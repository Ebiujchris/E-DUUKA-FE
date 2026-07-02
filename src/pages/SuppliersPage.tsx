import { useEffect, useState, useMemo } from 'react';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/api';

interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  totalOwed: number;
}

interface Product { id: string; name: string; }
interface PurchaseOrder {
  id: string;
  supplier?: { name: string };
  product?: { name: string };
  quantity: number;
  unitCost: number;
  totalCost: number;
  status: string;
  createdAt: string;
}

const formatCurrency = (n: number) =>
  `UGX ${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function SuppliersPage() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders'>('suppliers');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
  const [orderForm, setOrderForm] = useState({ supplierId: '', productId: '', quantity: '', unitCost: '', notes: '' });

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` }), [user?.id]);

  const load = async () => {
    try {
      setLoading(true);
      const [sRes, pRes, oRes] = await Promise.all([
        fetch(`${API_URL}/suppliers`, { headers: authHeader }),
        fetch(`${API_URL}/products`, { headers: authHeader }),
        fetch(`${API_URL}/purchase-orders`, { headers: authHeader }),
      ]);
      setSuppliers(sRes.ok ? await sRes.json() : []);
      setProducts(pRes.ok ? await pRes.json() : []);
      setOrders(oRes.ok ? await oRes.json() : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.id]);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setMessage(null);
    try {
      const res = await fetch(`${API_URL}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(supplierForm),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || 'Failed to add supplier');
      setMessage(`Added supplier: ${payload.name}`);
      setSupplierForm({ name: '', phone: '', email: '', address: '', notes: '' });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
  };

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setMessage(null);
    try {
      const res = await fetch(`${API_URL}/purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ ...orderForm, quantity: Number(orderForm.quantity), unitCost: Number(orderForm.unitCost) }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || 'Failed to create order');
      setMessage('Purchase order created');
      setOrderForm({ supplierId: '', productId: '', quantity: '', unitCost: '', notes: '' });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
  };

  const handleReceive = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/purchase-orders/${id}/receive`, { method: 'POST', headers: authHeader });
      if (!res.ok) throw new Error('Failed to receive order');
      setMessage('Order received — stock updated');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('Remove this supplier?')) return;
    await fetch(`${API_URL}/suppliers/${id}`, { method: 'DELETE', headers: authHeader });
    await load();
  };

  const filteredSuppliers = useMemo(() =>
    suppliers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone ?? '').includes(search)),
    [suppliers, search]);

  const filteredOrders = useMemo(() =>
    orders.filter((o) =>
      (o.supplier?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (o.product?.name ?? '').toLowerCase().includes(search.toLowerCase())),
    [orders, search]);

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    received: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-600',
  };

  return (
    <PageShell title="Suppliers" description="Manage suppliers and track purchase orders.">
      <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
        {/* Forms */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Add supplier</h2>
            <form onSubmit={handleAddSupplier} className="mt-4 space-y-3">
              <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" placeholder="Supplier name" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} required />
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" placeholder="Phone" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
                <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" placeholder="Email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} />
              </div>
              <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" placeholder="Address (optional)" value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} />
              <button className="rounded-xl bg-brand-500 px-4 py-2.5 font-semibold text-white" type="submit">Save supplier</button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-semibold text-slate-900">New purchase order</h2>
            <form onSubmit={handleAddOrder} className="mt-4 space-y-3">
              <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={orderForm.supplierId} onChange={(e) => setOrderForm({ ...orderForm, supplierId: e.target.value })} required>
                <option value="">Select supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={orderForm.productId} onChange={(e) => setOrderForm({ ...orderForm, productId: e.target.value })} required>
                <option value="">Select product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" placeholder="Quantity" type="number" min="1" value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })} required />
                <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" placeholder="Unit cost (UGX)" type="number" value={orderForm.unitCost} onChange={(e) => setOrderForm({ ...orderForm, unitCost: e.target.value })} required />
              </div>
              <button className="rounded-xl bg-brand-500 px-4 py-2.5 font-semibold text-white" type="submit">Create order</button>
            </form>
          </div>
          {message && <p className="text-sm text-emerald-600">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* List panel */}
        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(['suppliers', 'orders'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setActiveTab(t)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${activeTab === t ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {t === 'suppliers' ? `Suppliers (${suppliers.length})` : `Orders (${orders.length})`}
                </button>
              ))}
            </div>
          </div>

          <input type="text" placeholder={`Search ${activeTab}...`} value={search} onChange={(e) => setSearch(e.target.value)} className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none" />

          {loading ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">Loading...</div>
          ) : activeTab === 'suppliers' ? (
            filteredSuppliers.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">No suppliers yet.</div>
            ) : (
              <div className="mt-4 max-h-[520px] overflow-y-auto space-y-2 pr-1">
                {filteredSuppliers.map((s) => (
                  <div key={s.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{s.name}</p>
                        {s.phone && <p className="text-xs text-slate-500">{s.phone}</p>}
                        {s.address && <p className="text-xs text-slate-400">{s.address}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        {Number(s.totalOwed) > 0 && <p className="text-sm font-semibold text-red-600">{formatCurrency(s.totalOwed)} owed</p>}
                        <button type="button" onClick={() => handleDeleteSupplier(s.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            filteredOrders.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">No purchase orders yet.</div>
            ) : (
              <div className="mt-4 max-h-[520px] overflow-y-auto space-y-2 pr-1">
                {filteredOrders.map((o) => (
                  <div key={o.id} className={`rounded-xl border p-3 ${o.status === 'pending' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">{o.product?.name ?? 'Product'}</p>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[o.status] ?? 'bg-slate-100 text-slate-500'}`}>{o.status}</span>
                        </div>
                        <p className="text-xs text-slate-500">From {o.supplier?.name ?? '—'} · {o.quantity} units @ {formatCurrency(o.unitCost)}</p>
                        <p className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold text-slate-900">{formatCurrency(o.totalCost)}</p>
                        {o.status === 'pending' && (
                          <button type="button" onClick={() => handleReceive(o.id)} className="mt-1 rounded-lg bg-emerald-500 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-600">
                            Mark received
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </PageShell>
  );
}
