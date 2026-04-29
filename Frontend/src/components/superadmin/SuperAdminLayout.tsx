import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Search,
  Building2,
  CreditCard,
  Activity
} from 'lucide-react';
import { useNotify } from '../../context/NotificationContext';
import socketService from '../../services/socket';
import api from '../../services/api';

const SuperAdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotify();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socketService.connect();
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const fetchSearchData = useCallback(async () => {
    try {
      const [bizRes, planRes, logRes] = await Promise.all([
        api.get('/superadmin/auth/businesses').catch(() => ({ data: { businesses: [] } })),
        api.get('/superadmin/auth/plans').catch(() => ({ data: { plans: [] } })),
        api.get('/superadmin/auth/logs').catch(() => ({ data: { logs: [] } })),
      ]);
      if (bizRes.data.success) setBusinesses(bizRes.data.businesses);
      if (planRes.data.success) setPlans(planRes.data.plans);
      if (logRes.data.success) setLogs(logRes.data.logs);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchSearchData(); }, [fetchSearchData]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return null;
    return {
      businesses: businesses.filter(b => b.businessName?.toLowerCase().includes(q)).slice(0, 5),
      plans: plans.filter(p => p.name?.toLowerCase().includes(q)).slice(0, 3),
      logs: logs.filter(l => l.description?.toLowerCase().includes(q)).slice(0, 4)
    };
  }, [searchQuery, businesses, plans, logs]);

  const clearSearch = () => { setSearchQuery(''); setShowSearch(false); };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/superadmin/dashboard', icon: LayoutDashboard },
    { name: 'User Plan', path: '/superadmin/user-plan', icon: Users },
    { name: 'Account Center', path: '/superadmin/accounts', icon: ShieldCheck },
    { name: 'Admin Setting', path: '/superadmin/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50/50 overflow-hidden font-inter">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-100 flex flex-col shrink-0 shadow-2xl z-[110] 
        transform transition-transform duration-500 lg:translate-x-0 lg:static lg:w-56 lg:shadow-sm
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <NavLink to="/superadmin/dashboard" className="p-6 pb-4 flex items-center justify-between no-underline">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg font-black text-xl">
              N
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-lg tracking-tight text-slate-900 leading-none">NexusBill</span>
              <span className="text-indigo-600 text-[10px] font-semibold uppercase tracking-widest mt-1">SuperAdmin</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-900">
            <X size={20} />
          </button>
        </NavLink>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-${isActive ? 'semibold' : 'medium'} tracking-wide transition-all
                ${isActive ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}
              `}
            >
              <item.icon size={16} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 hover:text-white hover:bg-rose-500 hover:border-rose-600 transition-all group shadow-sm active:scale-95"
          >
            <span className="group-hover:translate-x-1 transition-transform flex items-center gap-2">
              <LogOut size={14} /> Secure Exit
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-white animate-pulse"></div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-100 flex items-center gap-3 px-3 lg:px-6 shrink-0 z-[100] shadow-sm sticky top-0 transition-all duration-300">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 bg-slate-50 text-slate-500 rounded-xl border border-slate-100 shrink-0"
          >
            <Menu size={18} />
          </button>

          <div className="flex-1 relative" ref={searchRef}>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
                placeholder="Search platform..."
                className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white transition-all"
              />
            </div>

            {showSearch && searchQuery.length >= 2 && searchResults && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 max-h-[400px] overflow-y-auto">
                {searchResults.businesses.map((biz, i) => (
                  <button key={i} onClick={() => { navigate('/superadmin/accounts'); clearSearch(); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center"><Building2 size={14} /></div>
                    <div className="flex-1 text-left"><p className="text-sm font-semibold">{biz.businessName}</p></div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/superadmin/dashboard#global-audit-log')} className="relative p-2 text-slate-400">
              <Bell size={18} />
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />}
            </button>
            <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-semibold text-xs">SA</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar bg-[#F1F5F9]/50 p-4 lg:px-8 lg:py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;
