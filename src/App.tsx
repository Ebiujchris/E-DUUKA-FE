import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
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
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
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
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
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
