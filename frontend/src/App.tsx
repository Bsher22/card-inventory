// App.tsx
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Package,
  FileSpreadsheet,
  ShoppingCart,
  DollarSign,
  Upload,
  BarChart3,
  Users,
  Send,
  Award,
  Store,
  Trophy,
  ShieldCheck,
  Building2,
  Grid3X3,
} from 'lucide-react';

// Auth
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import UserMenu from './components/UserMenu';
import Login from './pages/Login';

// Pages
import Dashboard from './pages/Dashboard';
import ProductLines from './pages/ProductLines';
import Checklists from './pages/Checklists';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Sales from './pages/Sales';
import ChecklistUpload from './pages/ChecklistUpload';
import Consigners from './pages/Consigners';
import Consignments from './pages/Consignments';
import GradingSubmissions from './pages/GradingSubmissions';
import AuthenticationPage from './pages/AuthenticationPage';
import EbayImport from './pages/EbayImport';
import StandaloneItems from './pages/StandaloneItems';
import Submitters from './pages/Submitters';
import PricingMatrix from './pages/PricingMatrix';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/product-lines', icon: Package, label: 'Product Lines' },
  { to: '/checklists', icon: FileSpreadsheet, label: 'Checklists' },
  { to: '/upload', icon: Upload, label: 'Upload Checklist' },
  { to: '/inventory', icon: BarChart3, label: 'Inventory' },
  { to: '/memorabilia', icon: Trophy, label: 'Memorabilia' },
  { to: '/consigners', icon: Users, label: 'Consigners' },
  { to: '/consignments', icon: Send, label: 'Consignments' },
  { to: '/pricing-matrix', icon: Grid3X3, label: 'Pricing Matrix' },
  { to: '/grading', icon: Award, label: 'Card Grading' },
  { to: '/authentication', icon: ShieldCheck, label: 'Authentication' },
  { to: '/submitters', icon: Building2, label: 'Submitters' },
  { to: '/purchases', icon: ShoppingCart, label: 'Purchases' },
  { to: '/sales', icon: DollarSign, label: 'Sales' },
  { to: '/sales/ebay-import', icon: Store, label: 'eBay Import' },
];

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">⚾</span>
            Card Inventory
          </h1>
          <p className="text-slate-400 text-sm mt-1">Management System</p>
        </div>

        <nav className="mt-6 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white border-r-2 border-blue-500'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Menu in footer */}
        <div className="border-t border-slate-800 p-4">
          <UserMenu />
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen">{children}</main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public route - Login */}
            <Route path="/login" element={<Login />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/product-lines"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ProductLines />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/checklists"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Checklists />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ChecklistUpload />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Inventory />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/memorabilia"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <StandaloneItems />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/consigners"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Consigners />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/consignments"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Consignments />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pricing-matrix"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <PricingMatrix />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/grading"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <GradingSubmissions />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/authentication"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AuthenticationPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/submitters"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Submitters />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchases"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Purchases />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Sales />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales/ebay-import"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <EbayImport />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;