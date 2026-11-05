import { lazy, Suspense, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const SalesPage = lazy(() => import('./pages/SalesPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const StaffPage = lazy(() => import('./pages/StaffPage'));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const ReceiptsPage = lazy(() => import('./pages/ReceiptsPage'));
const CreditsPage = lazy(() => import('./pages/CreditsPage'));
const RestockPage = lazy(() => import('./pages/RestockPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const BalanceSheetPage = lazy(() => import('./pages/BalanceSheetPage'));
const CashFlowPage = lazy(() => import('./pages/CashFlowPage'));
const IncomeComparisonPage = lazy(() => import('./pages/IncomeComparisonPage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const BrandsPage = lazy(() => import('./pages/BrandsPage'));
const ActivityPage = lazy(() => import('./pages/ActivityPage'));

type RequiredPermission = 'canViewDashboard' | 'canMakeSales' | 'canApproveCredits' | 'canAccessInventory' | 'canManageExpenses' | 'canViewReports';

function ProtectedRoute({ children, requiredPermission }: { children: ReactNode; requiredPermission?: RequiredPermission }) {
  const { isAuthenticated, loading, user, subscriptionExpiredMessage } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="app-loading-mark" role="status" aria-label="Loading">
          <span>e</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (subscriptionExpiredMessage) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-amber-50 px-4 py-10">
          <section className="w-full max-w-xl rounded-3xl border border-amber-200 bg-white p-7 shadow-xl sm:p-9">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Subscription renewal required</p>
            <h1 className="mt-3 text-2xl font-bold text-slate-900">Your shop access is paused</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">{subscriptionExpiredMessage}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">Please arrange payment with your E-Duuka administrator. Access will be restored after your renewal is confirmed.</p>
            <Link to="/" className="mt-6 inline-flex rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700">Back to sign in</Link>
          </section>
        </main>
      );
    }
    return <Navigate to="/" replace />;
  }

  if (requiredPermission && user?.accountType === 'staff') {
    const hasAccess = Boolean(user.permissions?.[requiredPermission]);
    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
            <div className="app-loading-mark app-loading-mark-small" role="status" aria-label="Loading">
              <span>e</span>
            </div>
            Loading E-Duuka…
          </div>
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredPermission="canViewDashboard">
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription"
          element={
            <ProtectedRoute>
              <SubscriptionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/activity"
          element={
            <ProtectedRoute requiredPermission="canViewReports">
              <ActivityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute requiredPermission="canAccessInventory">
              <ProductsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales"
          element={
            <ProtectedRoute requiredPermission="canMakeSales">
              <SalesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute requiredPermission="canViewReports">
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff"
          element={
            <ProtectedRoute>
              <StaffPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/suppliers"
          element={
            <ProtectedRoute>
              <SuppliersPage />
            </ProtectedRoute>
          }
        />
        <Route path="/expenses" element={<ProtectedRoute requiredPermission="canManageExpenses"><ExpensesPage /></ProtectedRoute>} />
        <Route path="/receipts" element={<ProtectedRoute requiredPermission="canMakeSales"><ReceiptsPage /></ProtectedRoute>} />
        <Route path="/credits"  element={<ProtectedRoute requiredPermission="canApproveCredits"><CreditsPage /></ProtectedRoute>} />
        <Route path="/restock"    element={<ProtectedRoute requiredPermission="canAccessInventory"><RestockPage /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute requiredPermission="canAccessInventory"><CategoriesPage /></ProtectedRoute>} />
        <Route path="/brands"     element={<ProtectedRoute requiredPermission="canAccessInventory"><BrandsPage /></ProtectedRoute>} />
        <Route path="/settings"   element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/balance-sheet" element={<ProtectedRoute requiredPermission="canViewReports"><BalanceSheetPage /></ProtectedRoute>} />
        <Route path="/cash-flow" element={<ProtectedRoute requiredPermission="canViewReports"><CashFlowPage /></ProtectedRoute>} />
        <Route path="/income-comparison" element={<ProtectedRoute requiredPermission="canViewReports"><IncomeComparisonPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
