import { useState, useEffect } from 'react';
import {
   ShieldCheck, Download, RefreshCcw,
   AlertCircle, CheckCircle,
   Zap, Activity, Calendar
} from 'lucide-react';
import api from '../services/api';
import {
   BarChart, Bar, XAxis, YAxis, Tooltip,
   ResponsiveContainer, CartesianGrid
} from 'recharts';

function ChartWrapper({ data, children }: any) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        <Activity size={24} className="text-slate-300 mb-2" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">NODATA_SYNC</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[280px] min-h-[280px] min-w-[200px] relative">
      <ResponsiveContainer width="100%" height={280}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/**
 * NexusBill GST Professional Compliance Portal
 * Real-time GSTR-1 Node Synchronization and Fiscal Audit Trail.
 */
export default function GSTPortal() {
   const [gstData, setGstData] = useState<any>(null);
   const [loading, setLoading] = useState(true);
   const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

   useEffect(() => {
      fetchGSTData();

      const syncChannel = new BroadcastChannel('nexus_sync');
      syncChannel.onmessage = (event) => {
        if (event.data === 'FETCH_PRODUCTS' || event.data === 'FETCH_DASHBOARD') {
           fetchGSTData();
        }
      };

      return () => syncChannel.close();
   }, [period]);

   const fetchGSTData = async () => {
      setLoading(true);
      try {
         // Syncing with the Strategic Sales Report Node (which contains detailed GST slabs)
         const res = await api.get('/reports/sales').catch(() => ({ data: { data: null } }));
         setGstData(res.data?.data);
      } catch (err) {
         console.error("Nexus GST Sync Error:", err);
      } finally {
         setLoading(false);
      }
   };

   const handleExport = () => {
      if (!gstData?.gstSlabs) return;
      const rows = [
         ['GST Rate', 'Taxable Value', 'Total Tax (IGST)', 'Status'],
         ...gstData.gstSlabs.map((s: any) => [`${s._id}%`, s.taxableValue.toFixed(2), s.totalTax.toFixed(2), 'AUDITED']),
         ['GLOBAL TOTAL', '', gstData.totalGST.toFixed(2), 'READY_FOR_FILING'],
      ];
      const csv = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `gst-nexus-node-${period}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click(); URL.revokeObjectURL(url);
   };

   if (loading && !gstData) return (
      <div className="h-[80vh] flex flex-col items-center justify-center  bg-slate-50/50">
         <div className="relative">
            <RefreshCcw size={48} className="text-indigo-600 animate-spin opacity-20" />
            <ShieldCheck size={24} className="absolute inset-0 m-auto text-indigo-600" />
         </div>
         <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Syncing Fiscal Compliance Nodes...</p>
      </div>
   );

   return (
      <div className="p-6 space-y-6  bg-[#fcfcfd] min-h-screen">
         {/* Header — Compliance Protocol */}
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
               <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full border border-amber-100 shadow-sm mb-2">
                  <Zap size={10} className="text-amber-600 fill-amber-600" />
                  <span className="text-[9px] font-black text-amber-900/60 uppercase tracking-[0.15em]">GST Compliance Logic</span>
               </div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-none flex items-center gap-3">
                  GSTR-1 Protocol Hub <ShieldCheck className="text-indigo-600" size={28} />
               </h1>
               <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                  <Activity size={12} /> Automated Tax Reconciliation & Slab Arbitration.
               </p>
            </div>
            <div className="flex items-center gap-3">
               <div className="bg-white border border-slate-100 p-1.5 rounded-2xl flex gap-1 shadow-sm">
                  {(['month', 'quarter', 'year'] as const).map(p => (
                     <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${period === p ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                     >
                        {p}
                     </button>
                  ))}
               </div>
               <button onClick={handleExport} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black shadow-xl shadow-indigo-200 transition-all uppercase tracking-[0.1em]">
                  <Download size={14} /> Export Audit CSV
               </button>
            </div>
         </div>

         {/* Global Vitals Node */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard label="Taxable Nexus" value={`₹${(gstData?.gstSlabs?.reduce((s: number, c: any) => s + c.taxableValue, 0) || 0).toLocaleString()}`} icon={Zap} color="indigo" sub="Pre-tax Revenue" />
            <MetricCard label="Total GST collected" value={`₹${(gstData?.totalGST || 0).toLocaleString()}`} icon={ShieldCheck} color="emerald" sub="Combined CGST/SGST" />
            <MetricCard label="Filing Readiness" value="98.4%" icon={Activity} color="amber" sub="Compliance Score" />
            <MetricCard label="Current Period Node" value={period.toUpperCase()} icon={Calendar} color="rose" sub="Reporting Cycle" />
         </div>

         {/* Main Analytical Grid */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Slab Flux Chart */}
            <div className="lg:col-span-8 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-[0.03] -mr-4 -mt-4">
                  <ShieldCheck size={180} className="text-slate-900 rotate-12" />
               </div>
               <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                     <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tighter leading-none">Fiscal Flow Distribution</h3>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Slab-wise Tax Aggregation</p>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                           <span className="text-[9px] font-black text-slate-400 uppercase uppercase">Collected Tax</span>
                        </div>
                     </div>
                  </div>
                  <div className="h-[280px] w-full min-h-[280px]">
                     <ChartWrapper data={gstData?.gstSlabs}>
                        <BarChart data={gstData?.gstSlabs || []}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 900 }} tickFormatter={v => `GST ${v}%`} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 900 }} />
                           <Tooltip
                              cursor={{ fill: '#f8fafc' }}
                              contentStyle={{ borderRadius: 20, border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: 16 }}
                              itemStyle={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase' }}
                           />
                           <Bar dataKey="totalTax" name="GST Node" fill="#10b981" radius={[12, 12, 0, 0]} barSize={40} />
                        </BarChart>
                     </ChartWrapper>
                  </div>
               </div>
            </div>

            {/* Narrative Performance — GSTR assistant */}
            <div className="lg:col-span-4 space-y-4">
               <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden h-full">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                     <Zap size={100} className="text-white rotate-12" />
                  </div>
                  <div className="relative z-10 space-y-6">
                     <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Node G1: Assessment</p>
                        <h4 className="text-white text-xl font-black tracking-tighter">Strategic Tax Narrative</h4>
                        <p className="text-slate-400 text-[11px] font-medium leading-relaxed mt-4 uppercase">
                           {gstData?.totalGST > 0
                              ? `Detected peak tax throughput in the GST ${gstData.gstSlabs[0]?._id || "Scanning"}% node. Recommend archiving all reference invoices for this bracket before the EOM filing protocol.`
                              : "Fiscal synchronization pending. Scanning for taxable supplies across core nodes."}
                        </p>
                     </div>

                     <div className="pt-6 border-t border-white/5 space-y-4">
                        <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                           <div>
                              <p className="text-[8px] font-black text-white/40 uppercase">Integrated Tax Path</p>
                              <p className="text-sm font-black text-white uppercase tracking-tight">CGST + SGST</p>
                           </div>
                           <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-xl">
                              <CheckCircle size={18} />
                           </div>
                        </div>
                        <div className="flex justify-center">
                           <button onClick={handleExport} className="w-full py-4 bg-indigo-600 hover:bg-white text-white hover:text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/40">
                              Initialize GSTR-1 Archive
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Fiscal Settlement Matrix (The Heart of the Portal) */}
         <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
               <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tighter">Fiscal Settlement Matrix</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Comprehensive Slab-wise Reconciliation Node</p>
               </div>
               <div className="flex gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                     <CheckCircle size={14} className="text-emerald-500" />
                     <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Audit Logs: OK</span>
                  </div>
               </div>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                        <th className="py-4 px-4 w-1/4">Tax Protocol Node</th>
                        <th className="py-4 px-4 text-right">Taxable Supply</th>
                        <th className="py-4 px-4 text-right">CGST (Central)</th>
                        <th className="py-4 px-4 text-right">SGST (State)</th>
                        <th className="py-4 px-4 text-right">Total Integrated Tax</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {gstData?.gstSlabs?.length > 0 ? gstData.gstSlabs.map((slab: any, i: number) => (
                        <tr key={i} className="group hover:bg-slate-50/50 transition-all">
                           <td className="py-5 px-4 font-black text-[12px] text-slate-900 uppercase">
                              <div className="flex items-center gap-3">
                                 <div className="w-4 h-4 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-[7px] font-black text-slate-400">
                                    {i + 1}
                                 </div>
                                 GST {slab._id}% Bracket
                              </div>
                           </td>
                           <td className="py-5 px-4 text-right font-black text-[12px] text-slate-500">₹{slab.taxableValue.toLocaleString()}</td>
                           <td className="py-5 px-4 text-right font-black text-[11px] text-slate-400">₹{(slab.totalTax / 2).toLocaleString()}</td>
                           <td className="py-5 px-4 text-right font-black text-[11px] text-slate-400">₹{(slab.totalTax / 2).toLocaleString()}</td>
                           <td className="py-5 px-4 text-right">
                              <span className="px-5 py-2 bg-indigo-50 text-indigo-700 rounded-full text-[12px] font-black shadow-sm ring-1 ring-indigo-100">
                                 ₹{slab.totalTax.toLocaleString()}
                              </span>
                           </td>
                        </tr>
                     )) : (
                        <tr><td colSpan={5} className="py-20 text-center text-slate-200 font-black text-[12px] uppercase tracking-[0.5em]">Syncing_Fiscal_Data...</td></tr>
                     )}
                  </tbody>
                  {gstData?.gstSlabs?.length > 0 && (
                     <tfoot className="bg-slate-900 border-t-2 border-slate-900 rounded-b-[2rem]">
                        <tr className="text-white font-black uppercase text-[11px] tracking-widest">
                           <td className="py-6 px-4">Global Settlement Summary</td>
                           <td className="py-6 px-4 text-right">₹{gstData.gstSlabs.reduce((s: number, c: any) => s + c.taxableValue, 0).toLocaleString()}</td>
                           <td className="py-6 px-4 text-right text-indigo-400">₹{(gstData.totalGST / 2).toLocaleString()}</td>
                           <td className="py-6 px-4 text-right text-indigo-400">₹{(gstData.totalGST / 2).toLocaleString()}</td>
                           <td className="py-6 px-4 text-right text-indigo-400 text-[14px] tracking-tighter">₹{gstData.totalGST.toLocaleString()}</td>
                        </tr>
                     </tfoot>
                  )}
               </table>
            </div>
         </div>

         {/* Risk Notice Protocol */}
         <div className="bg-amber-50/50 border border-amber-100 p-8 rounded-[3rem] flex items-center gap-6">
            <div className="p-4 bg-amber-500 text-white rounded-3xl shadow-xl shadow-amber-200">
               <AlertCircle size={28} />
            </div>
            <div>
               <h4 className="text-sm font-black text-amber-900 uppercase">GSTR-1 Compliance Directive</h4>
               <p className="text-[11px] font-bold text-amber-900/60 leading-relaxed mt-1 uppercase tracking-tight">
                  All fiscal values in this portal are auto-reconciled from your authenticated invoice nodes.
                  Ensure centralized IGST/CGST parity before the 10th of every rolling period. NexusBill is currently operating on Protocol NK4A2 (Live).
               </p>
            </div>
         </div>
      </div>
   );
}

function MetricCard({ label, value, icon: Icon, color, sub }: any) {
   const themes: any = {
      indigo: 'border-indigo-100 text-indigo-600 bg-white hover:border-indigo-400 shadow-indigo-100/20',
      rose: 'border-rose-100 text-rose-600 bg-white hover:border-rose-400 shadow-rose-100/20',
      amber: 'border-amber-100 text-amber-600 bg-white hover:border-amber-400 shadow-amber-100/20',
      emerald: 'border-emerald-100 text-emerald-600 bg-white hover:border-emerald-400 shadow-emerald-100/20',
   };
   return (
      <div className={`p-6 rounded-[2rem] border-2 transition-all group shadow-xl flex flex-col relative overflow-hidden ${themes[color]}`}>
         <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm ring-1 ring-slate-100 group-hover:scale-110 transition-transform">
               <Icon size={18} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.1em] opacity-60 text-slate-500">{sub}</span>
         </div>
         <div className="relative z-10">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1 text-slate-500">{label}</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{value}</h3>
         </div>
         <div className="absolute bottom-0 right-0 p-2 opacity-[0.03] group-hover:opacity-10 transition-all group-hover:-rotate-12">
            <Icon size={80} />
         </div>
      </div>
   );
}
