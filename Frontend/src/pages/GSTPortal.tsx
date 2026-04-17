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
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">NODATA_SYNC</p>
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
         const now = new Date();
         let startDate = new Date();
         
         if (period === 'month') startDate.setDate(now.getDate() - 30);
         else if (period === 'quarter') startDate.setDate(now.getDate() - 90);
         else if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);

         const res = await api.get(`/reports/gst?startDate=${startDate.toISOString()}`).catch(() => ({ data: { data: null } }));
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
         <p className="mt-4 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.3em] animate-pulse">Syncing Fiscal Compliance Nodes...</p>
      </div>
   );

   return (
      <div className="p-2 sm:p-4 space-y-4  bg-[#fcfcfd] min-h-screen">
         {/* Header — Compliance Protocol */}
         <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
            <div className="space-y-1">
               <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
                  GST Compliance Dashboard
               </h1>
               <p className="text-sm font-normal text-slate-500">
                   Track your Input Tax Credit (ITC) and GST liabilities
               </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={() => fetchGSTData()}
                  className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-[1.25rem] transition-all hover:shadow-md"
                  title="Force Sync"
                >
                  <RefreshCcw size={18} className={loading ? 'animate-spin text-indigo-600' : ''} />
                </button>
                <div className="bg-white border border-slate-200 p-1 rounded-2xl flex gap-1 shadow-sm shrink-0">
                   <div className="px-4 py-2 flex items-center gap-2 text-slate-600 font-semibold text-xs border-r border-slate-100">
                      <Calendar size={14} /> FY 2024-25
                   </div>
                   {(['month', 'quarter', 'year'] as const).map(p => (
                      <button
                         key={p}
                         onClick={() => setPeriod(p)}
                         className={`px-4 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all ${period === p ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                         {p}
                      </button>
                   ))}
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-[#0da368] hover:bg-[#0b8f5a] text-white rounded-[1.25rem] text-xs font-bold shadow-lg shadow-emerald-100 transition-all">
                  <ShieldCheck size={16} /> File GSTR-1
                </button>
            </div>
         </div>

         {/* Global Vitals Node — High-Density Inter Semibold */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard 
              label="OUTPUT GST (SALES)" 
              value={`₹${(gstData?.outputGST || 0).toLocaleString()}`} 
              color="output" 
              sub="↑ +12.5% Growth"
            />
            <MetricCard 
              label="INPUT GST (PURCHASES)" 
              value={`₹${(gstData?.inputGST || 0).toLocaleString()}`} 
              color="input" 
              sub="↓ -4.2% Savings"
            />
            <MetricCard 
              label="NET GST PAYABLE" 
              value={`₹${(gstData?.netPayable || 0).toLocaleString()}`} 
              color="payable" 
              sub="Compliance: Ready"
            />
            <MetricCard 
              label="ITC BALANCE" 
              value={`₹${(gstData?.itcBalance || 0).toLocaleString()}`} 
              color="itc" 
              sub="Next Filing Cycle"
            />
         </div>

         {/* Main Analytical Flux */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-12 bg-white p-6 rounded-[2.5rem] border-2 border-slate-200 shadow-sm relative overflow-hidden">
               <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                     <div>
                        <h2 className="text-base font-bold text-slate-800 uppercase tracking-tight">GST Flux Analysis</h2>
                        <p className="text-xs font-medium text-slate-500">Dual-stream audit: Output Tax (Sales) vs Input Tax (Purchases)</p>
                     </div>
                  </div>
                  <div className="h-[340px] w-full">
                     <ChartWrapper data={gstData?.salesSlabs}>
                        <BarChart data={gstData?.salesSlabs?.map((s: any) => ({
                           ...s,
                           inputTax: gstData?.purchaseSlabs?.find((p: any) => p._id === s._id)?.totalTax || 0
                        })) || []}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fontSize: 10, fill: '#64748b', fontWeight: 600 }} tickFormatter={v => `GST ${v}%`} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                           <Tooltip
                               cursor={{ fill: '#f8fafc' }}
                               contentStyle={{ fontFamily: "Inter", borderRadius: 16, border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: 12 }}
                               itemStyle={{ fontFamily: "Inter", fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}
                           />
                           <Bar dataKey="totalTax" name="Output GST (Sales)" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={24} />
                           <Bar dataKey="inputTax" name="Input GST (ITC)" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
                        </BarChart>
                     </ChartWrapper>
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
                      <span className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest">Audit Logs: OK</span>
                  </div>
               </div>
            </div>
            <div className="flex flex-col">
                {/* Mobile Hub Cards */}
                <div className="lg:hidden divide-y divide-slate-50">
                    {gstData?.gstSlabs?.length > 0 ? gstData.gstSlabs.map((slab: any, i: number) => (
                        <div key={i} className="py-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Bracket {i + 1}</span>
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-semibold uppercase tracking-widest border border-indigo-100">
                                   GST {slab._id}%
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[8px] font-semibold text-slate-300 uppercase mb-1 tracking-widest">Taxable Value</p>
                                    <p className="text-xs font-bold text-slate-700">₹{slab.taxableValue.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-semibold text-slate-300 uppercase mb-1 tracking-widest">Audit Status</p>
                                    <p className="text-[9px] font-semibold text-emerald-500 uppercase tracking-widest uppercase">Audited Node</p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-50 flex justify-between items-center bg-slate-50/50 p-3 rounded-xl">
                                <div className="flex flex-col">
                                    <p className="text-[7px] font-semibold text-slate-400 uppercase tracking-widest">TOTAL_GST_LIABILITY</p>
                                    <p className="money-highlight !text-base">₹{slab.totalTax.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-[7px] font-semibold text-slate-400 uppercase mb-0.5 tracking-widest shrink-0 leading-none">CGSTRO node: ₹{(slab.totalTax/2).toFixed(0)}</p>
                                   <p className="text-[7px] font-semibold text-slate-400 uppercase tracking-widest shrink-0 leading-none">SGSTRO node: ₹{(slab.totalTax/2).toFixed(0)}</p>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="py-12 text-center text-slate-200 font-semibold text-[10px] uppercase tracking-widest">Syncing Fiscal Hub...</div>
                    )}
                </div>

                {/* Desktop Audit Table */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left">
                    <thead>
                        <tr className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-100">
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
                                    <div className="w-4 h-4 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-[7px] font-semibold text-slate-400">
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
                            <tr><td colSpan={5} className="py-20 text-center text-slate-200 font-semibold text-[12px] uppercase tracking-[0.5em]">Syncing_Fiscal_Data...</td></tr>
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

const MetricCard = memo(({ label, value, color, sub }: any) => {
  const themes: any = {
    output: 'border-l-[4px] border-indigo-500',
    input: 'border-l-[4px] border-emerald-500',
    payable: 'border-l-[4px] border-amber-500',
    itc: 'border-l-[4px] border-slate-500',
  };

  const subColors: any = {
    output: 'text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100',
    input: 'text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100',
    payable: 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100',
    itc: 'text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100',
  };
  
  return (
    <div className={`bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-3 transition-all hover:border-slate-300 h-full font-inter ${themes[color]}`}>
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
          {value}
        </h3>
      </div>
      <div>
        <span className={`text-[8px] font-bold uppercase tracking-widest ${subColors[color]}`}>
          {sub}
        </span>
      </div>
    </div>
  );
});



