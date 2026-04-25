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
  X
} from 'lucide-react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';

const SuperAdminDashboard: React.FC = () => {
  const location = useLocation();
  const { notifications, unreadCount, markAllAsRead, deleteAllNotifications, markAsRead, deleteNotification, loadMore, hasMore, loading: notificationsLoading } = useNotify();
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
        <div className="lg:col-span-6 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-tight">Subscription Intelligence</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Actionable Account Governance</p>
            </div>
            <div className="flex items-center gap-2">
               <div className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-rose-100">
                  {stats?.expiringSoon?.length || 0} Expiring Soon
               </div>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-2 no-scrollbar">
            {(!stats?.expiringSoon?.length && !stats?.recentlyExpired?.length) ? (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                 <ShieldCheck size={48} className="text-slate-200 mb-2" />
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">All Systems Nominal</p>
              </div>
            ) : (
              <>
                {stats?.expiringSoon?.map((biz: any) => (
                  <div key={biz.businessId} className="flex items-center justify-between p-4 bg-amber-50/30 border border-amber-100 rounded-2xl group hover:bg-amber-50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-black text-xs">
                        {biz.name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight truncate max-w-[150px]">{biz.name || 'Unknown Node'}</h4>
                        <p className="text-[9px] font-semibold text-amber-600 uppercase tracking-widest mt-0.5">Expiring in {Math.ceil((new Date(biz.planEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} Days</p>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 bg-white border border-amber-200 text-amber-700 text-[8px] font-bold uppercase tracking-widest rounded-lg hover:bg-amber-600 hover:text-white transition-all shadow-sm active:scale-95">
                      Notify
                    </button>
                  </div>
                ))}

                {stats?.recentlyExpired?.map((biz: any) => (
                  <div key={biz.businessId} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl opacity-75 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center font-black text-xs">
                        {biz.name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-tight truncate max-w-[150px]">{biz.name || 'Unknown Node'}</h4>
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
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    {!n.isRead && <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-1.5 py-0.5 rounded">Unread</span>}
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
                className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {notificationsLoading ? 'Synchronizing Nexus...' : 'Load Older Events'}
              </button>
            )}
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
