import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageShell from '../components/PageShell';
import { API_URL, api, authHeader } from '../lib/api';

const fc = (n: number | null | undefined) => {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `UGX ${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

interface TodayStats {
  revenue: number;
  profit: number;
  expenses: number;
  transactions: number;
  cashSales: number;
  creditSales: number;
}

interface LowStockProduct { id: string; name: string; stock: number }
interface DailyRevenue { date: string; label: string; revenue: number }
interface SubscriptionInfo {
  plan: string;
  amount: number;
  currency: string;
  billingInterval: string;
  status: string;
  endsAt?: string | null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const [today, setToday]       = useState<TodayStats | null>(null);
  const [weekRev, setWeekRev]   = useState<number>(0);
  const [monthRev, setMonthRev] = useState<number>(0);
  const [revenueTrend, setRevenueTrend] = useState<DailyRevenue[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [outstanding, setOutstanding] = useState<number>(0);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!userId) return;
    const h = authHeader();
    const now = new Date();

    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const todayEnd   = new Date(now); todayEnd.setHours(23,59,59,999);

    const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 7); weekStart.setHours(0,0,0,0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59,999);

    const enc = encodeURIComponent;

    const load = async () => {
      setLoading(true);
      try {
        const [sToday, sWeek, sMonth, eToday, credStats, lsRes, dashboardRes] = await Promise.all([
          fetch(`${API_URL}/sales/range?startDate=${enc(todayStart.toISOString())}&endDate=${enc(todayEnd.toISOString())}`, { headers: h }).then(r => r.ok ? r.json() : []),
          fetch(`${API_URL}/sales/range?startDate=${enc(weekStart.toISOString())}&endDate=${enc(todayEnd.toISOString())}`, { headers: h }).then(r => r.ok ? r.json() : []),
          fetch(`${API_URL}/sales/range?startDate=${enc(monthStart.toISOString())}&endDate=${enc(monthEnd.toISOString())}`, { headers: h }).then(r => r.ok ? r.json() : []),
          fetch(`${API_URL}/expenses/by-date-range?startDate=${enc(todayStart.toISOString())}&endDate=${enc(todayEnd.toISOString())}`, { headers: h }).then(r => r.ok ? r.json() : []),
          fetch(`${API_URL}/credits/stats`, { headers: h }).then(r => r.ok ? r.json() : { totalOutstanding: 0 }),
          fetch(`${API_URL}/products/low-stock`, { headers: h }).then(r => r.ok ? r.json() : []),
          api.getDashboardData().catch(() => null),
        ]);

        const active = (arr: any[]) => arr.filter((s: any) => s.status !== 'voided');
        const sumAmt  = (arr: any[]) => arr.reduce((s: number, x: any) => s + Number(x.totalAmount), 0);
        const sumProfit = (arr: any[]) => arr.reduce((s: number, x: any) =>
          s + (Number(x.unitPrice) - Number(x.product?.buyingPrice ?? 0)) * Number(x.quantity), 0);

        const todayActive = active(sToday);
        setToday({
          revenue:      sumAmt(todayActive),
          profit:       sumProfit(todayActive),
          expenses:     eToday.reduce((s: number, e: any) => s + Number(e.amount), 0),
          transactions: todayActive.length,
          cashSales:    todayActive.filter((s: any) => s.paymentType === 'cash').reduce((s: number, x: any) => s + Number(x.totalAmount), 0),
          creditSales:  todayActive.filter((s: any) => s.paymentType === 'credit').reduce((s: number, x: any) => s + Number(x.totalAmount), 0),
        });
        setWeekRev(sumAmt(active(sWeek)));
        setMonthRev(sumAmt(active(sMonth)));
        const dailyTotals = new Map<string, number>();
        for (const sale of active(sWeek)) {
          const date = new Date(sale.createdAt);
          if (Number.isNaN(date.getTime())) continue;
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + Number(sale.totalAmount));
        }
        setRevenueTrend(Array.from({ length: 7 }, (_, index) => {
          const date = new Date(now);
          date.setDate(now.getDate() - 6 + index);
          date.setHours(0, 0, 0, 0);
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          return {
            date: key,
            label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date),
            revenue: dailyTotals.get(key) ?? 0,
          };
        }));
        setOutstanding(Number(credStats.totalOutstanding ?? 0));
        setLowStock(Array.isArray(lsRes) ? lsRes.slice(0, 5) : []);
        setSubscription(dashboardRes?.subscription ?? null);
      } catch {/* silent */}
      finally { setLoading(false); }
    };
    load();
  }, [userId]);

  const netToday = useMemo(() => today ? today.profit - today.expenses : 0, [today]);
  const subscriptionDaysRemaining = useMemo(() => {
    if (!subscription?.endsAt) return null;
    const remaining = new Date(subscription.endsAt).getTime() - Date.now();
    return Number.isFinite(remaining) ? Math.ceil(remaining / 86_400_000) : null;
  }, [subscription?.endsAt]);
  const showSubscriptionReminder = subscription?.status === 'active'
    && subscriptionDaysRemaining !== null
    && subscriptionDaysRemaining > 0
    && subscriptionDaysRemaining <= 2;
  const greet = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }, []);

  return (
    <PageShell title="Dashboard" description="Today's performance at a glance.">
      <div className="space-y-6">

        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-800 to-brand-700 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-200">{greet}</p>
              <h2 className="mt-1 text-3xl font-bold sm:text-4xl">{user?.name ?? 'Merchant'}</h2>
              <p className="mt-2 text-base text-slate-300">Here’s how your shop is doing today.</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur min-w-[110px]">
                <p className="text-sm text-brand-200 uppercase tracking-wide">Transactions</p>
                <p className="mt-1 text-2xl font-bold">{today?.transactions ?? 0}</p>
              </div>
              <div className={`rounded-2xl border px-4 py-3 backdrop-blur min-w-[110px] ${netToday >= 0 ? 'border-emerald-400/30 bg-emerald-500/20' : 'border-red-400/30 bg-red-500/20'}`}>
                <p className="text-sm text-slate-300 uppercase tracking-wide">Net today</p>
                <p className={`mt-1 text-xl font-bold ${netToday >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fc(netToday)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Low stock + outstanding credits alert bar */}
        {!loading && (lowStock.length > 0 || outstanding > 0 || showSubscriptionReminder) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {showSubscriptionReminder && (
              <Link to="/subscription" className="flex-1 flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 hover:bg-amber-100 transition">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-sm font-bold text-amber-700">!</div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-amber-900">Subscription due in {subscriptionDaysRemaining} day{subscriptionDaysRemaining === 1 ? '' : 's'}</p>
                  <p className="text-sm text-amber-700">Pay {subscription?.currency} {Number(subscription?.amount).toLocaleString()} to keep account access.</p>
                </div>
                <span className="ml-auto text-sm font-semibold text-amber-800 shrink-0">Subscription →</span>
              </Link>
            )}
            {lowStock.length > 0 && (
              <Link to="/restock" className="flex-1 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 hover:bg-amber-100 transition">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-xs font-bold text-amber-700">!</div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-amber-800">{lowStock.length} product{lowStock.length > 1 ? 's' : ''} low/out of stock</p>
                  <p className="text-sm text-amber-600 truncate">{lowStock.map(p => p.name).join(', ')}</p>
                </div>
                <span className="ml-auto text-sm font-semibold text-amber-700 shrink-0">Restock →</span>
              </Link>
            )}
            {outstanding > 0 && (
              <Link to="/credits" className="flex-1 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 hover:bg-red-100 transition">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-xs font-bold text-red-700">$</div>
                <div>
                  <p className="text-base font-semibold text-red-800">Outstanding credit debt</p>
                  <p className="text-sm text-red-600">{fc(outstanding)} owed to you</p>
                </div>
                <span className="ml-auto text-sm font-semibold text-red-700 shrink-0">View →</span>
              </Link>
            )}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500">Loading dashboard…</div>
        ) : (
          <>
            {/* Today KPIs */}
            <section className="grid gap-4 grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 border-t-4 border-t-brand-500 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Revenue today</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{fc(today?.revenue)}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 border-t-4 border-t-emerald-500 bg-emerald-50 p-5 shadow-sm">
                <p className="text-sm font-medium text-emerald-800 uppercase tracking-wide">Gross profit</p>
                <p className="mt-2 text-2xl font-bold text-emerald-900">{fc(today?.profit)}</p>
              </div>
              <div className="rounded-2xl border border-red-200 border-t-4 border-t-red-400 bg-red-50 p-5 shadow-sm">
                <p className="text-sm font-medium text-red-700 uppercase tracking-wide">Expenses today</p>
                <p className="mt-2 text-2xl font-bold text-red-800">{fc(today?.expenses)}</p>
              </div>
              <div className={`rounded-2xl border border-t-4 p-5 shadow-sm ${netToday >= 0 ? 'border-emerald-200 border-t-emerald-500 bg-emerald-50' : 'border-red-200 border-t-red-500 bg-red-50'}`}>
                <p className={`text-sm font-medium uppercase tracking-wide ${netToday >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>Net profit</p>
                <p className={`mt-2 text-2xl font-bold ${netToday >= 0 ? 'text-emerald-900' : 'text-red-800'}`}>{fc(netToday)}</p>
              </div>
            </section>

            {/* Cash flow today */}
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-800">Cash in</p>
                <p className="mt-1 text-xl font-bold text-emerald-900">{fc(today?.cashSales)}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">Credit sales</p>
                <p className="mt-1 text-xl font-bold text-amber-900">{fc(today?.creditSales)}</p>
              </div>
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">Money out (expenses)</p>
                <p className="mt-1 text-xl font-bold text-red-800">{fc(today?.expenses)}</p>
              </div>
            </section>

            <RevenueTrendChart data={revenueTrend} />

            {/* Performance + quick links */}
            <section className="grid gap-6 lg:grid-cols-2">
              {/* Period performance */}
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 sm:p-6">
                <p className="mb-3 text-sm font-bold uppercase tracking-wide text-brand-700">At a glance</p>
                <div className="space-y-2">
                  {[
                    { label: 'This week revenue', value: fc(weekRev) },
                    { label: 'This month revenue', value: fc(monthRev) },
                    { label: 'Outstanding credits', value: fc(outstanding) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3">
                      <span className="text-base text-slate-600">{label}</span>
                      <span className="text-base font-semibold text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick links */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="mb-3 text-sm font-bold uppercase tracking-wide text-brand-700">Quick actions</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'New sale',    sub: 'Record a transaction', to: '/sales', featured: true },
                    { label: 'Restock',     sub: 'Add stock to products', to: '/restock', featured: true },
                    { label: 'Expenses',    sub: 'Record a cost', to: '/expenses' },
                    { label: 'Credits',     sub: 'Who owes you money', to: '/credits' },
                    { label: 'Reports',     sub: 'Daily & monthly view', to: '/reports' },
                    { label: 'Receipts',    sub: 'Print/share receipts', to: '/receipts' },
                  ].map(({ label, sub, to, featured }) => (
                    <Link key={to} to={to} className={`group rounded-xl border p-3 transition hover:border-brand-300 hover:bg-brand-50 ${featured ? 'border-brand-200 bg-brand-50/70' : 'border-slate-200 bg-slate-50'}`}>
                      <p className="text-base font-semibold text-slate-900 group-hover:text-brand-800">{label}<span className="float-right text-brand-600">→</span></p>
                      <p className="mt-1 text-sm text-slate-600">{sub}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
}

function RevenueTrendChart({ data }: { data: DailyRevenue[] }) {
  const width = 720;
  const height = 250;
  const left = 58;
  const right = 18;
  const top = 18;
  const bottom = 38;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxRevenue = Math.max(...data.map(day => day.revenue), 1);
  const points = data.map((day, index) => ({
    ...day,
    x: left + (data.length > 1 ? (index / (data.length - 1)) * chartWidth : chartWidth / 2),
    y: top + chartHeight - (day.revenue / maxRevenue) * chartHeight,
  }));
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${top + chartHeight} L ${points[0].x} ${top + chartHeight} Z`
    : '';
  const weeklyTotal = data.reduce((total, day) => total + day.revenue, 0);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-brand-700">Revenue trend</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">Last 7 days</h3>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">7-day revenue</p>
          <p className="text-lg font-bold text-slate-900">{fc(weeklyTotal)}</p>
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <svg
          className="h-auto min-w-[520px] w-full"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Revenue over the last 7 days: ${data.map(day => `${day.label} ${fc(day.revenue)}`).join(', ')}`}
        >
          <defs>
            <linearGradient id="revenue-area-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#27834d" stopOpacity=".22" />
              <stop offset="100%" stopColor="#27834d" stopOpacity=".015" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map(step => {
            const y = top + (chartHeight / 3) * step;
            const value = maxRevenue * (1 - step / 3);
            return (
              <g key={step}>
                <line x1={left} y1={y} x2={width - right} y2={y} stroke="#e8edf0" strokeDasharray={step === 3 ? undefined : '4 5'} />
                <text x={left - 10} y={y + 4} textAnchor="end" fill="#77838b" fontSize="11">{value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : Math.round(value)}</text>
              </g>
            );
          })}
          {areaPath && <path d={areaPath} fill="url(#revenue-area-gradient)" />}
          {linePath && <path d={linePath} fill="none" stroke="#27834d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
          {points.map(point => (
            <g key={point.date}>
              <circle cx={point.x} cy={point.y} r="5" fill="white" stroke="#27834d" strokeWidth="3">
                <title>{point.label}: {fc(point.revenue)}</title>
              </circle>
              <text x={point.x} y={height - 10} textAnchor="middle" fill="#66736c" fontSize="12" fontWeight="500">{point.label}</text>
            </g>
          ))}
        </svg>
      </div>
      {weeklyTotal === 0 && <p className="mt-2 text-sm text-slate-500">No sales recorded in this period yet.</p>}
    </section>
  );
}
