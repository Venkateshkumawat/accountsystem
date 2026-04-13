import { useState, useEffect, useCallback } from "react";
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
              <h2 className="text-xl font-bold text-white leading-tight">Nexus Master</h2>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1 block">Global Network</span>
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
                <span className={`text-sm font-medium tracking-wide uppercase`}>{item.title}</span>
                {isActive && <ChevronRight size={14} className="ml-auto text-indigo-600 animate-pulse" />}
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="p-4 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black">SA</div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-[12px] text-white truncate">Nexus Master</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="p-2.5 bg-white/10 rounded-xl text-slate-400 hover:text-rose-500 transition-all hover:scale-110 active:scale-90 shadow-inner"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 lg:pl-[312px] transition-all duration-500 px-4 lg:px-8 pb-10">
        <header className="h-[100px] flex items-center gap-6 sticky top-0 z-40 bg-[#F0F4F9]/80 backdrop-blur-md transition-all">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden w-12 h-12 flex items-center justify-center bg-slate-950 text-white rounded-2xl shadow-xl active:scale-90 transition-transform"><Menu size={20} /></button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1"><span className="p-1 px-2.5 bg-indigo-600 text-[9px] text-white font-black uppercase rounded-lg tracking-widest shadow-lg shadow-indigo-600/20">Operational</span><h1 className="text-2xl font-bold text-slate-900 leading-tight uppercase">{activeTab}</h1></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Global Master Protocol • v6.0.0 Stable</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={refreshAll} className={`w-12 h-12 flex items-center justify-center bg-white border border-slate-200/50 rounded-2xl text-slate-400 hover:text-indigo-600 hover:shadow-xl hover:-translate-y-0.5 transition-all group ${loading ? 'opacity-50 pointer-events-none' : ''}`}><RefreshCcw size={20} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} /></button>
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
                <div className="p-8 border-b border-white/20 flex items-center justify-between"><div><h3 className="text-lg font-semibold text-slate-900 uppercase tracking-tight">Activity Stream</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Real-time Global Audit</p></div><Database size={20} className="text-indigo-600" /></div>
                <div className="p-6 h-[500px] overflow-y-auto space-y-4">
                  {globalLogs.map((log, idx) => (
                    <div key={idx} className="group flex items-center p-4 bg-slate-50/50 hover:bg-white border border-transparent hover:border-indigo-100 rounded-[2rem] transition-all duration-300">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-600' : log.action === 'DELETE' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}><Activity size={18} /></div>
                      <div className="flex-1 ml-4"><div className="flex items-center gap-2"><span className="text-[9px] font-black bg-slate-800 text-white px-1.5 rounded">{log.resource}</span><h4 className="text-[13px] font-extrabold text-slate-800 tracking-tight">{log.description}</h4></div><p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{log.userName} • {new Date(log.createdAt).toLocaleString()}</p></div>
                    </div>
                  ))}
                  {globalLogs.length === 0 && <div className="flex items-center justify-center h-full text-slate-300 uppercase font-black text-xs tracking-widest animate-pulse">-- NO RECENT ACTIVITY --</div>}
                </div>
              </div>

              <div className="space-y-8">
                <div className="glass-card p-8 group"><h3 className="text-lg font-semibold text-slate-900 uppercase tracking-tight mb-8 flex items-center gap-3"><BarChart3 size={20} className="text-indigo-600" /> Load Factor</h3><div className="space-y-6"><SystemPipe label="Node Saturation" percent="34%" color="bg-indigo-500" /><SystemPipe label="Global Traffic" percent="78%" color="bg-violet-500" /><SystemPipe label="API Response" percent="12ms" isValueOnly /><SystemPipe label="Core Uptime" percent="99.9%" isValueOnly /></div></div>
                <div className="bg-gradient-to-br from-indigo-900 to-slate-950 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group"><Globe className="absolute -bottom-8 -right-8 text-indigo-500/10 group-hover:scale-125 transition-transform duration-1000" size={160} /><div className="relative z-10"><h4 className="text-white text-lg font-black uppercase tracking-tighter mb-2">Network Health</h4><p className="text-indigo-300/80 text-[11px] font-bold uppercase tracking-[0.15em] mb-8">All Nexus clusters operational. Proactive shielding active.</p><div className="flex items-center gap-2 group-hover:translate-x-2 transition-transform"><span className="text-[10px] font-black text-white hover:text-indigo-400 cursor-pointer uppercase underline underline-offset-8">Diagnostics</span><ArrowUpRight size={14} className="text-indigo-400" /></div></div></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Node Registry" && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
             <div className="glass-card overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-slate-900 uppercase tracking-tight leading-none mb-1">Workspace Index</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified Nexus Business Nodes</p></div><div className="relative"><Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="SEARCH NODES..." className="pl-11 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase outline-none focus:bg-white w-64 transition-all" /></div></div>
                <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-slate-50 border-b border-slate-100"><th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Organization</th><th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Protocol Tier</th><th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th><th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Audit Cycle</th><th className="p-6 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Controls</th></tr></thead><tbody className="divide-y divide-slate-50">
                      {businesses.map((biz, i) => (
                        <tr key={i} className="group hover:bg-slate-50/80 transition-all duration-300"><td className="p-6"><p className="font-black text-slate-900 text-[14px] uppercase group-hover:text-indigo-600 transition-colors">{biz.businessName}</p><span className=" text-[9px] text-slate-400 uppercase tracking-widest">UID: {biz.businessId}</span></td><td className="p-6 text-center"><span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-black rounded-lg uppercase shadow-sm">{biz.plan}</span></td><td className="p-6 text-center"><div className={`inline-flex items-center gap-2 font-black text-[10px] uppercase ${biz.isActive ? 'text-emerald-500' : 'text-rose-500'}`}><span className={`w-2 h-2 rounded-full ${biz.isActive ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 animate-pulse'}`} />{biz.status?.toUpperCase() || 'OFFLINE'}</div></td><td className="p-6 text-center"><p className="text-[11px] font-black text-slate-600 uppercase tracking-tighter">{new Date(biz.planEndDate).toLocaleDateString()}</p><p className="text-[8px] font-bold text-slate-400 uppercase">Expiry Signal</p></td><td className="p-6 text-right space-x-2">
                             <button onClick={() => { setShowBusinessModal(biz); setEditFormData({ plan: biz.plan, planStartDate: biz.planStartDate?.split('T')[0], planEndDate: biz.planEndDate?.split('T')[0] }); }} className="w-10 h-10 bg-white text-slate-400 hover:text-indigo-600 border border-slate-100 rounded-xl inline-flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm"><Settings size={16} /></button>
                             <button onClick={() => setShowResetPassword(biz)} className="w-10 h-10 bg-white text-slate-400 hover:text-amber-600 border border-slate-100 rounded-xl inline-flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm"><Key size={16} /></button>
                             <button onClick={() => setShowDeleteConfirm(biz)} className="w-10 h-10 bg-white text-slate-400 hover:text-rose-600 border border-slate-100 rounded-xl inline-flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm"><Trash2 size={16} /></button>
                          </td></tr>
                      ))}
                      {businesses.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-slate-300 font-bold uppercase text-[10px] tracking-[0.3em] animate-pulse">-- NO MANAGED NODES IN REGISTRY --</td></tr>}
                </tbody></table></div>
             </div>
          </div>
        )}

        {/* PROVISIONING TAB (FULL FUNCTIONALITY) */}
        {activeTab === "Provisioning" && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {provisioningResult ? (
              <div className="glass-card p-12 bg-emerald-50 border-emerald-100 relative overflow-hidden">
                <CheckCircle2 className="absolute -top-10 -right-10 text-emerald-500/10" size={300} />
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold text-emerald-900 uppercase tracking-tight mb-2 leading-none">Node Provisioned Successfully</h2>
                  <p className="text-emerald-700 font-bold uppercase tracking-widest text-[12px] mb-12">New Nexus Node [ {provisioningResult.businessId} ] is now ONLINE</p>
                  
                  <div className="bg-white p-8 rounded-[2rem] border border-emerald-200 shadow-xl max-w-2xl">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 block">Temporary Access Protocol</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[11px] font-black uppercase text-slate-500">Business ID</span>
                        <div className="flex items-center gap-3">
                          <span className=" text-[14px] font-black text-slate-900">{provisioningResult.businessId}</span>
                          <button onClick={() => { navigator.clipboard.writeText(provisioningResult.businessId); alert("Copied ID"); }} className="p-2 hover:bg-white rounded-lg transition-colors"><Copy size={14} /></button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[11px] font-black uppercase text-slate-500">Login Email</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[14px] text-slate-900">{provisioningResult.email}</span>
                          <button onClick={() => { navigator.clipboard.writeText(provisioningResult.email); alert("Copied Email"); }} className="p-2 hover:bg-white rounded-lg transition-colors"><Copy size={14} /></button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-6 bg-slate-900 rounded-[1.5rem]">
                        <span className="text-[11px] font-black uppercase text-indigo-400">Master Password</span>
                        <div className="flex items-center gap-3">
                          <span className=" text-[18px] font-black text-white">{provisioningResult.loginCredentials.password}</span>
                          <button onClick={() => { navigator.clipboard.writeText(provisioningResult.loginCredentials.password); alert("Copied Password"); }} className="p-2 bg-white/10 text-white hover:bg-white/20 rounded-lg transition-colors"><Copy size={16} /></button>
                        </div>
                      </div>
                    </div>
                    <p className="mt-8 text-[10px] font-black text-rose-500 uppercase tracking-widest text-center">{provisioningResult.loginCredentials.note}</p>
                    <button onClick={() => setProvisioningResult(null)} className="mt-10 w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all">Done - Provision Next Node</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-8">
                <div className="flex-1 glass-card p-12 relative overflow-hidden group">
                  <Zap className="absolute -top-10 -right-10 text-indigo-500/5 group-hover:scale-150 transition-transform duration-1000" size={240} />
                  <div className="relative z-10 max-w-2xl">
                    <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight mb-4 leading-none">Rapid Provisioning</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[12px] mb-12">Authorized Force-Creation of Enterprise Nodes</p>
                    
                    <form className="space-y-8" onSubmit={handleProvisioning}>
                      <div className="grid grid-cols-2 gap-8">
                        <NexusInput label="Org Name" value={provisioningData.businessName} onChange={(v: string) => setProvisioningData({...provisioningData, businessName: v})} placeholder="ACME CORP" required />
                        <NexusInput label="Admin Email" type="email" value={provisioningData.email} onChange={(v: string) => setProvisioningData({...provisioningData, email: v})} placeholder="ADMIN@ACME.IO" required />
                        <NexusInput label="Full Identity" value={provisioningData.ownerFullName} onChange={(v: string) => setProvisioningData({...provisioningData, ownerFullName: v})} placeholder="JOHN DOE" required />
                        <NexusInput label="Secure Key" type="password" value={provisioningData.password} onChange={(v: string) => setProvisioningData({...provisioningData, password: v})} required />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-6 bg-slate-50 p-6 rounded-[2rem]">
                        <NexusInput label="City" value={provisioningData.location.city} onChange={(v: string) => setProvisioningData({...provisioningData, location: {...provisioningData.location, city: v}})} required />
                        <NexusInput label="State" value={provisioningData.location.state} onChange={(v: string) => setProvisioningData({...provisioningData, location: {...provisioningData.location, state: v}})} required />
                        <NexusInput label="Pincode" value={provisioningData.location.pincode} onChange={(v: string) => setProvisioningData({...provisioningData, location: {...provisioningData.location, pincode: v}})} required />
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">Protocol Hub</label>
                            <select value={provisioningData.plan} onChange={(e) => setProvisioningData({...provisioningData, plan: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-2xl text-[12px] font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none cursor-pointer">
                              <option value="free">FREE TRIAL HUB</option>
                              <option value="pro">PROFESSIONAL HUB</option>
                              <option value="enterprise">ENTERPRISE CLUSTER</option>
                            </select>
                         </div>
                         <NexusInput label="Mobile Uplink" value={provisioningData.mobileNumber} onChange={(v: string) => setProvisioningData({...provisioningData, mobileNumber: v})} placeholder="10 Digits Only" required />
                      </div>

                      <button disabled={provisioningLoading} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-[12px] uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-2xl shadow-indigo-600/10 active:scale-95 group disabled:opacity-50">
                        {provisioningLoading ? "Deploying Nexus Protocol..." : "Initialize Node Deployment"} <Plus size={18} className="inline ml-2 group-hover:rotate-90 transition-transform" />
                      </button>
                    </form>
                  </div>
                </div>
                
                <div className="w-96 space-y-6">
                  <div className="glass-card p-8 bg-indigo-900 text-white relative overflow-hidden">
                    <Shield size={40} className="mb-6 text-indigo-400 relative z-10" />
                    <h4 className="text-xl font-black uppercase tracking-tighter mb-2 relative z-10">Verification Protocol</h4>
                    <p className="text-indigo-200/60 text-[10px] font-bold uppercase tracking-widest leading-relaxed relative z-10">Manual provisioning bypasses public verification layers. All credentials generated here are master-signed.</p>
                  </div>
                  <div className="glass-card p-8 bg-slate-50">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Service Requirements</h4>
                    <ul className="space-y-4">
                      {['Valid 10-digit Mobile', 'Unique Registry Email', '8-character Secure Key', 'Valid 6-digit Pincode'].map((req, i) => (
                        <li key={i} className="flex items-center gap-3 text-[11px] font-extrabold text-slate-600 uppercase">
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

        {/* SECURITY MATRIX (TELEMETRY) */}
        {activeTab === "Security Matrix" && (
          <div className="space-y-8 animate-in zoom-in-95 duration-500"><div className="grid grid-cols-1 md:grid-cols-3 gap-8"><div className="glass-card p-10 col-span-2"><div className="flex items-center justify-between mb-12"><div><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Security Telemetry</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Live Firewall & Authentication Audit</p></div><Shield size={32} className="text-indigo-600 animate-pulse" /></div><div className="space-y-8"><SecurityNode label="Brute-force Interception" status="Locked" count="124" color="emerald" /><SecurityNode label="Cross-tenant Barrier" status="Stable" count="0 Violations" color="indigo" /><SecurityNode label="Master Key Rotation" status="Required" count="12 days ago" color="rose" /></div></div><div className="space-y-8"><div className="glass-card p-8 bg-slate-900 text-white relative overflow-hidden group"><div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px]" /><Activity className="text-indigo-400 mb-6" size={32} /><h4 className="text-lg font-black uppercase tracking-tighter mb-2">Entropy Shield</h4><p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8">Node integrity is scanned every 60 seconds.</p><button onClick={refreshAll} className="w-full py-4 bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 hover:bg-white/20 transition-all ">FORCE RE-SCAN</button></div></div></div></div>
        )}

        {/* SYSTEM AUDIT (MASTER LOGS) */}
        {activeTab === "System Audit" && (
           <div className="space-y-8 animate-in fade-in duration-700"><div className="glass-card overflow-hidden"><div className="p-8 border-b border-slate-100 flex items-center justify-between"><h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Diagnostic Master Logs</h3><button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 active:scale-110 transition-all">Export JSON-D</button></div><div className="p-0"><div className="bg-slate-950 p-8  text-[11px] text-indigo-400 h-[600px] overflow-y-auto space-y-1">{globalLogs.length > 0 ? globalLogs.map((log, i) => (<div key={i} className="hover:bg-white/5 p-1 rounded  border-l-2 border-transparent hover:border-indigo-500 transition-colors"><span className="text-slate-600 text-[10px] uppercase">[{new Date(log.createdAt).toISOString()}]</span><span className="text-emerald-500 ml-2 font-black">SUCCESS:</span><span className="text-white ml-2 uppercase">[{log.resource}]</span><span className="text-slate-200 ml-2">{log.description}</span><span className="text-indigo-500/60 ml-2 ">AUTH: {log.userName}</span></div>)) : (<div className="flex items-center justify-center h-full text-slate-600 uppercase font-black text-xs tracking-widest animate-pulse">-- AWAITING SYSTEM TELEMETRY --</div>)}</div></div></div></div>
        )}

        {/* PLAN REGISTRY */}
        {activeTab === "Plan Protocol" && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between"><div><h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Monetization Registry</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">SaaS Tier Configurations</p></div><button onClick={() => { setPlanFormData({ name: "", priceMonthly: 0, priceYearly: 0, maxInvoicesPerMonth: 50, maxProducts: 100, maxUsers: 2, features: ["Basic Inventory"] }); setShowPlanModal({ mode: 'create' }); }} className="btn-primary flex items-center gap-2 px-6 py-4 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"><Plus size={18} /><span className="text-[11px] font-black uppercase tracking-widest">Define Tier</span></button></div>
            <div className="grid grid-cols-3 gap-6">
              {plans.map((plan, i) => (
                <div key={i} className="glass-card p-10 group relative overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
                  <div className="flex items-center justify-between mb-8"><div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg rotate-3"><CreditCard size={28} /></div><div className="flex gap-2"><button onClick={() => { setPlanFormData(plan); setShowPlanModal(plan); }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all"><Edit3 size={15} /></button><button onClick={async () => { if(confirm("Archival sequence?")) { await api.delete(`/superadmin/auth/plans/${plan._id}`); fetchPlans(); } }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 transition-all"><Trash2 size={15} /></button></div></div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-8"><span className="text-4xl font-black text-indigo-600">₹{plan.priceMonthly}</span><span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">/ Master Sync</span></div>
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between text-[11px] font-black text-slate-600 border-b border-slate-100 pb-3"><span className="uppercase text-slate-400 tracking-widest">Product Quota</span><span className="text-slate-900">{plan.maxProducts} units</span></div>
                    <div className="flex items-center justify-between text-[11px] font-black text-slate-600 border-b border-slate-100 pb-3"><span className="uppercase text-slate-400 tracking-widest">User Slots</span><span className="text-slate-900">{plan.maxUsers} limit</span></div>
                  </div>
                  <div className="space-y-2 pt-2">{plan.features.map((f: string, idx: number) => (<div key={idx} className="flex items-center gap-2.5 text-[10px] font-bold text-slate-500 uppercase"><CheckCircle2 size={14} className="text-emerald-500" />{f}</div>))}</div>
                </div>
              ))}
              {plans.length === 0 && <div className="col-span-3 py-20 text-center glass-card border-dashed border-2 border-slate-200 uppercase font-black text-slate-300 text-xs tracking-[0.4em]">-- NO TIERS REGISTERED --</div>}
            </div>
          </div>
        )}

      </main>

      {/* MODALS */}
      
      {/* Node Control Modal */}
      {showBusinessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20">
            <div className="p-10 border-b border-slate-100 flex justify-between items-start">
              <div><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">Node Oversight</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{showBusinessModal.businessName} [ {showBusinessModal.businessId} ]</p></div>
              <button onClick={() => setShowBusinessModal(null)} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-1 gap-4">
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block leading-none">Security Protocol State</span><div className="flex items-center justify-between">
                    <div className="flex items-center gap-3"><div className={`w-3 h-3 rounded-full ${showBusinessModal.isActive ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'}`} /><span className="text-[14px] font-black uppercase text-slate-800">{showBusinessModal.status?.toUpperCase()}</span></div>
                    <div className="flex gap-2">
                        {showBusinessModal.status !== 'active' && <button onClick={() => updateNodeStatus(showBusinessModal.businessId, 'activate')} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-100">Restore</button>}
                        {showBusinessModal.status !== 'inactive' && <button onClick={() => updateNodeStatus(showBusinessModal.businessId, 'deactivate')} className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200">Detach</button>}
                        {showBusinessModal.status !== 'suspended' && <button onClick={() => { const r = prompt("Enter suspension reason:"); if(r) updateNodeStatus(showBusinessModal.businessId, 'suspend', r); }} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-100">Suspend</button>}
                    </div>
                </div></div>
              </div>

              <div className="space-y-6">
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">Assigned Hub Tier</label><select value={editFormData.plan} onChange={(e) => setEditFormData({...editFormData, plan: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-2xl text-[12px] font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none cursor-pointer">{plans.map(p => <option key={p.name} value={p.name}>{p.name.toUpperCase()} HUB</option>)}</select></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">Uplink Date</label><input type="date" value={editFormData.planStartDate} onChange={(e) => setEditFormData({...editFormData, planStartDate: e.target.value})} className="w-full p-4 bg-slate-50 border-none rounded-xl text-[12px] font-black outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all " /></div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">Protocol Expiry</label><input type="date" value={editFormData.planEndDate} onChange={(e) => setEditFormData({...editFormData, planEndDate: e.target.value})} className="w-full p-4 bg-slate-50 border-none rounded-xl text-[12px] font-black outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all " /></div>
                </div>
              </div>

              <button onClick={() => updateNodePlan(showBusinessModal.businessId)} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-[12px] uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl active:scale-95 group">Execute Master Update <Zap size={16} className="inline ml-2 group-hover:text-amber-400 transition-colors" /></button>
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
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-3">Credential Rotation</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Assigning new Master Key for Node [ {showResetPassword.businessId} ]</p>
              </div>
              <div className="w-full space-y-4">
                <NexusInput label="New Master Password" type="password" value={newPasswordValue} onChange={setNewPasswordValue} required minLength={8} />
              </div>
              <div className="w-full flex flex-col gap-3">
                <button type="submit" className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black text-[12px] uppercase tracking-widest hover:bg-amber-600 active:scale-95 transition-all shadow-lg shadow-amber-500/20">Rotate Credentials</button>
                <button type="button" onClick={() => { setShowResetPassword(null); setNewPasswordValue(""); }} className="w-full py-5 bg-slate-100 text-slate-400 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200">Abort Protocol</button>
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
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-3">Nuclear Deletion?</h3>
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest leading-relaxed px-2">Permanent erasure protocol for <span className="text-rose-500 underline decoration-indigo-200 underline-offset-4 font-black">{showDeleteConfirm.businessName} [ {showDeleteConfirm.businessId} ]</span> and all associated staff telemetry.</p>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={() => deleteNodePermanently(showDeleteConfirm.businessId)} className="w-full py-6 bg-rose-500 text-white rounded-2xl font-black text-[12px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg active:scale-95 shadow-rose-500/20">Verify Nuclear Purge</button>
                <button onClick={() => setShowDeleteConfirm(null)} className="w-full py-6 bg-slate-100 text-slate-400 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Cancel</button>
              </div>
           </div>
        </div>
      )}

      {/* Plan Modal (Defining Tiers) */}
      {showPlanModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
           <form onSubmit={handlePlanSubmit} className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-white/20"><div className="p-10 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10"><div><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{showPlanModal.mode === 'create' ? 'Define New Tier' : 'Edit Protocol'}</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Master Service Definitions</p></div><button type="button" onClick={() => setShowPlanModal(null)} className="p-3 bg-slate-50 rounded-2xl"><X size={20} /></button></div><div className="p-10 space-y-8 flex-1 overflow-y-auto"><div className="grid grid-cols-2 gap-8"><div className="space-y-6"><NexusInput label="Protocol Designation" value={planFormData.name} onChange={(v: string) => setPlanFormData({...planFormData, name: v})} placeholder="MAXIMA" /><NexusInput label="Monthly Token (₹)" type="number" value={planFormData.priceMonthly} onChange={(v: string) => setPlanFormData({...planFormData, priceMonthly: parseInt(v)})} /></div><div className="space-y-6"><NexusInput label="Product Capacity" type="number" value={planFormData.maxProducts} onChange={(v: string) => setPlanFormData({...planFormData, maxProducts: parseInt(v)})} /><NexusInput label="User Slots" type="number" value={planFormData.maxUsers} onChange={(v: string) => setPlanFormData({...planFormData, maxUsers: parseInt(v)})} /></div></div><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 ml-2">Feature Set Allocation</label><textarea className="w-full p-6 bg-slate-50 border-none rounded-3xl text-[13px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 min-h-[140px] resize-none" placeholder="ONE FEATURE PER LINE..." value={Array.isArray(planFormData.features) ? planFormData.features.join('\n') : planFormData.features} onChange={(e) => setPlanFormData({...planFormData, features: e.target.value.split('\n')})} /></div></div><div className="p-10 pt-0 bg-white"><button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-[12px] uppercase tracking-[0.2em] hover:bg-slate-900 transition-all shadow-xl active:scale-95 group">Publish Protocol Signal {showPlanModal.mode === 'create' ? <Plus size={18} className="inline ml-2 group-hover:rotate-90 transition-transform" /> : <RefreshCcw size={18} className="inline ml-2 group-hover:rotate-180 transition-transform" />}</button></div></form>
        </div>
      )}

    </div>
  );
}

{/* REUSABLE UI COMPONENTS */}

function SecurityNode({ label, status, count, color }: any) {
   const colors: any = { emerald: "bg-emerald-50 text-emerald-600 border-emerald-100", indigo: "bg-indigo-50 text-indigo-600 border-indigo-100", rose: "bg-rose-50 text-rose-600 border-rose-100" };
   return (<div className={`p-6 border rounded-[2rem] flex items-center justify-between transition-all hover:scale-[1.01] ${colors[color]}`}><div><p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">{label}</p><h4 className="text-lg font-black uppercase tracking-tighter leading-none">{status}</h4></div><div className="text-right"><span className="text-[14px] font-black uppercase tracking-widest ">{count}</span></div></div>);
}

function NexusStatCard({ label, value, icon: Icon, grow, color, delay }: any) {
  const colorMap: any = { indigo: "bg-indigo-50 text-indigo-600 border-indigo-100", emerald: "bg-emerald-50 text-emerald-600 border-emerald-100", violet: "bg-violet-50 text-violet-600 border-violet-100", rose: "bg-rose-50 text-rose-600 border-rose-100" };
  return (<div className="glass-card p-10 group relative overflow-hidden animate-in zoom-in-95 duration-500 hover:shadow-2xl hover:scale-[1.02] transition-all" style={{ animationDelay: `${delay}ms` }}><div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-125 transition-transform duration-700"><Icon size={100} /></div><div className="flex items-center justify-between mb-10"><div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm group-hover:rotate-[15deg] transition-all duration-500 ${colorMap[color]}`}><Icon size={28} /></div><div className="flex items-center gap-1.5"><span className={`text-[11px] font-black uppercase tracking-widest ${colorMap[color].split(' ')[1]}`}>{grow}</span></div></div><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">{label}</p><h3 className="text-4xl font-bold text-slate-900 tracking-tight group-hover:scale-105 transition-transform origin-left leading-none">{value}</h3></div>);
}

function SystemPipe({ label, percent, color, isValueOnly }: any) {
  return (<div className="group"><div className="flex items-center justify-between mb-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] group-hover:text-slate-900 transition-colors">{label}</p><span className="text-[12px] font-black text-slate-900 uppercase ">{percent}</span></div>{!isValueOnly && (<div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5"><div className={`h-full ${color} rounded-full transition-all duration-[2s] ease-out group-hover:brightness-110 shadow-sm`} style={{ width: percent }} /></div>)}</div>);
}

function NexusInput({ label, type = "text", value, onChange, placeholder, required = false, minLength }: any) {
  return (<div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2">{label}</label><input type={type} value={value} placeholder={placeholder} required={required} minLength={minLength} onChange={(e) => onChange(e.target.value)} className="w-full p-5 bg-slate-50 border-none rounded-2xl text-[13px] font-extrabold outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-300 transition-all font-inter" /></div>);
}

const menuItems = [
  { title: "Command Center", icon: Layout },
  { title: "Node Registry", icon: Building2 },
  { title: "Plan Protocol", icon: Activity },
  { title: "Provisioning", icon: Zap },
  { title: "Security Matrix", icon: Shield },
  { title: "System Audit", icon: Clock },
];
