import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  AlertTriangle, 
  CreditCard,
  TrendingUp,
  Activity,
  ArrowUpRight,
  RefreshCcw,
  Trash2
} from 'lucide-react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';

const SuperAdminDashboard: React.FC = () => {
  const { notifications, unreadCount, markAllAsRead, deleteAllNotifications } = useNotify();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/superadmin/auth/stats');
      setStats(res.data.stats);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  const statCards = [
    { label: 'Total Business Admins', value: stats?.businessCount || 0, icon: Users, color: 'indigo', sub: '+12% this month' },
    { label: 'Active Subscriptions', value: stats?.activeSubscriptions || 0, icon: ShieldCheck, color: 'emerald', sub: '98.5% uptime' },
    { label: 'Expired Plans', value: stats?.expiredCount || 0, icon: AlertTriangle, color: 'rose', sub: '3 pending renewals' },
    { label: 'Revenue Summary', value: '₹4.2L', icon: CreditCard, color: 'violet', sub: 'Monthly targets met' },
  ];

  return (
    <div className="space-y-4 min-h-screen pb-10">
      {/* Header Context */}
      <div className="flex justify-between items-center bg-white border border-slate-100 p-5 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <Activity size={20} />
           </div>
           <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tighter font-medium leading-none mb-1 text-slate-900">Master Terminal</h1>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-none">Nexus Governance Protocol v1.02</p>
           </div>
        </div>
        <button 
          onClick={fetchStats}
          className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all rounded-xl border border-slate-100 shadow-sm"
        >
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex flex-col justify-between group hover:border-indigo-600 transition-all relative overflow-hidden h-[100px]">
             <div className={`absolute -right-2 -bottom-2 w-16 h-16 opacity-5 rotate-12 transition-transform group-hover:scale-125 ${s.color === 'indigo' ? 'text-indigo-600' : s.color === 'emerald' ? 'text-emerald-600' : s.color === 'rose' ? 'text-rose-600' : 'text-violet-600'}`}>
              <s.icon size={50} />
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <div className={`p-1.5 rounded-lg ${s.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : s.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : s.color === 'rose' ? 'bg-rose-50 text-rose-600' : 'bg-violet-50 text-violet-600'}`}>
                <s.icon size={12} />
              </div>
              <div className="flex items-center gap-1 text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded text-xs font-black uppercase">
                <ArrowUpRight size={8} /> +2.5%
              </div>
            </div>
            
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5 leading-none">{s.label}</p>
              <h2 className="text-lg font-black text-slate-900 tracking-tight italic leading-none">
                {typeof s.value === 'number' ? s.value.toLocaleString('en-IN') : s.value}
              </h2>
              <p className="text-xs font-bold text-slate-300 mt-1 transition-opacity group-hover:opacity-100 opacity-60 font-medium">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder Activity Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 ">
        <div className="lg:col-span-6 bg-white border border-slate-100 rounded-xl p-6 h-64 flex flex-col items-center justify-center text-center opacity-40 grayscale group hover:grayscale-0 hover:opacity-100 transition-all cursor-not-allowed relative overflow-hidden">
          <Activity size={32} className="mb-4 text-indigo-600" />
          <h2 className="text-xl font-black text-slate-400 group-hover:text-slate-900 transition-colors font-medium tracking-tighter">Telemetery Node Flow</h2>
          <p className="text-slate-300 font-bold max-w-xs mt-2 uppercase text-xs tracking-widest leading-relaxed">Global scaling chart initializing... nexus connectivity verified for population.</p>
        </div>

        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-6 h-64 flex flex-col relative overflow-hidden ring-1 ring-slate-800">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h4 className="text-sm font-black text-indigo-400 font-medium tracking-[0.2em] leading-none mb-1 uppercase">Administrative Registry</h4>
              <p className="text-slate-500 font-black text-[10px] uppercase">Real-time audit log.</p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-black rounded-full animate-pulse uppercase tracking-widest">
                  {unreadCount} New
                </span>
              )}
              <button 
                onClick={markAllAsRead}
                onDoubleClick={deleteAllNotifications}
                className="p-1.5 bg-white/5 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-all rounded-lg"
                title="Singe Click: Archive | Double Click: Purge"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          
          <div className="space-y-3 overflow-y-auto no-scrollbar flex-1">
            {notifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20">
                <Activity size={24} className="text-slate-500 mb-2" />
                <p className="text-[10px] font-black text-slate-500 uppercase">Registry Clean</p>
              </div>
            ) : notifications.slice(0, 10).map(n => (
              <div key={n._id} className="flex items-start gap-3 border-b border-white/5 pb-3 last:border-0 hover:bg-white/5 p-1 transition-all rounded group">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  n.type === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                  n.type === 'warning' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                  n.type === 'error' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' :
                  'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-white/90 leading-tight uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{n.message}</p>
                  <p className="text-[8px] font-bold text-white/30 lowercase mt-1 italic">{new Date(n.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
