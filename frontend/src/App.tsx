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
  Award
} from 'lucide-react';

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
  { to: '/consigners', icon: Users, label: 'Consigners' },
  { to: '/consignments', icon: Send, label: 'Consignments' },
  { to: '/grading', icon: Award, label: 'PSA Submissions' },
  { to: '/purchases', icon: ShoppingCart, label: 'Purchases' },
  { to: '/sales', icon: DollarSign, label: 'Sales' },
];

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          {/* Sidebar */}
          <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 text-white">
            <div className="p-6">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <span className="text-2xl">⚾</span>
                Card Inventory
              </h1>
              <p className="text-slate-400 text-sm mt-1">Management System</p>
            </div>
            
            <nav className="mt-6">
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
            
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
              <div className="text-xs text-slate-500">
                <p>Topps • Bowman</p>
                <p className="mt-1">v1.0.0</p>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="ml-64 min-h-screen">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/product-lines" element={<ProductLines />} />
              <Route path="/checklists" element={<Checklists />} />
              <Route path="/upload" element={<ChecklistUpload />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/consigners" element={<Consigners />} />
              <Route path="/consignments" element={<Consignments />} />
              <Route path="/grading" element={<GradingSubmissions />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/sales" element={<Sales />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
