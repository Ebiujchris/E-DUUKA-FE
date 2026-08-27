import { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PageShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  path: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'group' in entry;
}

const ALL_NAV: NavEntry[] = [
  { label: 'Overview',  path: '/dashboard' },
  { label: 'Sales',     path: '/sales' },
  { label: 'Receipts',  path: '/receipts' },
  { label: 'Credits',   path: '/credits' },
  { label: 'Expenses',  path: '/expenses' },
  {
    group: 'Inventory',
    items: [
      { label: 'Products',   path: '/products' },
      { label: 'Categories', path: '/categories' },
      { label: 'Brands',     path: '/brands' },
      { label: 'Restock',    path: '/restock' },
      { label: 'Suppliers',  path: '/suppliers' },
    ],
  },
  { label: 'Reports', path: '/reports' },
  {
    group: 'Financials',
    items: [
      { label: 'Balance Sheet', path: '/balance-sheet' },
      { label: 'Cash Flow',     path: '/cash-flow' },
      { label: 'Comparison',    path: '/income-comparison' },
    ],
  },
  { label: 'Staff',    path: '/staff' },
  { label: 'Settings', path: '/settings' },
];

const INVENTORY_PATHS = ['/products', '/categories', '/brands', '/restock', '/suppliers'];
const FINANCIAL_PATHS = ['/balance-sheet', '/cash-flow', '/income-comparison'];

export default function PageShell({ title, description, children }: PageShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Inventory:  INVENTORY_PATHS.includes(location.pathname),
    Financials: FINANCIAL_PATHS.includes(location.pathname),
  });
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleGroup = (group: string) =>
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));

  const handleLogout = () => { logout(); navigate('/'); };
  const closeMenu = () => setMenuOpen(false);

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {ALL_NAV.map((entry) => {
        if (isGroup(entry)) {
          const isOpen = !!expandedGroups[entry.group];
          const hasActive = entry.items.some(i => location.pathname === i.path);
          return (
            <div key={entry.group}>
              <button
                type="button"
                onClick={() => toggleGroup(entry.group)}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${
                  hasActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{entry.group}</span>
                <span className={`text-xs transition-transform duration-200 inline-block ${isOpen ? 'rotate-90' : ''}`}>›</span>
              </button>
              {isOpen && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l border-slate-200 pl-3">
                  {entry.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClick}
                      className={({ isActive }) =>
                        `flex items-center rounded-xl px-3 py-2 text-sm font-medium transition ${
                          isActive
                            ? 'bg-brand-50 text-brand-700'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        }
        return (
          <NavLink
            key={entry.path}
            to={entry.path}
            onClick={onClick}
            className={({ isActive }) =>
              `flex items-center rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            {entry.label}
          </NavLink>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_32%),linear-gradient(135deg,_#f8fafc_0%,_#eef4ff_100%)]">

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-base font-bold text-white shadow shadow-brand-500/30">
              E
            </div>
            <div className="hidden sm:block">
              <p className="text-base font-semibold text-slate-900 leading-tight">E-DUUKA</p>
              <p className="text-[10px] text-slate-500 leading-tight">Merchant workspace</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-xs font-medium text-slate-700">{user?.name}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="hidden sm:inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Sign out
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"
              aria-label="Toggle menu"
            >
              {menuOpen
                ? <span className="text-lg leading-none">✕</span>
                : <span className="flex flex-col gap-1 items-center justify-center w-5">
                    <span className="block h-0.5 w-4 bg-slate-600 rounded" />
                    <span className="block h-0.5 w-4 bg-slate-600 rounded" />
                    <span className="block h-0.5 w-4 bg-slate-600 rounded" />
                  </span>
              }
            </button>
          </div>
        </div>
      </header>

      {/* Mobile slide-down nav */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-20 bg-slate-950/40" onClick={closeMenu}>
          <div
            className="absolute top-[57px] left-0 right-0 bg-white border-b border-slate-200 shadow-xl px-4 py-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <NavLinks onClick={closeMenu} />
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex min-h-[calc(100vh-57px)]">

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:w-52 lg:shrink-0 lg:flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur p-4">
          <div className="rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 p-3 text-white shadow shadow-brand-500/20">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-100">Store hub</p>
            <p className="mt-0.5 text-xs font-semibold">Run your shop smartly.</p>
          </div>
          {user?.name && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold text-slate-800 truncate">{user.name}</p>
            </div>
          )}
          <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto">
            <NavLinks />
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 bg-white/90 backdrop-blur p-4 sm:p-6">
          <div className="mb-5 border-b border-slate-200 pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-600">E-DUUKA</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{title}</h1>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
