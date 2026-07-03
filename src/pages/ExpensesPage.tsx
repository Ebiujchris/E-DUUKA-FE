import { useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { SkeletonList } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { useFetch } from '../hooks/useFetch';
import { API_URL, authHeader, bustCache } from '../lib/api';

interface Expense {
  id: string;
  category: string;
  amount: number;
  description?: string;
  supplier?: string;
  expenseDate: string;
}

const CATEGORIES = [
  'rent', 'electricity', 'water', 'internet', 'utilities',
  'transport', 'fuel', 'stock_purchase', 'stock_loss',
  'salaries', 'casual_labour', 'taxes', 'repairs',
  'advertising', 'miscellaneous',
];

const fmt = (n: number) => `UGX ${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function ExpensesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [form, setForm] = useState({
    category: 'rent',
    amount: '',
    description: '',
    supplier: '',
    expenseDate: new Date().toISOString().split('T')[0],
  });

  const { data: expenses = [], loading, error, reload } = useFetch<Expense[]>(
    () => fetch(`${API_URL}/expenses`, { headers: authHeader() }).then((r) => {
      if (!r.ok) throw new Error('Failed to load expenses');
      return r.json();
    }),
    [user?.id],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount) { toast.error('Enter an amount'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          category: form.category,
          amount: Number(form.amount),
          description: form.description || undefined,
          supplier: form.supplier || undefined,
          expenseDate: form.expenseDate,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(Array.isArray(payload.message) ? payload.message[0] : payload.message || 'Failed');
      toast.success('Expense recorded');
      bustCache('/expenses');
      bustCache('/dashboard');
      setForm({ category: 'rent', amount: '', description: '', supplier: '', expenseDate: new Date().toISOString().split('T')[0] });
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await fetch(`${API_URL}/expenses/${id}`, { method: 'DELETE', headers: authHeader() });
      toast.success('Expense deleted');
      reload();
    } catch { toast.error('Failed to delete'); }
  };

  const filtered = useMemo(() => expenses.filter((e) => {
    const matchCat = catFilter === 'all' || e.category === catFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || (e.description ?? '').toLowerCase().includes(q) || (e.supplier ?? '').toLowerCase().includes(q) || e.category.includes(q);
    return matchCat && matchSearch;
  }), [expenses, catFilter, search]);

  const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const totalAll = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <PageShell title="Expenses" description="Track all business costs — rent, stock, salaries, utilities and more.">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-center">

        {/* Form */}
        <div className="w-full lg:w-[400px] lg:shrink-0">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Record expense</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</option>)}
              </select>
              <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Amount (UGX)" type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Supplier / paid to (optional)" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
              <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
              <button type="submit" disabled={submitting} className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {submitting ? 'Saving…' : 'Save expense'}
              </button>
            </form>
          </div>

          {/* Summary */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total recorded</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{fmt(totalAll)}</p>
          </div>
        </div>

        {/* List */}
        <div className="rounded-2xl border border-slate-200 p-5 w-full lg:max-w-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">All expenses</h2>
            <span className="text-sm text-slate-500">{fmt(totalFiltered)} · {filtered.length} entries</span>
          </div>

          <div className="mt-4 space-y-3">
            <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none" placeholder="Search description or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setCatFilter('all')} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${catFilter === 'all' ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                All ({expenses.length})
              </button>
              {CATEGORIES.filter((c) => expenses.some((e) => e.category === c)).map((c) => (
                <button key={c} type="button" onClick={() => setCatFilter(c)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${catFilter === c ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {c.replace(/_/g, ' ')}
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
            ) : filtered.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
                {expenses.length === 0 ? 'No expenses yet.' : 'No expenses match filters.'}
              </div>
            ) : (
              <div className="mt-4 max-h-[520px] overflow-y-auto space-y-2 pr-1">
                {filtered.map((e) => (
                  <div key={e.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 capitalize">
                            {e.category.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {e.description && <p className="mt-0.5 text-sm text-slate-700">{e.description}</p>}
                        {e.supplier && <p className="text-xs text-slate-400">{e.supplier}</p>}
                        <p className="text-xs text-slate-400">{new Date(e.expenseDate).toLocaleDateString()}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold text-red-600">{fmt(e.amount)}</p>
                        <button type="button" onClick={() => handleDelete(e.id)} className="mt-1 text-xs text-slate-400 hover:text-red-500">Delete</button>
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
