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
  const [visibleLimit, setVisibleLimit] = useState(8);

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
    <div className="nexus-container py-6 lg:py-6 animate-in fade-in duration-500">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Event Registry</h1>
          <p className="text-sm font-normal text-slate-500 mt-1">Auditing active node signals across the platform</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-5 py-2.5 bg-indigo-50 border border-indigo-100/50 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
            <span className="text-sm font-semibold text-indigo-700">{unreadCount} Pending Nodes</span>
          </div>
          <button
            onClick={handleClearRegistry}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            Clear Registry
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="lg:col-span-2 relative group">
          <input
            type="text"
            placeholder="Search specific logs, barcodes, or event signatures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-6 py-2.5 bg-white border border-slate-100 rounded-2xl text-sm font-medium shadow-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="w-full px-6 py-2.5 bg-white border border-slate-100 rounded-2xl text-[10px] font-semibold tracking-wide outline-none shadow-sm focus:border-indigo-500"
        >
          <option value="all">All Log Types</option>
          <option value="success">Success nodes</option>
          <option value="info">Info nodes</option>
          <option value="warning">Warning nodes</option>
          <option value="error">Error nodes</option>
        </select>

        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as any)}
          className="w-full px-6 py-2.5 bg-white border border-slate-100 rounded-2xl text-[10px] font-semibold tracking-wide outline-none shadow-sm focus:border-indigo-500"
        >
          <option value="all">Full History</option>
          <option value="today">Today Only</option>
          <option value="week">Past 7 Days</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {/* Main List */}
      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden mb-10">
        {loading && notifications.length === 0 ? (
          <div className="py-20 text-center animate-pulse text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
            Scanning Node Repository...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-20 text-center">
            <Bell size={32} className="text-slate-100 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Empty Trace</h3>
            <p className="text-slate-400 text-[10px] font-semibold mt-1 uppercase tracking-widest">No matching logs found in registry</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredNotifications.slice(0, visibleLimit).map((n) => (
              <div
                key={n._id}
                onDoubleClick={(e) => !n.isRead && acknowledgeLog(n._id, e as any)}
                className={`px-6 py-3.5 hover:bg-slate-50/80 transition-all group flex items-start gap-4 relative cursor-pointer select-none border-b border-slate-50 last:border-0 ${!n.isRead ? 'bg-indigo-50/20' : ''}`}
              >
                {!n.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600" />
                )}

                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-white ${n.type === 'success' ? 'bg-emerald-50' :
                  n.type === 'error' ? 'bg-rose-50' :
                    n.type === 'warning' ? 'bg-amber-50' : 'bg-indigo-50'
                  }`}>
                  {n.type === 'success' ? <CheckCircle size={14} className="text-emerald-500" /> :
                   n.type === 'error' ? <XCircle size={14} className="text-rose-500" /> :
                   n.type === 'warning' ? <AlertTriangle size={14} className="text-amber-500" /> : <Info size={14} className="text-indigo-500" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-lg border ${n.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      n.type === 'error' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        n.type === 'warning' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                      }`}>
                      {n.type} Node
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                      {new Date(n.createdAt).toLocaleDateString('en-IN')} · {new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className={`text-[13px] font-semibold tracking-tight uppercase select-none group-hover:text-indigo-600 transition-colors ${!n.isRead ? 'text-slate-900' : 'text-slate-500 opacity-80'}`}>
                    {n.message}
                  </p>
                </div>

                <button
                  onClick={(e) => handlePurgeLog(n._id, e)}
                  title="Archive this log"
                  className="p-2 text-slate-200 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {filteredNotifications.length > visibleLimit && (
              <button
                onClick={() => setVisibleLimit(prev => prev + 20)}
                className="w-full py-6 text-[11px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-[0.2em] hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
              >
                Load Historical History Nodes ({filteredNotifications.length - visibleLimit} Hidden)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Metrics */}
      <div className="flex items-center justify-between px-5 py-4 bg-slate-900 rounded-3xl text-white shadow-xl">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none">Registry Context</span>
            <span className="text-sm font-bold mt-1 tracking-tight">Industrial Protocol v2.5</span>
          </div>
          <div className="w-px h-8 bg-white/10 hidden sm:block" />
          <div className="hidden sm:flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Synced Nodes</span>
            <span className="text-sm font-bold mt-1 tracking-tight">{notifications.length} Atomic Entries</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <span className="text-[10px] font-black uppercase text-indigo-300 tracking-[0.2em] animate-pulse">Telemetry Active</span>
           <Zap size={16} className="text-indigo-400" />
        </div>
      </div>
    </div>
  );
}
