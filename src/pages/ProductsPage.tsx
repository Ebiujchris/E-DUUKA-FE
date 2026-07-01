import { useEffect, useState } from 'react';
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

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
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
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
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

  return (
    <PageShell title="Products" description="Add inventory and track stock for your shop.">
      <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
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
          {message ? <p className="mt-4 text-sm text-emerald-600">{message}</p> : null}
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        </form>

        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Inventory</h2>
            <span className="text-sm text-slate-500">{products.length} items</span>
          </div>

          {loading ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
              No products yet. Add your first item.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {products.map((product) => (
                <div key={product.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{product.name}</p>
                      <p className="text-sm text-slate-500">Buy {formatCurrency(product.buyingPrice)} • Sell {formatCurrency(product.sellingPrice)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{product.stockQuantity} units</p>
                      <p className="text-sm text-slate-500">Threshold {product.lowStockThreshold ?? 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
