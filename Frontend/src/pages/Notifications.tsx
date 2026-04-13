import { useState, useMemo } from 'react';
import {
  Bell,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Zap,
} from 'lucide-react';
import { useNotify } from '../context/NotificationContext';
import toast from 'react-hot-toast';

export default function Notifications() {
  const { notifications, unreadCount, markAsRead, deleteAllNotifications, deleteNotification, loading } = useNotify();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'success' | 'info' | 'error' | 'warning'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [visibleLimit, setVisibleLimit] = useState(3);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={18} className="text-emerald-500" />;
      case 'error': return <XCircle size={18} className="text-rose-500" />;
      case 'warning': return <AlertTriangle size={18} className="text-amber-500" />;
      default: return <Info size={18} className="text-indigo-500" />;
    }
  };

  const filteredNotifications = useMemo(() => {
    let result = notifications.filter(n =>
      n.message.toLowerCase().includes(search.toLowerCase())
    );

    if (typeFilter !== 'all') {
      result = result.filter(n => n.type === typeFilter);
    }

    if (timeFilter !== 'all') {
      const now = new Date();
      result = result.filter(n => {
        const nodeDate = new Date(n.createdAt);
        if (timeFilter === 'today') return nodeDate.toDateString() === now.toDateString();
        if (timeFilter === 'week') return (now.getTime() - nodeDate.getTime()) / (1000 * 60 * 60 * 24) <= 7;
        if (timeFilter === 'month') return nodeDate.getMonth() === now.getMonth() && nodeDate.getFullYear() === now.getFullYear();
        return true;
      });
    }

    return result;
  }, [notifications, search, typeFilter, timeFilter]);

  const handleClearRegistry = () => {
    if (confirm("Are you sure you want to permanently clear the entire event registry? This action cannot be undone.")) {
      deleteAllNotifications();
      toast.success("Audit Registry Purged");
    }
  };

  const handlePurgeLog = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Permanently delete this event log? This cannot be undone.")) {
      deleteNotification(id);
      toast.success("Audit Node Purged Permanently");
    }
  };

  const acknowledgeLog = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead(id);
    toast.success("Log Node Acknowledged");
  };

  return (
    <div className="nexus-container py-6 lg:py-10 animate-in fade-in duration-500">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Zap size={10} className="text-indigo-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Infrastructure Monitoring</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Event Registry</h1>
          <p className="text-slate-500 text-sm mt-1 opacity-70">Auditing active node signals across the platform.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-5 py-2.5 bg-indigo-50 border border-indigo-100/50 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
            <span className="text-sm font-semibold text-indigo-700">{unreadCount} Pending Nodes</span>
          </div>
          <button
            onClick={handleClearRegistry}
            className="btn-primary shadow-xl shadow-indigo-200"
          >
            Clear Registry
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 relative group">
          <input
            type="text"
            placeholder="Search specific logs, barcodes, or event signatures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-6 py-2.5 bg-white border border-slate-100 rounded-2xl text-sm font-medium shadow-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300"
          />
        </div>

        <div className="relative group">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="w-full px-6 py-2.5 bg-white border border-slate-100 rounded-2xl text-[10px] font-semibold tracking-wide outline-none appearance-none shadow-sm focus:border-indigo-500"
          >
            <option value="all">All Log Types</option>
            <option value="success" className="text-emerald-500">Success nodes</option>
            <option value="info" className="text-indigo-500">Info nodes</option>
            <option value="warning" className="text-amber-500">Warning nodes</option>
            <option value="error" className="text-rose-500">Error nodes</option>
          </select>
        </div>

        <div className="relative group">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="w-full px-6 py-2.5 bg-white border border-slate-100 rounded-2xl text-[10px] font-semibold tracking-wide outline-none appearance-none shadow-sm focus:border-indigo-500 cursor-pointer hover:border-indigo-300 transition-all"
          >
            <option value="all">Full History</option>
            <option value="today">Today Only</option>
            <option value="week">Past 7 Days</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-[0_10px_35px_rgba(0,0,0,0.05)] overflow-hidden mb-10">
        {loading && notifications.length === 0 ? (
          <div className="py-32 flex flex-col items-center animate-pulse">
            <div className="w-16 h-16 bg-slate-50 rounded-3xl mb-6 shadow-sm shadow-indigo-100/50" />
            <div className="h-2 w-48 bg-slate-50 rounded-full mb-3" />
            <div className="h-2 w-32 bg-slate-50 opacity-50 rounded-full" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-40 text-center animate-in zoom-in duration-700">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner shadow-indigo-100/50">
              <Bell size={40} />
            </div>
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight">No {typeFilter === 'all' ? 'Event' : typeFilter} Match</h3>
            <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-wide">
              {typeFilter === 'error' ? 'Registry is clear of critical infrastructure anomalies.' : 'Registry is clean or the filter returned void nodes.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredNotifications.slice(0, visibleLimit).map((n) => (
              <div
                key={n._id}
                onDoubleClick={(e) => !n.isRead && acknowledgeLog(n._id, e as any)}
                className={`px-6 py-6 hover:bg-slate-50/50 transition-all group flex items-start gap-4 relative cursor-pointer select-none ${!n.isRead ? 'bg-indigo-50/20' : ''}`}
                title={!n.isRead ? "Double-click to Acknowledge Node" : ""}
              >
                {!n.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600 animate-in fade-in slide-in-from-left duration-500" />
                )}

                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${n.type === 'success' ? 'bg-emerald-50' :
                  n.type === 'error' ? 'bg-rose-50' :
                    n.type === 'warning' ? 'bg-amber-50' : 'bg-indigo-50'
                  }`}>
                  {getTypeIcon(n.type)}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[8px] font-semibold tracking-wide px-2 py-0.5 rounded-md ${n.type === 'success' ? 'bg-emerald-100 text-emerald-700' :
                      n.type === 'error' ? 'bg-rose-100 text-rose-700' :
                        n.type === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                      {n.type} Node
                    </span>
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                      {new Date(n.createdAt).toLocaleDateString('en-IN')} · {new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className={`text-sm leading-tight select-none ${!n.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-500'}`}>
                    {n.message}
                  </p>

                  <div className="flex items-center gap-4 pt-1">
                    {!n.isRead && (
                      <button
                        onClick={(e) => acknowledgeLog(n._id, e)}
                        className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:text-slate-900 transition-colors"
                      >
                        Acknowledge Entry →
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => handlePurgeLog(n._id, e)}
                  title="Archive this log"
                  className="p-3 text-slate-200 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}

            {filteredNotifications.length > visibleLimit && (
              <button
                onClick={() => setVisibleLimit(prev => prev + 20)}
                className="w-full py-8 text-[11px] font-black text-indigo-600 uppercase tracking-[0.4em] hover:bg-slate-50 transition-all flex items-center justify-center gap-3 animate-in fade-in"
              >
                Load Historical History Nodes ({filteredNotifications.length - visibleLimit} Hidden)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Metrics */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900 rounded-2xl text-white">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest leading-none">Registry Context</span>
            <span className="text-sm font-black mt-0.5">Industrial Protocol v2.1</span>
          </div>
          <div className="w-px h-5 bg-white/10 hidden sm:block" />
          <div className="hidden sm:flex flex-col">
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Synced Nodes</span>
            <span className="text-sm font-black mt-0.5">{notifications.length} Entries</span>
          </div>
        </div>
        <Zap size={16} className="text-indigo-400/30 animate-pulse" />
      </div>
    </div>
  );
}
