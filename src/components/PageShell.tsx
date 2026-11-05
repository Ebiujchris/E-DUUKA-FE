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
  icon?: string;
}

interface NavGroup {
  group: string;
  icon: string;
  items: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'group' in entry;
}

const ALL_NAV: NavEntry[] = [
  { label: 'Overview',  path: '/dashboard', icon: '◫' },
  { label: 'Subscription', path: '/subscription', icon: '◇' },
  { label: 'Sales',     path: '/sales', icon: '↗' },
  { label: 'Receipts',  path: '/receipts', icon: '▤' },
  { label: 'Credits',   path: '/credits', icon: '◷' },
  { label: 'Expenses',  path: '/expenses', icon: '−' },
  {
    group: 'Inventory',
    icon: '▦',
    items: [
      { label: 'Products',   path: '/products', icon: '□' },
      { label: 'Categories', path: '/categories', icon: '▧' },
      { label: 'Brands',     path: '/brands', icon: '◇' },
      { label: 'Restock',    path: '/restock', icon: '↻' },
      { label: 'Suppliers',  path: '/suppliers', icon: '♧' },
    ],
  },
  { label: 'Reports', path: '/reports', icon: '▥' },
  { label: 'Activity', path: '/activity', icon: '⌁' },
  {
    group: 'Financials',
    icon: '◉',
    items: [
      { label: 'Balance Sheet', path: '/balance-sheet', icon: '▤' },
      { label: 'Cash Flow',     path: '/cash-flow', icon: '↗' },
      { label: 'Comparison',    path: '/income-comparison', icon: '⇄' },
    ],
  },
  { label: 'Staff',    path: '/staff', icon: '♙' },
  { label: 'Settings', path: '/settings', icon: '⚙' },
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
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-[15px] font-semibold transition ${
                  hasActive
                    ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-100'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <span className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-base text-slate-600">{entry.icon}</span>{entry.group}</span>
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
                        `flex items-center rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
                          isActive
                            ? 'bg-brand-50 font-semibold text-brand-800 ring-1 ring-brand-100'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                        }`
                      }
                    >
                      <span className="mr-3 w-5 text-center text-base text-brand-600">{item.icon}</span>{item.label}
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
              `flex items-center rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
                isActive
                  ? 'bg-brand-50 font-semibold text-brand-800 ring-1 ring-brand-100'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
              }`
            }
          >
            <span className="mr-3 grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-base text-brand-700">{entry.icon}</span>{entry.label}
          </NavLink>
        );
      })}
    </>
  );

  return (
    <div className="workspace-shell min-h-screen bg-[#f4f7f3]">

      {/* Header */}
      <header className="workspace-topbar sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[68px] w-full max-w-[1800px] items-center justify-between px-4 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px_14px_14px_5px] bg-[#23845b] font-display text-xl font-semibold text-white shadow-md shadow-green-900/15">
              e
            </div>
            <div className="hidden sm:block">
              <p className="font-display text-base font-semibold leading-tight tracking-tight text-slate-900">E-DUUKA</p>
              <p className="mt-0.5 text-xs leading-tight text-slate-500">Business workspace</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <div className="mr-2 hidden items-center gap-2.5 sm:flex">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e8f2e9] text-sm font-bold text-[#26764e]">
                {user?.name?.trim().charAt(0).toUpperCase() || 'U'}
              </span>
              <span className="max-w-44 truncate text-sm font-semibold text-slate-700">{user?.name}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#c7dccb] hover:bg-[#f5faf5] hover:text-[#26764e] sm:inline-flex"
            >
              Sign out
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-workspace-navigation"
            >
              {menuOpen
                ? <span className="text-xl leading-none" aria-hidden="true">×</span>
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
            id="mobile-workspace-navigation"
            className="absolute left-0 right-0 top-[68px] max-h-[calc(100vh-68px)] overflow-y-auto border-b border-slate-200 bg-white px-4 py-4 shadow-xl"
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
      <div className="mx-auto flex min-h-[calc(100vh-68px)] max-w-[1800px]">

        {/* Desktop sidebar */}
        <aside className="workspace-sidebar sticky top-[68px] hidden h-[calc(100vh-68px)] w-[272px] shrink-0 flex-col border-r border-slate-200/80 bg-white/90 p-4 backdrop-blur lg:flex">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#286e4a] via-[#23845b] to-[#176844] p-4 text-white shadow-lg shadow-green-950/10">
            <div className="pointer-events-none absolute -right-7 -top-8 h-24 w-24 rounded-full border border-white/15 shadow-[0_0_0_14px_rgba(255,255,255,0.05)]" />
            <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-green-100">Store hub</p>
            <p className="relative mt-2 text-sm font-semibold">Run your business smartly.</p>
          </div>
          {user?.name && (
            <div className="mt-3 rounded-xl border border-[#e5ece4] bg-[#f8faf7] px-3 py-2.5">
              <p className="text-[11px] font-medium text-slate-500">Signed in as</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{user.name}</p>
            </div>
          )}
          <nav aria-label="Main navigation" className="mt-3 flex-1 space-y-1 overflow-y-auto pb-2">
            <NavLinks />
          </nav>
        </aside>

        {/* Main content */}
        <main className="workspace-main min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="workspace-page-heading mb-6 border-b border-[#e4eae3] pb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#39815a]">Your workspace</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-[#17241d]">{title}</h1>
            {description && <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>}
          </div>
          <div className="workspace-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
