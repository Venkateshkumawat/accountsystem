import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, FileText, Package, Archive,
  BookOpen, Receipt, Users, BarChart2, LogOut,
  Menu, X, Shield, AlertTriangle, ArrowRight, Cog, Bell
} from 'lucide-react';
import api from '../services/api';
import socketService from '../services/socket';
import { useAuth } from '../hooks/useAuth';
import NotificationCenter from './NotificationCenter';

interface AppLayoutProps { children?: React.ReactNode; }

interface SuggestionItem {
  type: 'invoice' | 'product' | 'staff';
  id: string;
  label: string;
  sub: string;
  path: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasPermission, isBusinessAdmin } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [planStatus, setPlanStatus] = useState<any>(null);

  // ── Global Socket Connection ──
  useEffect(() => {
    socketService.connect();
    // Re-connect on user change? Handled by connect() check.
  }, []);

  // ── Global Search ──────────────────────────────────────────────────────────
  const [searchQ, setSearchQ] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showSug, setShowSug] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  useEffect(() => { setIsSidebarOpen(false); }, [location.pathname]);

  // Fetch plan status for businessAdmin
  useEffect(() => {
    if (isBusinessAdmin) {
      api.get('/businesses/plan-status')
        .then(res => setPlanStatus(res.data))
        .catch(() => {});
    }
  }, [isBusinessAdmin, location.pathname]);

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

  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard, permission: null,        roles: null },
    { id: 'pos',       path: '/pos',       label: 'POS Billing', icon: ShoppingCart,    permission: 'POS',       roles: null },
    { id: 'b2b',       path: '/b2b',       label: 'B2B Sales',   icon: FileText,        permission: 'POS',       roles: null },
    { id: 'purchases', path: '/purchases', label: 'Purchases',   icon: Package,         permission: 'PURCHASES', roles: null },
    { id: 'inventory', path: '/inventory', label: 'Inventory',   icon: Archive,         permission: 'INVENTORY', roles: null },
    { id: 'accounting',path: '/accounting',label: 'Accounting',  icon: BookOpen,        permission: 'ACCOUNTING',roles: null },
    { id: 'gst',       path: '/gst',       label: 'GST Portal',  icon: Receipt,         permission: 'GST_PORTAL',roles: null },
    { id: 'parties',   path: '/parties',   label: 'Parties',     icon: Users,           permission: 'CUSTOMERS', roles: null },
    { id: 'staff',     path: '/staff',     label: 'Staff',       icon: Shield,          permission: 'STAFF',     roles: null },
    { id: 'reports',   path: '/reports',   label: 'Reports',     icon: BarChart2,       permission: 'REPORTS',   roles: null },
    { id: 'notifications', path: '/notifications', label: 'Audit Logs',  icon: Bell,            permission: 'AUDIT_LOGS',roles: null },
    { id: 'settings',  path: '/settings',  label: 'Admin Settings', icon: Cog,           permission: 'SETTINGS',  roles: ['businessAdmin'] },
  ];

  const visibleNavItems = navItems.filter(item => {
    if (item.roles !== null) {
      if (isBusinessAdmin && item.roles.includes('businessAdmin')) return true;
      if (user?.role && item.roles.includes(user.role)) return true;
      return false;
    }
    if (item.permission !== null) {
        if (isBusinessAdmin) return true; // Admins see everything
        return hasPermission(item.permission);
    }
    return true; 
  });

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'NX';

  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#E8EDF5] select-none ">
      {/* ── MOBILE BACKDROP ────────────────────────────────────────────────── */}
      {(isSidebarOpen || isMobileSearchOpen) && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] animate-in fade-in duration-300"
          onClick={() => { setIsSidebarOpen(false); setIsMobileSearchOpen(false); }}
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 w-[280px] bg-white border-r border-slate-100 z-[200] transform transition-transform duration-500 lg:translate-x-0 lg:static lg:block ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col overflow-hidden">
          <div className="h-[52px] px-6 flex items-center justify-between border-b border-slate-100 shrink-0">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Shield size={20} />
              </div>
              <span className="text-xl font-black text-slate-900 tracking-tighter uppercase">
                Nexus<span className="text-indigo-600">Bill</span>
              </span>
            </Link>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-900">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto sidebar-scrollbar scroll-smooth">
            {visibleNavItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

              return (
                <Link
                  key={idx}
                  to={item.path}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-[1.25rem] transition-all duration-300 group relative ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-600' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon size={18} className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  <span className={`text-[13px] tracking-wide uppercase font-${isActive ? 'black' : 'bold'}`}>{item.label}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-100 shrink-0 mt-auto">
            <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 transition-all hover:border-indigo-100">
              <div className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-black text-[11px] text-indigo-600 uppercase">
                {getInitials(user?.name || 'NB')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-black text-slate-900 truncate uppercase tracking-tight">{user?.name || 'Nexus Admin'}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{user?.role || 'Root Access'}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                title="De-authorize Terminal"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── CORE VIEWPORT ────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-[#F4F7FA]">
        <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
          <header className={`h-[52px] bg-white border-b border-slate-200/60 flex items-center justify-between px-4 lg:px-6 z-[120] ${location.pathname === '/dashboard' ? 'sticky top-0' : ''}`}>
            <div className="flex items-center gap-3 flex-1">
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="lg:hidden p-1.5 text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
              >
              <Menu size={20} />
            </button>

            <button 
              onClick={() => setIsMobileSearchOpen(true)} 
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
            >
              <Receipt size={18} />
            </button>
            
            {/* Desktop Search */}
            <div className={`
              fixed lg:relative inset-x-0 top-0 p-3 lg:p-0 bg-white lg:bg-transparent border-b border-slate-100 lg:border-none
              flex-1 max-w-sm transition-all duration-300 z-50
              ${isMobileSearchOpen ? 'translate-y-0 opacity-100' : '-translate-y-full lg:translate-y-0 opacity-0 lg:opacity-100 pointer-events-none lg:pointer-events-auto'}
            `} ref={searchRef}>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="SEARCH NODES..."
                  className="w-full pl-6 h-9 lg:h-8 bg-slate-50 border-slate-100 rounded-lg text-[10px] font-black uppercase tracking-widest focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  value={searchQ}
                  onChange={handleSearch}
                  onFocus={() => searchQ.length >= 2 && setShowSug(true)}
                />
                
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
                        <BarChart2 size={10} /> Node Recommendations
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
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{s.sub}</p>
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
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-widest select-none">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              Nexus_Live: Stable
            </div>
            <NotificationCenter />
          </div>
        </header>

        <div className="p-4 lg:p-6 relative">
            {isBusinessAdmin && planStatus && (planStatus.isNearExpiry || planStatus.status === 'expired') && (
              <div className={`mb-3 p-6 rounded-[2rem] border-2 flex items-center gap-6 animate-in slide-in-from-top-4 duration-500 shadow-xl ${
                planStatus.status === 'expired' ? 'bg-rose-600 border-rose-500 text-white' : 'bg-amber-400 border-amber-300 text-slate-900'
              }`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                  planStatus.status === 'expired' ? 'bg-white/20' : 'bg-black/10'
                }`}>
                  <AlertTriangle size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black uppercase tracking-tight">
                    {planStatus.status === 'expired' ? 'Infrastructure Suspended' : 'Subscription Ending Soon'}
                  </h3>
                  <p className="text-sm font-bold opacity-90 mt-0.5">
                    {planStatus.status === 'expired' 
                      ? 'Nexus protocol halted. Please restore billing to resume high-velocity operations.'
                      : `Sync anomaly: Your plan expires in ${planStatus.remainingDays} days. Visit Master Control to renew.`
                    }
                  </p>
                </div>
                <Link 
                  to="/settings" 
                  className={`px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg ${
                    planStatus.status === 'expired' ? 'bg-white text-rose-600' : 'bg-slate-900 text-white'
                  }`}
                >
                  Configure Billing
                </Link>
              </div>
            )}
            
            <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200/60 min-h-[calc(100vh-120px)] p-4 sm:p-5 lg:p-6 relative">
               {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
