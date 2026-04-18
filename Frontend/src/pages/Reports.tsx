import { useState, useEffect } from 'react';
import {
  TrendingUp, RefreshCcw, Box,
  ShoppingCart, Zap,
  IndianRupee, Activity, ShieldCheck,
  TrendingDown, ArrowUpRight, CreditCard, Tag, X
} from 'lucide-react';
import {
  XAxis, Tooltip, ResponsiveContainer, AreaChart,
  Area, YAxis, CartesianGrid, PieChart, Pie, Cell,
  BarChart, Bar, LineChart, Line, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import socketService from '../services/socket';

function ChartWrapper({ data, children, height = 250 }: any) {
  if (!data || data.length === 0) {
    return (
      <div style={{ minHeight: `${height}px`, height: `${height}px` }} className="w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        <Box size={24} className="text-slate-300 mb-2" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">No Data Available</p>
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
  const [showCrisis, setShowCrisis] = useState(false);
  const [showAlertActions, setShowAlertActions] = useState(false);
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    paymentMethod: '',
    customerName: ''
  });

  const [selectedHub, setSelectedHub] = useState<string | null>(null);
  const [hubTransactions, setHubTransactions] = useState<any[]>([]);
  const [hubLoading, setHubLoading] = useState(false);

  useEffect(() => {
    fetchAllData();

    // ── Real-time Socket Sync ──
    const handleDataSync = (payload: any) => {
      console.log("📡 Reports Sync Received:", payload);
      fetchAllData();
      if (selectedHub) fetchHubHistory(selectedHub);
    };

    socketService.on('DATA_SYNC', handleDataSync);

    // ── Cross-Tab Sync ──
    const syncChannel = new BroadcastChannel('nexus_sync');
    syncChannel.onmessage = (event) => {
      if (event.data === 'FETCH_PRODUCTS' || event.data === 'FETCH_DASHBOARD' || event.data?.type === 'INVOICE') {
        fetchAllData();
        if (selectedHub) fetchHubHistory(selectedHub);
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

  const fetchHubHistory = async (method: string) => {
    setHubLoading(true);
    setSelectedHub(method);
    try {
      const res = await api.get('/invoices', { params: { paymentMethod: method.toLowerCase(), limit: 50 } });
      setHubTransactions(res.data?.data || []);
    } catch (err) {
      console.error("Hub Fetch Error:", err);
    } finally {
      setHubLoading(false);
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center ">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
      <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-tighter">Syncing Reports...</h2>
    </div>
  );

  return (
    <div className="space-y-4 select-none print:m-0 print:p-0">
      {/* 🖨️ Print-Only Audit Header */}
      <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-4">
        <h1 className="text-2xl font-semibold uppercase tracking-tighter">Nexus Node Audit Report</h1>
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
        <button onClick={fetchAllData} className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all border border-slate-200">
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
            <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp size={10} /> Start Date
            </label>
            <input
              type="date"
              className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl text-[11px] font-semibold focus:bg-white focus:border-indigo-500 outline-none transition-all"
              value={filters.startDate}
              onChange={e => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>
          <div className="flex-1 min-w-[140px] space-y-1.5">
            <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingDown size={10} /> End Date
            </label>
            <input
              type="date"
              className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl text-[11px] font-semibold focus:bg-white focus:border-indigo-500 outline-none transition-all"
              value={filters.endDate}
              onChange={e => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
          <div className="flex-1 min-w-[140px] space-y-1.5">
            <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <CreditCard size={10} /> Protocol
            </label>
            <select
              className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl text-[11px] font-semibold focus:bg-white focus:border-indigo-500 outline-none appearance-none transition-all"
              value={filters.paymentMethod}
              onChange={e => setFilters({ ...filters, paymentMethod: e.target.value })}
            >
              <option value="">All Streams</option>
              <option value="cash">Cash Settlement</option>
              <option value="upi">UPI Protocol</option>
              <option value="card">Card Terminal</option>
            </select>
          </div>

          <button
            onClick={() => setFilters({ startDate: '', endDate: '', paymentMethod: '', customerName: '' })}
            className="px-4 py-2.5 text-rose-500 hover:bg-rose-50 rounded-2xl text-[10px] font-semibold uppercase tracking-widest transition-all h-[42px] border border-transparent hover:border-rose-100"
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
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-200 shadow-sm relative overflow-hidden flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-tighter leading-none">Revenue Growth Flux</h3>
                <p className="text-[9px] text-slate-400 font-semibold uppercase mt-1.5 tracking-widest leading-none">Real-time Node Telemetry</p>
              </div>
              <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
                <TrendingUp size={14} />
              </div>
            </div>
            <div className="flex-1 w-full min-w-0 relative">
              <ChartWrapper data={salesData?.dailySales} height={240}>
                <ResponsiveContainer width="100%" height={240} minWidth={0}>
                  <AreaChart data={salesData?.dailySales || []}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                    <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fontSize: 7, fill: "#cbd5e1", fontWeight: 600 }} interval="preserveStartEnd" />
                   <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fontSize: 8, fill: '#94A3B8', fontWeight: 600 }} />
                   <Tooltip contentStyle={{ fontFamily: "Inter", fontSize: 9, fontWeight: 600, borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                   <Area type="monotone" dataKey="totalSales" stroke="#6366f1" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} dot={{ r: 3, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartWrapper>
            </div>
          </div>

          {/* Integrated Insights - Responsive Grid */}
          <div className="bg-slate-950 p-6 md:p-8 rounded-[2.5rem] border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
               <div className="space-y-1">
                  <p className="text-[8px] font-semibold text-indigo-400 uppercase tracking-widest leading-none">Node: Growth</p>
                  <h4 className="text-white text-xs font-semibold tracking-tight uppercase">Growth Potential</h4>
                  <p className="text-slate-400 text-[10px] font-semibold leading-relaxed mt-2 uppercase tracking-tight opacity-70">
                     {salesData?.topSoldItems?.[0] ? `Strongest performance in ${salesData.topSoldItems[0]._id}. Scale stock accordingly.` : "Analyzing market velocity..."}
                  </p>
               </div>
               <div className="md:border-x border-white/5 md:px-8 space-y-1">
                  <p className="text-[8px] font-semibold text-emerald-400 uppercase tracking-widest leading-none">Node: Health</p>
                  <h4 className="text-white text-xs font-semibold tracking-tight uppercase">Performance node</h4>
                  <p className="text-slate-400 text-[10px] font-semibold leading-relaxed mt-2 uppercase tracking-tight opacity-70">
                      Fiscal sync status nominal. Revenue stream is consistent across active hubs.
                  </p>
               </div>
               <div className="md:pl-8 space-y-1">
                  <p className="text-[8px] font-semibold text-rose-400 uppercase tracking-widest leading-none">Node: Risk</p>
                  <h4 className="text-white text-xs font-semibold tracking-tight uppercase">Stock Risk Radar</h4>
                  <p className="text-slate-400 text-[10px] font-semibold leading-relaxed mt-2 uppercase tracking-tight opacity-70">
                      {salesData?.lowStockItems?.length > 0 ? `Alert: ${salesData.lowStockItems.length} nodes at risk. Restock protocol recommended.` : "Inventory nodes stable."}
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* Small Stats / Velocity Ranking */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full">
          <div className="bg-slate-950 p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden border border-slate-800 flex-1 flex flex-col group">
            <h3 className="text-sm font-semibold text-indigo-400 mb-5 uppercase tracking-widest flex items-center gap-2 leading-none">
              <ArrowUpRight size={14} className="opacity-60" /> Peak Velocity Hub
            </h3>
            <div className="space-y-4 relative z-10 flex-1 overflow-y-auto custom-scrollbar pr-1">
              {salesData?.topSoldItems?.length > 0 ? salesData.topSoldItems.slice(0, 5).map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-[11px] py-1.5 border-b border-white/5 last:border-b-0 leading-none group/item">
                  <div className="flex items-center gap-3">
                    <span className="text-white/20 font-semibold group-hover/item:text-indigo-400 transition-colors w-4">#0{i + 1}</span>
                    <span className="font-semibold text-white/90 uppercase truncate max-w-[120px] sm:max-w-[180px] tracking-tight">{item._id}</span>
                  </div>
                  <span className="font-semibold text-indigo-400 shrink-0">₹{item.revenue.toLocaleString()}</span>
                </div>
              )) : <div className="py-10 text-center"><p className="text-[9px] text-white/10 uppercase font-semibold tracking-[0.3em]">Syncing_Nodes</p></div>}
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-200 shadow-sm flex-1 flex flex-col transition-all duration-500 overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
              <h3 className="text-sm font-semibold text-rose-600 uppercase tracking-tighter flex items-center gap-2 leading-none">
                <TrendingDown size={14} /> Crisis Hub
              </h3>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
               <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[185px] animate-in fade-in duration-500">
                  {/* Combine Out of Stock and Low Stock */}
                  {[...(salesData?.lowStockItems || []), ...(inventoryData?.lowStockProducts || [])].map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-[10px] py-2 border-b border-slate-50 last:border-b-0 leading-none group">
                      <div className="flex items-center gap-2">
                        <div className={`w-0.5 h-3 rounded-full ${item.stock <= 0 ? 'bg-rose-500' : 'bg-amber-400'}`} />
                        <span className="font-semibold text-slate-800 uppercase truncate max-w-[120px] group-hover:text-rose-500 transition-colors tracking-tight">{item.name || item._id}</span>
                      </div>
                      <span className={`font-semibold text-[8px] uppercase tracking-tighter ${item.stock <= 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                        {item.stock} NODE
                      </span>
                    </div>
                  ))}
                  {(!(salesData?.lowStockItems?.length) && !(inventoryData?.lowStockProducts?.length)) && (
                    <div className="text-center py-6">
                        <ShieldCheck size={20} className="text-emerald-300 mx-auto mb-2 opacity-50" />
                        <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest leading-none">All Nodes Stable</p>
                    </div>
                  )}
               </div>

               <div className="pt-4 border-t border-slate-50 mt-2">
                 {!showAlertActions ? (
                    <button 
                    onClick={() => setShowAlertActions(true)}
                    className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-semibold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
                    >
                    <ShieldCheck size={12} /> Manage Alert
                    </button>
                 ) : (
                    <div className="flex gap-2 animate-in slide-in-from-bottom-2 duration-300">
                    <button 
                        onClick={() => navigate('/purchases')}
                        className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] font-semibold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/10"
                    >
                        New Purchase
                    </button>
                    <button 
                        onClick={() => navigate('/inventory', { state: { alarmFocus: true } })}
                        className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-semibold uppercase tracking-widest hover:bg-slate-200 border border-slate-200 transition-all"
                    >
                        Edit Items
                    </button>
                    <button 
                        onClick={() => setShowAlertActions(false)}
                        className="px-3 bg-rose-50 text-rose-500 rounded-xl border border-rose-100 flex items-center justify-center"
                    >
                        <TrendingDown size={14} className="rotate-45" />
                    </button>
                    </div>
                 )}
               </div>
            </div>
          </div>
        </div>
      </div>






      {/* Merchant Protocol Audit terminal */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        {(['CASH', 'UPI', 'CARD'] as const).map(proto => {
          const metric = (salesData?.paymentMetrics || []).find((m: any) => m._id?.toUpperCase() === proto);
          const themes = {
            CASH: 'text-emerald-600 bg-emerald-50 border-emerald-100',
            UPI: 'text-indigo-600 bg-indigo-50 border-indigo-100',
            CARD: 'text-rose-600 bg-rose-50 border-rose-100'
          } as any;
          return (
            <div 
              key={proto} 
              onClick={() => fetchHubHistory(proto)}
              className={`bg-white p-3 sm:p-5 rounded-2xl border-2 border-slate-200 shadow-sm relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-start justify-between group transition-all hover:scale-[1.02] cursor-pointer active:scale-95 ${themes[proto] || 'border-slate-100 text-slate-400'}`}
            >
              <div className="z-10 text-center sm:text-left">
                <span className="text-[7px] sm:text-[9px] font-semibold uppercase text-slate-400 block mb-1">{proto} Hub</span>
                <h3 className="text-sm sm:text-lg font-semibold tracking-tight text-slate-900 leading-none">₹{(metric?.amount || 0).toLocaleString()}</h3>
                <p className="text-[6px] sm:text-[8px] font-semibold text-slate-400 mt-1 sm:mt-2 uppercase">Settlements: <span className="text-slate-900">{metric?.count || 0}</span></p>
              </div>
              <div className="p-1.5 sm:p-2 rounded-lg bg-white border border-slate-100 shrink-0 mt-2 sm:mt-0 z-10 transition-all group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-800">
                {proto === 'CASH' ? <IndianRupee size={12} /> : proto === 'UPI' ? <Zap size={12} /> : <CreditCard size={12} />}
              </div>
              <div className="absolute top-0 right-0 p-1 opacity-10 rotate-12 pointer-events-none group-hover:rotate-45 transition-all"> <Zap size={40} /> </div>
            </div>
          );
        })}
      </div>

      {/* Payment History Modal Terminal */}
      {selectedHub && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in duration-300 flex flex-col max-h-[85vh]">
            <div className="px-8 py-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base font-semibold uppercase tracking-[0.2em]">{selectedHub} Hub Settlement Ledger</h3>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1 opacity-80">Syncing Node: {localStorage.getItem('businessId') || 'GLOBAL_ROOT'}</p>
              </div>
              <button 
                onClick={() => setSelectedHub(null)}
                className="p-3 bg-white/10 hover:bg-rose-500 hover:text-white rounded-2xl transition-all shadow-xl active:scale-75"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-x-auto custom-scrollbar p-6">
              {hubLoading ? (
                <div className="h-64 flex flex-col items-center justify-center">
                   <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                   <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Reconciling Ledger Nodes...</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-50">
                      <th className="py-4 px-4">Date Protocol</th>
                      <th className="py-4 px-4">Customer Segment</th>
                      <th className="py-4 px-4">Registry ID</th>
                      <th className="py-4 px-4 text-center">Status</th>
                      <th className="py-4 px-4 text-right">Settlement Amt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {hubTransactions.length > 0 ? hubTransactions.map((tx: any, i: number) => (
                      <tr key={tx._id} className="text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors group">
                        <td className="py-5 px-4">
                           <div className="flex items-center gap-3">
                              <span className="text-[10px] text-slate-300 font-bold">#{hubTransactions.length - i}</span>
                              <span className="uppercase tracking-tighter">{new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                           </div>
                        </td>
                        <td className="py-5 px-4 uppercase tracking-tighter">
                           <div className="flex flex-col">
                              <span className="text-slate-900">{tx.customerName || 'Walk-in Node'}</span>
                              <span className="text-[9px] text-slate-400 mt-1">{tx.customerPhone || 'NO_PHONE_SYNC'}</span>
                           </div>
                        </td>
                        <td className="py-5 px-4 text-[10px] text-slate-400 font-mono">{tx.invoiceNumber}</td>
                        <td className="py-5 px-4 text-center">
                           <span className={`px-2.5 py-1 rounded-lg text-[8px] uppercase tracking-widest font-bold border ${tx.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                              {tx.paymentStatus}
                           </span>
                        </td>
                        <td className="py-5 px-4 text-right text-slate-900 font-bold">
                           ₹{tx.grandTotal.toLocaleString()}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="py-20 text-center text-slate-300 font-semibold uppercase tracking-widest text-[10px]">NO_TRANS_NODES_SYNCED_FOR_CRITERIA</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
               <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Aggregate Registry Audit: <span className="text-slate-900">{hubTransactions.length} Nodes</span></p>
               <button 
                  onClick={() => setSelectedHub(null)}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-semibold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95"
               >
                  Close Audit Ledger
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Fiscal Settlement Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-6">
        {/* Compact Insight Matrix (Small Box) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-[2.5rem] border-2 border-slate-200 shadow-sm flex flex-col h-[500px] overflow-hidden">
          <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-3">
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck size={18} className="text-amber-500" /> Fiscal Insight
            </h3>
          </div>
          <div className="flex-1 w-full min-w-0 h-[220px] relative">
            <ChartWrapper data={salesData?.gstSlabs} height={220}>
              <ResponsiveContainer width="100%" height={220} minWidth={0}>
                <PieChart>
                  <Pie data={salesData?.gstSlabs || []} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="totalTax" nameKey="_id">
                    {(salesData?.gstSlabs || []).map((_e: any, index: number) => <Cell key={index} fill={['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#a855f7'][index % 5]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 900, borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </div>
          <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex-1 overflow-y-auto custom-scrollbar">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Node Summary</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                <span className="uppercase">Net Yield</span>
                <span className="text-amber-600 font-black tracking-tight">₹{(salesData?.totalGST || 0).toLocaleString()}</span>
              </div>
              <p className="text-[9px] text-slate-400 font-bold leading-relaxed uppercase">
                Monitoring tax liability concentration across all synchronized business nodes.
              </p>
            </div>
          </div>
        </div>

        {/* Granular Slab Matrix (The Table) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-[2.5rem] border-2 border-slate-200 shadow-sm flex flex-col h-[500px] overflow-hidden">
          <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-3">
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck size={18} className="text-amber-500" /> Slab Reconciliation Matrix
            </h3>
          </div>
          <div className="flex-1 overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-3 px-2">Tax bracket</th>
                  <th className="py-3 px-2 text-right">Taxable Supply</th>
                  <th className="py-3 px-2 text-right">Collected Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {salesData?.gstSlabs?.length > 0 ? salesData.gstSlabs.map((slab: any, i: number) => (
                  <tr key={i} className="text-[11px] font-bold text-slate-700 uppercase hover:bg-slate-50 transition-colors group">
                    <td className="py-4 px-2 text-slate-400 group-hover:text-amber-600 transition-colors tracking-tight">GST {slab._id}% Protocol</td>
                    <td className="py-4 px-2 text-right">₹{slab.taxableValue.toLocaleString()}</td>
                    <td className="py-4 px-2 text-right text-amber-600 font-black">₹{slab.totalTax.toLocaleString()}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} className="py-10 text-center text-slate-200 font-bold tracking-widest uppercase">NO_TAX_DATA_SYNCED</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {salesData?.gstSlabs?.length > 0 && (
            <div className="mt-4 pt-4 border-t-2 border-slate-100 bg-white">
              <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl shadow-lg">
                <span className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Aggregate Summary</span>
                <span className="text-lg font-black text-amber-400">₹{salesData.totalGST.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Strategic Hub Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        {/* Terminal A: Payment Flux Protocol */}
        <div className="bg-white p-5 rounded-[2rem] border-2 border-slate-200 shadow-sm flex flex-col h-[320px] overflow-hidden group">
           <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                 <CreditCard size={14} className="text-indigo-600" /> Sector Settlement logic
              </h3>
              <div className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-semibold rounded-md border border-indigo-100 uppercase tracking-widest">Protocol Sync</div>
           </div>
           <div className="flex-1 w-full relative">
              <ChartWrapper data={salesData?.paymentMetrics} height={200}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={salesData?.paymentMetrics || []} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="amount" nameKey="_id">
                        {(salesData?.paymentMetrics || []).map((entry:any, index:number) => {
                          const proto = entry._id?.toLowerCase();
                          return <Cell key={`cell-${index}`} fill={proto === 'upi' ? '#10b981' : proto === 'cash' ? '#6366f1' : '#f43f5e'} />;
                        })}
                    </Pie>
                    <Tooltip contentStyle={{ fontFamily: "Inter", fontSize: 9, fontWeight: 600, borderRadius: 10, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartWrapper>
           </div>
           <div className="flex justify-center gap-4 mt-2 pb-2 border-t border-slate-50 pt-3">
               {[{p:"UPI",c:"#10b981"},{p:"CASH",c:"#6366f1"},{p:"CARD",c:"#f43f5e"}].map((proto) => (
                  <div key={proto.p} className="flex items-center gap-1.5">
                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: proto.c }} />
                     <span className="text-[9px] font-semibold uppercase text-slate-400 tracking-widest">{proto.p}</span>
                  </div>
               ))}
           </div>
        </div>

        {/* Terminal B: Inventory Hub Concentration */}
        <div className="bg-white p-5 rounded-[2rem] border-2 border-slate-200 shadow-sm flex flex-col h-[320px] overflow-hidden group">
           <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                 <Box size={14} className="text-amber-500" /> Inventory Hub Distribution
              </h3>
              <div className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-semibold rounded-md border border-amber-100 uppercase tracking-widest">Global Audit</div>
           </div>
           <div className="flex-1 w-full relative overflow-x-auto custom-scrollbar-thin">
              <div style={{ minWidth: (inventoryData?.categoryDistribution?.length || 0) * 55 + 'px', height: '100%' }}>
                <ChartWrapper data={inventoryData?.categoryDistribution} height={220}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={inventoryData?.categoryDistribution || []} margin={{ left: 5, right: 5, bottom: 25 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                       <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fontSize: 7, fill: '#94A3B8', fontWeight: 600 }} interval={0} angle={-35} textAnchor="end" />
                       <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fontSize: 7, fill: '#94A3B8', fontWeight: 600 }} />
                       <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ fontFamily: "Inter", fontSize: 9, fontWeight: 600, borderRadius: 10, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                       <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              </div>
           </div>
           <p className="text-center text-[8px] font-semibold text-slate-300 uppercase tracking-widest mt-1 border-t border-slate-50 pt-2 italic">Categorical Capital Weight Audit</p>
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
    <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3 transition-all hover:border-indigo-200 group relative overflow-hidden h-full">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${colors[color]} border shadow-sm`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0 text-center sm:text-left flex-1">
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-1.5 whitespace-nowrap overflow-hidden text-ellipsis">{label}</p>
        <h3 className="text-lg sm:text-xl font-semibold text-slate-900 leading-tight truncate" title={value}>{value}</h3>
        {sub && <p className={`mt-1.5 text-[8px] font-semibold uppercase tracking-tighter ${color === 'rose' ? 'text-rose-500' : 'text-emerald-600'} truncate`}>{sub}</p>}
      </div>
    </div>
  );
}


