import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Bell,
  Search, 
  History, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info,
  Zap,
  Clock,
  Trash2,
  Users,
  FileText,
  Tag,
  ArrowRight,
  ChevronDown,
  Activity as ActivityIcon,
  MoreVertical
} from 'lucide-react';
import api from '../services/api';
import { useNotify } from '../context/NotificationContext';
import toast from 'react-hot-toast';

interface StreamItem {
    id: string;
    type: 'ALERT' | 'AUDIT';
    severity: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description: string;
    authority: string;
    createdAt: string;
    isRead?: boolean;
    resource?: string;
}

const AuditCenter: React.FC = () => {
    const { notifications, markAsRead, deleteAllNotifications, deleteNotification, loading: notifyLoading } = useNotify();
    const [activities, setActivities] = useState<any[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [showAll, setShowAll] = useState(false);

    const fetchAuditHistory = async () => {
        setAuditLoading(true);
        try {
            const res = await api.get(`/reports/activity?limit=100`);
            setActivities(res.data.data || []);
        } catch (err) {
            toast.error('Nexus Failure: Notification Stream Unreachable');
        } finally {
            setAuditLoading(false);
        }
    };

    const deleteAuditNode = async (id: string) => {
        if (!confirm("Delete this message permanently?")) return;
        try {
            await api.delete(`/reports/activity/${id}`);
            setActivities(prev => prev.filter(a => a._id !== id));
            toast.success('Message Deleted');
        } catch (err) {
            toast.error('Delete Failure: Action Restricted');
        }
    };

    useEffect(() => {
        fetchAuditHistory();
    }, []);

    const unifiedStream = useMemo(() => {
        const mappedAlerts: StreamItem[] = notifications.map(n => ({
            id: n._id,
            type: 'ALERT',
            severity: n.type,
            title: n.category?.toUpperCase() || 'SYSTEM',
            description: n.message,
            authority: 'SYSTEM',
            createdAt: n.createdAt,
            isRead: n.isRead
        }));

        const mappedAudit: StreamItem[] = activities.map(a => ({
            id: a._id,
            type: 'AUDIT',
            severity: (a.action === 'DELETE' || a.action === 'TRANSACTION') ? 'warning' : 'info',
            title: `${a.action} · ${a.resource}`,
            description: a.description,
            authority: a.userName,
            createdAt: a.createdAt,
            resource: a.resource
        }));

        const combined = [...mappedAlerts, ...mappedAudit].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        if (search.trim()) {
            return combined.filter(item => 
                item.description.toLowerCase().includes(search.toLowerCase()) || 
                item.title.toLowerCase().includes(search.toLowerCase()) ||
                item.authority.toLowerCase().includes(search.toLowerCase())
            );
        }

        return combined;
    }, [notifications, activities, search]);

    const displayedStream = showAll ? unifiedStream : unifiedStream.slice(0, 10);

    const getSeverityStyles = (severity: string) => {
        switch (severity) {
            case 'success': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'error': return 'bg-rose-50 text-rose-600 border-rose-100';
            case 'warning': return 'bg-amber-50 text-amber-600 border-amber-100';
            default: return 'bg-indigo-50 text-indigo-600 border-indigo-100';
        }
    };

    const getIcon = (type: string, severity: string) => {
        if (type === 'ALERT') {
            if (severity === 'error') return <XCircle size={14} />;
            if (severity === 'warning') return <AlertTriangle size={14} />;
            return <Bell size={14} />;
        }
        return <ActivityIcon size={14} />;
    };

    return (
        <div className="nexus-container py-4 md:py-8 animate-in fade-in duration-700 font-inter px-4 md:px-0">
            {/* ── HEADER ────────────────────────────────────────────────────────── */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-10">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <div>
                        <h1 className="text-xl md:text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-3 font-inter">
                            <Bell className="text-indigo-600 shrink-0" size={24} /> Message Center
                        </h1>
                        <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-[0.2em] leading-none font-inter">Verified Communication Stream</p>
                    </div>
                    {/* Mobile Clear All Action */}
                    <button 
                        onClick={() => confirm("Clear all unread messages?") && deleteAllNotifications()}
                        className="md:hidden p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                        onClick={() => confirm("Clear all unread messages?") && deleteAllNotifications()}
                        className="hidden md:flex px-6 py-2.5 bg-white border border-slate-100 text-[10px] font-semibold uppercase tracking-widest text-rose-600 rounded-2xl hover:bg-rose-50 transition-all font-inter"
                    >
                        Clear Messages
                    </button>
                    <div className="flex-1 md:flex-none px-5 py-2.5 bg-slate-900 rounded-2xl flex items-center justify-center gap-4 text-white shadow-xl">
                        <History size={16} className="text-indigo-400" />
                        <span className="text-sm font-semibold tracking-tight font-inter">{unifiedStream.length} Total</span>
                    </div>
                </div>
            </header>

            {/* ── SEARCH ────────────────────────────────────────────────────────── */}
            <div className="relative mb-6 md:mb-8">
                <input 
                    type="text" 
                    placeholder="Search recent activity..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-6 py-3.5 md:py-4 bg-white border border-slate-100 rounded-[1rem] md:rounded-[1.5rem] text-[13px] font-semibold text-slate-600 placeholder:text-slate-300 focus:border-indigo-500 shadow-sm transition-all font-inter"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            </div>

            {/* ── UNIFIED TIMELINE ────────────────────────────────────────────────────────── */}
            <div className="bg-white border border-slate-100 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm overflow-hidden min-h-[400px]">
                {/* 💻 DESKTOP TABLE VIEW */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left table-fixed">
                        <thead>
                             <tr className="border-b border-slate-100 bg-slate-50/30 font-bold">
                                <th className="w-[180px] px-8 py-5 text-[9px] text-slate-400 uppercase tracking-[0.2em] font-inter">Protocol Time</th>
                                <th className="w-[220px] px-8 py-5 text-[9px] text-slate-400 uppercase tracking-[0.2em] font-inter">Classification</th>
                                <th className="px-8 py-5 text-[9px] text-slate-400 uppercase tracking-[0.2em] font-inter text-center">Message Description</th>
                                <th className="w-[240px] px-8 py-5 text-[9px] text-slate-400 uppercase tracking-[0.2em] font-inter text-right">Authority Identity</th>
                                <th className="w-[120px] px-8 py-5 text-[9px] text-slate-400 uppercase tracking-[0.2em] font-inter text-right pr-8">Actions</th>
                             </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-inter">
                            {auditLoading && activities.length === 0 ? (
                                Array(5).fill(0).map((_, i) => <tr key={i} className="animate-pulse h-20 bg-slate-50/20" />)
                            ) : displayedStream.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-32 text-center text-slate-300">
                                        <Zap size={32} className="mx-auto mb-4 opacity-20" />
                                        <p className="text-[10px] font-semibold uppercase tracking-widest font-inter">No Notifications Found</p>
                                    </td>
                                </tr>
                            ) : (
                                displayedStream.map((item) => (
                                    <tr 
                                        key={`${item.type}-${item.id}`} 
                                        onDoubleClick={() => item.type === 'ALERT' && !item.isRead && markAsRead(item.id)}
                                        className={`hover:bg-slate-100 transition-all cursor-pointer group relative border-b border-slate-100 last:border-0 ${item.type === 'ALERT' && !item.isRead ? 'bg-indigo-50/10' : ''}`}
                                    >
                                        <td className="px-8 py-6 align-top relative">
                                            {item.type === 'ALERT' && !item.isRead && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600 shadow-[2px_0_12px_rgba(79,70,229,0.4)]" />
                                            )}
                                            <div className="flex items-start gap-4">
                                                <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center transition-all shadow-sm ${item.type === 'ALERT' && !item.isRead ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-white'}`}>
                                                    <Clock size={14} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-[12px] tabular-nums font-semibold ${item.type === 'ALERT' && !item.isRead ? 'text-slate-900 scale-105 origin-left' : 'text-slate-700'}`}>
                                                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <p className={`text-[9px] mt-1 uppercase tracking-tight tabular-nums truncate font-semibold ${item.type === 'ALERT' && !item.isRead ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                        {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 align-top">
                                            <div className="flex flex-col gap-2.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded-lg border text-[8px] uppercase tracking-widest inline-flex w-fit font-semibold ${getSeverityStyles(item.severity)}`}>
                                                        {item.type}
                                                    </span>
                                                    {item.type === 'ALERT' && !item.isRead && (
                                                        <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.6)]" />
                                                    )}
                                                </div>
                                                <div className={`flex items-center gap-2 text-[10px] uppercase tracking-tight truncate transition-colors font-semibold ${item.type === 'ALERT' && !item.isRead ? 'text-indigo-700' : 'text-slate-500 group-hover:text-slate-900'}`}>
                                                    {getIcon(item.type, item.severity)}
                                                    <span>{item.title}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 align-top">
                                            <div className="flex flex-col gap-1.5">
                                                <p className={`text-[13px] tracking-tight leading-relaxed break-words line-clamp-2 uppercase transition-all font-semibold ${item.type === 'ALERT' && !item.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                                                    {item.description}
                                                </p>
                                                {item.type === 'ALERT' && !item.isRead && (
                                                    <p className="text-[9px] font-semibold text-indigo-600 italic uppercase tracking-[0.05em] flex items-center gap-2 animate-pulse">
                                                        <ArrowRight size={10} /> Double-Tap to Acknowledge
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 align-top">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 shrink-0 border rounded-xl flex items-center justify-center text-[11px] font-semibold shadow-sm transition-all ${item.type === 'ALERT' && !item.isRead ? 'bg-indigo-600 border-indigo-700 text-white scale-110' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                                                    {item.authority[0].toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-[11px] uppercase tracking-tight truncate font-semibold ${item.type === 'ALERT' && !item.isRead ? 'text-slate-900' : 'text-slate-700'}`}>{item.authority}</p>
                                                    <p className={`text-[9px] uppercase tracking-tighter font-semibold ${item.type === 'ALERT' && !item.isRead ? 'text-indigo-500' : 'text-slate-400'}`}>
                                                        {item.type === 'ALERT' && !item.isRead ? 'Unread System Node' : 'Verified Node'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 align-top text-right">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (item.type === 'ALERT') deleteNotification(item.id);
                                                    else deleteAuditNode(item.id);
                                                }}
                                                className="p-2.5 text-slate-200 hover:text-rose-600 hover:bg-rose-50/50 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 📱 MOBILE CARD VIEW */}
                <div className="lg:hidden divide-y divide-slate-50 font-inter">
                    {auditLoading && activities.length === 0 ? (
                        Array(3).fill(0).map((_, i) => <div key={i} className="animate-pulse h-32 bg-slate-50/20" />)
                    ) : displayedStream.length === 0 ? (
                        <div className="py-20 text-center text-slate-300 px-4">
                            <Zap size={32} className="mx-auto mb-4 opacity-20" />
                            <p className="text-[10px] font-semibold uppercase tracking-widest">No Notifications Found</p>
                        </div>
                    ) : (
                        displayedStream.map((item) => (
                            <div 
                                key={`${item.type}-${item.id}`}
                                onClick={() => item.type === 'ALERT' && !item.isRead && markAsRead(item.id)}
                                className={`p-4 transition-all relative ${item.type === 'ALERT' && !item.isRead ? 'bg-indigo-50/20' : ''}`}
                            >
                                {item.type === 'ALERT' && !item.isRead && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600" />
                                )}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center shadow-sm ${item.type === 'ALERT' && !item.isRead ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                            <Clock size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold text-slate-900 tabular-nums">
                                                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-tighter">
                                                {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-semibold uppercase tracking-widest ${getSeverityStyles(item.severity)}`}>
                                            {item.type}
                                        </span>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (item.type === 'ALERT') deleteNotification(item.id);
                                                else deleteAuditNode(item.id);
                                            }}
                                            className="p-1.5 text-slate-300 hover:text-rose-600"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <h3 className={`text-[10px] uppercase tracking-tight mb-2 flex items-center gap-2 ${item.type === 'ALERT' && !item.isRead ? 'font-black text-indigo-700' : 'font-bold text-slate-400'}`}>
                                    {getIcon(item.type, item.severity)}
                                    {item.title}
                                </h3>
                                <p className={`text-[13px] leading-relaxed uppercase break-words px-1 ${item.type === 'ALERT' && !item.isRead ? 'font-black text-slate-900' : 'font-bold text-slate-600'}`}>
                                    {item.description}
                                </p>
                                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center text-[9px] font-bold text-indigo-600">
                                            {item.authority[0].toUpperCase()}
                                        </div>
                                        <span className="text-[10px] font-semibold text-slate-500 uppercase">{item.authority}</span>
                                    </div>
                                    {item.type === 'ALERT' && !item.isRead && (
                                        <span className="text-[8px] font-bold text-indigo-600 uppercase italic">Tap to Read</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* ── SEE ALL BUTTON ────────────────────────────────────────────────────────── */}
                {!showAll && unifiedStream.length > 10 && (
                    <div className="p-6 md:p-8 bg-slate-50/50 flex justify-center border-t border-slate-50">
                        <button 
                            onClick={() => setShowAll(true)}
                            className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-3 bg-white border border-slate-200 rounded-xl md:rounded-2xl text-[12px] font-semibold text-slate-600 hover:text-indigo-600 hover:border-indigo-100 hover:shadow-lg transition-all font-inter group"
                        >
                            <span>See All ({unifiedStream.length - 10} more)</span>
                            <ChevronDown size={16} className="group-hover:translate-y-0.5 transition-transform" />
                        </button>
                    </div>
                )}
            </div>

            {/* ── FOOTER ANALYTICS ────────────────────────────────────────────────────────── */}
            <footer className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] font-semibold text-slate-300 uppercase tracking-[0.2em] font-inter">
                <p className="text-center md:text-left">© 2026 Nexus Terminal · Secure Activity Log</p>
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> Synchronized</span>
                    <span className="flex items-center gap-2 font-inter"><Zap size={14} className="text-indigo-400 animate-pulse" /> Live Telemetry</span>
                </div>
            </footer>
        </div>
    );
};

export default AuditCenter;
