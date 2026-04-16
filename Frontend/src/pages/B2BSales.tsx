import { useState, useEffect, useCallback, memo } from 'react';
import {
    Plus,
    Building2,
    Zap,
    TrendingUp,
    FileText,
    Users,
    CreditCard,
    RefreshCcw,
    ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function B2BSales() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ revenue: 0, pending: 0, count: 0, clients: 0 });

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/invoices?limit=100');
            const data = res.data?.data || [];
            
            // Filter or assume these are B2B for this view
            setInvoices(data);
            
            const revenue = data.reduce((s: number, i: any) => s + (i.grandTotal || 0), 0);
            const pending = data.filter((i: any) => i.paymentStatus !== 'paid').reduce((s: number, i: any) => s + (i.grandTotal || 0), 0);
            const clients = new Set(data.map((i: any) => i.customerName)).size;
            
            setStats({ revenue, pending, count: data.length, clients });
        } catch (e) {
            console.error("B2B Node Sync Error:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    return (
        <div className="space-y-4 h-full min-h-screen p-2 bg-[#F8FAFC]">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl shadow-slate-200">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <Zap size={10} className="text-amber-500 fill-amber-500" />
                            <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest leading-none">B2B Command Node</span>
                        </div>
                        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight leading-tight">Business Terminal</h1>
                    </div>
                </div>

                <div className="flex items-center gap-2 z-10">
                    <button onClick={fetchAll} className="p-2.5 text-slate-400 hover:text-indigo-600 border border-slate-100 rounded-xl hover:bg-indigo-50 transition-all">
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <Link
                        to="/pos"
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-semibold uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95"
                    >
                        <Plus size={14} /> New B2B Invoice
                    </Link>
                </div>
            </header>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="B2B Revenue" value={`₹${stats.revenue.toLocaleString()}`} icon={TrendingUp} color="emerald" />
                <MetricCard label="Active Clients" value={`${stats.clients} Nodes`} icon={Users} color="indigo" />
                <MetricCard label="Pending Flow" value={`₹${stats.pending.toLocaleString()}`} icon={CreditCard} color="rose" />
                <MetricCard label="Settled Load" value={stats.count.toString()} icon={FileText} color="amber" />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-8 bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
                        <h3 className="text-base font-semibold text-slate-900 uppercase tracking-tight">Recent Node Transactions</h3>
                        <span className="text-[8px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">Real-time sync active</span>
                    </div>
                    
                    <div className="h-[500px] overflow-y-auto custom-scrollbar">
                        {invoices.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 opacity-20">
                                <Building2 size={48} className="mb-4" />
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Zero B2B Protocols Managed</p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 sticky top-0 z-10">
                                    <tr className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                                        <th className="px-6 py-4">Client ID</th>
                                        <th className="px-6 py-4">Invoice Node</th>
                                        <th className="px-6 py-4 text-right">Factual Value</th>
                                        <th className="px-6 py-4 text-center">State</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {invoices.map((inv) => (
                                        <tr key={inv._id} className="group hover:bg-slate-50/80 transition-all cursor-pointer">
                                            <td className="px-6 py-4">
                                                <span className="text-[11px] font-semibold text-slate-900 truncate block max-w-[150px] uppercase">{inv.customerName || 'Walk-in'}</span>
                                            </td>
                                            <td className="px-6 py-4 text-indigo-600 font-semibold text-[10px] uppercase tracking-wider">{inv.invoiceNumber}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-semibold text-slate-900">₹{inv.grandTotal?.toLocaleString() || 0}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-semibold uppercase tracking-widest border ${
                                                    inv.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                                                }`}>
                                                    {inv.paymentStatus}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-slate-900 p-6 rounded-2xl border-2 border-slate-800 shadow-xl relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-indigo-400 text-[8px] font-semibold uppercase tracking-[0.2em] mb-2 leading-none">Automation Node</p>
                            <h3 className="text-lg font-semibold text-white tracking-tight mb-3">Optimize Bulk Settlements</h3>
                            <p className="text-slate-400 text-[10px] font-semibold uppercase leading-relaxed">Accelerate wholesale flow with automated GST reconciliation and nodal tracking.</p>
                            <button className="mt-6 px-5 py-2.5 bg-white text-slate-900 rounded-xl text-[10px] font-semibold uppercase tracking-widest hover:bg-slate-50 shadow-xl active:scale-95 transition-all">Enable Auto-Sync</button>
                        </div>
                        <Zap size={100} className="absolute -right-4 -top-4 text-white opacity-5 rotate-12 group-hover:rotate-45 transition-transform duration-700" />
                    </div>

                    <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg border border-indigo-500 flex items-center justify-between">
                        <div>
                            <p className="text-white font-semibold text-xs uppercase tracking-tighter leading-none mb-1">Nodal Support</p>
                            <p className="text-indigo-100 text-[8px] font-semibold uppercase tracking-widest opacity-80">Protocol Version 4.0.2</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"><ArrowRight size={14} /></div>
                    </div>
                </div>
            </div>
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
      <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3 transition-all hover:border-indigo-200 group relative overflow-hidden h-full">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${colors[color] || colors.indigo} border shadow-sm`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0 text-center sm:text-left flex-1">
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-1.5 whitespace-nowrap overflow-hidden text-ellipsis">{label}</p>
          <h3 className="text-lg sm:text-xl font-semibold text-slate-900 leading-tight truncate" title={value}>{value}</h3>
          {sub && <p className={`mt-1.5 text-[8px] font-semibold uppercase tracking-tighter ${color === 'rose' ? 'text-rose-500' : 'text-emerald-600'} truncate`}>{sub}</p>}
        </div>
      </div>
    );
});
