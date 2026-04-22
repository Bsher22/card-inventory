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
  CalendarDays,
  Star,
  Boxes,
  Compass,
  Wrench,
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
import ConsignerDetail from './pages/ConsignerDetail';
import Consignments from './pages/Consignments';
import GradingSubmissions from './pages/GradingSubmissions';
import AuthenticationPage from './pages/AuthenticationPage';
import EbayImport from './pages/EbayImport';
import StandaloneItems from './pages/StandaloneItems';
import Submitters from './pages/Submitters';
import MilbSchedule from './pages/MilbSchedule';
import TopProspects from './pages/TopProspects';
import InventoryHub from './pages/InventoryHub';
import InventoryUpload from './pages/InventoryUpload';
import ConsignmentsHub from './pages/ConsignmentsHub';
import EbayConsigners from './pages/EbayConsigners';
import EbayConsignments from './pages/EbayConsignments';
import EbayConsignmentDetail from './pages/EbayConsignmentDetail';
import EbayPayouts from './pages/EbayPayouts';
import ScoutingHub from './pages/ScoutingHub';
import ServicesHub from './pages/ServicesHub';

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
  { to: '/inventory-hub', icon: Boxes, label: 'Inventory' },
  { to: '/consignments-hub', icon: Send, label: 'Consignments' },
  { to: '/ebay-consignments', icon: Store, label: 'eBay Consign' },
  { to: '/scouting', icon: Compass, label: 'Scouting' },
  { to: '/services', icon: Wrench, label: 'Services' },
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
            {/* Hub pages */}
            <Route
              path="/inventory-hub"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <InventoryHub />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/consignments-hub"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ConsignmentsHub />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/scouting"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ScoutingHub />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/services"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ServicesHub />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Sub-pages */}
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
              path="/inventory-upload"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <InventoryUpload />
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
              path="/consigners/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ConsignerDetail />
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
              path="/milb-schedule"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <MilbSchedule />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/top-prospects"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <TopProspects />
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
            {/* eBay Consignments (3rd-party consignment selling) */}
            <Route
              path="/ebay-consigners"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <EbayConsigners />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ebay-consignments"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <EbayConsignments />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ebay-consignments/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <EbayConsignmentDetail />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ebay-payouts"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <EbayPayouts />
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