import { useEffect, useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/api';

const fmt = (n: number) =>
  `UGX ${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

type Period = 'today' | 'week' | 'month';

interface SaleRecord {
  id: string;
  status?: string;
  paymentType: string;
  totalAmount: number;
  unitPrice: number;
  quantity: number;
  customerName?: string;
  product?: { name: string; buyingPrice?: number };
  createdAt: string;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description?: string;
  expenseDate: string;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('today');
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` }), [user?.id]);

  const getRange = (p: Period) => {
    const now = new Date();
    const start = new Date(now);
    if (p === 'today') start.setHours(0, 0, 0, 0);
    else if (p === 'week') start.setDate(now.getDate() - 7);
    else start.setDate(1), start.setHours(0, 0, 0, 0);
    return { start: start.toISOString(), end: now.toISOString() };
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true); setError(null);
        const { start, end } = getRange(period);
        const [sRes, eRes] = await Promise.all([
          fetch(`${API_URL}/sales/range?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`, { headers: authHeader }),
          fetch(`${API_URL}/expenses/by-date-range?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`, { headers: authHeader }),
        ]);
        setSales(sRes.ok ? await sRes.json() : []);
        setExpenses(eRes.ok ? await eRes.json() : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period, user?.id]);

  const stats = useMemo(() => {
    const active = sales.filter((s) => s.status !== 'voided');
    const revenue = active.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const profit = active.reduce((sum, s) => {
      const buy = Number(s.product?.buyingPrice ?? 0);
      return sum + (Number(s.unitPrice) - buy) * Number(s.quantity);
    }, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = profit - totalExpenses;
    const cashSales = active.filter((s) => s.paymentType === 'cash').reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const creditSales = active.filter((s) => s.paymentType === 'credit').reduce((sum, s) => sum + Number(s.totalAmount), 0);
    return { revenue, profit, totalExpenses, netProfit, transactions: active.length, cashSales, creditSales };
  }, [sales, expenses]);

  // Best selling products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    sales.filter((s) => s.status !== 'voided').forEach((s) => {
      const name = s.product?.name ?? 'Unknown';
      if (!map[name]) map[name] = { name, qty: 0, revenue: 0 };
      map[name].qty += Number(s.quantity);
      map[name].revenue += Number(s.totalAmount);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [sales]);

  // Top customers by spend
  const topCustomers = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> = {};
    sales.filter((s) => s.status !== 'voided' && s.customerName).forEach((s) => {
      const name = s.customerName!;
      if (!map[name]) map[name] = { name, total: 0, count: 0 };
      map[name].total += Number(s.totalAmount);
      map[name].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [sales]);

  // Expense breakdown by category
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => { map[e.category] = (map[e.category] ?? 0) + Number(e.amount); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  return (
    <PageShell title="Reports" description="Sales performance, profit breakdown and top insights.">
      {/* Period selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['today', 'week', 'month'] as Period[]).map((p) => (
          <button key={p} type="button" onClick={() => setPeriod(p)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${period === p ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {p === 'today' ? 'Today' : p === 'week' ? 'This week' : 'This month'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-slate-500">Loading reports...</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Revenue', value: fmt(stats.revenue), color: 'border-slate-200 bg-white' },
              { label: 'Gross Profit', value: fmt(stats.profit), color: 'border-emerald-200 bg-emerald-50' },
              { label: 'Expenses', value: fmt(stats.totalExpenses), color: 'border-red-200 bg-red-50' },
              { label: 'Net Profit', value: fmt(stats.netProfit), color: stats.netProfit >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50' },
            ].map((card) => (
              <div key={card.label} className={`rounded-2xl border p-5 ${card.color}`}>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Cash vs Credit + Transactions */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Transactions</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.transactions}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm text-emerald-700">Cash sales</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900">{fmt(stats.cashSales)}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm text-amber-700">Credit sales</p>
              <p className="mt-2 text-2xl font-semibold text-amber-900">{fmt(stats.creditSales)}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Best selling products */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">Best sellers</h3>
              {topProducts.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">No sales in this period.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {topProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                        <p className="text-sm text-slate-800 truncate">{p.name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-slate-900">{fmt(p.revenue)}</p>
                        <p className="text-xs text-slate-400">{p.qty} units</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top customers */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">Top customers</h3>
              {topCustomers.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">No named customers in this period.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {topCustomers.map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                        <p className="text-sm text-slate-800 truncate">{c.name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-slate-900">{fmt(c.total)}</p>
                        <p className="text-xs text-slate-400">{c.count} orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expenses by category */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">Expenses by category</h3>
              {expensesByCategory.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">No expenses in this period.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {expensesByCategory.map(([cat, total]) => (
                    <div key={cat} className="flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-700 capitalize">{cat.replace('_', ' ')}</p>
                      <p className="text-sm font-semibold text-red-600">{fmt(total)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
