import { useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { SkeletonList } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { useFetch } from '../hooks/useFetch';
import { API_URL, authHeader, bustCache } from '../lib/api';

interface ProductItem { id: string; name: string; sellingPrice: number; stockQuantity: number }
interface SaleItem {
  id: string;
  product?: { name: string };
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentType: string;
  customerName?: string;
  status?: string;
  createdAt: string;
}

const fmt = (n: number) => `UGX ${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function SalesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'cash' | 'credit'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;
  const [form, setForm] = useState({ productId: '', quantity: '1', unitPrice: '', paymentType: 'cash', customerName: '' });

  const { data: products = [], loading: prodLoading } = useFetch<ProductItem[]>(
    () => fetch(`${API_URL}/products`, { headers: authHeader() }).then((r) => r.json()),
    [user?.id],
  );

  const { data: sales = [], loading: salesLoading, error, reload } = useFetch<SaleItem[]>(
    () => fetch(`${API_URL}/sales`, { headers: authHeader() }).then((r) => {
      if (!r.ok) throw new Error('Failed to load sales');
      return r.json();
    }),
    [user?.id],
  );

  const loading = prodLoading || salesLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId || !form.unitPrice) { toast.error('Fill in all required fields'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          productId: form.productId,
          quantity: Number(form.quantity),
          unitPrice: Number(form.unitPrice),
          paymentType: form.paymentType,
          customerName: form.customerName.trim() || 'Walk-in customer',
          userId: user?.id,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(Array.isArray(payload.message) ? payload.message[0] : payload.message || 'Failed');
      toast.success('Sale recorded');
      bustCache('/sales');
      bustCache('/products');
      bustCache('/dashboard');
      setForm({ productId: '', quantity: '1', unitPrice: '', paymentType: 'cash', customerName: '' });
      setPage(1);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record sale');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSales = useMemo(() => sales.filter((s) => {
    const matchFilter = filter === 'all' || s.paymentType === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || [s.product?.name, s.customerName, s.paymentType].some((v) => v?.toLowerCase().includes(q));
    return matchFilter && matchSearch;
  }), [sales, filter, search]);

  const visibleSales = filteredSales.slice(0, page * PAGE_SIZE);
  const hasMore = visibleSales.length < filteredSales.length;

  return (
    <PageShell title="Sales" description="Record sales quickly and review recent transactions.">
      <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Record a sale</h2>
          <div className="mt-4 space-y-3">
            <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required>
              <option value="">Select a product</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} · stock {p.stockQuantity}</option>)}
            </select>
            <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" placeholder="Quantity" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
            <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" placeholder="Unit price" type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required />
            <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })}>
              <option value="cash">Cash</option>
              <option value="credit">Credit</option>
              <option value="mobile_money">Mobile Money</option>
            </select>
            <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" placeholder="Buyer name (optional)" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            <button className="rounded-xl bg-brand-500 px-4 py-2.5 font-semibold text-white disabled:opacity-60 transition" type="submit" disabled={submitting}>
              {submitting ? 'Recording…' : 'Record sale'}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Transactions</h2>
            <span className="text-sm text-slate-500">{filteredSales.length} of {sales.length}</span>
          </div>

          <div className="mt-4 space-y-3">
            <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none" placeholder="Search buyer or product..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            <div className="flex gap-2">
              {(['all', 'cash', 'credit'] as const).map((f) => (
                <button key={f} type="button" onClick={() => { setFilter(f); setPage(1); }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filter === f ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {f === 'all' && `All (${sales.length})`}
                  {f === 'cash' && `Cash (${sales.filter((s) => s.paymentType === 'cash').length})`}
                  {f === 'credit' && `Credit (${sales.filter((s) => s.paymentType === 'credit').length})`}
                </button>
              ))}
            </div>
          </div>

          {loading ? <div className="mt-4"><SkeletonList rows={5} /></div>
            : error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 flex items-center justify-between">
                <span>{error}</span>
                <button type="button" onClick={() => reload()} className="text-xs underline">Retry</button>
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
                {sales.length === 0 ? 'No sales recorded yet.' : 'No matching sales.'}
              </div>
            ) : (
              <>
                <div className="mt-4 max-h-[480px] overflow-y-auto space-y-2 pr-1">
                  {visibleSales.map((sale) => {
                    const isCredit = sale.paymentType === 'credit';
                    return (
                      <div key={sale.id} className={`rounded-xl border p-3 ${isCredit && sale.status !== 'paid' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium text-slate-900">{sale.product?.name ?? 'Product'}</p>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${isCredit ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>{sale.paymentType}</span>
                              {sale.status && sale.status !== 'active' && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{sale.status}</span>}
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">{sale.quantity} units · {sale.customerName ?? 'Walk-in customer'}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-semibold text-slate-900">{fmt(sale.totalAmount)}</p>
                            <p className="text-xs text-slate-400">{new Date(sale.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {hasMore && (
                  <button type="button" onClick={() => setPage((p) => p + 1)} className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                    Load more
                  </button>
                )}
              </>
            )}
        </div>
      </div>
    </PageShell>
  );
}
