import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageShell from '../components/PageShell';
import { api, API_URL, type DashboardData } from '../lib/api';

interface SaleRecord {
  id: string;
  product?: { name: string; buyingPrice?: number };
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentType: string;
  status?: string;
  customerName?: string;
  createdAt: string;
}

const formatCurrency = (amount: number | null | undefined) => {
  const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return `UGX ${safeAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export default function DashboardPage() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<SaleRecord | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      setDashboardData(null);
      setSales([]);
      setLoading(false);
      setError(null);
      return () => {
        isMounted = false;
      };
    }

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        setDashboardData(null);
        setSales([]);
        const token = localStorage.getItem('authToken') || '';
        const [dashboard, salesResponse] = await Promise.all([
          api.getDashboardData(),
          fetch(`${API_URL}/sales`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!salesResponse.ok) throw new Error('Unable to load sales history');
        const salesPayload = await salesResponse.json();

        if (isMounted) {
          setDashboardData(dashboard);
          setSales(Array.isArray(salesPayload) ? salesPayload : []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unable to load dashboard data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.phone]);

  const summary = useMemo(() => {
    const profitMade = sales.reduce((sum, sale) => {
      const buyingPrice = sale.product?.buyingPrice ?? 0;
      const profit = buyingPrice > 0 && sale.unitPrice > buyingPrice ? (sale.unitPrice - buyingPrice) * sale.quantity : 0;
      return sum + profit;
    }, 0);

    const lossesMade = sales.reduce((sum, sale) => {
      const buyingPrice = sale.product?.buyingPrice ?? 0;
      const loss = buyingPrice > 0 && sale.unitPrice < buyingPrice ? (buyingPrice - sale.unitPrice) * sale.quantity : 0;
      return sum + loss;
    }, 0);

    return {
      profitMade,
      lossesMade,
      revenue: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
      transactions: sales.length,
    };
  }, [sales]);

  return (
    <PageShell title="Dashboard" description="A modern merchant overview for sales, inventory, reports, and receipts.">
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-brand-600 p-6 text-white shadow-lg shadow-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-100">Good morning</p>
              <h2 className="mt-2 font-display text-3xl font-semibold">Welcome back, {user?.name ?? 'merchant'}.</h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-200">
                Manage inventory, record fresh sales, review profit and loss, and share receipts with your customers from one place.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.24em] text-brand-100">Today</p>
              <p className="mt-1 text-xl font-semibold">{dashboardData?.today?.transactions ?? 0} transactions</p>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
            Loading your commerce dashboard...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-600">{error}</div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Revenue</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(dashboardData?.today?.sales ?? summary.revenue)}</p>
                <p className="mt-1 text-sm text-slate-500">Live sales for this shop</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <p className="text-sm text-emerald-700">Profit</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-900">{formatCurrency(summary.profitMade || (dashboardData?.today?.profit ?? 0))}</p>
                <p className="mt-1 text-sm text-emerald-700">Positive margin from sold items</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <p className="text-sm text-amber-700">Loss</p>
                <p className="mt-2 text-2xl font-semibold text-amber-900">{formatCurrency(summary.lossesMade)}</p>
                <p className="mt-1 text-sm text-amber-700">Items sold below cost</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Stock watch</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{dashboardData?.inventory?.lowStockCount ?? 0}</p>
                <p className="mt-1 text-sm text-slate-500">Low stock alert items</p>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Quick flow</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900">Run your shop faster</h3>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <Link to="/sales" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-200 hover:bg-brand-50">
                    <p className="font-semibold text-slate-900">Add sales</p>
                    <p className="mt-1 text-sm text-slate-500">Log cash or credit sales instantly.</p>
                  </Link>
                  <Link to="/products" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-200 hover:bg-brand-50">
                    <p className="font-semibold text-slate-900">Add inventory</p>
                    <p className="mt-1 text-sm text-slate-500">Create products and set stock levels.</p>
                  </Link>
                  <Link to="/reports" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-200 hover:bg-brand-50">
                    <p className="font-semibold text-slate-900">Full reports</p>
                    <p className="mt-1 text-sm text-slate-500">Review performance by day, week, and month.</p>
                  </Link>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Performance snapshot</p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-sm text-slate-500">This week</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{formatCurrency(dashboardData?.week?.sales)}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-sm text-slate-500">This month</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{formatCurrency(dashboardData?.month?.sales)}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-sm text-slate-500">Profit margin</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{(Number.isFinite(Number(dashboardData?.month?.profitMargin)) ? Number(dashboardData?.month?.profitMargin) : 0).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Sales preview</p>
                  <h3 className="mt-1 text-xl font-semibold text-slate-900">Your latest sales are summarized here</h3>
                </div>
                <Link to="/sales" className="text-sm font-semibold text-brand-600 transition hover:text-brand-500">
                  View full sales history
                </Link>
              </div>

              {sales.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No sales recorded yet.
                </div>
              ) : (
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {sales.slice(0, 3).map((sale) => (
                    <div key={sale.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{sale.product?.name ?? 'Product'}</p>
                          <p className="mt-1 text-sm text-slate-500">{sale.customerName ?? 'Walk-in customer'}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${sale.paymentType === 'credit' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {sale.paymentType}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                        <span>Amount</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(sale.totalAmount)}</span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-slate-500">Date</span>
                        <span className="font-medium text-slate-900">{formatDate(sale.createdAt)}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(sale)}
                        className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Receipt / invoice
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {selectedReceipt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Receipt preview</p>
                <h3 className="mt-1 font-display text-2xl font-semibold text-slate-900">Invoice #{selectedReceipt.id.slice(0, 8).toUpperCase()}</h3>
              </div>
              <button type="button" onClick={() => setSelectedReceipt(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
                Close
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Customer</p>
                  <p className="font-semibold text-slate-900">{selectedReceipt.customerName ?? 'Walk-in customer'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-semibold text-slate-900">{formatDate(selectedReceipt.createdAt)}</p>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>{selectedReceipt.product?.name ?? 'Product'}</span>
                  <span>{selectedReceipt.quantity} × {formatCurrency(selectedReceipt.unitPrice)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                  <span>Payment</span>
                  <span className="capitalize">{selectedReceipt.paymentType}</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 text-base font-semibold text-slate-900">
                  <span>Total</span>
                  <span>{formatCurrency(selectedReceipt.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => window.print()} className="flex-1 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white">
                Print receipt
              </button>
              <button type="button" onClick={() => setSelectedReceipt(null)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
