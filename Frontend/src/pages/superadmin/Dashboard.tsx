import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  Activity,
  RefreshCcw,
  Trash2,
  X,
  TrendingUp,
  PieChart as PieIcon,
  Printer,
  MessageCircle,
  QrCode
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';

const SuperAdminDashboard: React.FC = () => {
  const location = useLocation();
  const { notifications, unreadCount, markAllAsRead, deleteAllNotifications, markAsRead, deleteNotification, loadMore, hasMore, loading: notificationsLoading } = useNotify();
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [statsRes, transRes] = await Promise.all([
        api.get('/superadmin/auth/stats'),
        api.get('/superadmin/auth/transactions')
      ]);
      setStats(statsRes.data.stats);
      setTransactions(transRes.data.transactions);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);
  
  // ── Anchor Navigation Protocol ───────────────────────────────────────────
  useEffect(() => {
    if (location.hash === '#global-audit-log') {
      const el = document.getElementById('global-audit-log');
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location.hash, notifications]); // Trigger on hash change or notification load

  return (
    <>
    <div className="space-y-4 min-h-screen pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">SuperAdmin Dashboard</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Global platform monitoring and administrative governance</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-medium uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95"
        >
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /> Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2">
        <SuperStat label="BUSINESS ADMINS" value={stats?.businessCount || 0} icon={Users} color="indigo" sub="TOTAL NODES" />
        <SuperStat label="ACTIVE PLANS" value={stats?.activeSubscriptions || 0} icon={ShieldCheck} color="emerald" sub="+5 this week" />
        <SuperStat label="EXPIRED PLANS" value={stats?.expiredCount || 0} icon={AlertTriangle} color="rose" sub="ACTION REQUIRED" />
        <SuperStat label="MONTHLY REVENUE" value={`₹${((stats?.totalRevenue || 0) / 100000).toFixed(1)}L`} icon={CreditCard} color="amber" sub="GLOBAL FLOW" />
      </div>

      {/* ── Platform Pulse: Growth & Market Share ── */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 px-2">
        {/* Registration Trend (Small UI) */}
        <div className="lg:col-span-6 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <TrendingUp size={14} className="text-indigo-500" /> Platform Growth Pulse
              </h3>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">30-Day Registration Velocity</p>
            </div>
          </div>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={stats?.registrationTrend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="_id" 
                  tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600, fontFamily: 'Inter' }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600, fontFamily: 'Inter' }}
                  axisLine={false}
                  tickLine={false}
                  width={25}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontFamily: 'Inter', fontSize: 10, fontWeight: 600 }}
                  labelStyle={{ color: '#6366f1', marginBottom: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  name="New Nodes"
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  dot={{ fill: '#6366f1', strokeWidth: 2, r: 4, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  label={{ position: 'top', fill: '#6366f1', fontSize: 10, fontWeight: 700, dy: -5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Recent Registrations List (User ID & Plan focus) */}
          <div className="mt-4 pt-4 border-t border-slate-50 overflow-x-auto no-scrollbar">
            <div className="flex gap-3 pb-2">
              {stats?.recentRegistrations?.map((reg: any) => (
                <div key={reg.businessId} className="shrink-0 p-3 bg-slate-50 border border-slate-100 rounded-xl min-w-[140px]">
                   <p className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">{reg.businessId}</p>
                   <p className="text-[10px] font-semibold text-slate-800 truncate mt-1">{reg.businessName}</p>
                   <div className="flex items-center justify-between mt-2">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        reg.plan === 'enterprise' ? 'bg-indigo-100 text-indigo-700' : 
                        reg.plan === 'pro'        ? 'bg-emerald-100 text-emerald-700' : 
                                                    'bg-slate-200 text-slate-600'
                      }`}>{reg.plan}</span>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Plan Distribution (Small UI) */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <PieIcon size={14} className="text-emerald-500" /> Plan Distribution
              </h3>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Market Share Composition</p>
            </div>
          </div>
          <div className="flex-1 flex items-center">
            <div className="h-[140px] w-1/2">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={stats?.planDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="_id"
                  >
                    {(stats?.planDistribution || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry._id === 'enterprise' ? '#6366f1' : entry._id === 'pro' ? '#10b981' : '#cbd5e1'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontFamily: 'Inter', fontSize: 10, fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-2 pl-4">
              {stats?.planDistribution?.map((entry: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${entry._id === 'enterprise' ? 'bg-indigo-500' : entry._id === 'pro' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">{entry._id}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-900">{entry.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Analytical Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 ">
        <div className="lg:col-span-6 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-slate-800 uppercase tracking-tight">Subscription Intelligence</h2>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Actionable Account Governance</p>
            </div>
            <div className="flex items-center gap-2">
               <div className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[9px] font-semibold uppercase tracking-widest border border-rose-100">
                  {stats?.expiringSoon?.length || 0} Expiring Soon
               </div>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-2 no-scrollbar">
            {(!stats?.expiringSoon?.length && !stats?.recentlyExpired?.length) ? (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                 <ShieldCheck size={48} className="text-slate-200 mb-2" />
                 <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-[0.2em]">All Systems Nominal</p>
              </div>
            ) : (
              <>
                {stats?.expiringSoon?.map((biz: any) => (
                  <div key={biz.businessId} className="flex items-center justify-between p-4 bg-amber-50/30 border border-amber-100 rounded-2xl group hover:bg-amber-50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-semibold text-xs">
                        {biz.businessName?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-tight truncate max-w-[150px]">{biz.businessName || 'Unknown Node'}</h4>
                        <p className="text-[9px] font-semibold text-amber-600 uppercase tracking-widest mt-0.5">Expiring in {Math.ceil((new Date(biz.planEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} Days</p>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 bg-white border border-amber-200 text-amber-700 text-[8px] font-semibold uppercase tracking-widest rounded-lg hover:bg-amber-600 hover:text-white transition-all shadow-sm active:scale-95">
                      Notify
                    </button>
                  </div>
                ))}

                {stats?.recentlyExpired?.map((biz: any) => (
                  <div key={biz.businessId} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl opacity-75 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center font-semibold text-xs">
                        {biz.businessName?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-tight truncate max-w-[150px]">{biz.businessName || 'Unknown Node'}</h4>
                        <p className="text-[9px] font-semibold text-rose-500 uppercase tracking-widest mt-0.5">Expired on {new Date(biz.planEndDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 bg-rose-600 text-white text-[8px] font-bold uppercase tracking-widest rounded-lg hover:bg-rose-700 transition-all shadow-md active:scale-95">
                      Suspend
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div id="global-audit-log" className="lg:col-span-4 bg-slate-900 rounded-[2rem] p-8 h-[400px] flex flex-col relative overflow-hidden shadow-2xl">
          <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
            <div>
              <h4 className="text-[10px] font-semibold text-indigo-400 tracking-[0.2em] uppercase">Global Audit Log</h4>
              <p className="text-[10px] font-semibold text-slate-500 uppercase mt-1 tracking-widest">Real-time system events</p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-semibold rounded-full animate-pulse uppercase">
                  {unreadCount} New
                </span>
              )}
              <button
                onClick={() => {
                  if (window.confirm('CRITICAL ACTION: Are you sure you want to permanently purge all system alerts? This action cannot be reversed.')) {
                    markAllAsRead(); 
                    deleteAllNotifications();
                  }
                }}
                className="p-2 bg-white/5 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-all rounded-xl font-medium"
                title="Purge All Alerts"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="space-y-4 overflow-y-auto no-scrollbar flex-1 pb-4">
            {notifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20">
                <Activity size={32} className="text-slate-500 mb-2" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">No Events Found</p>
              </div>
            ) : notifications.slice(0, 15).map(n => (
              <div 
                key={n._id} 
                onClick={() => !n.isRead && markAsRead(n._id)}
                onDoubleClick={() => !n.isRead && markAsRead(n._id)}
                className={`flex items-start gap-3 group border-white/5 cursor-pointer p-2 rounded-xl transition-all hover:bg-white/5 active:scale-[0.98] ${!n.isRead ? 'bg-white/[0.03]' : ''}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                  n.type === 'success' ? 'bg-emerald-500' :
                  n.type === 'warning' ? 'bg-amber-500' :
                  n.type === 'error' ? 'bg-rose-500' :
                  'bg-indigo-500'
                } ${!n.isRead ? 'animate-pulse' : 'opacity-40'}`}></div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-relaxed transition-colors ${!n.isRead ? 'font-bold text-white' : 'font-normal text-white/50 group-hover:text-indigo-400'}`}>
                    {n.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    {!n.isRead && <span className="text-[8px] font-semibold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-1.5 py-0.5 rounded">Unread</span>}
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Delete this specific alert?')) {
                      deleteNotification(n._id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 transition-all rounded-lg shrink-0"
                  title="Delete Alert"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={notificationsLoading}
                className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {notificationsLoading ? 'Synchronizing Nexus...' : 'Load Older Events'}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 px-2">
        <div className="lg:col-span-10 bg-slate-900 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
           {/* Animated Background Glow */}
           <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full -mr-20 -mt-20 group-hover:bg-indigo-500/20 transition-all duration-700"></div>
           
           <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                 <div>
                    <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <CreditCard size={14} /> Global Revenue Flux
                    </h3>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-1">6-Month Fiscal Forensics: Master Node Flow</p>
                 </div>
                 <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Total Yield: </span>
                    <span className="text-sm font-black text-white ml-2">₹{(stats?.totalRevenue || 0).toLocaleString()}</span>
                 </div>
              </div>

              <div className="h-[240px] w-full">
                 <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={stats?.monthlyRevenue || []}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                       <XAxis 
                          dataKey="_id" 
                          tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600, fontFamily: 'Inter' }}
                          axisLine={false}
                          tickLine={false}
                          dy={10}
                       />
                       <YAxis 
                          tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600, fontFamily: 'Inter' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}
                          width={35}
                       />
                       <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                          contentStyle={{ background: '#0f172a', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)', fontFamily: 'Inter', fontSize: 10, fontWeight: 600 }}
                          itemStyle={{ color: '#818cf8' }}
                          formatter={(v: any) => [`₹${v.toLocaleString()}`, 'Revenue']}
                       />
                       <Bar 
                          dataKey="revenue" 
                          fill="url(#revGradient)" 
                          radius={[6, 6, 0, 0]} 
                          barSize={40}
                          label={{ position: 'top', fill: '#818cf8', fontSize: 10, fontWeight: 700, dy: -10, formatter: (v: any) => `₹${(v/1000).toFixed(1)}k` }}
                       >
                          <defs>
                             <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#4338ca" />
                             </linearGradient>
                          </defs>
                       </Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
      </div>

      {/* ── Master Transaction Registry: Global Subscription Flow ── */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 px-2">
         <div className="lg:col-span-10 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
               <div>
                  <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                     <CreditCard size={14} className="text-emerald-500" /> Master Transaction Registry
                  </h3>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Global Subscription History & Fiscal Forensics</p>
               </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
               <table className="w-full text-left border-separate border-spacing-y-2">
                  <thead>
                     <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <th className="px-4 pb-2">Business</th>
                        <th className="px-4 pb-2">Plan</th>
                        <th className="px-4 pb-2">Date</th>
                        <th className="px-4 pb-2 text-right">Amount</th>
                        <th className="px-4 pb-2">Transaction ID</th>
                        <th className="px-4 pb-2">Source</th>
                     </tr>
                  </thead>
                  <tbody>
                     {transactions.length === 0 ? (
                        <tr>
                           <td colSpan={6} className="text-center py-20 opacity-20">
                              <Activity size={48} className="mx-auto mb-4 text-slate-300" />
                              <p className="text-[10px] font-semibold uppercase tracking-widest">No Fiscal Records Synchronized</p>
                           </td>
                        </tr>
                     ) : transactions.map((tx, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50 transition-all rounded-2xl">
                           <td className="px-4 py-4 bg-slate-50/50 group-hover:bg-white border-y border-l border-slate-100 rounded-l-2xl">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 bg-white border border-slate-200 text-slate-600 rounded-lg flex items-center justify-center font-bold text-[10px] shadow-sm">
                                    {tx.businessName?.charAt(0)}
                                 </div>
                                 <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-slate-800 truncate uppercase">{tx.businessName}</p>
                                    <p className="text-[9px] font-semibold text-indigo-500 tracking-widest">{tx.businessId}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-4 py-4 bg-slate-50/50 group-hover:bg-white border-y border-slate-100">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${
                                 tx.plan === 'enterprise' ? 'bg-indigo-100 text-indigo-700' :
                                 tx.plan === 'pro'        ? 'bg-emerald-100 text-emerald-700' :
                                                            'bg-slate-200 text-slate-600'
                              }`}>{tx.plan} Protocol</span>
                              <p className="text-[8px] font-semibold text-slate-400 mt-1 uppercase">Validity: {new Date(tx.startDate).toLocaleDateString()} - {new Date(tx.endDate).toLocaleDateString()}</p>
                           </td>
                           <td className="px-4 py-4 bg-slate-50/50 group-hover:bg-white border-y border-slate-100">
                              <p className="text-[11px] font-bold text-slate-800 uppercase">{new Date(tx.assignedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{new Date(tx.assignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                           </td>
                           <td className="px-4 py-4 bg-slate-50/50 group-hover:bg-white border-y border-slate-100 text-right">
                              <p className="text-[13px] font-black text-slate-900 leading-none">₹{(tx.amountPaid || 0).toLocaleString()}</p>
                              <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Settled</p>
                           </td>
                           <td className="px-4 py-4 bg-slate-50/50 group-hover:bg-white border-y border-slate-100">
                              <div className="space-y-1">
                                 <button 
                                    onClick={() => { setSelectedTx(tx); setShowInvoice(true); }}
                                    className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
                                 >
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                    <p className="text-[9px] font-bold font-mono">{tx.transactionId || 'LEGACY-TXN'}</p>
                                 </button>
                                 {tx.razorpayPaymentId && (
                                    <p className="text-[8px] font-semibold text-slate-400 pl-3 uppercase">Gateway: {tx.razorpayPaymentId}</p>
                                 )}
                              </div>
                           </td>
                           <td className="px-4 py-4 bg-slate-50/50 group-hover:bg-white border-y border-r border-slate-100 rounded-r-2xl">
                              <div className="flex items-center gap-2">
                                 <ShieldCheck size={12} className={tx.assignedBy === 'superadmin' ? 'text-indigo-500' : 'text-slate-400'} />
                                 <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">{tx.assignedBy}</span>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>

    {/* ── Nexus Subscription Invoice Modal ── */}
    {showInvoice && selectedTx && (
      <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto pt-20 pb-10">
        <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden relative animate-in fade-in slide-in-from-top-10 duration-500">
          {/* Close Button - Optimized Placement */}
          <button 
            onClick={() => setShowInvoice(false)}
            className="absolute top-4 right-4 p-1.5 bg-white/10 text-white/40 hover:text-white hover:bg-white/20 rounded-full transition-all z-[210] border border-white/5 backdrop-blur-md"
          >
            <X size={16} />
          </button>

          {/* Invoice Header */}
          <div className="bg-slate-900 pt-12 pb-8 px-8 text-white relative overflow-hidden shrink-0 border-b border-white/5">
             <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full -mr-16 -mt-16"></div>
             <div className="relative z-10 flex justify-between items-center pr-10">
                <div>
                   <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[7px] font-black uppercase tracking-[0.4em] text-emerald-400">Master Node Issued</span>
                   </div>
                   <h2 className="text-xl font-black tracking-tighter text-indigo-400 leading-none">NEXUS<span className="text-white">BILL</span></h2>
                   <p className="text-[7px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1.5">Authorized Fiscal Artifact</p>
                </div>
                <div className="text-right">
                   <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Digital Manifest ID</p>
                   <h3 className="text-sm font-mono font-bold tracking-tight">{selectedTx.transactionId || 'LEGACY-TXN'}</h3>
                   <p className="text-[7px] font-medium text-slate-500 uppercase mt-1">Issued By: Nexus Global Master Admin</p>
                </div>
             </div>
          </div>

          {/* Invoice Body */}
          <div className="p-8 space-y-6">
             <div className="grid grid-cols-2 gap-8">
                <div>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Billed Recipient</p>
                   <h4 className="text-xs font-bold text-slate-900 uppercase">{selectedTx.businessName}</h4>
                   <p className="text-[10px] text-slate-600 font-medium mt-1">{selectedTx.ownerFullName}</p>
                   <p className="text-[10px] text-slate-500">{selectedTx.email}</p>
                   <p className="text-[10px] text-slate-500">{selectedTx.mobileNumber}</p>
                   {selectedTx.location && (
                      <p className="text-[10px] text-slate-400 mt-1 italic">
                         {selectedTx.location.city}, {selectedTx.location.state}
                      </p>
                   )}
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Fiscal Timeline</p>
                   <p className="text-[10px] text-slate-600 font-semibold">Processed: {new Date(selectedTx.assignedAt).toLocaleDateString()}</p>
                   <p className="text-[10px] text-slate-600 font-semibold mt-0.5">Gateway: {selectedTx.razorpayPaymentId ? 'Razorpay' : 'Nexus Internal'}</p>
                   {selectedTx.gstin && <p className="text-[10px] text-slate-600 font-semibold mt-0.5 uppercase">GSTIN: {selectedTx.gstin}</p>}
                </div>
             </div>

             <div className="border-y border-slate-100 py-6">
                <table className="w-full">
                   <thead>
                      <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                         <th className="text-left pb-4">Description</th>
                         <th className="text-center pb-4">Period</th>
                         <th className="text-right pb-4">Amount</th>
                      </tr>
                   </thead>
                   <tbody>
                      <tr>
                         <td className="py-2">
                            <p className="text-sm font-bold text-slate-800 uppercase">Nexus {selectedTx.plan} Subscription</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Full infrastructure access with managed nodes</p>
                         </td>
                         <td className="text-center py-2">
                            <p className="text-xs font-semibold text-slate-600 uppercase tracking-tighter">
                               {new Date(selectedTx.startDate).toLocaleDateString()} - {new Date(selectedTx.endDate).toLocaleDateString()}
                            </p>
                         </td>
                         <td className="text-right py-2">
                            <p className="text-sm font-black text-slate-900">₹{(selectedTx.amountPaid || 0).toLocaleString()}</p>
                         </td>
                      </tr>
                   </tbody>
                </table>
             </div>

             <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <div className="flex items-center gap-4">
                   <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-1 grid grid-cols-4 grid-rows-4 gap-0.5 opacity-20">
                         {Array.from({ length: 16 }).map((_, i) => (
                            <div key={i} className="bg-slate-900 rounded-[1px]"></div>
                         ))}
                      </div>
                      <p className="text-[6px] font-bold text-slate-400 uppercase text-center leading-none z-10 px-1">Fiscal<br/>Verify</p>
                   </div>
                   <div className="max-w-[180px]">
                      <p className="text-[8px] font-bold text-slate-400 uppercase leading-relaxed">
                         This is a cryptographically signed artifact from the Nexus Node. No physical signature required.
                      </p>
                   </div>
                </div>
                <div className="text-right">
                   <div className="bg-indigo-50 px-5 py-3 rounded-2xl min-w-[160px]">
                      <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">Total Yield</p>
                      <h2 className="text-2xl font-black text-slate-900 mt-0.5">₹{(selectedTx.amountPaid || 0).toLocaleString()}</h2>
                   </div>
                </div>
             </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
             <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const text = `*NexusBill Subscription Invoice*%0A%0A*Business:* ${selectedTx.businessName}%0A*Plan:* ${selectedTx.plan.toUpperCase()}%0A*Amount:* ₹${selectedTx.amountPaid}%0A*Date:* ${new Date(selectedTx.assignedAt).toLocaleDateString()}%0A*Transaction ID:* ${selectedTx.transactionId}%0A%0A_Generated by Nexus Master Node_`;
                    window.open(`https://wa.me/?text=${text}`, '_blank');
                  }}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-md active:scale-95"
                >
                   <MessageCircle size={14} /> WhatsApp
                </button>
                <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-md active:scale-95"
                >
                   <Printer size={14} /> Print
                </button>
             </div>
             <button 
               onClick={() => setShowInvoice(false)}
               className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl text-[9px] font-bold uppercase hover:bg-slate-100 transition-all active:scale-95 shadow-sm"
             >
                Dismiss
             </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

function SuperStat({ label, value, icon: Icon, color, sub }: any) {
  const colors: any = {
    indigo: 'border-l-indigo-600 text-indigo-600 bg-indigo-50/50',
    rose: 'border-l-rose-600 text-rose-600 bg-rose-50/50',
    amber: 'border-l-amber-600 text-amber-600 bg-amber-50/50',
    emerald: 'border-l-emerald-600 text-emerald-600 bg-emerald-50/50',
  };
  
  return (
    <div className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md group relative overflow-hidden border-l-4 ${colors[color].split(' ')[0]}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${colors[color]} border border-white/50 shadow-sm`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1 leading-tight">{label}</p>
        <h3 className="text-2xl font-semibold text-slate-900 leading-none truncate mb-1">{typeof value === 'number' ? value.toLocaleString() : value}</h3>
        {sub && <p className={`text-[8px] font-semibold uppercase tracking-tighter ${color === 'rose' ? 'text-rose-500' : 'text-emerald-600'}`}>{sub}</p>}
      </div>
    </div>
  );
}



export default SuperAdminDashboard;
