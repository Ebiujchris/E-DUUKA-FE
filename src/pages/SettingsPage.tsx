import { useEffect, useState } from 'react';
import PageShell from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { API_URL, authHeader, bustCache } from '../lib/api';

interface ShopInfo {
  id: string;
  name: string;
  location?: string;
  phone?: string | null;
  initialCapital?: number;
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState({ name: user?.name ?? '', email: user?.email ?? '' });
  const [shop, setShop] = useState<ShopInfo | null>(null);

  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingShop, setSavingShop] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [shopDraft, setShopDraft] = useState({ name: '', location: '', phone: '' });
  const [shopLoadError, setShopLoadError] = useState('');

  useEffect(() => {
    if (!user?.shopId) return;
    let active = true;
    setShopLoadError('');
    fetch(`${API_URL}/users/me`, { headers: authHeader() })
      .then(async r => {
        if (!r.ok) throw new Error('Failed to load account and shop details');
        return r.json();
      })
      .then(data => {
        if (!active) return;
        setProfile({ name: data.name ?? '', email: data.email ?? '' });
        if (data.shop) {
          setShop(data.shop);
          setShopDraft({
            name: data.shop.name ?? '',
            location: data.shop.location ?? '',
            phone: data.shop.phone ?? '',
          });
        }
      })
      .catch(err => {
        if (active) {
          const message = err instanceof Error ? err.message : 'Failed to load shop details';
          console.error('Unable to load account and shop details:', err);
          setShopLoadError(message);
        }
      });
    return () => { active = false; };
  }, [user?.id, user?.shopId]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch(`${API_URL}/users/${user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ name: profile.name, email: profile.email || undefined }),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      toast.success('Profile updated');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Update failed'); }
    finally { setSavingProfile(false); }
  };

  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingShop(true);
    try {
      const res = await fetch(`${API_URL}/users/me/shop`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          name: shopDraft.name.trim(),
          location: shopDraft.location.trim(),
          phone: shopDraft.phone.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to update shop details');
      }
      const updatedShop: ShopInfo = await res.json();
      setShop(updatedShop);
      setShopDraft({
        name: updatedShop.name ?? '',
        location: updatedShop.location ?? '',
        phone: updatedShop.phone ?? '',
      });
      bustCache('/users/me');
      await refreshUser();
      toast.success('Shop details updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update shop details');
    } finally {
      setSavingShop(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) { toast.error('New passwords do not match'); return; }
    if (passwords.newPass.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSavingPassword(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.newPass }),
      });
      if (!res.ok) {
        const p = await res.json().catch(() => ({}));
        throw new Error(p.message || 'Failed to change password');
      }
      toast.success('Password changed');
      setPasswords({ current: '', newPass: '', confirm: '' });
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
    finally { setSavingPassword(false); }
  };

  return (
    <PageShell title="Settings" description="Manage your profile, shop details and account security.">
      <div className="max-w-2xl space-y-6">
        {shopLoadError && <p role="alert" className="text-sm text-red-600">{shopLoadError}</p>}

        {/* Profile */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Your profile</h2>
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Full name</label>
              <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Email (optional)</label>
              <input type="email" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                placeholder="your@email.com" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Phone number</label>
              <input className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
                value={user?.phone ?? ''} disabled title="Phone number cannot be changed" />
              <p className="text-xs text-slate-400 mt-1">Phone is used for login and cannot be changed.</p>
            </div>
            <button type="submit" disabled={savingProfile}
              className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-brand-600 transition">
              {savingProfile ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </div>

        {/* Shop details */}
        {shop && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Shop details</h2>
            {(user?.accountType ?? 'owner') === 'owner' ? (
              <form onSubmit={handleSaveShop} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Shop name</label>
                  <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                    value={shopDraft.name} onChange={(e) => setShopDraft({ ...shopDraft, name: e.target.value })} required maxLength={120} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Location</label>
                  <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                    value={shopDraft.location} onChange={(e) => setShopDraft({ ...shopDraft, location: e.target.value })} required maxLength={120} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Shop phone (optional)</label>
                  <input type="tel" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                    value={shopDraft.phone} onChange={(e) => setShopDraft({ ...shopDraft, phone: e.target.value })} maxLength={30} />
                </div>
                {shop.initialCapital != null && Number(shop.initialCapital) > 0 && (
                  <p className="text-sm text-slate-500">
                    Initial capital: <span className="font-medium text-slate-900">UGX {Number(shop.initialCapital).toLocaleString()}</span>
                  </p>
                )}
                <button type="submit" disabled={savingShop}
                  className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-brand-600 transition">
                  {savingShop ? 'Saving…' : 'Save shop details'}
                </button>
              </form>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="font-medium text-slate-900">{shop.name}</p>
                {shop.location && <p className="text-slate-500">{shop.location}</p>}
                {shop.phone && <p className="text-slate-500">{shop.phone}</p>}
                <p className="text-xs text-slate-400 mt-3">Only the shop owner can edit shop details.</p>
              </div>
            )}
          </div>
        )}

        {/* Change password */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Change password</h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Current password</label>
              <input type="password" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">New password</label>
              <input type="password" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                placeholder="Min. 6 characters" value={passwords.newPass} onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Confirm new password</label>
              <input type="password" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} required />
            </div>
            <button type="submit" disabled={savingPassword}
              className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-slate-700 transition">
              {savingPassword ? 'Saving…' : 'Change password'}
            </button>
          </form>
        </div>

        {/* App info */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 space-y-1">
          <p className="font-medium text-slate-700">E-DUUKA Shop Management</p>
          <p className="text-xs mt-2">Shop ID: <span className="font-mono text-xs">{user?.shopId}</span></p>
        </div>
      </div>
    </PageShell>
  );
}
