import { useEffect, useState, useMemo } from 'react';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../lib/api';

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  salary?: number;
  canAccessInventory: boolean;
  canApproveCredits: boolean;
  canViewReports: boolean;
  hireDate?: string;
}

const ROLES = ['cashier', 'manager', 'stock_keeper', 'owner'];

const roleBadge: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  cashier: 'bg-emerald-100 text-emerald-700',
  stock_keeper: 'bg-amber-100 text-amber-700',
};

const statusBadge: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-500',
  on_leave: 'bg-amber-100 text-amber-700',
};

export default function StaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', phone: '', role: 'cashier', salary: '',
    canAccessInventory: true, canApproveCredits: false, canViewReports: false,
  });

  const authHeader = { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` };

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/staff`, { headers: authHeader });
      if (!res.ok) throw new Error('Failed to load staff');
      const data = await res.json();
      setStaff(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setMessage(null);
    try {
      const res = await fetch(`${API_URL}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ ...form, salary: form.salary ? Number(form.salary) : undefined }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || 'Failed to add staff');
      setMessage(`Added ${payload.name}`);
      setForm({ name: '', phone: '', role: 'cashier', salary: '', canAccessInventory: true, canApproveCredits: false, canViewReports: false });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add staff');
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this staff member?')) return;
    try {
      await fetch(`${API_URL}/staff/${id}`, { method: 'DELETE', headers: authHeader });
      await load();
    } catch {
      setError('Failed to remove staff member');
    }
  };

  const filtered = useMemo(() => staff.filter((s) => {
    const matchRole = roleFilter === 'all' || s.role === roleFilter;
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search);
    return matchRole && matchSearch;
  }), [staff, search, roleFilter]);

  return (
    <PageShell title="Staff" description="Manage your team, roles and access permissions.">
      <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
        {/* Add staff form */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Add staff member</h2>
          <div className="mt-4 space-y-3">
            <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
              </select>
              <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2" placeholder="Monthly salary (UGX)" type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Permissions</p>
              {[
                { key: 'canAccessInventory', label: 'Access inventory' },
                { key: 'canApproveCredits', label: 'Approve credits' },
                { key: 'canViewReports', label: 'View reports' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form[key as keyof typeof form] as boolean} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="rounded" />
                  {label}
                </label>
              ))}
            </div>
            <button className="rounded-xl bg-brand-500 px-4 py-2.5 font-semibold text-white" type="submit">Add staff</button>
          </div>
          {message && <p className="mt-4 text-sm text-emerald-600">{message}</p>}
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </form>

        {/* Staff list */}
        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Team</h2>
            <span className="text-sm text-slate-500">{filtered.length} of {staff.length} members</span>
          </div>
          <div className="mt-4 space-y-3">
            <input type="text" placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none" />
            <div className="flex flex-wrap gap-2">
              {(['all', ...ROLES]).map((r) => (
                <button key={r} type="button" onClick={() => setRoleFilter(r)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${roleFilter === r ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {r === 'all' ? `All (${staff.length})` : r.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">Loading staff...</div>
          ) : filtered.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
              {staff.length === 0 ? 'No staff added yet.' : 'No staff match your filters.'}
            </div>
          ) : (
            <div className="mt-4 max-h-[480px] overflow-y-auto space-y-2 pr-1">
              {filtered.map((member) => (
                <div key={member.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-slate-900">{member.name}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge[member.role] ?? 'bg-slate-100 text-slate-600'}`}>{member.role.replace('_', ' ')}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[member.status] ?? 'bg-slate-100 text-slate-500'}`}>{member.status.replace('_', ' ')}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{member.phone}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {member.canAccessInventory && <span className="text-xs text-slate-400">📦 Inventory</span>}
                        {member.canApproveCredits && <span className="text-xs text-slate-400">✅ Credits</span>}
                        {member.canViewReports && <span className="text-xs text-slate-400">📊 Reports</span>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {member.salary ? <p className="text-sm font-semibold text-slate-900">UGX {Number(member.salary).toLocaleString()}</p> : null}
                      <button type="button" onClick={() => handleRemove(member.id)} className="mt-1 text-xs text-red-400 hover:text-red-600">Remove</button>
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
