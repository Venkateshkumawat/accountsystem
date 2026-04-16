import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  Activity,
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

  return (
    <div className="space-y-4 min-h-screen pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">SuperAdmin Dashboard</h1>
          <p className="text-sm font-normal text-slate-500 mt-1">Global platform monitoring and administrative governance</p>
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
        <SuperStat label="MONTHLY REVENUE" value="₹4.2L" icon={CreditCard} color="amber" sub="GLOBAL FLOW" />
      </div>

      {/* Main Analytical Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 ">
        <div className="lg:col-span-6 bg-white border border-slate-100 rounded-[2rem] p-8 h-[400px] flex flex-col items-center justify-center text-center group transition-all relative overflow-hidden shadow-sm">
          <Activity size={48} className="mb-4 text-indigo-600 opacity-20 group-hover:opacity-100 transition-opacity" />
          <h2 className="text-base font-semibold text-slate-900 uppercase tracking-tight">System Performance</h2>
          <p className="text-sm font-normal text-slate-400 max-w-sm mt-3">Global activity monitoring and infrastructure scaling trends will appear here.</p>
        </div>

        <div className="lg:col-span-4 bg-slate-900 rounded-[2rem] p-8 h-[400px] flex flex-col relative overflow-hidden shadow-2xl">
          <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
            <div>
              <h4 className="text-[10px] font-bold text-indigo-400 tracking-[0.2em] uppercase">Global Audit Log</h4>
              <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">Real-time system events</p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-semibold rounded-full animate-pulse uppercase">
                  {unreadCount} New
                </span>
              )}
              <button
                onClick={() => { markAllAsRead(); deleteAllNotifications(); }}
                className="p-2 bg-white/5 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-all rounded-xl font-medium"
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
            ) : notifications.slice(0, 10).map(n => (
              <div key={n._id} className="flex items-start gap-3 group border-white/5">
                <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${n.type === 'success' ? 'bg-emerald-500' :
                  n.type === 'warning' ? 'bg-amber-500' :
                    n.type === 'error' ? 'bg-rose-500' :
                      'bg-indigo-500'
                  }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-normal text-white/90 leading-relaxed group-hover:text-indigo-400 transition-colors">{n.message}</p>
                  <p className="text-xs font-normal text-white/30 lowercase mt-1">{new Date(n.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
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
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 leading-tight">{label}</p>
        <h3 className="text-2xl font-black text-slate-900 leading-none truncate mb-1">{typeof value === 'number' ? value.toLocaleString() : value}</h3>
        {sub && <p className={`text-[8px] font-bold uppercase tracking-tighter ${color === 'rose' ? 'text-rose-500' : 'text-emerald-600'}`}>{sub}</p>}
      </div>
    </div>
  );
}



export default SuperAdminDashboard;
