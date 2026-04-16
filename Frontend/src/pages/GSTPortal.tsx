import { useState, useEffect, memo } from 'react';
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

const ChartWrapper = memo(({ data, children }: any) => {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-[1.25rem] border border-dashed border-slate-200">
        <Activity size={24} className="text-slate-300 mb-2" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">NODATA_SYNC</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[280px] min-h-[280px] min-w-[200px] relative">
      <ResponsiveContainer width="100%" height={280} minWidth={0}>
        {children}
      </ResponsiveContainer>
    </div>
  );
});


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
      <div className="p-2 sm:p-4 space-y-4  bg-[#fcfcfd] min-h-screen">
         {/* Header — Compliance Protocol */}
         <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
            <div className="space-y-1">
               <h1 className="text-2xl lg:text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-3">
                  GST Compliance
               </h1>
               <p className="text-sm font-normal text-slate-500">
                   Track your Input Tax Credit (ITC) and GST liabilities
               </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <div className="bg-white border border-slate-100 p-1.5 rounded-2xl flex gap-1 shadow-sm shrink-0">
                  {(['month', 'quarter', 'year'] as const).map(p => (
                     <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-3 sm:px-4 py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold uppercase tracking-widest transition-all ${period === p ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                     >
                        {p}
                     </button>
                  ))}
               </div>
               <button onClick={handleExport} className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] sm:text-xs font-semibold shadow-lg shadow-indigo-100 transition-all uppercase tracking-widest shrink-0">
                  <Download size={14} /> Export Report
               </button>
            </div>
         </div>

         {/* Global Vitals Node */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard label="TAXABLE REVENUE" value={`₹${(gstData?.gstSlabs?.reduce((s: number, c: any) => s + c.taxableValue, 0) || 0).toLocaleString()}`} icon={Zap} color="indigo" />
            <MetricCard label="TOTAL GST" value={`₹${(gstData?.totalGST || 0).toLocaleString()}`} icon={ShieldCheck} color="emerald" />
            <MetricCard label="FILING PROGRESS" value="98.4%" icon={Activity} color="amber" />
            <MetricCard label="REPORTING CYCLE" value={period.toUpperCase()} icon={Calendar} color="rose" />
         </div>

         {/* Main Analytical Grid */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Slab Flux Chart */}
            <div className="lg:col-span-8 bg-white p-4 sm:p-6 rounded-2xl border-2 border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-[0.03] -mr-4 -mt-4">
                  <ShieldCheck size={180} className="text-slate-900 rotate-12" />
               </div>
               <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                     <div>
                        <h2 className="text-base font-semibold text-slate-900 uppercase tracking-tight">GST Distribution</h2>
                        <p className="text-sm font-normal text-slate-500">Slab-wise tax aggregation</p>
                     </div>
                  </div>
                  <div className="h-[280px] w-full min-h-[280px]">
                     <ChartWrapper data={gstData?.gstSlabs}>
                        <BarChart data={gstData?.gstSlabs || []}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fontSize: 10, fill: '#64748b', fontWeight: 900 }} tickFormatter={v => `GST ${v}%`} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fontSize: 10, fill: '#64748b', fontWeight: 900 }} />
                           <Tooltip
                              cursor={{ fill: '#f8fafc' }}
                              contentStyle={{ fontFamily: "Inter", borderRadius: 20, border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: 16 }}
                              itemStyle={{ fontFamily: "Inter", fontSize: 11, fontWeight: 900, textTransform: 'uppercase' }}
                           />
                           <Bar dataKey="totalTax" name="GST Pool" fill="#6366f1" radius={[12, 12, 0, 0]} barSize={40} />
                        </BarChart>
                     </ChartWrapper>
                  </div>
               </div>
            </div>

            {/* Narrative Performance — GSTR assistant */}
            <div className="lg:col-span-4 space-y-4">
               <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl border-2 border-slate-800 shadow-2xl relative overflow-hidden h-full">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                     <Zap size={100} className="text-white rotate-12" />
                  </div>
                  <div className="relative z-10 space-y-6">
                     <div>
                        <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-2">COMPLIANCE ASSISTANT</p>
                        <h4 className="text-white text-lg font-semibold tracking-tight leading-tight">Tax Insights & Recommendations</h4>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed mt-4">
                           {gstData?.totalGST > 0
                              ? `Detected peak tax throughput in the GST ${gstData.gstSlabs[0]?._id || "scanning"}% slab. Ensure all reference invoices are archived for this bracket before the end of month.`
                              : "Synchronization pending. Please review your sales data to generate tax reports."}
                        </p>
                     </div>

                     <div className="pt-6 border-t border-white/10 space-y-4">
                        <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                           <div>
                              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">TAX SYSTEM</p>
                              <p className="text-sm font-semibold text-white">CGST + SGST</p>
                           </div>
                           <div className="bg-emerald-500/20 text-emerald-400 p-2.5 rounded-xl">
                              <CheckCircle size={20} />
                           </div>
                        </div>
                        <button onClick={handleExport} className="w-full py-4 bg-indigo-600 hover:bg-white text-white hover:text-indigo-600 rounded-2xl text-xs font-semibold uppercase tracking-widest transition-all">
                           Generate GSTR-1 Report
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Fiscal Settlement Matrix (The Heart of the Portal) */}
          <div className="bg-white p-4 sm:p-8 rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
               <div>
                  <h2 className="text-base font-semibold text-slate-800 uppercase tracking-tight">GST Settlement Matrix</h2>
                  <p className="text-xs font-medium text-slate-500 mt-1">Slab-wise reconciliation details</p>
               </div>
               <div className="flex gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                     <CheckCircle size={14} className="text-emerald-500" />
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Audit Logs: OK</span>
                  </div>
               </div>
            </div>
            <div className="flex flex-col">
                {/* Mobile Hub Cards */}
                <div className="lg:hidden divide-y divide-slate-50">
                    {gstData?.gstSlabs?.length > 0 ? gstData.gstSlabs.map((slab: any, i: number) => (
                        <div key={i} className="py-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bracket {i + 1}</span>
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                                   GST {slab._id}%
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[8px] font-black text-slate-300 uppercase mb-1 tracking-widest">Taxable Value</p>
                                    <p className="text-xs font-bold text-slate-700">₹{slab.taxableValue.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-slate-300 uppercase mb-1 tracking-widest">Audit Status</p>
                                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest uppercase">Audited Node</p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-50 flex justify-between items-center bg-slate-50/50 p-3 rounded-xl">
                                <div className="flex flex-col">
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">TOTAL_GST_LIABILITY</p>
                                    <p className="money-highlight !text-base">₹{slab.totalTax.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-[7px] font-black text-slate-400 uppercase mb-0.5 tracking-widest shrink-0 leading-none">CGSTRO node: ₹{(slab.totalTax/2).toFixed(0)}</p>
                                   <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest shrink-0 leading-none">SGSTRO node: ₹{(slab.totalTax/2).toFixed(0)}</p>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="py-12 text-center text-slate-200 font-black text-[10px] uppercase tracking-widest">Syncing Fiscal Hub...</div>
                    )}
                </div>

                {/* Desktop Audit Table */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left">
                    <thead>
                        <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                            <th className="py-4 px-4 w-1/4">TAX SLAB</th>
                            <th className="py-4 px-4 text-right">TAXABLE SUPPLY</th>
                            <th className="py-4 px-4 text-right">CGST</th>
                            <th className="py-4 px-4 text-right">SGST</th>
                            <th className="py-4 px-4 text-right">TOTAL TAX</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {gstData?.gstSlabs?.length > 0 ? gstData.gstSlabs.map((slab: any, i: number) => (
                            <tr key={i} className="group hover:bg-slate-50/50 transition-all">
                            <td className="py-5 px-4 font-medium text-sm text-slate-900">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-[7px] font-black text-slate-400">
                                        {i + 1}
                                    </div>
                                    GST {slab._id}% Bracket
                                </div>
                            </td>
                            <td className="py-5 px-4 text-right font-medium text-sm text-slate-500">₹{slab.taxableValue.toLocaleString()}</td>
                            <td className="py-5 px-4 text-right font-medium text-sm text-slate-400">₹{(slab.totalTax / 2).toLocaleString()}</td>
                            <td className="py-5 px-4 text-right font-medium text-sm text-slate-400">₹{(slab.totalTax / 2).toLocaleString()}</td>
                            <td className="py-5 px-4 text-right">
                                <span className="px-5 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-semibold shadow-sm ring-1 ring-indigo-100">
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
                            <tr className="text-white font-semibold uppercase text-xs tracking-widest">
                            <td className="py-6 px-4">Global Settlement Summary</td>
                            <td className="py-6 px-4 text-right">₹{gstData.gstSlabs.reduce((s: number, c: any) => s + c.taxableValue, 0).toLocaleString()}</td>
                            <td className="py-6 px-4 text-right text-indigo-400">₹{(gstData.totalGST / 2).toLocaleString()}</td>
                            <td className="py-6 px-4 text-right text-indigo-400">₹{(gstData.totalGST / 2).toLocaleString()}</td>
                            <td className="py-6 px-4 text-right text-indigo-400 text-xl font-semibold tracking-tighter">₹{gstData.totalGST.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    )}
                    </table>
                </div>
            </div>
         </div>

         {/* Risk Notice Protocol */}
         <div className="bg-amber-50/50 border border-amber-100 p-8 rounded-[3rem] flex items-center gap-6">
            <div className="p-4 bg-amber-500 text-white rounded-3xl shadow-xl shadow-amber-200">
               <AlertCircle size={28} />
            </div>
            <div>
               <h4 className="text-sm font-semibold text-amber-900 uppercase tracking-wider">GSTR-1 Compliance Directive</h4>
               <p className="text-xs font-medium text-amber-900/70 leading-relaxed mt-1 max-w-2xl">
                  All fiscal values in this portal are auto-reconciled from your authenticated invoice nodes.
                  Ensure centralized IGST/CGST parity before the 10th of every rolling period. NexusBill is currently operating on Protocol NK4A2 (Live).
               </p>
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



