import { useEffect, useState } from 'react';
import PageShell from '../components/PageShell';
import { api, type DashboardData, type SubscriptionPaymentStatus } from '../lib/api';

function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not set'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(date);
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SubscriptionPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<SubscriptionPaymentStatus | null>(null);
  const [error, setError] = useState('');
  const [startingPayment, setStartingPayment] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([api.getDashboardData(), api.getSubscriptionPaymentStatus()])
      .then(([result, status]) => {
        if (active) {
          setData(result);
          setPaymentStatus(status);
        }
      })
      .catch(caught => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load subscription details.');
      });
    return () => { active = false; };
  }, []);

  const subscription = data?.subscription;
  const amount = subscription ? formatAmount(subscription.amount, subscription.currency) : 'UGX 30,000';
  const status = subscription?.status ?? 'unknown';

  async function beginPayment() {
    setStartingPayment(true);
    setError('');
    try {
      const checkout = await api.createSubscriptionCheckout();
      window.location.assign(checkout.checkoutUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not start subscription payment.');
      setStartingPayment(false);
    }
  }

  return (
    <PageShell title="Subscription" description="Your shop plan, renewal date and payment information.">
      <div className="mx-auto max-w-3xl space-y-5">
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {!subscription && !error && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading subscription details…</div>}
        {subscription && (
          <>
            <section className={`rounded-3xl border p-6 shadow-sm sm:p-8 ${status === 'active' ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white' : 'border-amber-300 bg-gradient-to-br from-amber-50 to-white'}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">E-DUUKA SHOP PLAN</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">{subscription.plan || 'Monthly'}</h2>
                  <p className="mt-1 text-sm text-slate-600">Billed monthly</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{status}</span>
              </div>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white bg-white/80 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Monthly price</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{amount}</p>
                </div>
                <div className="rounded-2xl border border-white bg-white/80 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Renewal date</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{formatDate(subscription.endsAt)}</p>
                </div>
              </div>
            </section>
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
              <h3 className="font-semibold">Automatic renewal after confirmed payment</h3>
              <p className="mt-1 text-sm leading-6 text-amber-900">
                {status === 'trial'
                  ? `Your shop is currently on a trial. Once online payments are connected, you can pay ${amount} here to activate the monthly plan.`
                  : `Pay ${amount} before the renewal date. Once online payments are connected, verified payment will renew your subscription automatically. If it expires before payment is confirmed, shop access is paused until renewal.`}
              </p>
              <p className="mt-2 text-xs leading-5 text-amber-800">
                {paymentStatus?.configured
                  ? 'Choose the available payment option to continue to secure checkout.'
                  : 'Online payment provider setup is pending. No payment will be collected until it is configured.'}
              </p>
              <button
                type="button"
                disabled={!paymentStatus?.configured || startingPayment}
                onClick={() => void beginPayment()}
                className="mt-4 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              >
                {startingPayment ? 'Connecting to checkout…' : paymentStatus?.configured ? 'Pay and renew' : 'Online payment coming soon'}
              </button>
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
}
