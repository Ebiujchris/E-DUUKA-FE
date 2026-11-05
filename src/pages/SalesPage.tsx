import { useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { SkeletonList } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { useFetch } from '../hooks/useFetch';
import { API_URL, authHeader, bustCache } from '../lib/api';

interface ProductItem {
  id: string;
  name: string;
  sellingPrice: number;
  stockQuantity: number;
  lowStockThreshold?: number;
  category?: string;
  brand?: string;
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
  createdByStaffId?: string;
  createdByStaffName?: string;
}
interface CartItem {
  key: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

const fmt = (n: number) => `UGX ${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function SalesPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartCustomer, setCartCustomer] = useState('');
  const [cartPayment, setCartPayment] = useState('cash');
  const [submitting, setSubmitting] = useState(false);

  // Two-step picker: category → brand → product
  const [pickerCategory, setPickerCategory] = useState('__all__');
  const [pickerBrand, setPickerBrand] = useState('__all__');
  const [pickerProductId, setPickerProductId] = useState('');
  const [pickerQty, setPickerQty] = useState('1');
  const [pickerPrice, setPickerPrice] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const [filter, setFilter] = useState<'all' | 'cash' | 'credit' | 'mobile_money'>('all');
  const [search, setSearch] = useState('');
  const [staffFilter, setStaffFilter] = useState('all');
  const [txPage, setTxPage] = useState(1);
  const TX_PAGE_SIZE = 6;
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const { data: rawProducts = [], loading: prodLoading } = useFetch<ProductItem[]>(
    () => fetch(`${API_URL}/products`, { headers: authHeader() }).then(r => r.json()),
    [user?.id],
  );
  const products = Array.isArray(rawProducts) ? rawProducts : [];

  const { data: rawSales = [], loading: salesLoading, error, reload } = useFetch<SaleItem[]>(
    () => fetch(`${API_URL}/sales`, { headers: authHeader() }).then(r => {
      if (!r.ok) throw new Error('Failed to load sales');
      return r.json();
    }),
    [user?.id],
  );
  const sales = Array.isArray(rawSales) ? rawSales : [];

  // Derive categories from products
  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category ?? 'Uncategorized'))].sort();
    return cats;
  }, [products]);

  const allCategories = ['__all__', ...categories];



  // Products filtered by selected category, brand, and search
  const categoryProducts = useMemo(() => {
    let filtered = products;
    if (pickerCategory !== '__all__') {
      filtered = filtered.filter(p => (p.category ?? 'Uncategorized') === pickerCategory);
    }
    if (pickerBrand !== '__all__') {
      filtered = filtered.filter(p => p.brand === pickerBrand);
    }
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }
    return filtered;
  }, [products, pickerCategory, pickerBrand, productSearch]);

  const handlePickerProduct = (id: string) => {
    setPickerProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) setPickerPrice(String(p.sellingPrice));
  };

  const handleCategoryChange = (cat: string) => {
    setPickerCategory(cat);
    setPickerBrand('__all__');
    setPickerProductId('');
    setPickerPrice('');
    setProductSearch('');
  };

  const handleBrandChange = (brand: string) => {
    setPickerBrand(brand);
    setPickerProductId('');
    setPickerPrice('');
    setProductSearch('');
  };

  const addToCart = () => {
    if (!pickerProductId || !pickerPrice || !pickerQty) { toast.error('Select a product, quantity and price'); return; }
    const product = products.find((p) => p.id === pickerProductId);
    if (!product) return;
    const qty = Number(pickerQty);
    const price = Number(pickerPrice);
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === pickerProductId && c.unitPrice === price);
      if (existing) {
        return prev.map((c) => c.key === existing.key ? { ...c, quantity: c.quantity + qty } : c);
      }
      return [...prev, { key: `${pickerProductId}-${Date.now()}`, productId: pickerProductId, productName: product.name, quantity: qty, unitPrice: price }];
    });
    setPickerProductId('');
    setPickerQty('1');
    setPickerPrice('');
  };

  const removeFromCart = (key: string) => setCart((prev) => prev.filter((c) => c.key !== key));
  const updateCartQty = (key: string, qty: number) => {
    if (qty < 1) { removeFromCart(key); return; }
    setCart((prev) => prev.map((c) => c.key === key ? { ...c, quantity: qty } : c));
  };
  const cartTotal = cart.reduce((sum, c) => sum + c.quantity * c.unitPrice, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    setSubmitting(true);
    try {
      const results = await Promise.allSettled(
        cart.map((item) =>
          fetch(`${API_URL}/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              paymentType: cartPayment,
              customerName: cartCustomer.trim() || 'Walk-in customer',
              userId: user?.id,
              // TODO: Add createdByStaffId once backend field is working
              // createdByStaffId: user?.id,
            }),
          }).then(async (r) => {
            const payload = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(payload.message || 'Failed');
            return payload;
          }),
        ),
      );
      const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      if (failed.length === 0) {
        toast.success(`${succeeded} item${succeeded > 1 ? 's' : ''} sold — ${fmt(cartTotal)}`);
        setCart([]); setCartCustomer(''); setCartPayment('cash');
      } else {
        toast.error(`${succeeded} sold, ${failed.length} failed: ${failed[0].reason?.message}`);
      }
      bustCache('/sales'); bustCache('/products'); bustCache('/dashboard');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSales = useMemo(() => sales.filter((s) => {
    // TODO: Re-enable staff filtering once createdByStaffId is working
    // if (!isOwner(user)) {
    //   if (s.createdByStaffId !== user?.id) return false;
    // }
    
    const matchFilter = filter === 'all' || s.paymentType === filter;
    const matchStaff = staffFilter === 'all' || s.createdByStaffName === staffFilter || s.createdByStaffId === staffFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || [s.product?.name, s.customerName, s.paymentType].some((v) => v?.toLowerCase().includes(q));
    return matchFilter && matchStaff && matchSearch;
  }), [sales, filter, staffFilter, search, user]);

  // Get unique staff names from sales for filter dropdown
  const staffNames = useMemo(() => {
    const names = new Set<string>();
    sales.forEach(s => {
      if (s.createdByStaffName) names.add(s.createdByStaffName);
    });
    return Array.from(names).sort();
  }, [sales]);

  const handleVoid = async (id: string) => {
    if (!voidReason.trim()) { toast.error('Enter a reason for voiding'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/sales/${id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ reason: voidReason }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || 'Failed to void sale');
      toast.success('Sale voided — stock restored');
      setVoidingId(null); setVoidReason('');
      bustCache('/sales'); bustCache('/products'); reload();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Void failed'); }
    finally { setSubmitting(false); }
  };

  const totalTxPages = Math.max(1, Math.ceil(filteredSales.length / TX_PAGE_SIZE));
  const visibleSales = filteredSales.slice((txPage - 1) * TX_PAGE_SIZE, txPage * TX_PAGE_SIZE);
  const loading = prodLoading || salesLoading;
  const completedSales = sales.filter((sale) => sale.status !== 'voided');
  const completedRevenue = completedSales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
  const creditRevenue = completedSales
    .filter((sale) => sale.paymentType === 'credit')
    .reduce((sum, sale) => sum + Number(sale.totalAmount), 0);

  // selected product for stock warning
  const selectedProduct = products.find(p => p.id === pickerProductId);

  return (
    <PageShell title="Sales" description="Create a sale, take payment, and keep track of every transaction.">
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#dfe9df] bg-gradient-to-br from-[#eef7ef] to-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64806c]">Completed transactions</p>
          <p className="mt-2 font-display text-2xl font-semibold text-[#214b32]">{completedSales.length.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500">Voided sales excluded</p>
        </div>
        <div className="rounded-2xl border border-[#e7e8d9] bg-gradient-to-br from-[#faf8ed] to-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#89764b]">Recorded sales value</p>
          <p className="mt-2 font-display text-2xl font-semibold text-slate-900">{fmt(completedRevenue)}</p>
          <p className="mt-1 text-xs text-slate-500">Across all recorded transactions</p>
        </div>
        <div className="rounded-2xl border border-[#e4e6f0] bg-gradient-to-br from-[#f1f3fa] to-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6a708d]">Credit sales value</p>
          <p className="mt-2 font-display text-2xl font-semibold text-slate-900">{fmt(creditRevenue)}</p>
          <p className="mt-1 text-xs text-slate-500">Recorded credit transactions</p>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(390px,.92fr)]">

        {/* ── Cart builder ── */}
        <div className="min-w-0 space-y-5">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-[#e9eee8] bg-gradient-to-r from-[#f4f9f4] to-white px-5 py-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e5f1e7] text-lg font-bold text-[#39815a]" aria-hidden="true">＋</span>
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">Add items</h2>
                <p className="mt-0.5 text-sm text-slate-500">Choose products and set the quantity and price.</p>
              </div>
            </div>
            <div className="space-y-4 p-5">

              {/* Category picker */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Category</label>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map((cat) => (
                    <button key={cat} type="button" onClick={() => handleCategoryChange(cat)}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${pickerCategory === cat ? 'border-[#23845b] bg-[#23845b] text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-[#b8d2bf] hover:bg-[#f5faf5]'}`}>
                      {cat === '__all__' ? `All (${products.length})` : `${cat} (${products.filter(p => (p.category ?? 'Uncategorized') === cat).length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand picker — shown when selected category has brands */}
              {(() => {
                const brandPool = pickerCategory === '__all__'
                  ? products
                  : products.filter(p => (p.category ?? 'Uncategorized') === pickerCategory);
                const brands = [...new Set(brandPool.map(p => p.brand).filter(Boolean) as string[])].sort();
                if (brands.length === 0) return null;
                return (
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Brand</label>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => handleBrandChange('__all__')}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${pickerBrand === '__all__' ? 'border-[#23845b] bg-[#23845b] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#b8d2bf]'}`}>
                        All
                      </button>
                      {brands.map(brand => (
                        <button key={brand} type="button" onClick={() => handleBrandChange(brand)}
                          className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${pickerBrand === brand ? 'border-[#23845b] bg-[#23845b] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#b8d2bf]'}`}>
                          {brand} ({brandPool.filter(p => p.brand === brand).length})
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Product search + select */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Product</label>
                <input
                  type="text"
                  placeholder="Search products…"
                  value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); setPickerProductId(''); setPickerPrice(''); }}
                  className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
                />
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  value={pickerProductId}
                  onChange={(e) => handlePickerProduct(e.target.value)}
                >
                  <option value="">Select a product</option>
                  {categoryProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · stock {p.stockQuantity}{p.stockQuantity === 0 ? ' OUT' : p.lowStockThreshold && p.stockQuantity <= p.lowStockThreshold ? ' LOW' : ''}
                    </option>
                  ))}
                </select>
                {/* Stock warning badge */}
                {selectedProduct && selectedProduct.stockQuantity === 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600">
                    Warning: Out of stock — sale will be blocked
                  </div>
                )}
                {selectedProduct && selectedProduct.stockQuantity > 0 && selectedProduct.lowStockThreshold && selectedProduct.stockQuantity <= selectedProduct.lowStockThreshold && (
                  <div className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-600">
                    Warning: Low stock — only {selectedProduct.stockQuantity} left
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Quantity
                  <input className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm" placeholder="1" type="number" min="1" value={pickerQty} onChange={(e) => setPickerQty(e.target.value)} />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Unit price (UGX)
                  <input className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm" placeholder="0" type="number" value={pickerPrice} onChange={(e) => setPickerPrice(e.target.value)} />
                </label>
              </div>
              <button type="button" onClick={addToCart} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#b8d8c0] bg-[#f2f8f2] px-5 py-2.5 text-sm font-semibold text-[#26764e] transition hover:border-[#87b596] hover:bg-[#e8f3e9]">
                <span aria-hidden="true">＋</span> Add item to cart
              </button>
            </div>
          </div>

          {/* Cart */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e9eee8] px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f4f2e8] text-lg text-[#9a8144]" aria-hidden="true">▤</span>
                <div>
                  <h2 className="font-display text-lg font-semibold text-slate-900">Current sale</h2>
                  <p className="mt-0.5 text-sm text-slate-500">{cart.length} {cart.length === 1 ? 'product' : 'products'} in cart</p>
                </div>
              </div>
              {cart.length > 0 && (
                <button type="button" onClick={() => setCart([])} className="rounded-lg px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-700">Clear cart</button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="m-5 rounded-xl border border-dashed border-[#dce7dc] bg-[#fafcf9] px-5 py-9 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#edf5ed] text-xl text-[#648c6d]" aria-hidden="true">＋</span>
                <p className="mt-3 text-sm font-semibold text-slate-700">Your sale is ready to build</p>
                <p className="mt-1 text-sm text-slate-500">Add a product to get started. It will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2 p-5">
                {cart.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl border border-[#e7ece6] bg-[#fbfcfa] px-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.productName}</p>
                      <p className="mt-1 text-xs text-slate-500">{fmt(item.unitPrice)} each</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" aria-label={`Decrease ${item.productName} quantity`} onClick={() => updateCartQty(item.key, item.quantity - 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-base font-semibold text-slate-600 hover:bg-slate-100">−</button>
                      <span className="min-w-6 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                      <button type="button" aria-label={`Increase ${item.productName} quantity`} onClick={() => updateCartQty(item.key, item.quantity + 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-base font-semibold text-slate-600 hover:bg-slate-100">+</button>
                      <span className="w-24 text-right text-sm font-semibold tabular-nums text-slate-900">{fmt(item.quantity * item.unitPrice)}</span>
                      <button type="button" onClick={() => removeFromCart(item.key)} className="ml-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-700">Remove</button>
                    </div>
                  </div>
                ))}
                <div className="flex items-end justify-between rounded-xl bg-[#f2f7f1] px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#64806c]">Sale total</p>
                    <p className="mt-1 text-xs text-slate-500">{cart.reduce((s, c) => s + c.quantity, 0)} units</p>
                  </div>
                  <span className="font-display text-xl font-semibold tabular-nums text-[#214b32]">{fmt(cartTotal)}</span>
                </div>

              <div className="space-y-4 border-t border-[#e9eee8] px-5 pb-5 pt-4">
                <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Customer name <span className="font-normal text-slate-400">Optional</span>
                  <input className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm" placeholder="Walk-in customer" value={cartCustomer} onChange={(e) => setCartCustomer(e.target.value)} />
                </label>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Payment method</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'cash', label: 'Cash', icon: '●' },
                    { value: 'credit', label: 'Credit', icon: '◷' },
                    { value: 'mobile_money', label: 'Mobile money', icon: '▣' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={cartPayment === opt.value}
                      onClick={() => setCartPayment(opt.value)}
                      className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                        cartPayment === opt.value
                          ? 'border-[#78ad88] bg-[#eff7ef] text-[#26764e] ring-1 ring-[#78ad88]/30'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-[#b8d2bf] hover:bg-[#f8fbf8]'
                      }`}
                    >
                      <span aria-hidden="true">{opt.icon}</span><span>{opt.label}</span>
                    </button>
                  ))}
                </div>
                </div>
                <button type="button" onClick={handleCheckout} disabled={submitting}
                  className="w-full rounded-xl bg-[#23845b] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-green-900/15 transition hover:bg-[#176844] disabled:cursor-wait disabled:opacity-60">
                  {submitting ? 'Processing sale…' : `Complete sale · ${fmt(cartTotal)}`}
                </button>
              </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Sales history ── */}
        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e9eee8] bg-gradient-to-r from-[#f7faf6] to-white px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf1f7] text-lg text-[#587995]" aria-hidden="true">↗</span>
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">Transactions</h2>
                <p className="mt-0.5 text-sm text-slate-500">Search and review sales history</p>
              </div>
            </div>
            <span className="rounded-full bg-[#f0f4ef] px-3 py-1.5 text-xs font-semibold tabular-nums text-slate-600">{filteredSales.length} / {sales.length}</span>
          </div>

          <div className="space-y-4 p-5">
            <input aria-label="Search transactions" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none" placeholder="Search by customer, product or payment…" value={search} onChange={(e) => { setSearch(e.target.value); setTxPage(1); }} />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(['all', 'cash', 'credit', 'mobile_money'] as const).map((f) => (
                <button key={f} type="button" onClick={() => { setFilter(f); setTxPage(1); }}
                  className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition ${filter === f ? 'border-[#23845b] bg-[#23845b] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#b8d2bf] hover:bg-[#f7faf7]'}`}>
                  {f === 'all' && `All (${sales.length})`}
                  {f === 'cash' && `Cash (${sales.filter((s) => s.paymentType === 'cash').length})`}
                  {f === 'credit' && `Credit (${sales.filter((s) => s.paymentType === 'credit').length})`}
                  {f === 'mobile_money' && `Mobile (${sales.filter((s) => s.paymentType === 'mobile_money').length})`}
                </button>
              ))}
            </div>
            {staffNames.length > 0 && (
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Sale by</label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
                  value={staffFilter}
                  onChange={(e) => { setStaffFilter(e.target.value); setTxPage(1); }}
                >
                  <option value="all">All staff ({sales.length})</option>
                  {staffNames.map(name => (
                    <option key={name} value={name}>
                      {name} ({sales.filter(s => s.createdByStaffName === name).length})
                    </option>
                  ))}
                </select>
              </div>
            )}
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
                <div className="space-y-2">
                  {visibleSales.map((sale) => {
                    const isCredit = sale.paymentType === 'credit';
                    const isMobile = sale.paymentType === 'mobile_money';
                    const isVoided = sale.status === 'voided';
                    return (
                      <div key={sale.id} className={`rounded-xl border p-3.5 transition ${isVoided ? 'border-slate-200 bg-slate-100 opacity-60' : 'border-[#e7ece6] bg-white hover:border-[#cbdccb] hover:bg-[#fbfdfb]'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="truncate text-sm font-semibold text-slate-900">{sale.product?.name ?? 'Product'}</p>
                              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${isCredit ? 'bg-amber-50 text-amber-700' : isMobile ? 'bg-blue-50 text-blue-700' : 'bg-[#edf6ee] text-[#28764c]'}`}>
                                {isCredit ? 'Credit' : isMobile ? 'Mobile money' : 'Cash'}
                              </span>
                              {isVoided && <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">Voided</span>}
                            </div>
                            <p className="mt-1.5 text-xs text-slate-600">{sale.quantity} {Number(sale.quantity) === 1 ? 'unit' : 'units'} <span className="mx-1 text-slate-300">·</span> {sale.customerName ?? 'Walk-in customer'}</p>
                            {(sale.createdByStaffName || sale.createdByStaffId) && (
                              <p className="mt-1 text-xs text-slate-500">
                                Sold by {sale.createdByStaffName || `Staff-${sale.createdByStaffId?.slice(0, 8)}`}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-slate-400">{new Date(sale.createdAt).toLocaleString()}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className={`font-display text-base font-semibold tabular-nums ${isVoided ? 'line-through text-slate-400' : 'text-slate-900'}`}>{fmt(sale.totalAmount)}</p>
                            {!isVoided && (
                              <button type="button"
                                onClick={() => { setVoidingId(voidingId === sale.id ? null : sale.id); setVoidReason(''); }}
                                className="mt-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                                Void
                              </button>
                            )}
                          </div>
                        </div>
                        {voidingId === sale.id && (
                          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
                            <input autoFocus type="text" placeholder="Reason for void"
                              className="min-w-40 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                              value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
                            <button type="button" onClick={() => handleVoid(sale.id)} disabled={submitting}
                              className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                              {submitting ? '…' : 'Confirm'}
                            </button>
                            <button type="button" onClick={() => setVoidingId(null)} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700">Cancel</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Pagination */}
                {totalTxPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      {(txPage - 1) * TX_PAGE_SIZE + 1}–{Math.min(txPage * TX_PAGE_SIZE, filteredSales.length)} of {filteredSales.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setTxPage(p => Math.max(1, p - 1))} disabled={txPage === 1}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition">←</button>
                      {Array.from({ length: totalTxPages }, (_, i) => i + 1)
                        .filter(n => n === 1 || n === totalTxPages || Math.abs(n - txPage) <= 1)
                        .reduce<(number | '...')[]>((acc, n, i, arr) => {
                          if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('...');
                          acc.push(n); return acc;
                        }, [])
                        .map((n, i) => n === '...'
                          ? <span key={`e-${i}`} className="px-1 text-xs text-slate-400">…</span>
                          : <button key={n} type="button" onClick={() => setTxPage(n as number)}
                              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${txPage === n ? 'bg-brand-500 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                              {n}
                            </button>
                        )}
                      <button type="button" onClick={() => setTxPage(p => Math.min(totalTxPages, p + 1))} disabled={txPage === totalTxPages}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition">→</button>
                    </div>
                  </div>
                )}
              </>
            )}
        </div>
      </div>
    </PageShell>
  );
}
