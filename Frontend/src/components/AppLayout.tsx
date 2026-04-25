import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// Hook registry: added useMemo for performance optimization
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, FileText, Package, Archive,
  BookOpen, Receipt, Users, BarChart2, LogOut,
  Menu, X, Shield, AlertTriangle, ArrowRight, Cog, Bell,
  Package2, Search as SearchIcon
} from 'lucide-react';
import api from '../services/api';
import socketService from '../services/socket';
import { useAuth } from '../hooks/useAuth';
import { useNotify } from '../context/NotificationContext';
import { IndianRupee, CreditCard, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AppLayoutProps { children?: React.ReactNode; }

interface SuggestionItem {
  type: 'invoice' | 'product' | 'party';
  id: string;
  label: string;
  sub: string;
  path: string;
}

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['businessAdmin', 'manager', 'accountant', 'cashier'], permission: null },
  { label: 'POS Terminal', path: '/pos', icon: ShoppingCart, roles: ['businessAdmin', 'manager', 'cashier'], permission: 'POS' },
  { label: 'B2B Sales', path: '/b2b', icon: Receipt, roles: ['businessAdmin', 'manager', 'cashier'], permission: 'POS' },
  { label: 'Purchases', path: '/purchases', icon: Archive, roles: ['businessAdmin', 'manager', 'accountant'], permission: 'PURCHASES' },
  { label: 'Inventory', path: '/inventory', icon: Package, roles: ['businessAdmin', 'manager', 'cashier'], permission: 'INVENTORY' },
  { label: 'Accounting', path: '/accounting', icon: BookOpen, roles: ['businessAdmin', 'manager', 'accountant'], permission: 'ACCOUNTING' },
  { label: 'Parties', path: '/parties', icon: Users, roles: ['businessAdmin', 'manager', 'accountant', 'cashier'], permission: 'CUSTOMERS' },
  { label: 'Staff Node', path: '/staff', icon: Users, roles: ['businessAdmin', 'manager'], permission: 'STAFF' },
  { label: 'GST Portal', path: '/gst', icon: Shield, roles: ['businessAdmin', 'manager', 'accountant'], permission: 'GST_PORTAL' },
  { label: 'REPORTS', path: '/reports', icon: BarChart2, roles: ['businessAdmin', 'manager', 'accountant'], permission: 'REPORTS' },
  { label: 'Message Center', path: '/audit-center', icon: Shield, roles: ['businessAdmin'], permission: null },
  { label: 'Settings', path: '/settings', icon: Cog, roles: ['businessAdmin'], permission: null },
];

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasPermission, isBusinessAdmin } = useAuth();
  const { unreadCount } = useNotify();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [planStatus, setPlanStatus] = useState<any>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Global Socket Connection ──
  useEffect(() => {
    socketService.connect();
  }, []);

  // ── Global Search ──────────────────────────────────────────────────────────
  const [searchQ, setSearchQ] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showSug, setShowSug] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { 
    // Only auto-close sidebar on mobile/tablet when navigation occurs
    if (window.innerWidth <= 1024) {
      setIsSidebarOpen(false); 
    }
  }, [location.pathname]);

  // Fetch plan status for businessAdmin once or when specifically needed
  useEffect(() => {
    if (isBusinessAdmin && !planStatus) {
      api.get('/businesses/plan-status')
        .then(res => setPlanStatus(res.data))
        .catch(() => {});
    }
  }, [isBusinessAdmin, planStatus]);


  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSug(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); setShowSug(false); return; }
    try {
      const [prodRes, invRes] = await Promise.all([
        api.get(`/products?name=${q}&limit=4`).catch(() => ({ data: { data: [] } })),
        api.get(`/invoices?search=${q}&limit=4`).catch(() => ({ data: { data: [] } })),
      ]);
      const products: SuggestionItem[] = (prodRes.data?.data || []).map((p: any) => ({
        type: 'product' as const,
        id: p._id,
        label: p.name,
        sub: `₹${p.sellingPrice} · Stock: ${p.stock}`,
        path: '/inventory'
      }));
      const invoices: SuggestionItem[] = (invRes.data?.data || []).map((inv: any) => ({
        type: 'invoice' as const,
        id: inv._id,
        label: inv.invoiceNumber,
        sub: `${inv.customerName || 'Walk-in'} · ₹${inv.grandTotal}`,
        path: '/b2b'
      }));
      const all = [...products, ...invoices].slice(0, 8);
      setSuggestions(all);
      setShowSug(all.length > 0);
    } catch { setSuggestions([]); }
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQ(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
    if (val.length >= 2) setShowSug(true); else setShowSug(false);
  };

  const handleSuggestionClick = (item: SuggestionItem) => {
    setSearchQ('');
    setShowSug(false);
    navigate(item.path);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const visibleNavItems = useMemo(() => NAV_ITEMS.filter(item => {
    if (item.roles !== null) {
      if (isBusinessAdmin && item.roles.includes('businessAdmin')) return true;
      if (user?.role && item.roles.includes(user.role)) return true;
      return false;
    }
    if (item.permission !== null) {
        if (isBusinessAdmin) return true;
        return hasPermission(item.permission);
    }
    return true; 
  }), [isBusinessAdmin, user, hasPermission]);

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'BB';

  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-white select-none ">
      {/* ── MOBILE BACKDROP ────────────────────────────────────────────────── */}
      {(isSidebarOpen || isMobileSearchOpen) && (
        <div 
          className="fixed inset-0 z-[100] animate-in fade-in duration-300 pointer-events-auto lg:hidden"
          onClick={() => { if (window.innerWidth <= 1024) { setIsSidebarOpen(false); setIsMobileSearchOpen(false); } }}
        />
      )}

      {/* ── SIDEBAR ────────────────────────────────────────────────────────── */}
      <aside 
        className={`fixed inset-y-0 left-0 w-[280px] bg-white border-r border-slate-100 z-[200] transform transition-transform duration-500 ${
          isSidebarOpen ? 'translate-x-0 lg:static lg:block' : '-translate-x-full lg:hidden'
        }`}
      >
        <div className="h-full flex flex-col overflow-hidden">
          <div className="h-[64px] px-6 flex items-center justify-between border-b border-slate-100 shrink-0">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <span className="text-xl font-black">N</span>
              </div>
              <span className="text-xl font-semibold tracking-tight text-slate-900">
                NexusBill
              </span>
            </Link>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-900">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto sidebar-scrollbar scroll-smooth">
            {visibleNavItems.map((item, idx) => (
              <SidebarItem 
                key={idx} 
                item={item} 
                isActive={location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))} 
                onClick={() => {
                  if (window.innerWidth <= 1024) {
                    setIsSidebarOpen(false);
                  }
                }}
              />
            ))}
          </nav>

          <div className="p-4 shrink-0 mt-auto border-t border-slate-50">
            <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 transition-all hover:border-indigo-100">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center font-semibold text-xs text-indigo-600 shrink-0">
                {getInitials(user?.name || 'BB')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name || 'Admin User'}</p>
                <p className="text-[10px] font-semibold text-slate-500 truncate uppercase tracking-widest">{user?.role || 'Authority'}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── CORE VIEWPORT ────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-slate-50/50">
        <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
          <header className="h-16 bg-white flex items-center justify-between px-4 lg:px-8 border-b border-slate-100 z-[120] sticky top-0">
            <div className="flex items-center gap-3 flex-1">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-all focus:outline-none"
              >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <button 
                onClick={() => setIsMobileSearchOpen(true)} 
                className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
              >
                <SearchIcon size={18} />
              </button>
            
              {/* Search Protocol */}
              <div className={`
                fixed lg:relative inset-x-0 top-0 p-3 lg:p-0 bg-white lg:bg-transparent border-b border-slate-100 lg:border-none
                flex-1 max-w-sm transition-all duration-300 z-50
                ${isMobileSearchOpen ? 'translate-y-0 opacity-100' : '-translate-y-full lg:translate-y-0 opacity-0 lg:opacity-100 pointer-events-none lg:pointer-events-auto'}
              `} ref={searchRef}>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Search node repository..."
                    className="w-full pl-10 h-11 bg-slate-50 border-none rounded-2xl text-sm font-normal text-slate-600 focus:bg-white focus:ring-4 focus:ring-slate-100 transition-all placeholder:text-slate-300"
                    value={searchQ}
                    onChange={handleSearch}
                    onFocus={() => searchQ.length >= 2 && setShowSug(true)}
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300">
                    <SearchIcon size={16} />
                  </div>
                  
                  {isMobileSearchOpen && (
                    <button 
                      onClick={() => setIsMobileSearchOpen(false)}
                      className="lg:hidden absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-500"
                    >
                      <X size={18} />
                    </button>
                  )}
                  
                  {showSug && suggestions.length > 0 && (
                    <div className="absolute top-full mt-2 w-full bg-white rounded-[1.5rem] shadow-2xl border border-slate-200 overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-300">
                      <div className="p-3 bg-slate-50 border-b border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <BarChart2 size={10} /> Sync Recommendations
                        </p>
                      </div>
                      <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                        {suggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => handleSuggestionClick(s)}
                            className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group border-b border-slate-50 last:border-0"
                          >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              s.type === 'product' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              {s.type === 'product' ? <Package size={16} /> : <Receipt size={16} />}
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <p className="text-[13px] font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase truncate">{s.label}</p>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">{s.sub}</p>
                            </div>
                            <ArrowRight size={14} className="ml-auto text-slate-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 lg:gap-5">
              <Link to="/audit-center" className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all relative">
                 <Bell size={20} />
                 {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] font-black text-white animate-in zoom-in-50 duration-300 shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                 )}
              </Link>
              <div className="hidden sm:flex flex-col items-end">
                 <span className="text-sm font-semibold text-slate-900 max-w-[150px] truncate">{user?.businessName || 'Nexus Node'}</span>
                 <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none font-inter">Verified GST</span>
              </div>
            </div>
          </header>

          <div className="pt-0 pb-6 px-4 lg:px-8 relative">
            {isBusinessAdmin && location.pathname === '/dashboard' && planStatus && (planStatus.isNearExpiry || planStatus.status === 'expired') && (
              <div className={`mb-4 p-3.5 rounded-2xl border flex items-center gap-4 animate-in slide-in-from-top-4 duration-500 shadow-sm ${
                planStatus.status === 'expired' ? 'bg-rose-600 border-rose-500 text-white' : 'bg-amber-400 border-amber-300 text-slate-900'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  planStatus.status === 'expired' ? 'bg-white/20' : 'bg-black/10'
                }`}>
                  <AlertTriangle size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold uppercase tracking-tight leading-none truncate">
                    {planStatus.status === 'expired' ? 'Infrastructure Suspended' : 'Subscription Ending Soon'}
                  </h3>
                  <p className="text-[10px] font-semibold opacity-90 mt-1 truncate">
                    {planStatus.status === 'expired' 
                      ? 'Critical failure: Nexus protocol halted. Restore billing to resume operations.'
                      : `Sync anomaly: Your plan expires in ${planStatus.remainingDays} days. Visit settings to renew.`
                    }
                  </p>
                </div>
                <Link 
                  to="/settings" 
                  className={`px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-sm shrink-0 ${
                    planStatus.status === 'expired' ? 'bg-white text-rose-600' : 'bg-slate-900 text-white'
                  }`}
                >
                  Configure
                </Link>
              </div>
            )}
            
            <div className="relative">
               {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const SidebarItem = React.memo(({ item, isActive, onClick }: { item: any, isActive: boolean, onClick: () => void }) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative ${
        isActive 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <Icon size={18} className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
      <span className={`text-[13px] font-${isActive ? 'bold' : 'semibold'} uppercase tracking-tight font-inter`}>{item.label}</span>
      {isActive && (
        <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
      )}
    </Link>
  );
});

