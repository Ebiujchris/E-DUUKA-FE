import { useEffect, useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';

interface ReportsSummary {
  sales: number;
  profit: number;
  transactions: number;
}

const formatCurrency = (amount: number) =>
  `UGX ${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function ReportsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [summary, setSummary] = useState<ReportsSummary>({ sales: 0, profit: 0, transactions: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
    }),
    [user?.id],
  );

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        setSummary({ sales: 0, profit: 0, transactions: 0 });
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/sales/range?startDate=${encodeURIComponent(new Date(Date.now() - (period === 'today' ? 24 : period === 'week' ? 7 : 30) * 60 * 60 * 1000).toISOString())}&endDate=${encodeURIComponent(new Date().toISOString())}`, { headers: authHeaders });
        if (!response.ok) throw new Error('Unable to load reports');
        const data = await response.json();
        const sales = Array.isArray(data) ? data : [];
        const activeSales = sales.filter((sale: { status?: string }) => sale.status !== 'voided');
        const reportSales = activeSales.reduce((sum: number, sale: { totalAmount?: number }) => sum + Number(sale.totalAmount || 0), 0);
        const reportProfit = activeSales.reduce((sum: number, sale: { unitPrice?: number; quantity?: number; product?: { buyingPrice?: number } }) => {
          const buyingPrice = Number(sale.product?.buyingPrice || 0);
          return sum + ((Number(sale.unitPrice || 0) - buyingPrice) * Number(sale.quantity || 0));
        }, 0);
        setSummary({ sales: reportSales, profit: reportProfit, transactions: activeSales.length });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load reports');
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [period, user?.id]);

  return (
    <PageShell title="Reports" description="Review sales performance by period.">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-wrap gap-2">
          {(['today', 'week', 'month'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${period === value ? 'bg-brand-500 text-white' : 'bg-white text-slate-600'}`}
            >
              {value === 'today' ? 'Today' : value === 'week' ? 'This week' : 'This month'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
            Loading reports...
          </div>
        ) : error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Revenue</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(summary.sales)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Profit</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(summary.profit)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Transactions</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.transactions}</p>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
