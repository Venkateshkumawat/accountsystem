import { useState, useEffect, memo, useMemo } from 'react';
import { 
    Phone, Mail, ArrowUpRight, ArrowDownLeft, MoreVertical, 
    UserPlus, Users, X, Edit2, Trash2, ShieldCheck, 
    Activity, MapPin, CreditCard, Search, Plus, 
    IndianRupee, ChevronDown, MessageSquare, RefreshCcw,
    CheckCircle2, AlertCircle, History
} from 'lucide-react';
import api from '../services/api';
import { useNotify } from '../context/NotificationContext';
import { INDIAN_STATES } from '../constants/indianStates';
import { validateGSTIN, validatePincode } from '../utils/validation';

/**
 * NexusBill Parties Terminal: Professional CRM and Ledger Hub.
 * Optimized for high-density auditing and automated transaction synchronization.
 */
export default function Parties() {
    const [parties, setParties] = useState<any[]>([]);
    const [activeFilter, setActiveFilter] = useState(() => localStorage.getItem('nexus_party_filter') || 'All');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showAllParties, setShowAllParties] = useState(false);
    const [showArrangeMenu, setShowArrangeMenu] = useState(false);
    const [sortBy, setSortBy] = useState(() => localStorage.getItem('nexus_party_sort') || 'Name');
    const [editingNode, setEditingNode] = useState<any>(null);
    const [selectedParty, setSelectedParty] = useState<any>(null);
    const [partyHistory, setPartyHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const { notifySuccess, notifyError } = useNotify();

    // Persist filter and sort state to storage
    useEffect(() => {
        localStorage.setItem('nexus_party_filter', activeFilter);
        localStorage.setItem('nexus_party_sort', sortBy);
    }, [activeFilter, sortBy]);

    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', type: 'Customer', group: 'General', gstin: '', openingBalance: 0,
        address: { street: '', city: '', state: '', pincode: '' }
    });

    const [paymentForm, setPaymentForm] = useState({
        amount: 0,
        method: 'Cash',
        note: ''
    });

    useEffect(() => { 
        fetchParties(); 
        const syncChannel = new BroadcastChannel('nexus_sync');
        syncChannel.onmessage = (event) => {
            if (['FETCH_DASHBOARD', 'SYNC_PARTIES'].includes(event.data)) fetchParties();
        };
        return () => syncChannel.close();
    }, []);

    const fetchParties = async () => {
        setLoading(true);
        try {
            const res = await api.get('/parties');
            setParties(res.data.data || []);
        } catch (err) { notifyError('Nexus Sync Failed: Parties unreachable'); }
        finally { setLoading(false); }
    };

    const handleSyncLifecycle = async () => {
        setLoading(true);
        try {
            await api.post('/parties/sync-lifecycle');
            notifySuccess('Lifecycle Registry Synchronized');
            fetchParties();
        } catch (err) { notifyError('Registry Sync Failed'); }
        finally { setLoading(false); }
    };

    const handlePurgeAll = async () => {
        if (!confirm('ABSOLUTE PURGE: This will definitively delete ALL party records. Continue?')) return;
        if (!confirm('FINAL PROTOCOL: Are you 100% certain? This cannot be undone.')) return;
        
        setLoading(true);
        try {
            await api.delete('/parties/purge-all');
            notifySuccess('Registry Decommissioned: All nodes purged.');
            fetchParties();
        } catch (err) { notifyError('Purge Protocol Failed'); }
        finally { setLoading(false); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingNode) {
                await api.put(`/parties/${editingNode._id}`, formData);
                notifySuccess(`Node Updated: ${formData.name}`);
            } else {
                await api.post('/parties', formData);
                notifySuccess(`Node Initialized: ${formData.name}`);
            }
            setShowModal(false);
            setEditingNode(null);
            resetForm();
            fetchParties();
            const sync = new BroadcastChannel('nexus_sync');
            sync.postMessage('SYNC_PARTIES');
            sync.close();
        } catch (err) { notifyError('Communication Error: Node rejected'); }
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedParty || paymentForm.amount <= 0) return;
        try {
            await api.post(`/parties/${selectedParty._id}/payment`, paymentForm);
            notifySuccess(`Settlement Recorded: ₹${paymentForm.amount} for ${selectedParty.name}`);
            setShowPaymentModal(false);
            setPaymentForm({ amount: 0, method: 'Cash', note: '' });
            fetchParties();
            const sync = new BroadcastChannel('nexus_sync');
            sync.postMessage('SYNC_PARTIES');
            sync.close();
        } catch (err) { notifyError('Settlement Failed'); }
    };

    // Fetch sale and payment history for party
    const fetchPartyHistory = async (party: any) => {
        setHistoryLoading(true);
        try {
            const [commRes, activityRes] = await Promise.all([
                // Commercial Documents
                party.type === 'Customer' 
                    ? api.get('/invoices', { params: { customerName: party.phone, limit: 5 } })
                    : api.get('/purchases', { params: { search: party.phone, limit: 5 } }),
                // Manual Settlements via Audit Logs
                api.get('/reports/activity', { params: { search: party.name, limit: 10 } })
            ]);

            const documents = (commRes.data?.data || []).map((doc: any) => ({
                id: doc._id,
                title: doc.invoiceNumber || doc.purchaseNumber || 'Protocol Document',
                amount: doc.grandTotal,
                date: doc.createdAt,
                status: doc.paymentStatus,
                type: party.type === 'Customer' ? 'SALE' : 'PURCHASE'
            }));

            const settlements = (activityRes.data?.data || [])
                .filter((act: any) => act.action === 'TRANSACTION')
                .map((act: any) => {
                    const amtMatch = act.description.match(/₹(\d+)/);
                    return {
                        id: act._id,
                        title: 'Direct Settlement',
                        amount: amtMatch ? parseInt(amtMatch[1]) : 0,
                        date: act.createdAt,
                        status: 'paid',
                        type: 'SETTLEMENT',
                        note: act.description
                    };
                });

            const combined = [...documents, ...settlements].sort((a, b) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            setPartyHistory(combined.slice(0, 10));
        } catch (err) { console.error('History Rebalancing Failed'); }
        finally { setHistoryLoading(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Purge this node from digital ledger?')) return;
        try {
            await api.delete(`/parties/${id}`);
            notifySuccess('Node Deleted');
            fetchParties();
            const sync = new BroadcastChannel('nexus_sync');
            sync.postMessage('SYNC_PARTIES');
            sync.close();
        } catch (err) { notifyError('Purge Failed'); }
    };

    const resetForm = () => {
        setFormData({
            name: '', phone: '', email: '', type: 'Customer', group: 'General', gstin: '', openingBalance: 0,
            address: { street: '', city: '', state: '', pincode: '' }
        });
    };

    const analytics = useMemo(() => {
        const toReceive = parties.filter(p => p.type === 'Customer').reduce((acc, p) => acc + (p.currentBalance || 0), 0);
        const toPay = parties.filter(p => p.type === 'Supplier' || p.type === 'Vendor').reduce((acc, p) => acc + (p.currentBalance || 0), 0);
        return { toReceive, toPay, net: toReceive - toPay };
    }, [parties]);

    // Arrange parties within the selected filter scope
    const filteredParties = useMemo(() => {
        let result = parties.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                                 p.gstin?.toLowerCase().includes(search.toLowerCase()) ||
                                 p.phone.includes(search);
            const matchesType = activeFilter === 'All' || 
                              (activeFilter === 'Customers' && p.type === 'Customer') ||
                              (activeFilter === 'Vendors' && (p.type === 'Vendor' || p.type === 'Supplier'));
            return matchesSearch && matchesType;
        });

        // Sort parties by name or balance amount
        return [...result].sort((a, b) => {
            if (sortBy === 'Name') return a.name.localeCompare(b.name);
            if (sortBy === 'Recent') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            if (sortBy === 'New Added Party') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (sortBy === 'High Balance') return (b.currentBalance || 0) - (a.currentBalance || 0);
            if (sortBy === 'Low Balance') return (a.currentBalance || 0) - (b.currentBalance || 0);
            return 0;
        });
    }, [parties, search, activeFilter, sortBy]);

    return (
        <div className="p-2 sm:p-4 space-y-4 bg-[#fcfcfd] min-h-screen font-inter select-none">
            {/* Header Area — High Density Protocol */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1 no-print">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl ring-4 ring-slate-900/10">
                        <Users size={20} className="animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">Parties Terminal</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">CRM & Fiscal Ledger Hub</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => { resetForm(); setEditingNode(null); setShowModal(true); }}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold shadow-lg shadow-indigo-100 transition-all uppercase tracking-widest active:scale-95"
                    >
                        <Plus size={14} /> Initialize Party
                    </button>
                    <button 
                        onClick={handleSyncLifecycle}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} /> Sync History
                    </button>
                    <button 
                        onClick={handlePurgeAll}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-3 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        <Trash2 size={14} /> Purge Records
                    </button>
                    <button onClick={fetchParties} className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-all h-[42px] flex items-center shadow-sm">
                        <History size={16} />
                    </button>
                </div>
            </div>

            {/* Summary Stat Hub — Integrated Fiscal Analytics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <SummaryCard 
                    label="TO RECEIVE" 
                    value={`₹${analytics.toReceive.toLocaleString()}`} 
                    variant="indigo" 
                    icon={ArrowDownLeft} 
                    sub="Receivable from Customers"
                />
                <SummaryCard 
                    label="TO PAY" 
                    value={`₹${analytics.toPay.toLocaleString()}`} 
                    variant="rose" 
                    icon={ArrowUpRight} 
                    sub="Payable to Vendors"
                />
                <SummaryCard 
                    label="NET BALANCE" 
                    value={`₹${Math.abs(analytics.net).toLocaleString()}`} 
                    variant="slate" 
                    icon={CreditCard} 
                    sub={analytics.net >= 0 ? "Surplus Position" : "Deficit Position"}
                />
            </div>

            {/* Registry Search & Audit Filter */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={16} />
                        <input 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search party name, GSTIN..." 
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-50 rounded-2xl text-[11px] font-semibold focus:bg-white focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400"
                        />
                    </div>
                    {/* Arrangement Feature Hub */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowArrangeMenu(!showArrangeMenu)}
                            className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold tracking-widest uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm"
                        >
                            <ArrowUpRight size={14} className={showArrangeMenu ? 'rotate-90' : ''} />
                            Arrange: {sortBy}
                        </button>
                        {showArrangeMenu && (
                            <div className="absolute left-0 top-full mt-2 w-48 bg-white border border-slate-100 shadow-2xl rounded-2xl z-[50] overflow-hidden animate-in fade-in slide-in-from-top-2">
                                {['Name', 'Recent', 'New Added Party', 'High Balance', 'Low Balance'].map(opt => (
                                    <button 
                                        key={opt}
                                        onClick={() => { setSortBy(opt); setShowArrangeMenu(false); }}
                                        className={`w-full text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest h-full transition-colors ${sortBy === opt ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100/50">
                    {['All', 'Customers', 'Vendors'].map(filter => (
                        <button 
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest ${
                                activeFilter === filter ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            {/* Primary Party Ledger — High Density Terminal */}
            <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                <div className="overflow-hidden">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                            <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 bg-slate-50/50">
                                <th className="py-4 px-3">Party Identity Details Hub</th>
                                <th className="py-4 px-3">Contact Node Hub Node</th>
                                <th className="py-4 px-4 text-center">Protocol Settlement Type</th>
                                <th className="py-4 px-4 text-right">Audit Amount Settlement</th>
                                <th className="py-4 px-6 text-right w-[140px]">Actions Hub Command</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-inter text-[11px]">
                            {(showAllParties || search || activeFilter !== 'All' ? filteredParties : filteredParties.slice(0, 10)).map((party) => (
                                <tr key={party._id} className="group hover:bg-slate-100 transition-all border-b border-slate-100 last:border-0">
                                    <td className="py-3 px-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 font-semibold group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all cursor-pointer font-inter text-[11px] shrink-0">
                                                {party.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-[13px] font-semibold text-slate-900 tracking-tight truncate leading-none mb-1 font-inter">{party.name}</h4>
                                                <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <ShieldCheck size={10} className="text-slate-400" />
                                                    <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-500 font-inter">{party.gstin || 'NO GST REG'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-800 font-inter">
                                                    <Phone size={9} className="text-slate-400" /> {party.phone}
                                                </div>
                                                <div className="flex items-center gap-1 no-print">
                                                    <a href={`tel:${party.phone}`} className="p-1 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-600 hover:text-white transition-all">
                                                        <Phone size={7} />
                                                    </a>
                                                    <a href={`https://wa.me/91${party.phone}`} target="_blank" rel="noreferrer" className="p-1 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-600 hover:text-white transition-all">
                                                        <MessageSquare size={7} />
                                                    </a>
                                                </div>
                                            </div>
                                            {party.email && (
                                                <div className="flex items-center gap-1.5 text-[8px] font-semibold text-slate-400 font-inter truncate max-w-[120px]">
                                                    <Mail size={8} /> {party.email}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-semibold uppercase tracking-widest border transition-all font-inter ${
                                            (party.type === 'Vendor' || party.type === 'Supplier') ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        }`}>
                                            {party.type === 'Supplier' ? 'Vendor' : party.type}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-[12px] font-semibold tracking-tight font-inter ${(party.currentBalance || 0) >= 0 ? ((party.type === 'Vendor' || party.type === 'Supplier') ? 'text-rose-600' : 'text-emerald-600') : 'text-slate-400'}`}>
                                                ₹{Math.abs(party.currentBalance || 0).toLocaleString()}
                                            </span>
                                            <span className="text-[7.5px] font-semibold uppercase tracking-widest text-slate-300 mt-0.5 font-inter">
                                                {(party.type === 'Vendor' || party.type === 'Supplier') ? 'PAY' : 'RECEIVE'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all font-inter whitespace-nowrap">
                                            <button 
                                                onClick={() => { 
                                                    setSelectedParty(party); 
                                                    setPartyHistory([]); 
                                                    fetchPartyHistory(party);
                                                    setShowPaymentModal(true); 
                                                }}
                                                className="text-indigo-600 text-[11px] font-semibold hover:underline flex items-center gap-1"
                                            >
                                                <History size={12} /> History
                                            </button>
                                            <div className="relative group/menu">
                                                <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100">
                                                    <MoreVertical size={14} />
                                                </button>
                                                <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-100 shadow-2xl rounded-xl invisible group-hover/menu:visible opacity-0 group-hover/menu:opacity-100 transition-all z-20 overflow-hidden">
                                                    <button onClick={() => { setEditingNode(party); setFormData(party); setShowModal(true); }} className="w-full text-left px-4 py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 font-inter">
                                                        <Edit2 size={12} /> Edit Node
                                                    </button>
                                                    <button onClick={() => handleDelete(party._id)} className="w-full text-left px-4 py-2 text-[10px] font-semibold text-rose-500 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-50 font-inter">
                                                        <Trash2 size={12} /> Delete Node
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredParties.length === 0 && (
                        <div className="py-24 text-center">
                            <Users size={32} className="mx-auto text-slate-200 mb-2" />
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No matching party nodes identified</p>
                        </div>
                    )}
                </div>
                {filteredParties.length > 10 && !search && activeFilter === 'All' && (
                    <div className="p-6 bg-slate-50 border-t border-slate-100/50 text-center">
                        <button 
                            onClick={() => setShowAllParties(!showAllParties)}
                            className="mx-auto px-10 py-3 bg-white border-2 border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-100 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 justify-center active:scale-95"
                        >
                            <History size={14} />
                            {showAllParties ? 'SEE LESS' : `SEE ALL PARTIES (${filteredParties.length})`}
                        </button>
                    </div>
                )}
            </div>

            {/* Settlement Modal — Professional Fiscal Record */}
            {showPaymentModal && selectedParty && (
                <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                        <header className="px-8 py-6 border-b border-slate-50 bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Record Settlement</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                {(selectedParty.type === 'Vendor' || selectedParty.type === 'Supplier') ? 'Direct Payment to Vendor' : 'Direct Receipt from Customer'}
                            </p>
                        </header>
                        <form onSubmit={handlePayment} className="p-8 space-y-6">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Balance</p>
                                <h4 className="text-xl font-bold text-slate-900">₹{Math.abs(selectedParty.currentBalance || 0).toLocaleString()}</h4>
                                <p className="text-[8px] font-bold text-indigo-600 uppercase mt-1">
                                    {(selectedParty.type === 'Vendor' || selectedParty.type === 'Supplier') ? 'Currently Payable' : 'Currently Receivable'}
                                </p>
                            </div>
                            <FormItem label="Settlement Amount (₹)" icon={IndianRupee} type="number" value={paymentForm.amount.toString()} onChange={(v: string) => setPaymentForm({...paymentForm, amount: Number(v) || 0})} required />
                            <FormItem label="Payment Method" icon={CreditCard} isSelect>
                                <select 
                                    value={paymentForm.method} 
                                    onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold outline-none focus:bg-white focus:border-indigo-600 transition-all"
                                >
                                    {['Cash', 'UPI', 'Bank Card', 'Net Banking', 'Cheque'].map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </FormItem>
                            <FormItem label="Memo / Note" icon={MessageSquare} value={paymentForm.note} onChange={(v: string) => setPaymentForm({...paymentForm, note: v})} placeholder="Ref order # or reason" />
                            
                            {/* Forensic Party History Section */}
                            <div className="pt-4 border-t border-slate-100">
                                <h5 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <History size={12} className="text-indigo-600" /> Recent Protocol History
                                </h5>
                                <div className="space-y-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
                                    {historyLoading ? (
                                        <div className="py-4 text-center animate-pulse text-[8px] font-black text-slate-300 uppercase tracking-widest">Reconciling Ledger...</div>
                                    ) : partyHistory.length > 0 ? partyHistory.map((h: any) => (
                                        <div key={h.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-[5px] font-black px-1 py-0.5 rounded-[2px] border leading-none ${
                                                        h.type === 'SETTLEMENT' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                                                        h.type === 'SALE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                        'bg-amber-50 text-amber-600 border-amber-100'
                                                    }`}>{h.type}</span>
                                                    <p className="text-[8px] font-bold text-slate-700 uppercase tracking-tight truncate max-w-[150px]">{h.title}</p>
                                                </div>
                                                <p className="text-[6px] font-semibold text-slate-400 uppercase tracking-wide ml-1">{new Date(h.date).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-bold text-slate-950">₹{h.amount.toLocaleString()}</p>
                                                <span className={`text-[6px] font-black uppercase px-1 py-0.5 rounded-[2px] border leading-none ${h.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                    {h.status}
                                                </span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-4 text-center text-[8px] font-bold text-slate-300 uppercase italic">No historical settlements identified</div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all">Cancel</button>
                                <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all active:scale-95">Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal — Consistent Architecture */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[90vh]">
                        <header className="px-8 py-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">{editingNode ? 'Edit Party Node' : 'Initialize Party'}</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Digital Ledger Deployment</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </header>

                        <form onSubmit={handleSave} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormItem label="Party Name" icon={Users} value={formData.name} onChange={(v: string) => setFormData({...formData, name: v})} required />
                                <FormItem label="Contact Node" icon={Phone} value={formData.phone} onChange={(v: string) => setFormData({...formData, phone: v})} required maxLength={10} />
                                <FormItem label="Protocol Type" icon={Activity} isSelect>
                                    <div className="flex gap-2">
                                        {['Customer', 'Vendor'].map(t => (
                                            <button key={t} type="button" onClick={() => setFormData({...formData, type: t})} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all border ${
                                                formData.type === t ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                            }`}> {t} </button>
                                        ))}
                                    </div>
                                </FormItem>
                                <FormItem label="Tax Registry (GSTIN)" icon={ShieldCheck} value={formData.gstin} onChange={(v: string) => setFormData({...formData, gstin: v.toUpperCase()})} />
                                <FormItem label="Opening Settlement" icon={IndianRupee} type="number" value={formData.openingBalance.toString()} onChange={(v: string) => setFormData({...formData, openingBalance: parseInt(v) || 0})} />
                                <FormItem label="Email Endpoint" icon={Mail} value={formData.email} onChange={(v: string) => setFormData({...formData, email: v})} type="email" />
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-tight">
                                    <MapPin size={14} className="text-indigo-500" /> Geolocation Matrix
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <FormItem label="Physical Address" value={formData.address.street} onChange={(v: string) => setFormData({...formData, address: {...formData.address, street: v}})} required />
                                    </div>
                                    <FormItem label="Zip Protocol" value={formData.address.pincode} onChange={(v: string) => setFormData({...formData, address: {...formData.address, pincode: v}})} required />
                                    <FormItem label="City Hub" value={formData.address.city} onChange={(v: string) => setFormData({...formData, address: {...formData.address, city: v}})} required />
                                    <div className="md:col-span-1">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">State Territory</label>
                                            <select 
                                                value={formData.address.state} 
                                                onChange={(e) => setFormData({...formData, address: {...formData.address, state: e.target.value}})}
                                                className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold outline-none focus:bg-white focus:border-indigo-600 transition-all"
                                                required
                                            >
                                                <option value="">Select Territory</option>
                                                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>

                        <footer className="p-8 border-t border-slate-50 bg-slate-50/50 flex gap-4">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all">Cancel</button>
                            <button onClick={handleSave} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-95">
                                {editingNode ? 'Update Node' : 'Initialize Node'}
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}

const SummaryCard = memo(({ label, value, variant, icon: Icon, sub }: any) => {
    const variants: any = {
        indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600 ring-indigo-500/10',
        rose: 'bg-rose-50 border-rose-100 text-rose-600 ring-rose-500/10',
        slate: 'bg-slate-50 border-slate-200 text-slate-900 ring-slate-900/10',
    };
    return (
        <div className={`p-5 rounded-[2rem] border-2 shadow-sm flex items-center justify-between group transition-all hover:scale-[1.02] ${variants[variant]}`}>
            <div className="space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{label}</p>
                <h3 className="text-xl sm:text-2xl font-semibold font-inter tracking-tight">{value}</h3>
                <p className="text-[8px] font-bold uppercase tracking-tight opacity-40">{sub}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-sm border border-black/5 transition-transform group-hover:rotate-12`}>
                <Icon size={20} />
            </div>
        </div>
    );
});

function FormItem({ label, icon: Icon, isSelect, ...props }: any) {
    return (
        <div className="space-y-1.5 flex-1 w-full">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                {Icon && <Icon size={12} className="text-indigo-400" />} {label}
            </label>
            {isSelect ? props.children : (
                <input 
                    {...props} 
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-600 transition-all placeholder:text-slate-300" 
                    onChange={(e) => props.onChange(e.target.value)}
                />
            )}
        </div>
    );
}
