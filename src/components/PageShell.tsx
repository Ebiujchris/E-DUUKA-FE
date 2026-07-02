import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PageShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

const navItems = [
  { label: 'Overview', path: '/dashboard' },
  { label: 'Inventory', path: '/products' },
  { label: 'Sales', path: '/sales' },
  { label: 'Reports', path: '/reports' },
  { label: 'Staff', path: '/staff' },
  { label: 'Suppliers', path: '/suppliers' },
  { label: 'Calendar', path: '/calendar' },
];

const salesLinks = [
  { label: 'New sale', path: '/sales' },
  { label: 'Sales history', path: '/sales' },
  { label: 'Receipts', path: '/dashboard' },
];

export default function PageShell({ title, description, children }: PageShellProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_32%),linear-gradient(135deg,_#f8fafc_0%,_#eef4ff_100%)]">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 text-lg font-bold text-white shadow-lg shadow-brand-500/20">
                E
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-slate-900">E-DUUKA</p>
                <p className="text-xs text-slate-500">Merchant workspace</p>
              </div>
            </Link>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-0 py-4 sm:px-0 lg:flex-row lg:px-0">
        <aside className="w-full rounded-none border-b border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur lg:w-72 lg:rounded-r-3xl lg:border-b-0 lg:border-r lg:shadow-none">
          <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 p-4 text-white shadow-lg shadow-brand-500/20">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-100">Store hub</p>
            <p className="mt-2 text-lg font-semibold">Run your shop like a modern retailer.</p>
          </div>

          <div className="mt-4 space-y-3">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <span>{item.label}</span>
              </NavLink>
            ))}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Sales</p>
              <div className="mt-2 space-y-1.5">
                {salesLinks.map((item) => (
                  <NavLink
                    key={item.label}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center rounded-xl px-2.5 py-2 text-sm transition ${
                        isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'
                      }`
                    }
                  >
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 rounded-none border-0 bg-white/90 p-4 shadow-sm backdrop-blur sm:p-6 lg:rounded-l-3xl lg:border-l lg:border-slate-200/80">
          <div className="mb-6 border-b border-slate-200 pb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Web workspace</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-slate-900">{title}</h1>
            {description ? <p className="mt-2 text-slate-600">{description}</p> : null}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
