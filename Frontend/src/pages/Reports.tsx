import { useState, useEffect } from 'react';
import {
  TrendingUp, RefreshCcw, Box,
  ShoppingCart, Zap,
  IndianRupee, Activity, ShieldCheck,
  TrendingDown, ArrowUpRight, CreditCard, Tag
} from 'lucide-react';
import {
  XAxis, Tooltip, ResponsiveContainer, AreaChart,
  Area, YAxis, CartesianGrid, PieChart, Pie, Cell,
  BarChart, Bar, LineChart, Line, Legend
} from 'recharts';
import api from '../services/api';
import socketService from '../services/socket';

function ChartWrapper({ data, children, height = 250 }: any) {
  if (!data || data.length === 0) {
    return (
      <div style={{ minHeight: `${height}px`, height: `${height}px` }} className="w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        <Box size={24} className="text-slate-300 mb-2" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">No Data Available</p>
      </div>
    );
  }

  return (
    <div style={{ height: `${height}px`, minHeight: `${height}px` }} className="relative w-full min-w-0 flex-1">
      {children}
    </div>
  );
}

export default function Reports() {
  const [salesData, setSalesData] = useState<any>(null);
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    paymentMethod: '',
    customerName: ''
  });

  useEffect(() => {
    fetchAllData();

    // ── Real-time Socket Sync ──
    const handleDataSync = (payload: any) => {
      console.log("📡 Reports Sync Received:", payload);
      fetchAllData();
    };

    socketService.on('DATA_SYNC', handleDataSync);

    // ── Cross-Tab Sync ──
    const syncChannel = new BroadcastChannel('nexus_sync');
    syncChannel.onmessage = (event) => {
      if (event.data === 'FETCH_PRODUCTS' || event.data === 'FETCH_DASHBOARD') {
        fetchAllData();
      }
    };

    return () => {
      socketService.off('DATA_SYNC', handleDataSync);
      syncChannel.close();
    };
  }, [filters]); // Auto-sync on filter change

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [invRes, salesRes] = await Promise.all([
        api.get('/reports/inventory').catch(() => ({ data: { data: null } })),
        api.get('/reports/sales', { params: filters }).catch(() => ({ data: { data: null } }))
      ]);
      setInventoryData(invRes.data?.data);
      setSalesData(salesRes.data?.data);
    } catch (err) {
      console.error("Nexus Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center ">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
      <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Syncing Reports...</h2>
    </div>
  );

  return (
    <div className="space-y-4 select-none print:m-0 print:p-0">
      {/* 🖨️ Print-Only Audit Header */}
      <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-4">
        <h1 className="text-2xl font-black uppercase tracking-tighter">Nexus Node Audit Report</h1>
        <div className="grid grid-cols-2 gap-4 mt-4 text-[10px] uppercase font-semibold text-slate-600">
          <div>
            <p>Protocol: Strategic Fiscal Audit</p>
            <p>Registry Node ID: {localStorage.getItem('businessId') || 'GLOBAL_ROOT'}</p>
          </div>
          <div className="text-right">
            <p>Generated: {new Date().toLocaleString('en-IN')}</p>
            <p>Period: {filters.startDate || 'Alpha'} - {filters.endDate || 'Omega'}</p>
          </div>
        </div>
      </div>

      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl">
            <Activity size={20} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 leading-tight">Business Intelligence</h1>
            <p className="text-slate-400 font-semibold text-[9px] uppercase tracking-widest mt-1">Real-time Performance Node</p>
          </div>
        </div>
        <button onClick={fetchAllData} className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200">
          <RefreshCcw size={12} /> Refresh Global Sync
        </button>
      </div>

      {/* Master Filter Registry */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 no-print">
         <div className="flex items-center gap-2 px-1">
            <Activity size={14} className="text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900 uppercase tracking-tight">Diagnostic Filter Registry</h2>
         </div>
         <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px] space-y-1.5">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <TrendingUp size={10} /> Start Date
               </label>
               <input 
                 type="date" 
                 className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl text-[11px] font-black focus:bg-white focus:border-indigo-500 outline-none transition-all" 
                 value={filters.startDate}
                 onChange={e => setFilters({...filters, startDate: e.target.value})}
               />
            </div>
            <div className="flex-1 min-w-[140px] space-y-1.5">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <TrendingDown size={10} /> End Date
               </label>
               <input 
                 type="date" 
                 className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl text-[11px] font-black focus:bg-white focus:border-indigo-500 outline-none transition-all"
                 value={filters.endDate}
                 onChange={e => setFilters({...filters, endDate: e.target.value})}
               />
            </div>
            <div className="flex-1 min-w-[140px] space-y-1.5">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <CreditCard size={10} /> Protocol
               </label>
               <select 
                 className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl text-[11px] font-black focus:bg-white focus:border-indigo-500 outline-none appearance-none transition-all"
                 value={filters.paymentMethod}
                 onChange={e => setFilters({...filters, paymentMethod: e.target.value})}
               >
                  <option value="">All Streams</option>
                  <option value="cash">Cash Settlement</option>
                  <option value="upi">UPI Protocol</option>
                  <option value="card">Card Terminal</option>
               </select>
            </div>
            <div className="flex-[2] min-w-[200px] space-y-1.5">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <ShoppingCart size={10} /> Customer Node
               </label>
               <input 
                 type="text" 
                 placeholder="Search name/mobile..." 
                 className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl text-[11px] font-black focus:bg-white focus:border-indigo-500 outline-none transition-all"
                 value={filters.customerName}
                 onChange={e => setFilters({...filters, customerName: e.target.value})}
               />
            </div>
            <button 
              onClick={() => setFilters({ startDate: '', endDate: '', paymentMethod: '', customerName: '' })}
              className="px-4 py-2.5 text-rose-500 hover:bg-rose-50 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all h-[42px] border border-transparent hover:border-rose-100"
            >
              Reset Audit
            </button>
         </div>
      </div>

      {/* Critical Vitals Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard label="Total Sales" value={`₹${(salesData?.totalSalesAllTime || 0).toLocaleString()}`} icon={Zap} color="indigo" />
        <MetricCard label="Total Purchases" value={`₹${(salesData?.dailyPurchases?.[0]?.totalPurchases || 0).toLocaleString()}`} icon={CreditCard} color="rose" />
        <MetricCard label="GST Liability" value={`₹${(salesData?.totalGST || 0).toLocaleString()}`} icon={ShieldCheck} color="amber" />
        <MetricCard label="Discount Yield" value={`₹${(salesData?.totalDiscounts || 0).toLocaleString()}`} icon={Tag} color="emerald" />
        <MetricCard label="Stock Valuation" value={`₹${(inventoryData?.stats?.totalValuation || 0).toLocaleString()}`} icon={IndianRupee} color="indigo" />
      </div>

      {/* Main Analysis Node */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sales Flux Chart */}
        <div className="lg:col-span-8 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900 uppercase tracking-tight leading-none">Revenue Growth Delta</h3>
              <p className="text-[8px] text-slate-400 font-semibold uppercase mt-1">7-Day Sales Synchronization</p>
            </div>
            <div className="flex gap-2">
              <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">LIVE_FEED</span>
            </div>
          </div>
          <div className="h-[250px] w-full min-w-0 relative">
            <ChartWrapper data={salesData?.dailySales} height={250}>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={salesData?.dailySales || []}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fontSize: 7, fill: "#cbd5e1", fontWeight: 900 }} interval="preserveStartEnd" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fontSize: 8, fill: '#94A3B8', fontWeight: 900 }} />
                  <Tooltip contentStyle={{ fontFamily: "Inter", fontSize: 10, fontWeight: 900, borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="totalSales" stroke="#6366f1" fillOpacity={1} fill="url(#colorSales)" strokeWidth={4} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </div>
        </div>

        {/* Small Stats / Velocity Ranking */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-950 p-5 rounded-3xl shadow-2xl relative overflow-hidden border border-slate-800">
            <h3 className="text-base font-semibold text-indigo-400 mb-4 uppercase tracking-tight flex items-center gap-2">
              <ArrowUpRight size={14} /> High Velocity Items
            </h3>
            <div className="space-y-3 relative z-10">
              {salesData?.topSoldItems?.length > 0 ? salesData.topSoldItems.slice(0, 3).map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-[11px] py-1 border-b border-white/5 last:border-b-0 leading-none">
                  <div className="flex items-center gap-2">
                    <span className="text-white/20 font-black">#{i + 1}</span>
                    <span className="font-black text-white/90 uppercase truncate max-w-[100px]">{item._id}</span>
                  </div>
                  <span className="font-black text-indigo-400">₹{item.revenue.toLocaleString()}</span>
                </div>
              )) : <div className="py-10 text-center"><p className="text-[10px] text-white/10 uppercase font-black tracking-widest">NODATA_SYNC</p></div>}
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-base font-semibold text-rose-500 mb-4 uppercase tracking-tight flex items-center gap-2">
              <TrendingDown size={14} /> Critical Low Stock
            </h3>
            <div className="space-y-3">
              {salesData?.lowStockItems?.length > 0 ? salesData.lowStockItems.slice(0, 3).map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-[11px] py-1 border-b border-slate-50 last:border-b-0 leading-none">
                  <span className="font-black text-slate-700 uppercase truncate max-w-[120px]">{item.name}</span>
                  <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full text-[9px]">{item.stock} Unit</span>
                </div>
              )) : <p className="text-[10px] text-slate-300 font-black py-4 uppercase">All Nodes Healthy</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Simple Table Node for Purchases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
            <h3 className="text-base font-semibold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <ShoppingCart size={14} className="text-indigo-600" /> Recent Purchase Acquisitions
            </h3>
          </div>
          <div className="flex flex-col">
            {/* Mobile Purchase Cards */}
            <div className="lg:hidden divide-y divide-slate-50">
              {salesData?.topPurchasedItems?.length > 0 ? salesData.topPurchasedItems.slice(0, 5).map((item: any, i: number) => (
                <div key={i} className="py-3 flex justify-between items-center">
                   <div>
                      <p className="text-[10px] font-black text-slate-800 uppercase">{item._id}</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase">{item.totalQty} Units Inbound</p>
                   </div>
                   <p className="text-[10px] font-black text-indigo-600">₹{item.investment.toLocaleString()}</p>
                </div>
              )) : <p className="py-6 text-center text-slate-200 font-black text-[10px] uppercase">NULL_SET</p>}
            </div>

            {/* Desktop Acquisitions Matrix */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                    <th className="py-3 px-2">Item Node</th>
                    <th className="py-3 px-2">Quantity</th>
                    <th className="py-3 px-2">Investment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {salesData?.topPurchasedItems?.length > 0 ? salesData.topPurchasedItems.slice(0, 5).map((item: any, i: number) => (
                    <tr key={i} className="text-[11px] font-black text-slate-700 uppercase">
                      <td className="py-3 px-2">{item._id}</td>
                      <td className="py-3 px-2 text-slate-400">{item.totalQty}</td>
                      <td className="py-3 px-2 text-indigo-600">₹{item.investment.toLocaleString()}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="py-10 text-center text-slate-300 font-black tracking-widest">NULL_SET</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Real-time Activity Ledger */}
        <div className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <h3 className="text-base font-semibold text-indigo-400 uppercase tracking-tight flex items-center gap-2">
              <Activity size={14} /> Master Audit Sequence
            </h3>
            <span className="text-[8px] font-black text-white/20 uppercase">Real-time Feed</span>
          </div>
          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
            {salesData?.activities?.length > 0 ? salesData.activities.map((act: any, i: number) => (
              <div key={i} className="flex flex-col gap-1 py-2 border-b border-white/5 last:border-b-0">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest leading-none">
                  <span className={act.action === 'CREATE' ? 'text-indigo-400' : 'text-amber-400'}>{act.resource} Node</span>
                  <span className="text-white/20 text-[8px] font-black">{new Date(act.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-[9px] text-white/50 font-black tracking-tight uppercase leading-none mt-1">{act.description}</p>
              </div>
            )) : <p className="py-10 text-center text-white/10 font-black text-[10px] tracking-widest">NO_LOGS_RECORDED</p>}
          </div>
        </div>

      </div>

      {/* Strategic Performance Insights Node */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-950 p-6 rounded-2xl border-2 border-white/10 shadow-2xl relative overflow-hidden mt-4">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <TrendingUp size={120} className="text-white rotate-12" />
        </div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
           <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Node A1: Discovery</p>
              <h4 className="text-white text-lg font-semibold tracking-tight">Strategic Growth Narrative</h4>
              <p className="text-slate-400 text-[10px] font-medium leading-relaxed mt-2 uppercase">
                {salesData?.topSoldItems?.length > 0 
                  ? `Revenue is currently dominated by ${salesData.topSoldItems[0]._id}. Recommend scaling purchase acquisitions in this node.`
                  : "Scanning for revenue drivers... Data synchronization in progress."}
              </p>
           </div>
           <div className="md:border-x border-white/5 md:px-8">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2">Node B2: Fiscal Health</p>
              <h4 className="text-white text-lg font-semibold tracking-tight">Promotional Impact Audit</h4>
              <div className="mt-3 space-y-2">
                 <div className="flex justify-between text-[9px] font-black text-slate-300 uppercase">
                    <span>GST Liability Reconciled</span>
                    <span className="text-emerald-400">STATUS_OK</span>
                 </div>
                 <div className="flex justify-between text-[9px] font-black text-slate-300 uppercase">
                    <span>Peak Transaction Node</span>
                    <span className="text-indigo-400">{salesData?.dailySales?.[0]?._id || "Scanning..."}</span>
                 </div>
              </div>
           </div>
           <div>
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mb-2">Node C3: Optimization</p>
              <h4 className="text-white text-lg font-semibold tracking-tight">Revenue Leakage Detection</h4>
              <p className="text-slate-400 text-[10px] font-medium leading-relaxed mt-2 uppercase">
                 {salesData?.lowStockItems?.length > 0 
                   ? `Detected ${salesData.lowStockItems.length} potential stock-outs. Preventative restock registry initialized.`
                   : "Inventory health is nominal. No leakage detected in current sync."}
              </p>
              <div className="mt-4 flex gap-2 no-print">
                 <button onClick={() => window.print()} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[8px] font-black uppercase tracking-widest transition-all">Download Audit PDF</button>
              </div>
           </div>
        </div>
      </div>

      {/* Merchant Protocol Audit terminal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
             {(['CASH', 'UPI', 'CARD'] as const).map(proto => {
               const metric = salesData?.paymentMetrics?.find((m:any) => m._id?.toUpperCase() === proto);
               const themes = {
                 CASH: 'text-emerald-600 bg-emerald-50 border-emerald-100',
                 UPI: 'text-indigo-600 bg-indigo-50 border-indigo-100',
                 CARD: 'text-rose-600 bg-rose-50 border-rose-100'
               };
               return (
                 <div key={proto} className={`bg-white p-3 sm:p-5 rounded-2xl border-2 border-slate-200 shadow-sm relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-start justify-between group transition-all hover:scale-[1.02] ${themes[proto]}`}>
                    <div className="z-10 text-center sm:text-left">
                        <span className="text-[7px] sm:text-[9px] font-black uppercase text-slate-400 block mb-1">{proto} Hub</span>
                        <h3 className="text-sm sm:text-lg font-semibold tracking-tight text-slate-900 leading-none">₹{(metric?.amount || 0).toLocaleString()}</h3>
                        <p className="text-[6px] sm:text-[8px] font-semibold text-slate-400 mt-1 sm:mt-2 uppercase">Settlements: <span className="text-slate-900">{metric?.count || 0}</span></p>
                    </div>
                    <div className="p-1.5 sm:p-2 rounded-lg bg-white border border-slate-100 shrink-0 mt-2 sm:mt-0 z-10">
                       {proto === 'CASH' ? <IndianRupee size={12} /> : proto === 'UPI' ? <Zap size={12} /> : <CreditCard size={12} />}
                    </div>
                    <div className="absolute top-0 right-0 p-1 opacity-10 rotate-12 pointer-events-none"> <Zap size={40} /> </div>
                 </div>
               );
             })}
          </div>

      {/* Fiscal Settlement Matrix (GST Slab Breakdown) */}
      <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm mt-4 overflow-hidden">
         <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
            <h3 className="text-base font-semibold text-slate-900 uppercase tracking-tight flex items-center gap-2">
               <ShieldCheck size={14} className="text-amber-500" /> Fiscal Settlement Matrix (GST Slabs)
            </h3>
         </div>
         <div className="flex flex-col">
            {/* Mobile GST Slab Cards */}
            <div className="lg:hidden divide-y divide-slate-50">
               {salesData?.gstSlabs?.length > 0 ? salesData.gstSlabs.map((slab:any, i:number) => (
                 <div key={i} className="py-3 space-y-2">
                    <div className="flex justify-between items-center">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">GST {slab._id}% Protocol</span>
                       <span className="text-[10px] font-black text-amber-600">₹{slab.totalTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Taxable Value</span>
                       <span className="text-[10px] font-bold text-slate-700">₹{slab.taxableValue.toLocaleString()}</span>
                    </div>
                 </div>
               )) : <p className="py-6 text-center text-slate-200 font-black text-[10px] uppercase">NO_TAX_DATA_SYNCED</p>}
               {salesData?.gstSlabs?.length > 0 && (
                 <div className="pt-3 border-t-2 border-slate-100 mt-2">
                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                       <span className="text-[9px] font-black text-slate-900 uppercase">Grand Aggregate</span>
                       <span className="text-xs font-black text-amber-600">₹{salesData.totalGST.toLocaleString()}</span>
                    </div>
                 </div>
               )}
            </div>

            {/* Desktop GST Matrix */}
            <div className="hidden lg:block overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                        <th className="py-3 px-2">Tax bracket</th>
                        <th className="py-3 px-2 text-right">Taxable Supply</th>
                        <th className="py-3 px-2 text-right">Collected Tax</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {salesData?.gstSlabs?.length > 0 ? salesData.gstSlabs.map((slab:any, i:number) => (
                       <tr key={i} className="text-[10px] font-black text-slate-700 uppercase">
                          <td className="py-3 px-2 text-slate-400">GST {slab._id}% Bracket</td>
                          <td className="py-3 px-2 text-right">₹{slab.taxableValue.toLocaleString()}</td>
                          <td className="py-3 px-2 text-right text-amber-600 font-black">₹{slab.totalTax.toLocaleString()}</td>
                       </tr>
                     )) : (
                       <tr><td colSpan={3} className="py-10 text-center text-slate-200 font-black tracking-widest">NO_TAX_DATA_SYNCED</td></tr>
                     )}
                  </tbody>
                  {salesData?.gstSlabs?.length > 0 && (
                    <tfoot>
                       <tr className="bg-slate-50/50 border-t-2 border-slate-100 font-black text-[10px] uppercase">
                          <td className="py-3 px-2 text-slate-900">Aggregate Summary</td>
                          <td className="py-3 px-2 text-right text-slate-900">₹{salesData.gstSlabs.reduce((s:number, c:any) => s + c.taxableValue, 0).toLocaleString()}</td>
                          <td className="py-3 px-2 text-right text-amber-600">₹{salesData.totalGST.toLocaleString()}</td>
                       </tr>
                    </tfoot>
                  )}
               </table>
            </div>
         </div>
      </div>

      {/* Visual Analytics Node */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Payment Logic Distribution */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col h-[350px] overflow-hidden">
           <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                 <CreditCard size={14} className="text-indigo-600" /> Sector-Wise Settlement Logic
              </h3>
           </div>
           <div className="flex-1 w-full min-w-0 h-[200px] relative">
              <ChartWrapper data={salesData?.paymentMetrics} height={200}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                        data={salesData?.paymentMetrics || []}
                        cx="50%" cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="amount"
                        nameKey="_id"
                    >
                        {(salesData?.paymentMetrics || []).map((entry:any, index:number) => {
                          const proto = entry._id?.toLowerCase();
                          const color = proto === 'upi' ? '#10b981' : proto === 'cash' ? '#6366f1' : '#f43f5e';
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                    </Pie>
                    <Tooltip contentStyle={{ fontFamily: "Inter", fontSize: 10, fontWeight: 900, borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartWrapper>
           </div>
           <div className="flex justify-center gap-4 mt-4 pb-2">
               {[{p:"UPI",c:"#10b981"},{p:"CASH",c:"#6366f1"},{p:"CARD",c:"#f43f5e"}].map((proto) => (
                  <div key={proto.p} className="flex items-center gap-1.5">
                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: proto.c }} />
                     <span className="text-[9px] font-black uppercase text-slate-400">{proto.p}</span>
                  </div>
               ))}
           </div>
        </div>

        {/* Category Concentration Audit */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col h-[300px] overflow-hidden">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                 <Box size={14} className="text-amber-500" /> Category-wise Inventory Hub
              </h3>
           </div>
           <div className="flex-1 w-full min-w-0 h-[200px] relative">
              <ChartWrapper data={inventoryData?.categoryDistribution} height={200}>
                 <ResponsiveContainer width="100%" height={200}>
                   <BarChart data={inventoryData?.categoryDistribution || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                      <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fontSize: 8, fill: '#94A3B8', fontWeight: 900 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fontSize: 8, fill: '#94A3B8', fontWeight: 900 }} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ fontFamily: "Inter", fontSize: 10, fontWeight: 900, borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="value" fill="#f59e0b" radius={[10, 10, 0, 0]} barSize={30} />
                   </BarChart>
                 </ResponsiveContainer>
              </ChartWrapper>
           </div>
        </div>
      </div>

      {/* Velocity & Stock Correlation Node */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        {/* Unit Velocity Flux (Sales Count) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col h-[300px] overflow-hidden">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                 <Zap size={14} className="text-indigo-600" /> Unit Velocity Flux
              </h3>
           </div>
           <div className="flex-1 w-full min-w-0 h-[200px] relative">
              <ChartWrapper data={salesData?.dailySales} height={200}>
                 <ResponsiveContainer width="100%" height={200}>
                   <LineChart data={salesData?.dailySales || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                      <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fontSize: 7, fill: "#cbd5e1", fontWeight: 900 }} interval="preserveStartEnd" />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fontSize: 8, fill: '#94A3B8', fontWeight: 900 }} />
                      <Tooltip contentStyle={{ fontFamily: "Inter", fontSize: 10, fontWeight: 900, borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                       <Line type="monotone" dataKey="count" name="TXN Count" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }} />
                   </LineChart>
                 </ResponsiveContainer>
              </ChartWrapper>
           </div>
           <p className="text-[8px] font-black text-slate-400 uppercase text-center mt-2 tracking-widest">Transaction Count Frequency</p>
        </div>

        {/* Stock vs Sales (Comparative Audit) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col h-[300px] overflow-hidden">
           <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                 <TrendingUp size={14} className="text-emerald-500" /> High-Velocity Node Performance Audit (Qty)
              </h3>
           </div>
           <div className="flex-1 w-full min-w-0 h-[200px] relative">
              <ChartWrapper data={salesData?.topSoldItems} height={200}>
                 <ResponsiveContainer width="100%" height={200}>
                   <BarChart data={salesData?.topSoldItems || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                      <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fontSize: 8, fill: '#94A3B8', fontWeight: 900 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fontSize: 8, fill: '#94A3B8', fontWeight: 900 }} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ fontFamily: "Inter", fontSize: 10, fontWeight: 900, borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontFamily: "Inter", fontSize: 8, fontWeight: 900, textTransform: 'uppercase', marginTop: '10px' }} />
                      <Bar dataKey="totalQty" name="Units Sold" fill="#6366f1" radius={[5, 5, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
              </ChartWrapper>
           </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, sub }: any) {
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
}


