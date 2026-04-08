import { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  Info, 
  CheckCircle, 
  ArrowRight, 
  X, 
  Package, 
  FileText, 
  CreditCard, 
  AlertTriangle, 
  Users,
  Trash2
} from 'lucide-react';
import { useNotify } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const NotificationCenter: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, loading } = useNotify();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = notifications.filter(n => filter === 'all' || !n.isRead);

  const formatShortDate = (ds: string) => {
    const d = new Date(ds);
    const diff = Math.max(0, Date.now() - d.getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <div className="relative " ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group"
      >
        <Bell size={20} className={unreadCount > 0 ? 'text-indigo-600 animate-pulse' : 'text-slate-400'} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-rose-600 border-2 border-white text-white text-[10px] font-black flex items-center justify-center rounded-full shadow-lg px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-4 w-96 bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden z-[200] animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Header */}
          <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black tracking-tighter uppercase leading-none">Notifications</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{unreadCount} Pending Nodes</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={markAllAsRead} 
                title="Mark all as read"
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white"
              >
                <CheckCircle size={18} />
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                title="Close Registry"
                className="p-2.5 bg-white/10 hover:bg-rose-500/20 hover:text-rose-200 rounded-xl transition-all text-white"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="px-6 py-3 border-b border-slate-50 flex items-center gap-4 bg-slate-50/30">
            <button onClick={() => setFilter('all')} className={`text-[10px] font-black uppercase tracking-[0.2em] ${filter === 'all' ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-500'}`}>All Logs</button>
            <button onClick={() => setFilter('unread')} className={`text-[10px] font-black uppercase tracking-[0.2em] ${filter === 'unread' ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-500'}`}>Unread</button>
          </div>

          {/* List */}
          <div className="max-h-[440px] overflow-y-auto no-scrollbar py-2">
            {loading && notifications.length === 0 ? (
               <div className="flex flex-col items-center py-20 animate-pulse">
                 <div className="w-12 h-12 bg-slate-100 rounded-2xl mb-4" />
                 <div className="h-2 w-32 bg-slate-100 rounded-full mb-2" />
                 <div className="h-2 w-24 bg-slate-50 rounded-full" />
               </div>
            ) : filtered.length === 0 ? (
               <div className="py-24 text-center">
                 <Bell size={40} className="mx-auto text-slate-100 mb-4" />
                 <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">No active nodes</p>
               </div>
            ) : (
               <>
                 {filtered.slice(0, 4).map((n) => (
                   <NotificationItem 
                     key={n._id} 
                     n={n} 
                     onMarkAsRead={() => markAsRead(n._id)}
                     onDelete={() => deleteNotification(n._id)}
                     formatShortDate={formatShortDate}
                   />
                 ))}
                 
                 {filtered.length > 10 && (
                   <button 
                     onClick={() => { navigate('/notifications'); setIsOpen(false); }}
                     className="w-full py-4 text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] hover:bg-indigo-50/50 transition-all border-t border-slate-50 flex items-center justify-center gap-2"
                   >
                     Manage Registry ({filtered.length - 4} More Items) <ArrowRight size={12}/>
                   </button>
                 )}
               </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const NotificationItem = ({ n, onMarkAsRead, onDelete, formatShortDate }: any) => {
  const [expanded, setExpanded] = useState(false);

  const getCategoryIcon = () => {
    switch (n.category) {
      case 'product': return <Package size={16} />;
      case 'invoice': return <FileText size={16} />;
      case 'payment': return <CreditCard size={16} />;
      case 'alert': return <AlertTriangle size={16} />;
      case 'staff': return <Users size={16} />;
      default: return <Info size={16} />;
    }
  };

  const getSeverityStyle = () => {
    if (n.type === 'error') return 'bg-rose-50 text-rose-500';
    if (n.type === 'warning') return 'bg-amber-50 text-amber-500';
    if (n.type === 'success') return 'bg-emerald-50 text-emerald-600';
    return 'bg-slate-50 text-indigo-600';
  };

  return (
    <div 
      onClick={() => setExpanded(!expanded)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!n.isRead) onMarkAsRead();
        else onDelete();
      }}
      className={`group px-8 py-4 flex gap-4 transition-all relative cursor-pointer select-none border-b border-slate-50 last:border-0 hover:bg-slate-50/50 ${!n.isRead ? 'after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-indigo-600 bg-indigo-50/10' : 'opacity-70 grayscale-[0.3]'}`}
    >
      <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${getSeverityStyle()}`}>
        {getCategoryIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
           <p className={`text-[12px] leading-[1.4] transition-all flex-1 ${expanded ? '' : 'truncate'} ${!n.isRead ? 'font-black text-slate-900 ' : 'font-bold text-slate-500'}`}>
             {n.message}
           </p>
           <button 
             onClick={(e) => { e.stopPropagation(); onDelete(); }}
             className="p-1 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 ml-2"
           >
             <Trash2 size={12} />
           </button>
        </div>
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1.5 flex items-center gap-2">
          <span className="text-indigo-400/50">{n.category}</span> • {formatShortDate(n.createdAt)}
        </p>
        
        {expanded && n.link && (
          <button className="mt-3 text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:underline">
            View Protocol Trace <ArrowRight size={10} />
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
