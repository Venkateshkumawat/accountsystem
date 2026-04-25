import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { PermissionRoute } from './components/PermissionGate';
import { NotificationProvider } from './context/NotificationContext';

// Dynamic Node Imports
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const POS = lazy(() => import('./pages/POS'));
const B2BSales = lazy(() => import('./pages/B2BSales'));


const Purchases = lazy(() => import('./pages/Purchases'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Accounting = lazy(() => import('./pages/Accounting'));
const GSTPortal = lazy(() => import('./pages/GSTPortal'));
const Parties = lazy(() => import('./pages/Parties'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Staff = lazy(() => import('./pages/Staff'));
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/Dashboard'));
const UserPlan = lazy(() => import('./pages/superadmin/UserPlan'));
const MasterAccount = lazy(() => import('./pages/superadmin/MasterAccount'));
const AdminSetting = lazy(() => import('./pages/superadmin/AdminSetting'));
const SuperAdminLayout = lazy(() => import('./components/superadmin/SuperAdminLayout'));
const AuditCenter = lazy(() => import('./pages/AuditCenter'));
const SuperAdminLogin = lazy(() => import('./pages/SuperAdminLogin'));
const InvoiceView = lazy(() => import('./pages/InvoiceView'));

const Loader = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-[#E8EDF5] ">
    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Initializing Nexus Protocol...</p>
  </div>
);

const App = () => {
  const [isSunset, setIsSunset] = useState(false);

  // ?? Nexus Sunset Protocol: Automatic theme shift at 5:00 PM (17:00)
  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const sunsetMode = hours >= 17; // 5:00 PM or later

      setIsSunset(sunsetMode);

      if (sunsetMode) {
        document.body.classList.add('nexus-sunset');
        // Injecting dynamic styles for premium evening experience
        document.documentElement.style.setProperty('--nexus-bg', '#0F172A');
        document.documentElement.style.setProperty('--nexus-card', '#1E293B');
        document.documentElement.style.setProperty('--nexus-text', '#F8FAFC');
      } else {
        document.body.classList.remove('nexus-sunset');
        document.documentElement.style.setProperty('--nexus-bg', '#F1F5F9');
        document.documentElement.style.setProperty('--nexus-card', '#FFFFFF');
        document.documentElement.style.setProperty('--nexus-text', '#0F172A');
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationProvider>
      <div className={`${isSunset ? 'dark' : ''} font-sans text-slate-900 bg-slate-50 min-h-screen selection:bg-indigo-100 selection:text-indigo-600 transition-colors duration-700`}>
        <Router>
          <Suspense fallback={<Loader />}>
            <Routes>
              {/* Public Nodes (Open Access) */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/superadmin-login" element={<SuperAdminLogin />} />

              {/* -- SuperAdmin Master Portal (Strict Isolation) -- */}
              <Route
                path="/superadmin"
                element={
                  <ProtectedRoute allowedRoles={['superadmin']} redirectTo="/dashboard">
                    <Suspense fallback={<Loader />}><SuperAdminLayout /></Suspense>
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<SuperAdminDashboard />} />
                <Route path="user-plan" element={<UserPlan />} />
                <Route path="accounts" element={<MasterAccount />} />
                <Route path="settings" element={<AdminSetting />} />
              </Route>

              {/* -- Business Operational Nodes (Authenticated Staff/Admin ONLY) -- */}
              <Route path="/dashboard" element={
                <ProtectedRoute allowedRoles={['businessAdmin', 'manager', 'accountant', 'cashier']} redirectTo="/superadmin">
                  <AppLayout><Dashboard /></AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/pos" element={
                <ProtectedRoute allowedRoles={['businessAdmin', 'manager', 'cashier']} redirectTo="/superadmin">
                  <AppLayout><PermissionRoute permission="POS"><POS /></PermissionRoute></AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/b2b" element={
                <ProtectedRoute allowedRoles={['businessAdmin', 'manager', 'cashier']} redirectTo="/superadmin">
                  <AppLayout><PermissionRoute permission="POS"><B2BSales /></PermissionRoute></AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/purchases" element={
                <ProtectedRoute allowedRoles={['businessAdmin', 'manager', 'accountant']} redirectTo="/superadmin">
                  <AppLayout><PermissionRoute permission="PURCHASES"><Purchases /></PermissionRoute></AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/inventory" element={
                <ProtectedRoute allowedRoles={['businessAdmin', 'manager', 'cashier']} redirectTo="/superadmin">
                  <AppLayout><PermissionRoute permission="INVENTORY"><Inventory /></PermissionRoute></AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/accounting" element={
                <ProtectedRoute allowedRoles={['businessAdmin', 'manager', 'accountant']} redirectTo="/superadmin">
                  <AppLayout><PermissionRoute permission="ACCOUNTING"><Accounting /></PermissionRoute></AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/gst" element={
                <ProtectedRoute allowedRoles={['businessAdmin', 'manager', 'accountant']} redirectTo="/superadmin">
                  <AppLayout><PermissionRoute permission="GST_PORTAL"><GSTPortal /></PermissionRoute></AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/parties" element={
                <ProtectedRoute allowedRoles={['businessAdmin', 'manager', 'accountant', 'cashier']} redirectTo="/superadmin">
                  <AppLayout><PermissionRoute permission="CUSTOMERS"><Parties /></PermissionRoute></AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/staff" element={
                <ProtectedRoute allowedRoles={['businessAdmin', 'manager']} redirectTo="/superadmin">
                  <AppLayout><PermissionRoute permission="STAFF"><Staff /></PermissionRoute></AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/reports" element={
                <ProtectedRoute allowedRoles={['businessAdmin', 'manager', 'accountant']} redirectTo="/superadmin">
                  <AppLayout><PermissionRoute permission="REPORTS"><Reports /></PermissionRoute></AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/audit-center" element={
                <ProtectedRoute allowedRoles={['businessAdmin']} redirectTo="/dashboard">
                  <AppLayout><AuditCenter /></AppLayout>
                </ProtectedRoute>
              } />

              {/* Settings (BusinessAdmin ONLY Protocol) */}
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={['businessAdmin']} redirectTo="/dashboard">
                    <AppLayout><Settings /></AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* Dedicated Finance Auditing */}
              <Route path="/invoice-view/:id" element={
                <ProtectedRoute allowedRoles={['businessAdmin', 'manager', 'accountant', 'cashier']} redirectTo="/superadmin">
                  <InvoiceView />
                </ProtectedRoute>
              } />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </div>
    </NotificationProvider>
  );
};

export default App;
