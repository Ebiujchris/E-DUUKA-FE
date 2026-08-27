import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal, { type AuthMode } from '../components/AuthModal';

export default function LandingPage() {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const handleAuthSuccess = () => {
    setAuthOpen(false);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafa 50%, #f0fdf4 100%)' }}>
      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/60 bg-white/70 backdrop-blur-md">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-base font-bold tracking-tight text-slate-900">E-DUUKA</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition shadow-sm shadow-brand-500/30"
            >
              Get started
            </button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 pt-32 pb-20 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-500/10 border border-brand-500/20 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          <span className="text-xs font-semibold text-brand-600 tracking-wide">Shop management · Uganda</span>
        </div>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          Run your shop.<br />
          <span className="text-brand-500">Know your numbers.</span>
        </h1>
        <p className="mt-6 max-w-lg text-lg text-slate-500 leading-relaxed">
          Inventory, sales, credits, and reports — all in one place. Built for small retail businesses.
        </p>
        <div className="mt-10">
          <button
            type="button"
            onClick={() => openAuth('login')}
            className="rounded-xl bg-brand-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600 transition"
          >
            Sign in to your shop
          </button>
        </div>
      </main>

      {/* Features */}
      <section className="py-14 px-6">
        <div className="mx-auto max-w-4xl grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: '📦', label: 'Inventory', text: 'Track stock in real time', color: 'bg-blue-50 border-blue-100' },
            { icon: '💰', label: 'Sales', text: 'Record and monitor profit', color: 'bg-emerald-50 border-emerald-100' },
            { icon: '📋', label: 'Credits', text: 'Manage customer debts', color: 'bg-amber-50 border-amber-100' },
            { icon: '📊', label: 'Reports', text: 'Insights to grow your shop', color: 'bg-purple-50 border-purple-100' },
          ].map((f) => (
            <div key={f.label} className={`rounded-2xl border p-5 ${f.color} transition hover:scale-[1.02]`}>
              <div className="mb-3 text-2xl">{f.icon}</div>
              <p className="text-sm font-semibold text-slate-800">{f.label}</p>
              <p className="mt-1 text-xs text-slate-500">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 text-center">
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} E-DUUKA</p>
      </footer>

      <AuthModal
        isOpen={authOpen}
        mode={authMode}
        onClose={() => setAuthOpen(false)}
        onModeChange={setAuthMode}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
