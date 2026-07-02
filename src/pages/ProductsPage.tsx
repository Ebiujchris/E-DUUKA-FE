import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import PageShell from '../components/PageShell';
import { API_URL } from '../lib/api';

interface ProductItem {
  id: string;
  name: string;
  buyingPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  lowStockThreshold?: number;
}

const formatCurrency = (amount: number) =>
  `UGX ${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

type StockFilter = 'all' | 'low' | 'out';

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [form, setForm] = useState({
    name: '',
    buyingPrice: '',
    sellingPrice: '',
    stockQuantity: '',
    lowStockThreshold: '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/products`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` },
      });
      if (!response.ok) throw new Error('Failed to load products');
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setProducts([]);
    loadProducts();
  }, [user?.id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          buyingPrice: Number(form.buyingPrice),
          sellingPrice: Number(form.sellingPrice),
          stockQuantity: Number(form.stockQuantity),
          lowStockThreshold: Number(form.lowStockThreshold || 0),
          userId: user?.id,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Unable to create product');
      setMessage(`Added ${payload.name}`);
      setForm({ name: '', buyingPrice: '', sellingPrice: '', stockQuantity: '', lowStockThreshold: '' });
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create product');
    }
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const threshold = p.lowStockThreshold ?? 0;
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'out' && p.stockQuantity === 0) ||
        (stockFilter === 'low' && p.stockQuantity > 0 && p.stockQuantity <= threshold);
      return matchesSearch && matchesStock;
    });
  }, [products, search, stockFilter]);

  const lowStockCount = products.filter(
    (p) => p.stockQuantity > 0 && p.stockQuantity <= (p.lowStockThreshold ?? 0),
  ).length;
  const outOfStockCount = products.filter((p) => p.stockQuantity === 0).length;

  return (
    <PageShell title="Products" description="Add inventory and track stock for your shop.">
      <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
        {/* Add product form */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Add product</h2>
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              placeholder="Product name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                placeholder="Buying price"
                type="number"
                value={form.buyingPrice}
                onChange={(e) => setForm({ ...form, buyingPrice: e.target.value })}
                required
              />
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                placeholder="Selling price"
                type="number"
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                placeholder="Stock quantity"
                type="number"
                value={form.stockQuantity}
                onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                required
              />
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                placeholder="Low stock threshold"
                type="number"
                value={form.lowStockThreshold}
                onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
              />
            </div>
            <button className="rounded-xl bg-brand-500 px-4 py-2.5 font-semibold text-white" type="submit">
              Save product
            </button>
          </div>
          {message && <p className="mt-4 text-sm text-emerald-600">{message}</p>}
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </form>

        {/* Inventory list */}
        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Inventory</h2>
            <span className="text-sm text-slate-500">{filtered.length} of {products.length} items</span>
          </div>

          {/* Search + filters */}
          <div className="mt-4 space-y-3">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            />
            <div className="flex gap-2">
              {(['all', 'low', 'out'] as StockFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStockFilter(f)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    stockFilter === f
                      ? 'bg-brand-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f === 'all' && `All (${products.length})`}
                  {f === 'low' && `Low stock (${lowStockCount})`}
                  {f === 'out' && `Out of stock (${outOfStockCount})`}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
              Loading products...
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
              {products.length === 0 ? 'No products yet. Add your first item.' : 'No products match your filters.'}
            </div>
          ) : (
            <div className="mt-4 max-h-[480px] overflow-y-auto space-y-2 pr-1">
              {filtered.map((product) => {
                const threshold = product.lowStockThreshold ?? 0;
                const isOut = product.stockQuantity === 0;
                const isLow = !isOut && threshold > 0 && product.stockQuantity <= threshold;
                return (
                  <div
                    key={product.id}
                    className={`rounded-xl border p-3 ${
                      isOut
                        ? 'border-red-200 bg-red-50'
                        : isLow
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium text-slate-900">{product.name}</p>
                          {isOut && (
                            <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                              Out
                            </span>
                          )}
                          {isLow && (
                            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-600">
                              Low
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Buy {formatCurrency(product.buyingPrice)} · Sell {formatCurrency(product.sellingPrice)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`font-semibold ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                          {product.stockQuantity} units
                        </p>
                        {threshold > 0 && (
                          <p className="text-xs text-slate-400">min {threshold}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
