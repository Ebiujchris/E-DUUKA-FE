import { useEffect, useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/api';

interface ProductItem {
  id: string;
  name: string;
  sellingPrice: number;
  stockQuantity: number;
}

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

const formatCurrency = (amount: number) =>
  `UGX ${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function SalesPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    productId: '',
    quantity: '1',
    unitPrice: '',
    paymentType: 'cash',
    customerName: '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'cash' | 'credit'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
    }),
    [user?.id],
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsResponse, salesResponse] = await Promise.all([
        fetch(`${API_URL}/products`, { headers: authHeaders }),
        fetch(`${API_URL}/sales`, { headers: authHeaders }),
      ]);

      if (!productsResponse.ok || !salesResponse.ok) throw new Error('Unable to load sales data');

      const [productsData, salesData] = await Promise.all([productsResponse.json(), salesResponse.json()]);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setSales(Array.isArray(salesData) ? salesData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load sales data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setProducts([]);
    setSales([]);
    loadData();
  }, [user?.id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.productId || !form.unitPrice || !form.quantity) {
      setError('Please fill in all required sale details.');
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          productId: form.productId,
          quantity: Number(form.quantity),
          unitPrice: Number(form.unitPrice || 0),
          paymentType: form.paymentType,
          customerName: form.customerName.trim() || (form.paymentType === 'credit' ? 'Walk-in customer' : 'Walk-in customer'),
          userId: user?.id,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Unable to record sale');

      setMessage('Sale recorded successfully');
      setForm({ productId: '', quantity: '1', unitPrice: '', paymentType: 'cash', customerName: '' });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record sale');
    } finally {
      setSubmitting(false);
    }
  };

  const visibleSales = useMemo(() => {
    const filtered = sales.filter((sale) => {
      const matchesFilter = filter === 'all' || sale.paymentType === filter;
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || [sale.product?.name, sale.customerName, sale.paymentType].some((value) => value?.toLowerCase().includes(query));
      return matchesFilter && matchesSearch;
    });

    return filtered.slice(0, page * pageSize);
  }, [sales, filter, search, page]);

  const totalPages = useMemo(() => {
    const filtered = sales.filter((sale) => {
      const matchesFilter = filter === 'all' || sale.paymentType === filter;
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || [sale.product?.name, sale.customerName, sale.paymentType].some((value) => value?.toLowerCase().includes(query));
      return matchesFilter && matchesSearch;
    });

    return Math.max(1, Math.ceil(filtered.length / pageSize));
  }, [sales, filter, search]);

  return (
    <PageShell title="Sales" description="Record sales quickly and review recent transactions.">
      <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Record a sale</h2>
          <div className="mt-4 space-y-3">
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
              required
            >
              <option value="">Select a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} • stock {product.stockQuantity}
                </option>
              ))}
            </select>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              placeholder="Quantity"
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              min="1"
              required
            />
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              placeholder="Unit price"
              type="number"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
              required
            />
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              value={form.paymentType}
              onChange={(e) => setForm({ ...form, paymentType: e.target.value })}
            >
              <option value="cash">Cash</option>
              <option value="credit">Credit</option>
            </select>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              placeholder="Buyer name (optional)"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            />
            <button
              className={`rounded-xl px-4 py-2.5 font-semibold text-white transition-all duration-200 ${submitting ? 'scale-[0.98] bg-emerald-600 shadow-inner' : 'bg-brand-500 hover:bg-brand-600 active:scale-[0.98] active:bg-emerald-600'}`}
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Recording…' : 'Record sale'}
            </button>
          </div>
          {message ? <p className="mt-4 text-sm text-emerald-600">{message}</p> : null}
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        </form>

        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent transactions</h2>
            <span className="text-sm text-slate-500">{visibleSales.length} of {sales.length} entries</span>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Search buyer or product"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'cash' | 'credit')}
            >
              <option value="all">All sales</option>
              <option value="cash">Cash</option>
              <option value="credit">Credit</option>
            </select>
          </div>

          {loading ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
              Loading sales...
            </div>
          ) : sales.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
              No sales recorded yet.
            </div>
          ) : visibleSales.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              No matching sales found.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {visibleSales.map((sale) => (
                <div key={sale.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{sale.product?.name ?? 'Product'}</p>
                      <p className="text-sm text-slate-500">
                        {sale.quantity} units • {sale.paymentType} • {sale.customerName ?? 'Walk-in customer'}
                      </p>
                      {sale.status ? <p className="text-xs text-slate-500">{sale.status}</p> : null}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{formatCurrency(sale.totalAmount)}</p>
                      <p className="text-sm text-slate-500">{new Date(sale.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {visibleSales.length > 0 && page < totalPages ? (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Load more
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
