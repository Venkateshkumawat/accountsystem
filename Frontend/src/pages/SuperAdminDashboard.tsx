import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Layout, LogOut, Shield, Building2, Activity, Users, Settings, 
  RefreshCcw, Menu, ChevronRight, Search, Zap, CheckCircle2, 
  Clock, ArrowUpRight, BarChart3, Database, Globe, Plus, Trash2, Edit3, X, AlertTriangle, CreditCard, Key, Copy
} from "lucide-react";
import api from "../services/api";
import NotificationCenter from "../components/NotificationCenter";
import { useNotify } from "../context/NotificationContext";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Command Center");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    businessCount: 0,
    userCount: 0,
    activeSubscriptions: 0,
    securityAlerts: 0,
    expiredCount: 0
  });

  const [globalLogs, setGlobalLogs] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [showBusinessModal, setShowBusinessModal] = useState<any>(null);
  const [showPlanModal, setShowPlanModal] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<any>(null);
  const [showResetPassword, setShowResetPassword] = useState<any>(null);
  const [newPasswordValue, setNewPasswordValue] = useState("");
  
  // Provisioning Result state
  const [provisioningResult, setProvisioningResult] = useState<any>(null);
  const [provisioningLoading, setProvisioningLoading] = useState(false);

  // Form states
  const [provisioningData, setProvisioningData] = useState({
    ownerFullName: "",
    email: "",
    password: "",
    businessName: "",
    mobileNumber: "",
    location: {
      address: "",
      city: "",
      state: "",
      pincode: ""
    },
    plan: "free",
    planStartDate: new Date().toISOString().split('T')[0],
    planEndDate: "",
    gstin: ""
  });

  const [planFormData, setPlanFormData] = useState<any>({
    name: "",
    priceMonthly: 0,
    priceYearly: 0,
    maxInvoicesPerMonth: 50,
    maxProducts: 100,
    maxUsers: 2,
    features: ["Basic Inventory", "Daily Reports"]
  });

  const [editFormData, setEditFormData] = useState({
    plan: "free",
    planStartDate: "",
    planEndDate: ""
  });

  // Auth & Init Sync
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (!token || !storedUser || storedUser === 'undefined') { navigate("/login"); return; }
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== "superadmin") { navigate("/login"); return; }
    setUser(parsedUser);
    refreshAll();
  }, [navigate]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchGlobalLogs(),
        fetchBusinesses(),
        fetchPlans()
      ]);
    } catch (err) {
      console.error("Master Sync Failure", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = async () => {
    const res = await api.get("/superadmin/auth/stats");
    if (res.data.success) setStats(res.data.stats);
  };

  const fetchGlobalLogs = async () => {
    const res = await api.get("/superadmin/auth/logs");
    if (res.data.success) setGlobalLogs(res.data.logs);
  };

  const fetchBusinesses = async () => {
    const res = await api.get("/superadmin/auth/businesses");
    if (res.data.success) setBusinesses(res.data.businesses);
  };

  const fetchPlans = async () => {
    const res = await api.get("/superadmin/auth/plans");
    if (res.data.success) setPlans(res.data.plans);
  };

  // Node Lifecycle Handlers
  const handleProvisioning = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisioningLoading(true);
    try {
      const res = await api.post("/superadmin/auth/business-admins/create", provisioningData);
      if (res.data.success) {
        setProvisioningResult(res.data.data);
        fetchBusinesses();
        fetchStats();
        setProvisioningData({
            ownerFullName: "", email: "", password: "", businessName: "", mobileNumber: "",
            location: { address: "", city: "", state: "", pincode: "" },
            plan: "free", planStartDate: new Date().toISOString().split('T')[0], planEndDate: "", gstin: ""
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Provisioning Failed");
    } finally {
      setProvisioningLoading(false);
    }
  };

  const updateNodeStatus = async (businessId: string, action: string, reason?: string) => {
    try {
      await api.patch(`/superadmin/auth/business-admins/${businessId}/status`, { action, reason });
      fetchBusinesses();
      fetchGlobalLogs();
    } catch (err) {
      alert("Status Update Failed");
    }
  };

  const updateNodePlan = async (businessId: string) => {
    try {
      await api.patch(`/superadmin/auth/business-admins/${businessId}/plan`, editFormData);
      setShowBusinessModal(null);
      fetchBusinesses();
      fetchGlobalLogs();
    } catch (err: any) {
      alert(err.response?.data?.message || "Plan Update Failed");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.patch(`/superadmin/auth/business-admins/${showResetPassword.businessId}/reset-password`, { newPassword: newPasswordValue });
      if (res.data.success) {
        alert(`Password reset successful. New Password: ${res.data.newPassword}. Copy it now as it won't be shown again.`);
        setShowResetPassword(null);
        setNewPasswordValue("");
      }
    } catch (err) {
      alert("Password Reset Failed");
    }
  };

  const deleteNodePermanently = async (businessId: string) => {
    try {
      await api.delete(`/superadmin/auth/business-admins/${businessId}`);
      setShowDeleteConfirm(null);
      fetchBusinesses();
      fetchStats();
      fetchGlobalLogs();
    } catch (err) {
      alert("Nuclear Deletion Failed");
    }
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (showPlanModal?._id) {
        await api.patch(`/superadmin/auth/plans/${showPlanModal._id}`, planFormData);
      } else {
        await api.post("/superadmin/auth/plans", planFormData);
      }
      setShowPlanModal(null);
      fetchPlans();
    } catch (err: any) {
      alert(err.response?.data?.message || "Plan Operation Failed");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // Click outside to close search
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Global search across all SuperAdmin data
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

    const logResults = globalLogs.filter(l =>
      l.description?.toLowerCase().includes(q) ||
      l.resource?.toLowerCase().includes(q) ||
      l.userName?.toLowerCase().includes(q)
    ).slice(0, 4);

    return { businesses: bizResults, plans: planResults, logs: logResults };
  }, [searchQuery, businesses, plans, globalLogs]);

  const totalSearchResults = searchResults
    ? searchResults.businesses.length + searchResults.plans.length + searchResults.logs.length
    : 0;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F0F4F9] flex ">
      
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-4 left-4 z-50 w-[280px] bg-slate-950/90 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col transition-all duration-500 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+32px)] lg:translate-x-0'}`}>
        <div className="p-8 border-b border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Zap size={60} className="text-indigo-400 rotate-12" /></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 rotate-3"><Shield size={24} className="text-white" /></div>
            <div>
              <h2 className="text-xl font-semibold text-white leading-tight">Nexus Master</h2>
              <span className="text-[10px] font-medium text-indigo-400 uppercase tracking-widest mt-1 block">Global Network</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-10 px-4 space-y-2 overflow-y-auto">
          {menuItems.map((item, i) => {
            const isActive = activeTab === item.title;
            const Icon = item.icon;
            return (
              <button key={i} onClick={() => { setActiveTab(item.title); setIsSidebarOpen(false); }} className={`w-full group flex items-center gap-4 px-6 py-4 rounded-[1.5rem] transition-all duration-300 ${isActive ? 'bg-white text-slate-900 shadow-2xl scale-[1.02]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-indigo-600 text-white' : 'bg-white/5 group-hover:scale-110'}`}><Icon size={18} /></div>
                <span className="text-sm font-medium">{item.title}</span>
                {isActive && <ChevronRight size={14} className="ml-auto text-indigo-600 animate-pulse" />}
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="p-4 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-semibold text-sm">SA</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white truncate">Nexus Master</p>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest leading-none">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="p-2.5 bg-white/10 rounded-xl text-slate-400 hover:text-rose-500 transition-all hover:scale-110 active:scale-90 shadow-inner"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 lg:pl-[312px] transition-all duration-500 px-4 lg:px-8 pb-10">
        <header className="h-[80px] flex items-center gap-4 sticky top-0 z-40 bg-[#F0F4F9]/90 backdrop-blur-md border-b border-slate-200/60 transition-all px-0">
          {/* Mobile sidebar toggle */}
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden w-11 h-11 flex items-center justify-center bg-slate-950 text-white rounded-2xl shadow-xl active:scale-90 transition-transform shrink-0"><Menu size={18} /></button>

          {/* Page title — hidden on small screens to give space to search */}
          <div className="hidden md:block shrink-0">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 bg-indigo-600 text-[9px] text-white font-semibold uppercase rounded-lg tracking-widest">Operational</span>
              <h1 className="text-lg font-semibold text-slate-900 leading-tight">{activeTab}</h1>
            </div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">Master Protocol • v6.0.0</p>
          </div>

          {/* ── Global Search Bar ── */}
          <div className="flex-1 max-w-2xl relative" ref={searchRef}>
            <div className="relative">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
                onKeyDown={(e) => { if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); } }}
                placeholder="Search businesses, plans, activity logs..."
                className="w-full pl-11 pr-10 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setShowSearch(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-all"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Search Dropdown */}
            {showSearch && searchQuery.length >= 2 && searchResults && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 max-h-[440px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">

                {/* Businesses section */}
                {searchResults.businesses.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                      <Building2 size={11} className="text-slate-400" />
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Businesses ({searchResults.businesses.length})</p>
                    </div>
                    {searchResults.businesses.map((biz, i) => (
                      <button
                        key={i}
                        onClick={() => { setActiveTab('Node Registry'); setShowSearch(false); setSearchQuery(''); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50/60 transition-colors text-left border-b border-slate-50 last:border-0 group"
                      >
                        <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                          <Building2 size={15} className="text-indigo-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{biz.businessName}</p>
                          <p className="text-xs font-medium text-slate-400">{biz.plan} plan · {biz.email}</p>
                        </div>
                        <span className={`shrink-0 text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                          biz.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                          biz.status === 'suspended' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
                        }`}>{biz.status}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Plans section */}
                {searchResults.plans.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                      <CreditCard size={11} className="text-slate-400" />
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Plans ({searchResults.plans.length})</p>
                    </div>
                    {searchResults.plans.map((plan, i) => (
                      <button
                        key={i}
                        onClick={() => { setActiveTab('Plan Protocol'); setShowSearch(false); setSearchQuery(''); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50/60 transition-colors text-left border-b border-slate-50 last:border-0 group"
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

                {/* Activity Logs section */}
                {searchResults.logs.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                      <Activity size={11} className="text-slate-400" />
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Activity Logs ({searchResults.logs.length})</p>
                    </div>
                    {searchResults.logs.map((log, i) => (
                      <button
                        key={i}
                        onClick={() => { setActiveTab('System Audit'); setShowSearch(false); setSearchQuery(''); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0 group"
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          log.action === 'CREATE' ? 'bg-emerald-50' :
                          log.action === 'DELETE' ? 'bg-rose-50' : 'bg-indigo-50'
                        }`}>
                          <Activity size={15} className={`${
                            log.action === 'CREATE' ? 'text-emerald-600' :
                            log.action === 'DELETE' ? 'text-rose-600' : 'text-indigo-600'
                          }`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">{log.description}</p>
                          <p className="text-xs font-medium text-slate-400">{log.userName} · {log.resource}</p>
                        </div>
                        <span className={`shrink-0 text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                          log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-600' :
                          log.action === 'DELETE' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
                        }`}>{log.action}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* No results */}
                {totalSearchResults === 0 && (
                  <div className="px-4 py-10 text-center">
                    <Search size={28} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-400">No results for "{searchQuery}"</p>
                    <p className="text-xs font-medium text-slate-300 mt-1">Try searching by business name, plan, or log description</p>
                  </div>
                )}

                {/* Footer hint */}
                {totalSearchResults > 0 && (
                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-[10px] font-medium text-slate-400">{totalSearchResults} result{totalSearchResults !== 1 ? 's' : ''} found</p>
                    <p className="text-[10px] font-medium text-slate-300">ESC to close</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={refreshAll} className={`w-10 h-10 flex items-center justify-center bg-white border border-slate-200/50 rounded-xl text-slate-400 hover:text-indigo-600 hover:shadow-lg hover:-translate-y-0.5 transition-all group ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
              <RefreshCcw size={17} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
            </button>
            <NotificationCenter />
          </div>
        </header>

        {activeTab === "Command Center" && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <NexusStatCard label="Enterprise Nodes" value={stats.businessCount} icon={Building2} grow="+12%" color="indigo" delay="0" />
              <NexusStatCard label="Live Sessions" value={stats.userCount} icon={Users} grow="Stable" color="emerald" delay="100" />
              <NexusStatCard label="Schema Sync" value="99.9%" icon={Activity} grow="Optimized" color="violet" delay="200" />
              <NexusStatCard label="Security Risk" value={stats.securityAlerts} icon={Shield} grow="Locked" color="rose" delay="300" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 glass-card overflow-hidden">
                <div className="p-8 border-b border-white/20 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Activity Stream</h3>
                    <p className="text-xs font-medium text-slate-400 mt-1">Real-time Global Audit</p>
                  </div>
                  <Database size={20} className="text-indigo-600" />
                </div>
                <div className="p-6 h-[500px] overflow-y-auto space-y-4">
                  {globalLogs.map((log, idx) => (
                    <div key={idx} className="group flex items-center p-4 bg-slate-50/50 hover:bg-white border border-transparent hover:border-indigo-100 rounded-[2rem] transition-all duration-300">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-600' : log.action === 'DELETE' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}><Activity size={18} /></div>
                      <div className="flex-1 ml-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-semibold bg-slate-800 text-white px-1.5 rounded">{log.resource}</span>
                          <h4 className="text-sm font-semibold text-slate-800 tracking-tight">{log.description}</h4>
                        </div>
                        <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest">{log.userName} • {new Date(log.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                  {globalLogs.length === 0 && <div className="flex items-center justify-center h-full text-slate-300 font-semibold text-xs tracking-widest animate-pulse">-- No recent activity --</div>}
                </div>
              </div>

              <div className="space-y-8">
                <div className="glass-card p-8 group">
                  <h3 className="text-lg font-semibold text-slate-900 tracking-tight mb-8 flex items-center gap-3"><BarChart3 size={20} className="text-indigo-600" /> Load Factor</h3>
                  <div className="space-y-6">
                    <SystemPipe label="Node Saturation" percent="34%" color="bg-indigo-500" />
                    <SystemPipe label="Global Traffic" percent="78%" color="bg-violet-500" />
                    <SystemPipe label="API Response" percent="12ms" isValueOnly />
                    <SystemPipe label="Core Uptime" percent="99.9%" isValueOnly />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-indigo-900 to-slate-950 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                  <Globe className="absolute -bottom-8 -right-8 text-indigo-500/10 group-hover:scale-125 transition-transform duration-1000" size={160} />
                  <div className="relative z-10">
                    <h4 className="text-white text-lg font-semibold tracking-tight mb-2">Network Health</h4>
                    <p className="text-indigo-300/80 text-xs font-medium mb-8">All Nexus clusters operational. Proactive shielding active.</p>
                    <div className="flex items-center gap-2 group-hover:translate-x-2 transition-transform">
                      <span className="text-sm font-semibold text-white hover:text-indigo-400 cursor-pointer">Diagnostics</span>
                      <ArrowUpRight size={14} className="text-indigo-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Node Registry" && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
             <div className="glass-card overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 tracking-tight leading-none mb-1">Workspace Index</h2>
                    <p className="text-xs font-medium text-slate-400">Verified Nexus Business Nodes</p>
                  </div>
                  <div className="relative">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search nodes..." className="pl-11 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:bg-white w-64 transition-all" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-6 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Organization</th>
                        <th className="p-6 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center">Plan Tier</th>
                        <th className="p-6 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center">Status</th>
                        <th className="p-6 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center">Expiry</th>
                        <th className="p-6 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {businesses.map((biz, i) => (
                        <tr key={i} className="group hover:bg-slate-50/80 transition-all duration-300">
                          <td className="p-6">
                            <p className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">{biz.businessName}</p>
                            <span className="text-xs font-medium text-slate-400">UID: {biz.businessId}</span>
                          </td>
                          <td className="p-6 text-center">
                            <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-semibold rounded-lg uppercase shadow-sm">{biz.plan}</span>
                          </td>
                          <td className="p-6 text-center">
                            <div className={`inline-flex items-center gap-2 font-semibold text-xs ${biz.isActive ? 'text-emerald-500' : 'text-rose-500'}`}>
                              <span className={`w-2 h-2 rounded-full ${biz.isActive ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 animate-pulse'}`} />
                              {biz.status?.toUpperCase() || 'OFFLINE'}
                            </div>
                          </td>
                          <td className="p-6 text-center">
                            <p className="text-sm font-medium text-slate-600">{new Date(biz.planEndDate).toLocaleDateString()}</p>
                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wide">Expiry</p>
                          </td>
                          <td className="p-6 text-right space-x-2">
                             <button onClick={() => { setShowBusinessModal(biz); setEditFormData({ plan: biz.plan, planStartDate: biz.planStartDate?.split('T')[0], planEndDate: biz.planEndDate?.split('T')[0] }); }} className="w-10 h-10 bg-white text-slate-400 hover:text-indigo-600 border border-slate-100 rounded-xl inline-flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm"><Settings size={16} /></button>
                             <button onClick={() => setShowResetPassword(biz)} className="w-10 h-10 bg-white text-slate-400 hover:text-amber-600 border border-slate-100 rounded-xl inline-flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm"><Key size={16} /></button>
                             <button onClick={() => setShowDeleteConfirm(biz)} className="w-10 h-10 bg-white text-slate-400 hover:text-rose-600 border border-slate-100 rounded-xl inline-flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                      {businesses.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-slate-300 font-semibold text-xs tracking-widest animate-pulse">-- No managed nodes in registry --</td></tr>}
                    </tbody>
                  </table>
                </div>
             </div>
          </div>
        )}

        {/* PROVISIONING TAB */}
        {activeTab === "Provisioning" && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {provisioningResult ? (
              <div className="glass-card p-12 bg-emerald-50 border-emerald-100 relative overflow-hidden">
                <CheckCircle2 className="absolute -top-10 -right-10 text-emerald-500/10" size={300} />
                <div className="relative z-10">
                  <h2 className="text-2xl font-semibold text-emerald-900 tracking-tight mb-2 leading-none">Node Provisioned Successfully</h2>
                  <p className="text-emerald-700 font-medium text-sm mb-12">New Nexus Node [ {provisioningResult.businessId} ] is now online</p>
                  
                  <div className="bg-white p-8 rounded-[2rem] border border-emerald-200 shadow-xl max-w-2xl">
                    <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-6 block">Temporary Access Protocol</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-xs font-semibold uppercase text-slate-500">Business ID</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-900">{provisioningResult.businessId}</span>
                          <button onClick={() => { navigator.clipboard.writeText(provisioningResult.businessId); alert("Copied ID"); }} className="p-2 hover:bg-white rounded-lg transition-colors"><Copy size={14} /></button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-xs font-semibold uppercase text-slate-500">Login Email</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-900">{provisioningResult.email}</span>
                          <button onClick={() => { navigator.clipboard.writeText(provisioningResult.email); alert("Copied Email"); }} className="p-2 hover:bg-white rounded-lg transition-colors"><Copy size={14} /></button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-6 bg-slate-900 rounded-[1.5rem]">
                        <span className="text-xs font-semibold uppercase text-indigo-400">Master Password</span>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold text-white">{provisioningResult.loginCredentials.password}</span>
                          <button onClick={() => { navigator.clipboard.writeText(provisioningResult.loginCredentials.password); alert("Copied Password"); }} className="p-2 bg-white/10 text-white hover:bg-white/20 rounded-lg transition-colors"><Copy size={16} /></button>
                        </div>
                      </div>
                    </div>
                    <p className="mt-8 text-[10px] font-semibold text-rose-500 uppercase tracking-widest text-center">{provisioningResult.loginCredentials.note}</p>
                    <button onClick={() => setProvisioningResult(null)} className="mt-10 w-full py-4 bg-emerald-600 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all">Done — Provision Next Node</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-8">
                <div className="flex-1 glass-card p-12 relative overflow-hidden group">
                  <Zap className="absolute -top-10 -right-10 text-indigo-500/5 group-hover:scale-150 transition-transform duration-1000" size={240} />
                  <div className="relative z-10 max-w-2xl">
                    <h2 className="text-2xl font-semibold text-slate-900 tracking-tight mb-4 leading-none">Rapid Provisioning</h2>
                    <p className="text-slate-400 font-medium text-sm mb-12">Authorized force-creation of enterprise nodes</p>
                    
                    <form className="space-y-8" onSubmit={handleProvisioning}>
                      <div className="grid grid-cols-2 gap-8">
                        <NexusInput label="Org Name" value={provisioningData.businessName} onChange={(v: string) => setProvisioningData({...provisioningData, businessName: v})} placeholder="Acme Corp" required />
                        <NexusInput label="Admin Email" type="email" value={provisioningData.email} onChange={(v: string) => setProvisioningData({...provisioningData, email: v})} placeholder="admin@acme.io" required />
                        <NexusInput label="Full Name" value={provisioningData.ownerFullName} onChange={(v: string) => setProvisioningData({...provisioningData, ownerFullName: v})} placeholder="John Doe" required />
                        <NexusInput label="Password" type="password" value={provisioningData.password} onChange={(v: string) => setProvisioningData({...provisioningData, password: v})} required />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-6 bg-slate-50 p-6 rounded-[2rem]">
                        <NexusInput label="City" value={provisioningData.location.city} onChange={(v: string) => setProvisioningData({...provisioningData, location: {...provisioningData.location, city: v}})} required />
                        <NexusInput label="State" value={provisioningData.location.state} onChange={(v: string) => setProvisioningData({...provisioningData, location: {...provisioningData.location, state: v}})} required />
                        <NexusInput label="Pincode" value={provisioningData.location.pincode} onChange={(v: string) => setProvisioningData({...provisioningData, location: {...provisioningData.location, pincode: v}})} required />
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3 block ml-2">Subscription Plan</label>
                            <select value={provisioningData.plan} onChange={(e) => setProvisioningData({...provisioningData, plan: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none cursor-pointer">
                              <option value="free">Free Trial</option>
                              <option value="pro">Professional</option>
                              <option value="enterprise">Enterprise</option>
                            </select>
                         </div>
                         <NexusInput label="Mobile Number" value={provisioningData.mobileNumber} onChange={(v: string) => setProvisioningData({...provisioningData, mobileNumber: v})} placeholder="10 digits only" required />
                      </div>

                      <button disabled={provisioningLoading} className="w-full py-4 bg-indigo-600 text-white rounded-[2rem] text-sm font-semibold hover:bg-indigo-700 transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                        {provisioningLoading ? "Deploying..." : "Initialize Node Deployment"} <Plus size={16} />
                      </button>
                    </form>
                  </div>
                </div>
                
                <div className="w-96 space-y-6">
                  <div className="glass-card p-8 bg-indigo-900 text-white relative overflow-hidden">
                    <Shield size={40} className="mb-6 text-indigo-400 relative z-10" />
                    <h4 className="text-xl font-semibold tracking-tight mb-2 relative z-10">Verification Protocol</h4>
                    <p className="text-indigo-200/60 text-xs font-medium leading-relaxed relative z-10">Manual provisioning bypasses public verification layers. All credentials generated here are master-signed.</p>
                  </div>
                  <div className="glass-card p-8 bg-slate-50">
                    <h4 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-6">Service Requirements</h4>
                    <ul className="space-y-4">
                      {['Valid 10-digit Mobile', 'Unique Registry Email', '8-character Password', 'Valid 6-digit Pincode'].map((req, i) => (
                        <li key={i} className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECURITY MATRIX */}
        {activeTab === "Security Matrix" && (
          <div className="space-y-8 animate-in zoom-in-95 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="glass-card p-10 col-span-2">
                <div className="flex items-center justify-between mb-12">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900 tracking-tight leading-none">Security Telemetry</h3>
                    <p className="text-xs font-medium text-slate-400 mt-1">Live Firewall & Authentication Audit</p>
                  </div>
                  <Shield size={32} className="text-indigo-600 animate-pulse" />
                </div>
                <div className="space-y-8">
                  <SecurityNode label="Brute-force Interception" status="Locked" count="124" color="emerald" />
                  <SecurityNode label="Cross-tenant Barrier" status="Stable" count="0 Violations" color="indigo" />
                  <SecurityNode label="Master Key Rotation" status="Required" count="12 days ago" color="rose" />
                </div>
              </div>
              <div className="space-y-8">
                <div className="glass-card p-8 bg-slate-900 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px]" />
                  <Activity className="text-indigo-400 mb-6" size={32} />
                  <h4 className="text-lg font-semibold tracking-tight mb-2">Entropy Shield</h4>
                  <p className="text-slate-400 text-xs font-medium mb-8">Node integrity is scanned every 60 seconds.</p>
                  <button onClick={refreshAll} className="w-full py-4 bg-white/10 rounded-2xl text-sm font-medium border border-white/5 hover:bg-white/20 transition-all">Force Re-scan</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SYSTEM AUDIT */}
        {activeTab === "System Audit" && (
           <div className="space-y-8 animate-in fade-in duration-700">
             <div className="glass-card overflow-hidden">
               <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Diagnostic Master Logs</h3>
                 <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium shadow-xl active:scale-110 transition-all">Export JSON</button>
               </div>
               <div className="p-0">
                 <div className="bg-slate-950 p-8 text-[11px] text-indigo-400 h-[600px] overflow-y-auto space-y-1">
                   {globalLogs.length > 0 ? globalLogs.map((log, i) => (
                     <div key={i} className="hover:bg-white/5 p-1 rounded border-l-2 border-transparent hover:border-indigo-500 transition-colors">
                       <span className="text-slate-600 text-[10px] uppercase">[{new Date(log.createdAt).toISOString()}]</span>
                       <span className="text-emerald-500 ml-2 font-semibold">SUCCESS:</span>
                       <span className="text-white ml-2 uppercase">[{log.resource}]</span>
                       <span className="text-slate-200 ml-2">{log.description}</span>
                       <span className="text-indigo-500/60 ml-2">AUTH: {log.userName}</span>
                     </div>
                   )) : (
                     <div className="flex items-center justify-center h-full text-slate-600 font-semibold text-xs tracking-widest animate-pulse">-- Awaiting system telemetry --</div>
                   )}
                 </div>
               </div>
             </div>
           </div>
        )}

        {/* PLAN REGISTRY */}
        {activeTab === "Plan Protocol" && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Monetization Registry</h2>
                <p className="text-xs font-medium text-slate-400 mt-1">SaaS Tier Configurations</p>
              </div>
              <button onClick={() => { setPlanFormData({ name: "", priceMonthly: 0, priceYearly: 0, maxInvoicesPerMonth: 50, maxProducts: 100, maxUsers: 2, features: ["Basic Inventory"] }); setShowPlanModal({ mode: 'create' }); }} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                <Plus size={16} />
                <span>Define Tier</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {plans.map((plan, i) => (
                <div key={i} className="glass-card p-8 group relative overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg rotate-3"><CreditCard size={28} /></div>
                    <div className="flex gap-2">
                      <button onClick={() => { setPlanFormData(plan); setShowPlanModal(plan); }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all"><Edit3 size={15} /></button>
                      <button onClick={async () => { if(confirm("Archive this tier?")) { await api.delete(`/superadmin/auth/plans/${plan._id}`); fetchPlans(); } }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 transition-all"><Trash2 size={15} /></button>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-3xl font-bold text-indigo-600">₹{plan.priceMonthly}</span>
                    <span className="text-xs font-medium text-slate-400">/ month</span>
                  </div>
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600 border-b border-slate-100 pb-3"><span className="text-slate-400">Product Quota</span><span className="text-slate-900">{plan.maxProducts} units</span></div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600 border-b border-slate-100 pb-3"><span className="text-slate-400">User Slots</span><span className="text-slate-900">{plan.maxUsers} limit</span></div>
                  </div>
                  <div className="space-y-2 pt-2">{plan.features.map((f: string, idx: number) => (<div key={idx} className="flex items-center gap-2.5 text-xs font-medium text-slate-500"><CheckCircle2 size={14} className="text-emerald-500" />{f}</div>))}</div>
                </div>
              ))}
              {plans.length === 0 && <div className="col-span-3 py-20 text-center glass-card border-dashed border-2 border-slate-200 font-semibold text-slate-300 text-xs tracking-widest">-- No tiers registered --</div>}
            </div>
          </div>
        )}

      </main>

      {/* MODALS */}
      
      {/* Node Control Modal */}
      {showBusinessModal && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in duration-300 max-h-[95vh] flex flex-col">
            <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Node Oversight</h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5">{showBusinessModal.businessName} [ {showBusinessModal.businessId} ]</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowBusinessModal(null)} className="px-4 py-2 bg-white/10 hover:bg-rose-500 hover:text-white rounded-xl transition-all text-xs font-medium text-slate-300">Back</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 sm:p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4 block leading-none">Node Status</span>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${showBusinessModal.isActive ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'}`} />
                      <span className="text-sm font-semibold text-slate-800">{showBusinessModal.status?.toUpperCase()}</span>
                    </div>
                    <div className="flex gap-2">
                        {showBusinessModal.status !== 'active' && <button onClick={() => updateNodeStatus(showBusinessModal.businessId, 'activate')} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-semibold text-xs hover:bg-emerald-100">Restore</button>}
                        {showBusinessModal.status !== 'inactive' && <button onClick={() => updateNodeStatus(showBusinessModal.businessId, 'deactivate')} className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl font-semibold text-xs hover:bg-slate-200">Detach</button>}
                        {showBusinessModal.status !== 'suspended' && <button onClick={() => { const r = prompt("Enter suspension reason:"); if(r) updateNodeStatus(showBusinessModal.businessId, 'suspend', r); }} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-semibold text-xs hover:bg-rose-100">Suspend</button>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3 block ml-2">Plan Tier</label>
                  <select value={editFormData.plan} onChange={(e) => setEditFormData({...editFormData, plan: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none cursor-pointer">{plans.map(p => <option key={p.name} value={p.name}>{p.name} Hub</option>)}</select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3 block ml-2">Start Date</label>
                      <input type="date" value={editFormData.planStartDate} onChange={(e) => setEditFormData({...editFormData, planStartDate: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3 block ml-2">Expiry Date</label>
                      <input type="date" value={editFormData.planEndDate} onChange={(e) => setEditFormData({...editFormData, planEndDate: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                    </div>
                </div>
              </div>

              <footer className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button type="button" onClick={() => setShowBusinessModal(null)} className="flex-1 py-4 bg-white text-slate-600 rounded-2xl text-sm font-semibold border border-slate-200 hover:bg-slate-100 transition-all">
                  Cancel
                </button>
                <button onClick={() => updateNodePlan(showBusinessModal.businessId)} className="flex-[2] py-4 bg-slate-950 text-white rounded-2xl text-sm font-semibold shadow-xl hover:bg-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-2 group">
                  Update Plan <Zap size={15} className="inline ml-1 group-hover:text-amber-400 transition-colors" />
                </button>
              </footer>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPassword && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
           <form onSubmit={handleResetPassword} className="bg-white w-full max-w-md rounded-[3rem] p-10 flex flex-col items-center gap-8 shadow-2xl border border-white/20 animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center"><Key size={32} /></div>
              <div className="text-center">
                <h3 className="text-2xl font-semibold text-slate-900 tracking-tight leading-none mb-3">Credential Rotation</h3>
                <p className="text-xs font-medium text-slate-400">Assigning new master key for Node [ {showResetPassword.businessId} ]</p>
              </div>
              <div className="w-full space-y-4">
                <NexusInput label="New Password" type="password" value={newPasswordValue} onChange={setNewPasswordValue} required minLength={8} />
              </div>
              <div className="w-full flex flex-col gap-3">
                <button type="submit" className="w-full py-4 bg-amber-500 text-white rounded-2xl text-sm font-semibold hover:bg-amber-600 active:scale-95 transition-all shadow-lg shadow-amber-500/20">Rotate Credentials</button>
                <button type="button" onClick={() => { setShowResetPassword(null); setNewPasswordValue(""); }} className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl text-sm font-medium hover:bg-slate-200">Cancel</button>
              </div>
           </form>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[3rem] p-12 text-center space-y-10 border border-white/20 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto scale-110 shadow-lg shadow-rose-500/10 border border-rose-100"><AlertTriangle size={48} /></div>
              <div>
                <h3 className="text-2xl font-semibold text-slate-900 tracking-tight leading-none mb-3">Confirm Deletion</h3>
                <p className="text-sm font-medium text-slate-400 leading-relaxed px-2">This will permanently erase <span className="text-rose-500 font-semibold">{showDeleteConfirm.businessName} [ {showDeleteConfirm.businessId} ]</span> and all associated staff data.</p>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={() => deleteNodePermanently(showDeleteConfirm.businessId)} className="w-full py-4 bg-rose-500 text-white rounded-2xl text-sm font-semibold hover:bg-rose-600 transition-all shadow-lg active:scale-95 shadow-rose-500/20">Confirm Deletion</button>
                <button onClick={() => setShowDeleteConfirm(null)} className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl text-sm font-medium hover:bg-slate-200 transition-all active:scale-95">Cancel</button>
              </div>
           </div>
        </div>
      )}

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
           <form onSubmit={handlePlanSubmit} className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-white/20">
             <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
               <div>
                 <h3 className="text-2xl font-semibold text-slate-900 tracking-tight leading-none">{showPlanModal.mode === 'create' ? 'Define New Tier' : 'Edit Plan'}</h3>
                 <p className="text-xs font-medium text-slate-400 mt-1">Master Service Definitions</p>
               </div>
               <button type="button" onClick={() => setShowPlanModal(null)} className="p-3 bg-slate-50 rounded-2xl"><X size={20} /></button>
             </div>
             <div className="p-10 space-y-8 flex-1 overflow-y-auto">
               <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-6">
                   <NexusInput label="Plan Name" value={planFormData.name} onChange={(v: string) => setPlanFormData({...planFormData, name: v})} placeholder="Maxima" />
                   <NexusInput label="Monthly Price (₹)" type="number" value={planFormData.priceMonthly} onChange={(v: string) => setPlanFormData({...planFormData, priceMonthly: parseInt(v)})} />
                 </div>
                 <div className="space-y-6">
                   <NexusInput label="Product Capacity" type="number" value={planFormData.maxProducts} onChange={(v: string) => setPlanFormData({...planFormData, maxProducts: parseInt(v)})} />
                   <NexusInput label="User Slots" type="number" value={planFormData.maxUsers} onChange={(v: string) => setPlanFormData({...planFormData, maxUsers: parseInt(v)})} />
                 </div>
               </div>
               <div>
                 <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-3 ml-2">Features (one per line)</label>
                 <textarea className="w-full p-6 bg-slate-50 border-none rounded-3xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 min-h-[140px] resize-none" placeholder="One feature per line..." value={Array.isArray(planFormData.features) ? planFormData.features.join('\n') : planFormData.features} onChange={(e) => setPlanFormData({...planFormData, features: e.target.value.split('\n')})} />
               </div>
             </div>
             <div className="p-10 pt-0 bg-white">
               <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-[2rem] text-sm font-semibold hover:bg-slate-900 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2">
                 Publish Plan {showPlanModal.mode === 'create' ? <Plus size={16} /> : <RefreshCcw size={16} />}
               </button>
             </div>
           </form>
        </div>
      )}

    </div>
  );
}

{/* REUSABLE UI COMPONENTS */}

function SecurityNode({ label, status, count, color }: any) {
   const colors: any = { emerald: "bg-emerald-50 text-emerald-600 border-emerald-100", indigo: "bg-indigo-50 text-indigo-600 border-indigo-100", rose: "bg-rose-50 text-rose-600 border-rose-100" };
   return (
     <div className={`p-6 border rounded-[2rem] flex items-center justify-between transition-all hover:scale-[1.01] ${colors[color]}`}>
       <div>
         <p className="text-[10px] font-semibold uppercase tracking-widest mb-1 opacity-60">{label}</p>
         <h4 className="text-lg font-semibold tracking-tight leading-none">{status}</h4>
       </div>
       <div className="text-right">
         <span className="text-sm font-semibold">{count}</span>
       </div>
     </div>
   );
}

function NexusStatCard({ label, value, icon: Icon, grow, color, delay }: any) {
  const colorMap: any = { indigo: "bg-indigo-50 text-indigo-600 border-indigo-100", emerald: "bg-emerald-50 text-emerald-600 border-emerald-100", violet: "bg-violet-50 text-violet-600 border-violet-100", rose: "bg-rose-50 text-rose-600 border-rose-100" };
  return (
    <div className="glass-card p-6 group relative overflow-hidden animate-in zoom-in-95 duration-500 hover:shadow-2xl hover:scale-[1.02] transition-all" style={{ animationDelay: `${delay}ms` }}>
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-125 transition-transform duration-700"><Icon size={100} /></div>
      <div className="flex items-center justify-between mb-6">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm group-hover:rotate-[15deg] transition-all duration-500 ${colorMap[color]}`}><Icon size={22} /></div>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-semibold ${colorMap[color].split(' ')[1]}`}>{grow}</span>
        </div>
      </div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-2xl font-semibold text-slate-900 tracking-tight group-hover:scale-105 transition-transform origin-left leading-none">{value}</h3>
    </div>
  );
}

function SystemPipe({ label, percent, color, isValueOnly }: any) {
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">{label}</p>
        <span className="text-sm font-semibold text-slate-900">{percent}</span>
      </div>
      {!isValueOnly && (
        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
          <div className={`h-full ${color} rounded-full transition-all duration-[2s] ease-out group-hover:brightness-110 shadow-sm`} style={{ width: percent }} />
        </div>
      )}
    </div>
  );
}

function NexusInput({ label, type = "text", value, onChange, placeholder, required = false, minLength }: any) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 block ml-2">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-slate-300"
      />
    </div>
  );
}

const menuItems = [
  { title: "Command Center", icon: Layout },
  { title: "Node Registry", icon: Building2 },
  { title: "Plan Protocol", icon: Activity },
  { title: "Provisioning", icon: Zap },
  { title: "Security Matrix", icon: Shield },
  { title: "System Audit", icon: Clock },
];
