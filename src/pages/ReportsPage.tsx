import { useEffect, useMemo, useRef, useState } from 'react';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/api';
import { printHtml } from '../lib/print';

const fmt = (n: number) =>
  `UGX ${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

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

// ─── Calendar strip helpers ───────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);

  // Calendar state
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const stripRef = useRef<HTMLDivElement>(null);

  // Data state
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` }), [user?.id]);

  // Scroll today's date into view on mount
  useEffect(() => {
    setTimeout(() => {
      const el = stripRef.current?.querySelector('[data-today="true"]') as HTMLElement | null;
      el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 150);
  }, [calMonth, calYear]);

  // Load data whenever selected date changes
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true); setError(null);
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);
        const [sRes, eRes] = await Promise.all([
          fetch(`${API_URL}/sales/range?startDate=${encodeURIComponent(start.toISOString())}&endDate=${encodeURIComponent(end.toISOString())}`, { headers: authHeader }),
          fetch(`${API_URL}/expenses/by-date-range?startDate=${encodeURIComponent(start.toISOString())}&endDate=${encodeURIComponent(end.toISOString())}`, { headers: authHeader }),
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
  }, [selectedDate, user?.id]);

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

  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => { map[e.category] = (map[e.category] ?? 0) + Number(e.amount); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const dateLabel = selectedDate.toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const handlePrint = () => {
    const rows = (arr: [string, string][]) =>
      arr.map(([l, v]) => `<tr><td>${l}</td><td class="right">${v}</td></tr>`).join('');
    const topProductRows = topProducts.map((p, i) =>
      `<tr><td>${i + 1}. ${p.name}</td><td class="right">${fmt(p.revenue)}</td><td class="right">${p.qty} units</td></tr>`).join('');
    const topCustomerRows = topCustomers.map((c, i) =>
      `<tr><td>${i + 1}. ${c.name}</td><td class="right">${fmt(c.total)}</td><td class="right">${c.count} orders</td></tr>`).join('');
    const expenseRows = expensesByCategory.map(([cat, total]) =>
      `<tr><td style="text-transform:capitalize">${cat.replace('_', ' ')}</td><td class="right red">${fmt(total)}</td></tr>`).join('');
    const html = `
      <h1>E-DUUKA — Daily Report</h1>
      <p class="meta">Date: ${dateLabel} &nbsp;·&nbsp; Generated: ${new Date().toLocaleString()}</p>
      <div class="summary">
        <div class="card"><div class="label">Revenue</div><div class="value">${fmt(stats.revenue)}</div></div>
        <div class="card"><div class="label">Gross Profit</div><div class="value green">${fmt(stats.profit)}</div></div>
        <div class="card"><div class="label">Expenses</div><div class="value red">${fmt(stats.totalExpenses)}</div></div>
        <div class="card"><div class="label">Net Profit</div><div class="value ${stats.netProfit >= 0 ? 'green' : 'red'}">${fmt(stats.netProfit)}</div></div>
      </div>
      <table><tr><th>Metric</th><th class="right">Value</th></tr>
        ${rows([['Transactions', String(stats.transactions)], ['Cash Sales', fmt(stats.cashSales)], ['Credit Sales', fmt(stats.creditSales)]])}
      </table>
      ${topProducts.length ? `<h2>Best Selling Products</h2>
        <table><tr><th>Product</th><th class="right">Revenue</th><th class="right">Qty</th></tr>${topProductRows}</table>` : ''}
      ${topCustomers.length ? `<h2>Top Customers</h2>
        <table><tr><th>Customer</th><th class="right">Total Spent</th><th class="right">Orders</th></tr>${topCustomerRows}</table>` : ''}
      ${expensesByCategory.length ? `<h2>Expenses by Category</h2>
        <table><tr><th>Category</th><th class="right">Amount</th></tr>${expenseRows}</table>` : ''}
      <p class="footer">E-DUUKA Shop Management &nbsp;·&nbsp; ${new Date().getFullYear()}</p>`;
    printHtml(html, `E-DUUKA Report — ${dateLabel}`);
  };

  return (
    <PageShell title="Reports" description="Tap any date to see that day's full report.">

      {/* ── Calendar strip ─────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition text-lg">
            ‹
          </button>
          <span className="text-sm font-semibold text-slate-800">{MONTHS[calMonth]} {calYear}</span>
          <button type="button" onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition text-lg">
            ›
          </button>
        </div>

        {/* Scrollable day strip */}
        <div ref={stripRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const date = new Date(calYear, calMonth, day);
            const isToday = isSameDay(date, today);
            const isSelected = isSameDay(date, selectedDate);
            const isFuture = date > today;
            return (
              <button
                key={day}
                type="button"
                data-today={isToday ? 'true' : undefined}
                disabled={isFuture}
                onClick={() => setSelectedDate(date)}
                className={`flex shrink-0 flex-col items-center rounded-xl px-3 py-2 transition
                  ${isSelected ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30' :
                    isToday ? 'border-2 border-brand-400 bg-brand-50 text-brand-700' :
                    isFuture ? 'opacity-30 cursor-not-allowed bg-slate-50 text-slate-400' :
                    'bg-slate-50 text-slate-700 hover:bg-brand-50 hover:text-brand-700'}`}
              >
                <span className="text-[10px] font-medium uppercase tracking-wide">{WEEKDAY[date.getDay()]}</span>
                <span className="mt-0.5 text-base font-bold">{day}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Selected date header ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Showing report for</p>
          <p className="text-lg font-bold text-slate-900">{dateLabel}</p>
        </div>
        {!loading && !error && (
          <button type="button" onClick={handlePrint}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            Print / Download PDF
          </button>
        )}
      </div>

      {/* ── Report content ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-slate-500">Loading report…</div>
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

          {stats.transactions === 0 && expenses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
              No activity recorded on this date.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Best selling products */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-semibold text-slate-900">Best sellers</h3>
                {topProducts.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-400">No sales on this date.</p>
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
                  <p className="mt-4 text-sm text-slate-400">No named customers.</p>
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
                  <p className="mt-4 text-sm text-slate-400">No expenses on this date.</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {expensesByCategory.map(([cat, total]) => (
                      <div key={cat} className="flex items-center justify-between gap-3">
                        <p className="text-sm text-slate-700 capitalize">{cat.replace(/_/g, ' ')}</p>
                        <p className="text-sm font-semibold text-red-600">{fmt(total)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
