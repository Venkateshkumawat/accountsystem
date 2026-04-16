import { useState, useEffect, memo } from 'react';
import { Phone, Mail, ArrowUpRight, ArrowDownLeft, MoreVertical, UserPlus, Users, X, Edit2, Trash2, ShieldCheck, Activity, MapPin, CreditCard, Search } from 'lucide-react';
import api from '../services/api';
import { useNotify } from '../context/NotificationContext';
import { INDIAN_STATES } from '../constants/indianStates';
import { validateGSTIN, validatePincode } from '../utils/validation';

export default function Parties() {
    const [parties, setParties] = useState<any[]>([]);
    const [activeType, setActiveType] = useState('All');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingNode, setEditingNode] = useState<any>(null);
    const [showAllParties, setShowAllParties] = useState(false);
    const LIMIT = 10;
    const { notifySuccess, notifyError } = useNotify();

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        type: 'Customer',
        group: 'General',
        gstin: '',
        openingBalance: 0,
        address: { street: '', city: '', state: '', pincode: '' }
    });

    useEffect(() => { 
        fetchParties(); 
        
        // ── Cross-Tab Sync ──
        const syncChannel = new BroadcastChannel('nexus_sync');
        const handleSync = (event: any) => {
            if (event.data === 'FETCH_DASHBOARD' || event.data === 'SYNC_PARTIES') {
                fetchParties();
            }
        };
        syncChannel.addEventListener('message', handleSync);

        return () => {
            syncChannel.removeEventListener('message', handleSync);
            syncChannel.close();
        };
    }, []);

    const fetchParties = async () => {
        setLoading(true);
        try {
            const res = await api.get('/parties');
            setParties(res.data.data || []);
        } catch (err) { notifyError('Nexus Sync Failed: Parties unreachable'); }
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

            // Notify other tabs
            const sync = new BroadcastChannel('nexus_sync');
            sync.postMessage('FETCH_DASHBOARD');
            sync.postMessage('SYNC_PARTIES');
            sync.close();
        } catch (err) { notifyError('Communication Error: Node rejected'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Purge this node from digital ledger?')) return;
        try {
            await api.delete(`/parties/${id}`);
            notifySuccess('Node Decommissioned');
            fetchParties();

            // Notify other tabs
            const sync = new BroadcastChannel('nexus_sync');
            sync.postMessage('FETCH_DASHBOARD');
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

    const filteredParties = parties.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search);
        const matchesType = activeType === 'All' || p.type === activeType;
        return matchesSearch && matchesType;
    });

    const displayedParties = showAllParties ? filteredParties : filteredParties.slice(0, LIMIT);

    const totalToReceive = parties.filter(p => p.openingBalance > 0).reduce((acc, p) => acc + p.openingBalance, 0);
    const totalToPay = parties.filter(p => p.openingBalance < 0).reduce((acc, p) => acc + Math.abs(p.openingBalance), 0);
    const netBalance = totalToReceive - totalToPay;

    if (loading && parties.length === 0) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center bg-slate-50/50">
                <Users size={48} className="text-slate-200 animate-pulse" />
                <p className="mt-4 text-sm font-medium text-slate-400">Syncing Party Vault...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 min-h-screen p-2 sm:p-4 bg-[#fcfcfd]">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Parties (Customers & Vendors)</h1>
                    <p className="text-sm font-normal text-slate-500 mt-1">Manage your business relationships and outstanding balances</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => { resetForm(); setEditingNode(null); setShowModal(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                        <UserPlus size={18} /> Add Party
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 font-inter">
                <MetricCard label="TO RECEIVE" value={`₹${totalToReceive.toLocaleString()}`} icon={ArrowUpRight} color="emerald" />
                <MetricCard label="TO PAY" value={`₹${totalToPay.toLocaleString()}`} icon={ArrowDownLeft} color="rose" />
                <MetricCard label="NET BALANCE" value={`₹${netBalance.toLocaleString()}`} icon={CreditCard} color="indigo" />
            </div>

            {/* Strategy & Search Protocol */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 lg:p-6 flex flex-col sm:flex-row gap-4 justify-between border-b border-slate-50">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input
                            type="text" placeholder="Search party name, GSTIN..." value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-normal focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                        />
                    </div>
                    <div className="flex gap-1.5 bg-slate-50 p-1 rounded-xl w-fit self-start sm:self-center">
                        {['All', 'Customer', 'Vendor'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setActiveType(type)}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                                    activeType === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {type}s
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-slate-50">
                    {filteredParties.map((party) => (
                        <div key={party._id} className="p-5 flex flex-col gap-4 hover:bg-slate-50/50 transition-colors">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-base font-semibold text-indigo-600 border border-slate-200 shrink-0">
                                        {party.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[15px] font-semibold text-slate-900 leading-tight truncate">{party.name}</p>
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight mt-0.5">{party.gstin || 'NO GSTIN REGISTRY'}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shrink-0 ${
                                    party.type === 'Vendor' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                }`}>
                                    {party.type}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-50/50">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Pulse</p>
                                    <p className={`text-base font-black ${party.openingBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        ₹{Math.abs(party.openingBalance).toLocaleString()}
                                    </p>
                                    <p className="text-[8px] font-semibold text-slate-400 uppercase">{party.openingBalance < 0 ? 'TO PAY' : 'TO RECEIVE'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Protocol</p>
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                        <Phone size={10} className="text-slate-300" />
                                        <span className="text-[11px] font-black">{party.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                                        <Mail size={10} className="text-slate-300" />
                                        <span className="text-[10px] font-semibold truncate max-w-[120px]">{party.email || 'no-nexus-mail'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => { 
                                    setEditingNode(party); 
                                    setFormData({
                                        ...party,
                                        address: party.address || { street: '', city: '', state: '', pincode: '' }
                                    }); 
                                    setShowModal(true); 
                                }} className="flex-1 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:border-indigo-200 transition-all">Edit Node</button>
                                <button onClick={() => handleDelete(party._id)} className="w-12 h-12 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl border border-rose-100 hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                    {filteredParties.length === 0 && (
                        <div className="py-20 text-center">
                            <Users size={32} className="mx-auto text-slate-100 mb-2" />
                            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No Parties Found</p>
                        </div>
                    )}
                </div>

                {/* Desktop Data Grid Table */}
                <div className="hidden lg:block overflow-x-auto no-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-50">
                                <th className="px-6 py-4">PARTY DETAILS</th>
                                <th className="px-6 py-4">CONTACT</th>
                                <th className="px-6 py-4">TYPE</th>
                                <th className="px-6 py-4">BALANCE</th>
                                <th className="px-6 py-4 text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {displayedParties.map(p => (
                                <tr key={p._id} className="group hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-0">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-indigo-600 border border-slate-200">
                                                {p.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900 leading-none mb-1">{p.name}</p>
                                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{p.gstin || 'No GSTIN Registry'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                <Phone size={12} className="text-slate-300" />
                                                <span className="text-[11px] font-medium">{p.phone}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-400">
                                                <Mail size={12} className="text-slate-300" />
                                                <span className="text-[11px] font-medium truncate max-w-[150px]">{p.email || 'no-registry@nexus.com'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                            p.type === 'Vendor' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {p.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className={`text-sm font-semibold ${p.openingBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                ₹{Math.abs(p.openingBalance).toLocaleString()}
                                            </p>
                                            <p className="text-[9px] font-medium text-slate-400 uppercase">{p.openingBalance < 0 ? 'TO PAY' : 'TO RECEIVE'}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <div className="relative group/menu">
                                                <button className="p-2 text-slate-300 hover:text-slate-600 hover:bg-white rounded-lg transition-all">
                                                    <MoreVertical size={16} />
                                                </button>
                                                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl py-2 w-32 hidden group-hover/menu:block z-10 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <button onClick={() => { 
                                                        setEditingNode(p); 
                                                        setFormData({
                                                            ...p,
                                                            address: p.address || { street: '', city: '', state: '', pincode: '' }
                                                        }); 
                                                        setShowModal(true); 
                                                    }} className="w-full text-left px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2">
                                                        <Edit2 size={12} /> Edit
                                                    </button>
                                                    <button onClick={() => handleDelete(p._id)} className="w-full text-left px-4 py-2 text-xs font-medium text-rose-500 hover:bg-rose-50 flex items-center gap-2">
                                                        <Trash2 size={12} /> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredParties.length > LIMIT && (
                        <div className="p-6 bg-slate-50/30 border-t border-slate-50 text-center">
                            <button
                                onClick={() => setShowAllParties(!showAllParties)}
                                className="mx-auto px-8 py-2.5 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 justify-center"
                            >
                                {showAllParties ? 'Collapse Registry' : `See All Parties (${filteredParties.length})`}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Initialize Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-white/20 max-h-[95vh] flex flex-col">
                        <header className="px-6 py-5 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-white shrink-0">
                            <div className="flex flex-col">
                                <h3 className="text-xl font-semibold tracking-tight uppercase">{editingNode ? 'Edit Party Node' : 'New Party Node'}</h3>
                                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Party Registry Update</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-white/10 hover:bg-rose-500 hover:text-white rounded-xl transition-all text-xs font-semibold uppercase tracking-widest text-slate-300">Back</button>
                            </div>
                        </header>

                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto w-full p-4 sm:p-6 custom-scrollbar">
                                <section className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <SI label="Node Name" icon={Users} placeholder="Full Name / Entity" value={formData.name} onChange={(v: string) => setFormData({...formData, name: v})} required />
                                        <SI label="Mobile Protocol" icon={Phone} placeholder="10 Digits" value={formData.phone} onChange={(v: string) => setFormData({...formData, phone: v})} required maxLength={10} />
                                        <SI label="Registry Email" icon={Mail} placeholder="email@nexus.com" value={formData.email} onChange={(v: string) => setFormData({...formData, email: v})} type="email" />
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-500 ml-1 flex items-center gap-2"> <Activity size={14} className="text-indigo-500" /> Strategy Type </label>
                                            <div className="flex gap-2">
                                                {['Customer', 'Vendor'].map(t => (
                                                    <button key={t} type="button" onClick={() => setFormData({...formData, type: t})} className={`flex-1 py-3.5 rounded-2xl text-sm font-medium border transition-all ${
                                                        formData.type === t ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'
                                                    }`}> {t} </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <SI 
                                                label="Tax Registry (GSTIN)" 
                                                icon={ShieldCheck} 
                                                placeholder="GSTIN Number" 
                                                value={formData.gstin} 
                                                onChange={(v: string) => setFormData({...formData, gstin: v.toUpperCase()})} 
                                            />
                                            {formData.gstin && !validateGSTIN(formData.gstin) && (
                                                <p className="text-[10px] font-medium text-rose-500 ml-1 mt-1">Invalid GSTIN Pattern</p>
                                            )}
                                        </div>
                                        <SI label="Opening Pulse (₹)" icon={CreditCard} type="number" value={formData.openingBalance.toString()} onChange={(v: string) => setFormData({...formData, openingBalance: parseInt(v) || 0})} placeholder="0.00" />
                                        
                                        <div className="md:col-span-2 space-y-1.5">
                                            <label className="text-sm font-medium text-slate-500 ml-1 flex items-center gap-2"> Section / Group </label>
                                            <div className="flex gap-2">
                                                <select value={formData.group} onChange={(e) => setFormData({...formData, group: e.target.value})} className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all">
                                                    <option value="General">General</option>
                                                    <option value="VIP">VIP Nodes</option>
                                                    <option value="Wholesale">Wholesale Hub</option>
                                                    <option value="Local">Local Contacts</option>
                                                    {[...new Set(parties.map(p => p.group))].filter(g => g && !['General', 'VIP', 'Wholesale', 'Local'].includes(g)).map(g => (
                                                        <option key={g} value={g}>{g}</option>
                                                    ))}
                                                </select>
                                                <input 
                                                    placeholder="+ New Group..." 
                                                    onKeyDown={(e: any) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            setFormData({...formData, group: e.target.value});
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                    className="w-48 px-5 py-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-xs font-semibold text-indigo-900 outline-none focus:border-indigo-600 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="pt-8 border-t border-slate-100">
                                    <div className="flex items-center gap-3 mb-6">
                                        <MapPin size={16} className="text-indigo-500" />
                                        <h4 className="text-lg font-semibold text-slate-900 tracking-tight">Geolocation Registry</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2"> <SI label="Physical Address" value={formData.address.street} onChange={(v: string) => setFormData({...formData, address: {...formData.address, street: v}})} placeholder="Street / Area" required /> </div>
                                        <div className="space-y-1.5">
                                            <SI 
                                                label="Zip Code" 
                                                value={formData.address.pincode} 
                                                onChange={(v: string) => setFormData({...formData, address: {...formData.address, pincode: v.replace(/\D/g, '').slice(0, 6)}})} 
                                                placeholder="400001" 
                                                required 
                                                maxLength={6} 
                                            />
                                            {formData.address.pincode && !validatePincode(formData.address.pincode) && (
                                                <p className="text-[10px] font-medium text-rose-500 ml-1 mt-1">Must be 6 digits</p>
                                            )}
                                        </div>
                                        <SI label="City Node" value={formData.address.city} onChange={(v: string) => setFormData({...formData, address: {...formData.address, city: v}})} placeholder="Mumbai" required />
                                        
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-500 ml-1 flex items-center gap-2"> State Territory </label>
                                            <select 
                                                value={formData.address.state} 
                                                onChange={(e) => setFormData({...formData, address: {...formData.address, state: e.target.value}})}
                                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all appearance-none"
                                                required
                                            >
                                                <option value="">Select State Territory</option>
                                                {INDIAN_STATES.map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </section>
                            
                                <footer className="pt-6 mt-6 border-t border-slate-100 flex gap-3 shrink-0">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-white text-slate-600 rounded-2xl text-xs sm:text-sm font-semibold border border-slate-200 hover:bg-slate-100 transition-all uppercase tracking-widest">
                                        Cancel
                                    </button>
                                    <button type="submit" className="flex-[2] py-4 bg-slate-950 text-white rounded-2xl text-xs sm:text-sm font-semibold shadow-xl hover:bg-indigo-600 transition-all uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 group">
                                        {editingNode ? 'Update Node' : 'Initialize Node'} <ShieldCheck size={16} className="inline ml-1 group-hover:text-amber-400 transition-colors" />
                                    </button>
                                </footer>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const MetricCard = memo(({ label, value, icon: Icon, color, sub }: any) => {
  const colors: any = {
    indigo: 'text-indigo-600 bg-indigo-50/50 border-indigo-100',
    rose: 'text-rose-600 bg-rose-50/50 border-rose-100',
    amber: 'text-amber-600 bg-amber-50/50 border-amber-100',
    emerald: 'text-emerald-600 bg-emerald-50/50 border-emerald-100',
  };
  
  return (
    <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-4 transition-all hover:border-indigo-200 group relative overflow-hidden">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${colors[color]} border shadow-sm`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 text-center sm:text-left flex-1">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <h3 className="text-xl font-semibold text-slate-900 leading-tight">{value}</h3>
        {sub && <p className={`mt-1 text-[8px] font-bold uppercase tracking-tighter ${color === 'rose' ? 'text-rose-500' : 'text-emerald-600'}`}>{sub}</p>}
      </div>
    </div>
  );
});



function SI({ label, icon: Icon, ...props }: any) {
    return (
        <div className="space-y-1.5 flex-1 min-w-0">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                {Icon && <Icon size={12} className="text-indigo-400" />} {label}
            </label>
            <input 
                {...props} 
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-600 transition-all placeholder:text-slate-300" 
                onChange={(e) => props.onChange(e.target.value)}
            />
        </div>
    );
}

