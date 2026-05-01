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
    const { 
        notifications, 
        markAsRead, 
        markAllAsRead, 
        deleteAllNotifications, 
        deleteNotification, 
        toggleBookmark,
        batchDelete,
        batchRead,
        loading: notifyLoading 
    } = useNotify();
    const [activities, setActivities] = useState<any[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [selectedDate, setSelectedDate] = useState('');
    const [showAll, setShowAll] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [viewSavedOnly, setViewSavedOnly] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const fetchAuditHistory = async () => {
        setAuditLoading(true);
        try {
            const res = await api.get(`/reports/activity?limit=100`);
            setActivities(res.data.data || []);
        } catch (err) {
            toast.error('System Error: Messages could not be loaded');
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

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === displayedStream.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(displayedStream.map(i => i.id));
        }
    };

    const unifiedStream = useMemo(() => {
        const mappedAlerts: StreamItem[] = notifications.map(n => ({
            id: n._id,
            type: 'ALERT',
            severity: n.type,
            title: 'ALERT',
            description: n.message,
            authority: 'SYSTEM',
            createdAt: n.createdAt,
            isRead: n.isRead,
            isBookmarked: n.isBookmarked,
            resource: n.category?.toUpperCase() || 'SYSTEM'
        }));

        const mappedAudit: StreamItem[] = activities.map(a => ({
            id: a._id,
            type: 'AUDIT',
            severity: (a.action === 'DELETE' || a.action === 'TRANSACTION') ? 'warning' : 'info',
            title: a.action === 'CREATE' ? 'ADD' : a.action,
            description: a.transactionId ? `${a.description} (TX: ${a.transactionId.slice(-6).toUpperCase()})` : a.description,
            authority: a.userName,
            createdAt: a.createdAt,
            resource: a.resource
        }));

        // Deduplicate by ID to prevent ghost nodes
        const uniqueNodes = new Map();
        [...mappedAlerts, ...mappedAudit].forEach(item => {
            if (!uniqueNodes.has(item.id)) uniqueNodes.set(item.id, item);
        });

        let combined = Array.from(uniqueNodes.values()).map(item => {
        return Array.from(uniqueNodes.values()).map(item => {
            let finalTitle = item.title;
            if (item.resource?.toUpperCase().includes('SALE') || item.resource?.toUpperCase().includes('INVOICE')) finalTitle = 'SALE';
            if (item.resource?.toUpperCase().includes('PURCHASE')) finalTitle = 'PURCHASE';
            return { ...item, title: finalTitle };
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [notifications, activities]);

    const displayedStream = useMemo(() => {
        let filtered = unifiedStream;

        if (activeFilter === 'Saved') {
            return filtered.filter(item => item.isBookmarked);
        }

        if (activeFilter === 'Alerts') {
            filtered = filtered.filter(item => item.type === 'ALERT');
        } else if (activeFilter === 'Audit') {
            filtered = filtered.filter(item => item.type === 'AUDIT');
        } else if (activeFilter === 'Critical') {
            filtered = filtered.filter(item => item.severity === 'error' || item.severity === 'warning');
        }

        if (selectedDate) {
            filtered = filtered.filter(item => item.createdAt.startsWith(selectedDate));
        }

        if (search.trim()) {
            const s = search.toLowerCase();
            filtered = filtered.filter(item => 
                item.description.toLowerCase().includes(s) || 
                item.title.toLowerCase().includes(s) ||
                item.authority.toLowerCase().includes(s)
            );
        }

        return showAll ? filtered : filtered.slice(0, 10);
    }, [unifiedStream, activeFilter, selectedDate, search, showAll]);

    const handleSelectAll = () => {
        if (selectedIds.length === displayedStream.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(displayedStream.map(i => i.id));
        }
    };

    const getSeverityStyles = (item: any) => {
        const t = item.title;
        if (t === 'SALE') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        if (t === 'PURCHASE') return 'bg-blue-50 text-blue-600 border-blue-100';
        if (t === 'DELETE') return 'bg-rose-50 text-rose-600 border-rose-100';
        if (t === 'ALERT') return 'bg-amber-50 text-amber-600 border-amber-100';
        if (t === 'UPDATE') return 'bg-indigo-50 text-indigo-600 border-indigo-100';
        
        switch (item.severity) {
            case 'success': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'error': return 'bg-rose-50 text-rose-600 border-rose-100';
            case 'warning': return 'bg-amber-50 text-amber-600 border-amber-100';
            default: return 'bg-indigo-50 text-indigo-600 border-indigo-100';
        }
    };

    const getIcon = (item: any) => {
        const t = item.title;
        if (t === 'SALE') return <FileText size={14} />;
        if (t === 'PURCHASE') return <Tag size={14} />;
        if (t === 'DELETE') return <Trash2 size={14} />;
        if (t === 'ADD') return <Zap size={14} />;
        if (t === 'UPDATE') return <ActivityIcon size={14} />;
        
        if (item.type === 'ALERT') {
            if (item.severity === 'error') return <XCircle size={14} />;
            if (item.severity === 'warning') return <AlertTriangle size={14} />;
            return <Bell size={14} />;
        }
        return <ActivityIcon size={14} />;
    };

    return (
        <div className="p-1 sm:p-3 space-y-2 animate-in fade-in duration-700 font-inter">
            {/* ── HEADER ────────────────────────────────────────────────────────── */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1 mb-4 md:mb-6">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <div>
                        <h1 className="text-xl md:text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-3 font-inter">
                            <Bell className="text-indigo-600 shrink-0" size={20} /> Message Center
                        </h1>
                        <p className="text-[9px] font-semibold text-slate-400 mt-0.5 uppercase tracking-[0.2em] leading-none font-inter">Notification History</p>
                    </div>
                    {/* Mobile Clear All Action */}
                    <button 
                        onClick={() => confirm("Clear all unread messages?") && deleteAllNotifications()}
                        className="md:hidden p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    {activeFilter === 'Saved' && (
                        <button 
                            onClick={() => {
                                if (confirm("Remove all messages from Saved section?")) {
                                    notifications.filter(n => n.isBookmarked).forEach(n => toggleBookmark(n._id));
                                }
                            }}
                            className="flex-1 md:flex-none px-4 py-2.5 bg-amber-50 border border-amber-100 text-[10px] font-semibold uppercase tracking-widest text-amber-600 rounded-2xl hover:bg-amber-600 hover:text-white transition-all font-inter flex items-center justify-center gap-2"
                        >
                            <Zap size={14} /> Empty Saved
                        </button>
                    )}
                    <button 
                        onClick={() => {
                            if (confirm("Mark all messages as read?")) {
                                markAllAsRead();
                            }
                        }}
                        className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-50 border border-indigo-100 text-[10px] font-semibold uppercase tracking-widest text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all font-inter flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={14} /> Mark All Read
                    </button>
                    <button 
                        onClick={() => confirm("Delete all non-saved messages?") && deleteAllNotifications()}
                        className="flex-1 md:flex-none px-4 py-2.5 bg-white border border-slate-100 text-[10px] font-semibold uppercase tracking-widest text-rose-600 rounded-2xl hover:bg-rose-50 transition-all font-inter flex items-center justify-center gap-2"
                    >
                        <Trash2 size={14} /> Delete History
                    </button>
                    <div className="hidden sm:flex px-5 py-2.5 bg-slate-900 rounded-2xl items-center justify-center gap-4 text-white shadow-xl">
                        <History size={16} className="text-indigo-400" />
                        <span className="text-sm font-semibold tracking-tight font-inter">{unifiedStream.length} Total</span>
                    </div>
                </div>
            </header>

            {/* ── SEARCH & FILTER ────────────────────────────────────────────────────────── */}
            <div className="space-y-3 mb-4 md:mb-5">
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Search recent activity..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-6 py-2.5 md:py-3 bg-white border border-slate-100 rounded-[1rem] md:rounded-[1.2rem] text-[12px] font-semibold text-slate-600 placeholder:text-slate-300 focus:border-indigo-500 shadow-sm transition-all font-inter"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        {['All', 'Alerts', 'Audit', 'Saved'].map((f) => (
                            <button
                                key={f}
                                onClick={() => {
                                    setActiveFilter(f);
                                    if (f === 'Saved') setViewSavedOnly(true);
                                    else setViewSavedOnly(false);
                                }}
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                                    activeFilter === f 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' 
                                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="pl-9 pr-4 py-1.5 bg-white border border-slate-100 rounded-xl text-[10px] font-semibold text-slate-600 focus:border-indigo-500 outline-none transition-all uppercase"
                            />
                        </div>
                        {selectedDate && (
                            <button onClick={() => setSelectedDate('')} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                                <XCircle size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── UNIFIED TIMELINE ────────────────────────────────────────────────────────── */}
            <div className="bg-white border border-slate-100 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm overflow-hidden min-h-[400px]">
                {/* 💻 DESKTOP TABLE VIEW */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left table-fixed">
                        <thead>
                              <tr className="border-b border-slate-100 bg-white font-bold">
                                {selectedIds.length > 0 && (
                                    <th className="w-[50px] px-4 py-3 text-center animate-in slide-in-from-left-4 duration-300">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.length > 0 && selectedIds.length === displayedStream.length}
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                    </th>
                                )}
                                <th className="w-[180px] px-6 py-4 text-[10px] text-slate-400 uppercase tracking-widest font-inter">Message Time</th>
                                <th className="w-[200px] px-6 py-4 text-[10px] text-slate-400 uppercase tracking-widest font-inter">Category</th>
                                <th className="px-6 py-4 text-[10px] text-slate-400 uppercase tracking-widest font-inter text-center">Message Description</th>
                                <th className="w-[100px] px-6 py-4 text-[10px] text-slate-400 uppercase tracking-widest font-inter text-right pr-10">Actions</th>
                              </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-inter">
                            {auditLoading && activities.length === 0 ? (
                                Array(5).fill(0).map((_, i) => <tr key={i} className="animate-pulse h-20 bg-slate-50/20" />)
                            ) : displayedStream.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-32 text-center text-slate-300">
                                        <Zap size={32} className="mx-auto mb-4 opacity-20" />
                                        <p className="text-[10px] font-semibold uppercase tracking-widest font-inter">No Notifications Found</p>
                                    </td>
                                </tr>
                            ) : (
                                displayedStream.map((item) => (
                                    <tr 
                                        key={`${item.type}-${item.id}`} 
                                        onDoubleClick={() => item.type === 'ALERT' && !item.isRead && markAsRead(item.id)}
                                        className={`hover:bg-indigo-50/50 transition-all duration-300 cursor-pointer group relative border-b-2 border-slate-100 last:border-0 ${item.type === 'ALERT' && !item.isRead ? 'bg-indigo-50/20' : ''}`}
                                    >
                                        {selectedIds.length > 0 && (
                                            <td className="px-4 py-3 align-middle text-center animate-in slide-in-from-left-4 duration-300">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={() => toggleSelection(item.id)}
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                />
                                            </td>
                                        )}
                                        <td className="px-6 py-3 align-middle relative group/time">
                                            <div className="flex items-center gap-3">
                                                {/* Selection Trigger (Next to box, not overlapping) */}
                                                {selectedIds.length === 0 && (
                                                    <div className="w-4 h-4 shrink-0 opacity-0 group-hover/time:opacity-100 transition-all duration-300 -ml-8 group-hover/time:ml-0 overflow-hidden">
                                                        <div 
                                                            className="w-4 h-4 rounded border-2 border-indigo-400 cursor-pointer bg-white shadow-sm hover:border-indigo-600 transition-colors" 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleSelection(item.id);
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                                
                                                <div className="w-10 h-10 shrink-0 bg-white border border-slate-100 rounded-xl flex items-center justify-center shadow-sm">
                                                    <Clock size={16} className="text-slate-400" />
                                                </div>
                                                <span className="text-[12px] font-bold text-slate-700 tracking-tight">
                                                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 align-middle">
                                            <div className="flex items-center gap-2">
                                                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100/50">
                                                    {item.type}
                                                </span>
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-100/50">
                                                    {getIcon(item)}
                                                    <span>{item.title}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 align-middle text-center">
                                            <p className={`text-[12px] font-semibold tracking-tight transition-all ${
                                                item.type === 'ALERT' && !item.isRead ? 'text-slate-900' : 'text-slate-500/70'
                                            }`}>
                                                {item.description}
                                            </p>
                                        </td>
                                        <td className="px-6 py-3 align-middle text-right pr-10">
                                            <div className="flex items-center justify-end gap-2">
                                                {item.type === 'ALERT' && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleBookmark(item.id);
                                                        }}
                                                        className={`p-2 rounded-xl transition-all ${item.isBookmarked ? 'text-amber-500 bg-amber-50' : 'text-slate-200 hover:text-amber-500 hover:bg-amber-50'}`}
                                                    >
                                                        <Zap size={16} fill={item.isBookmarked ? 'currentColor' : 'none'} />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (item.type === 'ALERT') deleteNotification(item.id);
                                                        else deleteAuditNode(item.id);
                                                    }}
                                                    className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
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
                                className={`p-3 transition-all relative border-b border-slate-50 last:border-0 hover:bg-indigo-50/30 ${item.type === 'ALERT' && !item.isRead ? 'bg-indigo-50/20' : ''}`}
                            >
                                {item.type === 'ALERT' && !item.isRead && (
                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-600" />
                                )}
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-6 h-6 shrink-0 rounded-lg flex items-center justify-center shadow-sm ${item.type === 'ALERT' && !item.isRead ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                            <Clock size={12} />
                                        </div>
                                        <p className="text-[10px] font-semibold text-slate-900 tabular-nums">
                                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`px-1.5 py-0.5 rounded-md border text-[7px] font-bold uppercase tracking-widest ${getSeverityStyles(item)}`}>
                                            {item.type}
                                        </span>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleBookmark(item.id);
                                            }}
                                            className={`p-1 rounded-md transition-all ${item.isBookmarked ? 'text-amber-500' : 'text-slate-300'}`}
                                        >
                                            <Zap size={12} fill={item.isBookmarked ? 'currentColor' : 'none'} />
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (item.type === 'ALERT') deleteNotification(item.id);
                                                else deleteAuditNode(item.id);
                                            }}
                                            className="p-1 text-slate-300 hover:text-rose-600"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <p className={`text-[11px] leading-snug break-words ${
                                    item.type === 'ALERT' && !item.isRead 
                                    ? 'font-bold text-slate-900' 
                                    : 'font-medium text-slate-400'
                                }`}>
                                    {item.description}
                                </p>
                                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-end">
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

            {/* ── BATCH ACTION BAR ────────────────────────────────────────────────────────── */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-10 duration-500">
                    <div className="bg-slate-900 text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-6 border border-slate-800 backdrop-blur-md">
                        <div className="flex items-center gap-3 pr-6 border-r border-slate-700">
                            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-black">
                                {selectedIds.length}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Selected</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => {
                                    selectedIds.forEach(id => toggleBookmark(id));
                                    setSelectedIds([]);
                                }}
                                className="px-4 py-2 hover:bg-amber-600 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-amber-400 hover:text-white"
                            >
                                <Zap size={14} /> Save
                            </button>
                            <button 
                                onClick={() => {
                                    batchRead(selectedIds);
                                    setSelectedIds([]);
                                }}
                                className="px-4 py-2 hover:bg-indigo-600 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                            >
                                <CheckCircle size={14} /> Mark Read
                            </button>
                            <button 
                                onClick={() => {
                                    if (confirm(`Delete ${selectedIds.length} messages permanently?`)) {
                                        batchDelete(selectedIds);
                                        setSelectedIds([]);
                                    }
                                }}
                                className="px-4 py-2 hover:bg-rose-600 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-rose-400 hover:text-white"
                            >
                                <Trash2 size={14} /> Batch Delete
                            </button>
                            <button 
                                onClick={() => setSelectedIds([])}
                                className="px-4 py-2 hover:bg-slate-800 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditCenter;
