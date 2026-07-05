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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

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

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <ProductsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales"
        element={
          <ProtectedRoute>
            <SalesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
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
      <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
      <Route path="/receipts" element={<ProtectedRoute><ReceiptsPage /></ProtectedRoute>} />
      <Route path="/credits"  element={<ProtectedRoute><CreditsPage /></ProtectedRoute>} />
      <Route path="/restock"  element={<ProtectedRoute><RestockPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/balance-sheet" element={<ProtectedRoute><BalanceSheetPage /></ProtectedRoute>} />
      <Route path="/cash-flow" element={<ProtectedRoute><CashFlowPage /></ProtectedRoute>} />
      <Route path="/income-comparison" element={<ProtectedRoute><IncomeComparisonPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
