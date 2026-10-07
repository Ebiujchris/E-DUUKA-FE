import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import SalesPage from './pages/SalesPage';
import ReportsPage from './pages/ReportsPage';
import StaffPage from './pages/StaffPage';
import SuppliersPage from './pages/SuppliersPage';
import ExpensesPage from './pages/ExpensesPage';
import ReceiptsPage from './pages/ReceiptsPage';
import CreditsPage from './pages/CreditsPage';
import RestockPage from './pages/RestockPage';
import SettingsPage from './pages/SettingsPage';
import BalanceSheetPage from './pages/BalanceSheetPage';
import CashFlowPage from './pages/CashFlowPage';
import IncomeComparisonPage from './pages/IncomeComparisonPage';
import CategoriesPage from './pages/CategoriesPage';
import BrandsPage from './pages/BrandsPage';
import ActivityPage from './pages/ActivityPage';

type RequiredPermission = 'canViewDashboard' | 'canMakeSales' | 'canApproveCredits' | 'canAccessInventory' | 'canManageExpenses' | 'canViewReports';

function ProtectedRoute({ children, requiredPermission }: { children: React.ReactNode; requiredPermission?: RequiredPermission }) {
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
  );
}
