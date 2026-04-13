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

  // -- Search state --
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // -- Global Socket Connection --
  useEffect(() => {
    socketService.connect();
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Fetch searchable data once on mount
  const fetchSearchData = useCallback(async () => {
    try {
      const [bizRes, planRes, logRes] = await Promise.all([
        api.get('/superadmin/auth/businesses').catch(() => ({ data: { businesses: [] } })),
        api.get('/superadmin/auth/plans').catch(() => ({ data: { plans: [] } })),
        api.get('/superadmin/auth/logs').catch(() => ({ data: { logs: [] } })),
      ]);
      if (bizRes.data.success)  setBusinesses(bizRes.data.businesses);
      if (planRes.data.success) setPlans(planRes.data.plans);
      if (logRes.data.success)  setLogs(logRes.data.logs);
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => { fetchSearchData(); }, [fetchSearchData]);

  // Click outside to close dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filtered search results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return null;

    const bizResults = businesses.filter(b =>
      b.businessName?.toLowerCase().includes(q) ||
      b.businessId?.toLowerCase().includes(q) ||
      b.ownerFullName?.toLowerCase().includes(q) ||
      b.email?.toLowerCase().includes(q) ||
      b.plan?.toLowerCase().includes(q) ||
      b.status?.toLowerCase().includes(q)
    ).slice(0, 5);

    const planResults = plans.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.features?.some((f: string) => f.toLowerCase().includes(q))
    ).slice(0, 3);

    const logResults = logs.filter(l =>
      l.description?.toLowerCase().includes(q) ||
      l.resource?.toLowerCase().includes(q) ||
      l.userName?.toLowerCase().includes(q)
    ).slice(0, 4);

    return { businesses: bizResults, plans: planResults, logs: logResults };
  }, [searchQuery, businesses, plans, logs]);

  const totalResults = searchResults
    ? searchResults.businesses.length + searchResults.plans.length + searchResults.logs.length
    : 0;

  const clearSearch = () => { setSearchQuery(''); setShowSearch(false); };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard',      path: '/superadmin/dashboard', icon: LayoutDashboard },
    { name: 'User & Plan',    path: '/superadmin/user-plan', icon: Users },
    { name: 'Master Account', path: '/superadmin/accounts',  icon: ShieldCheck },
    { name: 'Admin Setting',  path: '/superadmin/settings',  icon: Settings },
  ];


  return (
    <div className="flex h-screen bg-[#F1F5F9] overflow-hidden relative">
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
        <div className="p-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg font-black text-xl">
              N
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-lg tracking-tight text-slate-900 leading-none">
                NexusBill
              </span>
              <span className="text-indigo-600 text-[10px] font-semibold uppercase tracking-widest mt-1">
                SuperAdmin
              </span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-900">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-${isActive ? 'semibold' : 'medium'} tracking-wide transition-all
                ${isActive 
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}
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
            className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-widest text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* ── Top Navbar with Search ── */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center gap-3 px-3 lg:px-6 shrink-0 z-[100] shadow-sm sticky top-0">

          {/* Mobile sidebar toggle */}
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-indigo-50 transition-all border border-slate-100 shrink-0"
          >
            <Menu size={18} />
          </button>

          {/* ── Global Search Bar (fills all available space) ── */}
          <div className="flex-1 relative" ref={searchRef}>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
                onKeyDown={(e) => { if (e.key === 'Escape') clearSearch(); }}
                placeholder="Search businesses, plans, activity logs..."
                className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-all"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* ── Search Results Dropdown ── */}
            {showSearch && searchQuery.length >= 2 && searchResults && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 max-h-[420px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">

                {/* Businesses */}
                {searchResults.businesses.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 sticky top-0">
                      <Building2 size={10} className="text-slate-400" />
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        Businesses ({searchResults.businesses.length})
                      </p>
                    </div>
                    {searchResults.businesses.map((biz, i) => (
                      <button
                        key={i}
                        onClick={() => { navigate('/superadmin/accounts'); clearSearch(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50/50 transition-colors text-left border-b border-slate-50 last:border-0 group"
                      >
                        <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                          <Building2 size={15} className="text-indigo-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{biz.businessName}</p>
                          <p className="text-xs font-medium text-slate-400 truncate capitalize">{biz.plan} plan · {biz.email}</p>
                        </div>
                        <span className={`shrink-0 text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                          biz.status === 'active'    ? 'bg-emerald-50 text-emerald-600' :
                          biz.status === 'suspended' ? 'bg-rose-50 text-rose-600'       : 
                                                       'bg-slate-100 text-slate-500'
                        }`}>{biz.status}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Plans */}
                {searchResults.plans.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 sticky top-0">
                      <CreditCard size={10} className="text-slate-400" />
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        Plans ({searchResults.plans.length})
                      </p>
                    </div>
                    {searchResults.plans.map((plan, i) => (
                      <button
                        key={i}
                        onClick={() => { navigate('/superadmin/user-plan'); clearSearch(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50/50 transition-colors text-left border-b border-slate-50 last:border-0 group"
                      >
                        <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
                          <CreditCard size={15} className="text-amber-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-amber-700 transition-colors capitalize">{plan.name}</p>
                          <p className="text-xs font-medium text-slate-400">₹{plan.priceMonthly}/month · {plan.maxProducts} products · {plan.maxUsers} users</p>
                        </div>
                        <span className="shrink-0 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 uppercase">Plan</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Activity Logs */}
                {searchResults.logs.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 sticky top-0">
                      <Activity size={10} className="text-slate-400" />
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        Activity Logs ({searchResults.logs.length})
                      </p>
                    </div>
                    {searchResults.logs.map((log, i) => (
                      <button
                        key={i}
                        onClick={() => { navigate('/superadmin/dashboard'); clearSearch(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0 group"
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          log.action === 'CREATE' ? 'bg-emerald-50' :
                          log.action === 'DELETE' ? 'bg-rose-50'    : 'bg-indigo-50'
                        }`}>
                          <Activity size={15} className={`${
                            log.action === 'CREATE' ? 'text-emerald-600' :
                            log.action === 'DELETE' ? 'text-rose-600'    : 'text-indigo-600'
                          }`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">{log.description}</p>
                          <p className="text-xs font-medium text-slate-400">{log.userName} · {log.resource}</p>
                        </div>
                        <span className={`shrink-0 text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                          log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-600' :
                          log.action === 'DELETE' ? 'bg-rose-50 text-rose-600'       : 'bg-indigo-50 text-indigo-600'
                        }`}>{log.action}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {totalResults === 0 && (
                  <div className="px-4 py-10 text-center">
                    <Search size={28} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-400">No results for "{searchQuery}"</p>
                    <p className="text-xs font-medium text-slate-300 mt-1">Try a business name, plan name, or log keyword</p>
                  </div>
                )}

                {/* Footer */}
                {totalResults > 0 && (
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-[10px] font-medium text-slate-400">{totalResults} result{totalResults !== 1 ? 's' : ''} found</p>
                    <p className="text-[10px] font-medium text-slate-300">ESC to close</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right Actions ── */}
          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
               <ShieldCheck size={10} className="text-indigo-600" />
               <span className="text-[10px] font-medium uppercase text-slate-500 tracking-widest">Protocol V4.2 Locked</span>
            </div>
            <button onClick={() => navigate('/superadmin/notifications')} className="relative p-2 text-slate-400 hover:text-indigo-600 transition-colors">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full shadow-sm ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 pl-2 lg:pl-4 border-l border-slate-100">
               <div className="hidden lg:block text-right">
                <p className="text-[10px] font-semibold text-slate-900 uppercase">SuperAdmin</p>
                <p className="text-[10px] font-medium text-slate-400 uppercase mt-0.5 tracking-widest">Platform Root</p>
              </div>
              <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-semibold text-xs shrink-0">
                SA
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-[#F1F5F9]/50">
          <div className="px-4 pb-4 lg:px-10 lg:pb-10 pt-4">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;

