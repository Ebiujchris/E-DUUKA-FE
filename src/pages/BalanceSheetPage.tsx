import { useCallback, useState } from 'react';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { API_URL, authHeader } from '../lib/api';
import { printHtml } from '../lib/print';

const fmt = (n: number) => `UGX ${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

interface StockItem { name: string; qty: number; buyingPrice: number; value: number }
interface SupplierItem { name: string; owed: number }

interface BalanceSheet {
  asOf: string;
  assets: {
    stockValue: number;
    stockItems: StockItem[];
    receivables: number;
    cashRevenue: number;
    total: number;
  };
  liabilities: {
    supplierDebt: number;
    supplierBreakdown: SupplierItem[];
    total: number;
  };
  equity: {
    initialCapital: number;
    retainedEarnings: number;
    total: number;
  };
  incomeStatement: {
    totalRevenue: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    period: string;
  };
}

export default function BalanceSheetPage() {
  const { user } = useAuth();
  const [showStock, setShowStock] = useState(false);

  const fetchBS = useCallback(
    () => fetch(`${API_URL}/dashboard/balance-sheet`, { headers: authHeader() })
      .then(r => { if (!r.ok) throw new Error('Failed to load balance sheet'); return r.json() as Promise<BalanceSheet>; }),
    [user?.id],
  );

  const { data: bs, loading, error, reload } = useFetch<BalanceSheet>(fetchBS, [user?.id]);

  const handlePrint = () => {
    if (!bs) return;
    const { assets, liabilities, equity, incomeStatement: inc } = bs;

    const stockRows = assets.stockItems
      .sort((a, b) => b.value - a.value)
      .map(s => `<tr><td>${s.name}</td><td class="right">${s.qty}</td><td class="right">${fmt(s.buyingPrice)}</td><td class="right">${fmt(s.value)}</td></tr>`)
      .join('');

    const supplierRows = liabilities.supplierBreakdown
      .map(s => `<tr><td>${s.name}</td><td class="right red">${fmt(s.owed)}</td></tr>`)
      .join('');

    printHtml(`
      <h1>Balance Sheet — E-DUUKA</h1>
      <p class="meta">As of ${new Date(bs.asOf).toLocaleDateString('en-UG', { weekday:'long', year:'numeric', month:'long', day:'numeric' })} &nbsp;·&nbsp; Generated: ${new Date().toLocaleString()}</p>

      <h2>Assets</h2>
      <table>
        <tr><th>Item</th><th class="right">Value</th></tr>
        <tr><td>Stock on hand</td><td class="right">${fmt(assets.stockValue)}</td></tr>
        <tr><td>Customer receivables (outstanding credits)</td><td class="right">${fmt(assets.receivables)}</td></tr>
        <tr><td>Cash & mobile revenue (YTD)</td><td class="right">${fmt(assets.cashRevenue)}</td></tr>
        <tr><td><strong>Total Assets</strong></td><td class="right"><strong>${fmt(assets.total)}</strong></td></tr>
      </table>

      <h2>Liabilities</h2>
      <table>
        <tr><th>Item</th><th class="right">Value</th></tr>
        <tr><td>Supplier debt</td><td class="right red">${fmt(liabilities.supplierDebt)}</td></tr>
        <tr><td><strong>Total Liabilities</strong></td><td class="right red"><strong>${fmt(liabilities.total)}</strong></td></tr>
      </table>

      <h2>Equity (Owner's Net Worth)</h2>
      <table>
        <tr><th>Item</th><th class="right">Value</th></tr>
        <tr><td>Initial capital invested</td><td class="right">${fmt(equity.initialCapital)}</td></tr>
        <tr><td>Retained earnings (accumulated profit)</td><td class="right ${equity.retainedEarnings >= 0 ? 'green' : 'red'}">${fmt(equity.retainedEarnings)}</td></tr>
        <tr><td><strong>Total Equity</strong></td><td class="right ${equity.total >= 0 ? 'green' : 'red'}"><strong>${fmt(equity.total)}</strong></td></tr>
      </table>

      <h2>Income Statement (${inc.period})</h2>
      <table>
        <tr><th>Item</th><th class="right">Value</th></tr>
        <tr><td>Total Revenue</td><td class="right">${fmt(inc.totalRevenue)}</td></tr>
        <tr><td>Gross Profit</td><td class="right green">${fmt(inc.grossProfit)}</td></tr>
        <tr><td>Total Expenses</td><td class="right red">${fmt(inc.totalExpenses)}</td></tr>
        <tr><td><strong>Net Profit</strong></td><td class="right ${inc.netProfit >= 0 ? 'green' : 'red'}"><strong>${fmt(inc.netProfit)}</strong></td></tr>
      </table>

      ${assets.stockItems.length ? `
      <h2>Stock Valuation Detail</h2>
      <table>
        <tr><th>Product</th><th class="right">Qty</th><th class="right">Buy Price</th><th class="right">Value</th></tr>
        ${stockRows}
        <tr><td><strong>Total</strong></td><td></td><td></td><td class="right"><strong>${fmt(assets.stockValue)}</strong></td></tr>
      </table>` : ''}

      ${liabilities.supplierBreakdown.length ? `
      <h2>Supplier Debt Detail</h2>
      <table>
        <tr><th>Supplier</th><th class="right">Owed</th></tr>
        ${supplierRows}
      </table>` : ''}

      <p class="footer">E-DUUKA Shop Management &nbsp;·&nbsp; ${new Date().getFullYear()}</p>
    `, `Balance Sheet — ${new Date().toLocaleDateString()}`);
  };

  return (
    <PageShell title="Balance Sheet" description="Your shop's full financial position — assets, liabilities and equity.">
      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">Loading financial data…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => reload()} className="text-xs underline">Retry</button>
        </div>
      ) : bs ? (
        <div className="space-y-6">

          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              As of {new Date(bs.asOf).toLocaleDateString('en-UG', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </p>
            <button type="button" onClick={handlePrint}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              Print / Download PDF
            </button>
          </div>

          {/* Accounting equation banner */}
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 flex flex-wrap items-center justify-center gap-4 text-center">
            <div>
              <p className="text-xs text-brand-600 uppercase tracking-wide font-semibold">Total Assets</p>
              <p className="text-2xl font-bold text-brand-700">{fmt(bs.assets.total)}</p>
            </div>
            <span className="text-2xl text-brand-400 font-light">=</span>
            <div>
              <p className="text-xs text-red-500 uppercase tracking-wide font-semibold">Liabilities</p>
              <p className="text-2xl font-bold text-red-600">{fmt(bs.liabilities.total)}</p>
            </div>
            <span className="text-2xl text-slate-400 font-light">+</span>
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold text-emerald-600">Equity (Net Worth)</p>
              <p className={`text-2xl font-bold ${bs.equity.total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(bs.equity.total)}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">

            {/* ASSETS */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Assets</h2>

              {/* Stock */}
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Stock on hand</p>
                    <p className="text-xs text-slate-400">{bs.assets.stockItems.length} products · at buying price</p>
                  </div>
                  <p className="text-base font-bold text-slate-900">{fmt(bs.assets.stockValue)}</p>
                </div>
                <button type="button" onClick={() => setShowStock(!showStock)}
                  className="mt-1 text-xs text-brand-600 hover:underline">
                  {showStock ? 'Hide breakdown' : 'Show breakdown'}
                </button>
                {showStock && (
                  <div className="mt-2 rounded-xl border border-slate-100 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {bs.assets.stockItems.sort((a,b) => b.value - a.value).map(s => (
                      <div key={s.name} className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="text-slate-700">{s.name} <span className="text-slate-400">× {s.qty}</span></span>
                        <span className="font-medium text-slate-800">{fmt(s.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Receivables */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Customer receivables</p>
                  <p className="text-xs text-slate-400">Outstanding credit owed to you</p>
                </div>
                <p className="text-base font-bold text-amber-600">{fmt(bs.assets.receivables)}</p>
              </div>

              {/* Cash revenue */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Cash & mobile revenue (YTD)</p>
                  <p className="text-xs text-slate-400">Non-credit sales this year</p>
                </div>
                <p className="text-base font-bold text-emerald-700">{fmt(bs.assets.cashRevenue)}</p>
              </div>

              {/* Total assets */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 border border-slate-200">
                <p className="text-sm font-bold text-slate-900">Total Assets</p>
                <p className="text-lg font-bold text-slate-900">{fmt(bs.assets.total)}</p>
              </div>
            </div>

            {/* LIABILITIES + EQUITY */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Liabilities</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Supplier debt</p>
                    <p className="text-xs text-slate-400">What you owe your suppliers</p>
                  </div>
                  <p className="text-base font-bold text-red-600">{fmt(bs.liabilities.supplierDebt)}</p>
                </div>
                {bs.liabilities.supplierBreakdown.length > 0 && (
                  <div className="rounded-xl border border-red-100 divide-y divide-red-50">
                    {bs.liabilities.supplierBreakdown.map(s => (
                      <div key={s.name} className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="text-slate-700">{s.name}</span>
                        <span className="font-medium text-red-600">{fmt(s.owed)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {bs.liabilities.supplierBreakdown.length === 0 && (
                  <p className="text-xs text-emerald-600">✓ No outstanding supplier debt</p>
                )}
                <div className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-3 border border-red-200">
                  <p className="text-sm font-bold text-slate-900">Total Liabilities</p>
                  <p className="text-lg font-bold text-red-600">{fmt(bs.liabilities.total)}</p>
                </div>
              </div>

              {/* Equity */}
              <div className={`rounded-2xl border p-5 ${bs.equity.total >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                <h2 className="text-base font-bold text-slate-900 mb-3">Equity (Owner's Net Worth)</h2>
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Initial capital invested</span>
                    <span className="font-semibold text-slate-900">{fmt(bs.equity.initialCapital)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm border-t border-slate-200 pt-2">
                    <span className="text-slate-600">Retained earnings (all-time profit)</span>
                    <span className={`font-semibold ${bs.equity.retainedEarnings >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {fmt(bs.equity.retainedEarnings)}
                    </span>
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <p className="text-xs text-slate-500 mb-1">Initial Capital + Retained Earnings</p>
                  <p className={`text-3xl font-bold ${bs.equity.total >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(bs.equity.total)}</p>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {bs.equity.total >= 0 ? 'Positive net worth — shop is profitable.' : 'Negative equity — review expenses and debts.'}
                </p>
              </div>
            </div>
          </div>

          {/* Income Statement */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Income Statement</h2>
              <span className="text-xs bg-brand-100 text-brand-700 rounded-full px-3 py-1 font-medium">{bs.incomeStatement.period}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              {[
                { label: 'Revenue',       value: bs.incomeStatement.totalRevenue,  color: 'text-slate-900' },
                { label: 'Gross Profit',  value: bs.incomeStatement.grossProfit,   color: 'text-emerald-700' },
                { label: 'Expenses',      value: bs.incomeStatement.totalExpenses, color: 'text-red-600' },
                { label: 'Net Profit',    value: bs.incomeStatement.netProfit,     color: bs.incomeStatement.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
                  <p className={`mt-1 text-xl font-bold ${color}`}>{fmt(value)}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : null}
    </PageShell>
  );
}
