import {
    Plus,
    Building2,
    Zap,
    TrendingUp,
    FileText,
    ArrowRight,
    Users,
    CreditCard
} from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router-dom';


export default function B2BSales() {
    return (
        <div className="space-y-4 h-full  min-h-screen p-2 bg-[#F8FAFC]">

            {/* Compact Header Protocol */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl shadow-slate-200">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <Zap size={10} className="text-amber-500 fill-amber-500" />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">B2B Command Node</span>
                        </div>
                        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight leading-tight">Business Terminal</h1>
                    </div>
                </div>

                <div className="flex items-center gap-2 z-10">
                    <Link
                        to="/pos"
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95"
                    >
                        <Plus size={14} /> New B2B Invoice
                    </Link>
                    <Link
                        to="/accounting"
                        className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-slate-900 hover:text-slate-900 transition-all active:scale-95"
                    >
                        View Ledger
                    </Link>
                </div>

                <div className="absolute right-0 top-0 p-10 opacity-5 scale-150 rotate-45 pointer-events-none">
                    <Building2 size={80} />
                </div>
            </header>

            {/* Metrics Hub (Small & Dense) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="B2B Revenue" value="₹0" icon={TrendingUp} color="emerald" />
                <MetricCard label="Active Clients" value="0 Nodes" icon={Users} color="indigo" />
                <MetricCard label="Pending Flow" value="₹0" icon={CreditCard} color="rose" />
                <MetricCard label="Settled Load" value="0" icon={FileText} color="amber" />
            </div>

            {/* Split Interface: Recent Sales + Partner Nodes */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-3">

                {/* Transactional Flow Terminal */}
            <div className="lg:col-span-6 bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="w-full px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="text-base font-semibold text-slate-900 uppercase tracking-tight">Recent Node Transactions</h3>
                        <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">Real-time sync active</span>
                    </div>
                    <div className="p-0 flex flex-col min-h-[180px]">
                        {/* Mobile Cards */}
                        <div className="lg:hidden divide-y divide-slate-50">
                            {/* Records will be dynamically populated via Node Sync */}
                            <div className="flex flex-col items-center justify-center py-12 opacity-20">
                                <Building2 size={32} className="mb-2" />
                                <p className="text-[9px] font-black uppercase tracking-widest">Zero B2B Protocols Found</p>
                            </div>
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50">
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                                        <th className="px-5 py-4 font-black">Client SKU</th>
                                        <th className="px-5 py-4 font-black">Audit ID</th>
                                        <th className="px-5 py-4 font-black">Value</th>
                                        <th className="px-5 py-4 text-right font-black">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {/* Records will be dynamically populated via Node Sync */}
                                </tbody>
                            </table>
                            {/* Empty State for Empty Results */}
                            <div className="flex-1 flex flex-col items-center justify-center py-12 opacity-20 group-hover:opacity-30 transition-opacity">
                                <Building2 size={32} className="mb-2" />
                                <p className="text-[9px] font-black uppercase tracking-widest">Zero B2B Protocols Found</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-3 bg-slate-50/50 border-t border-slate-50 text-center">
                        <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center justify-center gap-2 mx-auto">
                            Access Full Ledger Protocol <ArrowRight size={10} />
                        </button>
                    </div>
                </div>

                {/* Automation Promo Plate */}
                <div className="lg:col-span-4 flex flex-col gap-3">
                    <div className="flex-1 bg-slate-900 p-6 rounded-2xl border-2 border-slate-800 shadow-xl relative overflow-hidden group">
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <p className="text-indigo-400 text-[8px] font-black uppercase tracking-[0.2em] mb-2 leading-none">Automation Node</p>
                                <h3 className="text-lg font-semibold text-white tracking-tight leading-none mb-3">Optimize Bulk Settlements</h3>
                                <p className="text-slate-400 text-[10px] font-semibold uppercase leading-relaxed max-w-[200px]">Accelerate wholesale flow with automated GST reconciliation and nodal tracking.</p>
                            </div>
                            <button className="mt-8 px-5 py-3 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all w-fit shadow-xl">
                                Enable Auto-Sync
                            </button>
                        </div>
                        <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12 text-white group-hover:rotate-45 transition-transform duration-700">
                            <Zap size={100} fill="currentColor" />
                        </div>
                    </div>

                    <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg flex items-center justify-between border border-indigo-500">
                        <div>
                            <p className="text-white font-black text-xs uppercase tracking-tighter leading-none mb-1">Nodal Support</p>
                            <p className="text-indigo-100 text-[8px] font-semibold uppercase tracking-widest">Protocol Version 4.0.2</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                            <ArrowRight size={14} />
                        </div>
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



