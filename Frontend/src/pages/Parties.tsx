import { useState, useEffect } from 'react';
import { Phone, Mail, ArrowUpRight, ArrowDownLeft, MoreVertical, Filter, UserPlus, Users, X, Edit2, Trash2, ShieldCheck, Activity, MapPin, Globe, CreditCard, Search, SearchCode } from 'lucide-react';
import api from '../services/api';
import { useNotify } from '../context/NotificationContext';

export default function Parties() {
    const [parties, setParties] = useState<any[]>([]);
    const [activeType, setActiveType] = useState('All');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingNode, setEditingNode] = useState<any>(null);
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

    useEffect(() => { fetchParties(); }, []);

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
        } catch (err) { notifyError('Communication Error: Node rejected'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Purge this node from digital ledger?')) return;
        try {
            await api.delete(`/parties/${id}`);
            notifySuccess('Node Decommissioned');
            fetchParties();
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

    if (loading && parties.length === 0) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center bg-slate-50/50">
                <Users size={48} className="text-slate-200 animate-pulse" />
                <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Syncing Party Vault...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 min-h-screen p-4 bg-[#fcfcfd]">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 shadow-sm mb-2">
                        <Activity size={10} className="text-indigo-600" />
                        <span className="text-[9px] font-black text-indigo-900/60 uppercase tracking-[0.2em]">Contact Records Management</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">Parties & NEXUS Nodes</h1>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck size={12} className="text-emerald-500" /> Digital address book for ecosystem ledger.
                    </p>
                </div>
                <button onClick={() => { resetForm(); setEditingNode(null); setShowModal(true); }} className="flex items-center gap-3 px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black shadow-2xl hover:bg-slate-800 transition-all uppercase tracking-widest active:scale-95">
                    <UserPlus size={18} /> Initialize New Node
                </button>
            </div>

            {/* Strategy & Search Protocol */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 px-2">
                <div className="lg:col-span-3 flex overflow-x-auto gap-2 no-scrollbar pb-2">
                    {['All', 'Customer', 'Vendor'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setActiveType(type)}
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border ${
                                activeType === type ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-200' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                            }`}
                        >
                            {type} Records
                        </button>
                    ))}
                </div>
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={14} />
                    <input
                        type="text" placeholder="SEARCH NODES..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-indigo-500/20 transition-all shadow-sm placeholder:text-slate-200"
                    />
                </div>
            </div>

            {/* Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
                {filteredParties.map((party) => (
                    <div key={party._id} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <button onClick={() => { setEditingNode(party); setFormData(party); setShowModal(true); }} className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"> <Edit2 size={12} /> </button>
                            <button onClick={() => handleDelete(party._id)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"> <Trash2 size={12} /> </button>
                        </div>

                        <div className="flex items-start gap-5">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${
                                party.type === 'Vendor' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                            }`}>
                                <Users size={24} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter leading-none">{party.name}</h3>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">{party.type} ID: {party._id.slice(-6)}</p>
                                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                    party.type === 'Vendor' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                    {party.type}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Phone size={12} className="text-slate-400" />
                                    <span className="text-[10px] font-bold">{party.phone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500 overflow-hidden">
                                    <Mail size={12} className="text-slate-400 shrink-0" />
                                    <span className="text-[10px] font-bold truncate">{party.email || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-3 flex flex-col justify-center items-end border border-slate-100/50">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Balance Ledger</span>
                                <span className={`text-xs font-black ${party.openingBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    ₹{Math.abs(party.openingBalance).toLocaleString()}
                                    <span className="text-[8px] ml-1">{party.openingBalance < 0 ? 'Pay' : 'Rec'}</span>
                                </span>
                            </div>
                        </div>

                        {party.address && (
                            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center gap-2 text-slate-300">
                                <MapPin size={10} />
                                <span className="text-[9px] font-bold uppercase truncate">{party.address.city}, {party.address.state}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Initialize Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-white/20">
                        <header className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                                    <UserPlus size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter">{editingNode ? 'Configure Node' : 'Initialize Node'}</h2>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Protocol V2.0 Registry Update</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-3 bg-white text-slate-400 hover:text-rose-500 rounded-2xl border border-slate-100 transition-all shadow-sm active:scale-90"> <X size={18} /> </button>
                        </header>

                        <form onSubmit={handleSave} className="flex flex-col max-h-[70vh]">
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                <section>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <SI label="Node Name" icon={Users} placeholder="Full Name / Entity" value={formData.name} onChange={(v: string) => setFormData({...formData, name: v})} required />
                                        <SI label="Mobile Protocol" icon={Phone} placeholder="10 Digits" value={formData.phone} onChange={(v: string) => setFormData({...formData, phone: v})} required maxLength={10} />
                                        <SI label="Registry Email" icon={Mail} placeholder="email@nexus.com" value={formData.email} onChange={(v: string) => setFormData({...formData, email: v})} type="email" />
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"> <Activity size={12} className="text-indigo-500" /> Strategy Type </label>
                                            <div className="flex gap-2">
                                                {['Customer', 'Vendor'].map(t => (
                                                    <button key={t} type="button" onClick={() => setFormData({...formData, type: t})} className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                                        formData.type === t ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'
                                                    }`}> {t} </button>
                                                ))}
                                            </div>
                                        </div>
                                        <SI label="Tax Registry (GSTIN)" icon={ShieldCheck} placeholder="GSTIN Number" value={formData.gstin} onChange={(v: string) => setFormData({...formData, gstin: v})} />
                                        <SI label="Opening Pulse (₹)" icon={CreditCard} type="number" value={formData.openingBalance.toString()} onChange={(v: string) => setFormData({...formData, openingBalance: parseInt(v) || 0})} placeholder="0.00" />
                                        
                                        <div className="md:col-span-2 space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"> <Layout size={12} className="text-indigo-500" /> Section / Group </label>
                                            <div className="flex gap-2">
                                                <select value={formData.group} onChange={(e) => setFormData({...formData, group: e.target.value})} className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black outline-none focus:bg-white focus:border-indigo-500 transition-all">
                                                    <option value="General">General</option>
                                                    <option value="VIP">VIP Nodes</option>
                                                    <option value="Wholesale">Wholesale Hub</option>
                                                    <option value="Local">Local Contacts</option>
                                                    {[...new Set(parties.map(p => p.group))].filter(g => g && !['General', 'VIP', 'Wholesale', 'Local'].includes(g)).map(g => (
                                                        <option key={g} value={g}>{g}</option>
                                                    ))}
                                                </select>
                                                <input 
                                                    placeholder="+ Quick Add Section..." 
                                                    onKeyDown={(e: any) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            setFormData({...formData, group: e.target.value});
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                    className="w-48 px-5 py-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-[10px] font-black outline-none focus:border-indigo-600 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="pt-8 border-t border-slate-100">
                                    <div className="flex items-center gap-3 mb-6">
                                        <MapPin size={14} className="text-indigo-500" />
                                        <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Geolocation Registry</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2"> <SI label="Physical Address" value={formData.address.street} onChange={(v: string) => setFormData({...formData, address: {...formData.address, street: v}})} placeholder="Street / Area" required /> </div>
                                        <SI label="Zip Code" value={formData.address.pincode} onChange={(v: string) => setFormData({...formData, address: {...formData.address, pincode: v}})} placeholder="400001" required maxLength={6} />
                                        <SI label="City Node" value={formData.address.city} onChange={(v: string) => setFormData({...formData, address: {...formData.address, city: v}})} placeholder="Mumbai" required />
                                        <SI label="State Territory" value={formData.address.state} onChange={(v: string) => setFormData({...formData, address: {...formData.address, state: v}})} placeholder="Maharashtra" required />
                                    </div>
                                </section>
                            </div>

                            <footer className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-white text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-100 transition-all"> Abort Mission </button>
                                <button type="submit" className="flex-[2] py-4 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 active:scale-95">
                                    {editingNode ? 'Execute Modification' : 'Confirm Initialization'} <ShieldCheck size={18} />
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function SI({ label, value, onChange, icon: Icon, placeholder, type = "text", required = false, pattern, maxLength, min, title }: any) {
    return (
        <div className="space-y-1.5 group transition">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2 group-focus-within:text-indigo-600 transition-colors">
                {Icon && <Icon size={12} />} {label} {required && <span className="text-rose-500 font-black ml-0.5">*</span>}
            </label>
            <div className="relative">
                <input required={required} type={type} pattern={pattern} maxLength={maxLength} min={min} title={title}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/30 outline-none placeholder:text-slate-300 transition-all shadow-sm"
                    placeholder={placeholder || `Enter ${label.split(' ').pop()}...`} value={value}
                    onChange={e => onChange(e.target.value)}
                />
            </div>
        </div>
    );
}
