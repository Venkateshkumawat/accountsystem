import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  IndianRupee, FileText, Package, Users, AlertTriangle,
  Plus, ShoppingCart, TrendingUp, XCircle,
  Settings, ChevronDown, RefreshCw, Filter,
  CheckCircle2, Zap
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import { Link } from 'react-router-dom';
import api from '../services/api';
import socketService from '../services/socket';
import InvoiceModal from '../components/InvoiceModal';
import PlanModal from '../components/PlanModal';

interface DashboardData {
  totalSales: number;
  todaySales: { total: number; count: number };
  monthlySales: number;
  monthlyCount: number;
  yearlySales: number;
  totalPurchases: number;
  totalTransactions: number;
  lowStockCount: number;
  totalProducts: number;
  inventoryValue: number;
  gstPayableThisMonth: number;
  recentActivities: any[];
  topProducts: any[];
  recentInvoices: any[];
  lowStockProducts: any[];
  staffCount: number;
  productCount: number;
  ProductLimit?: number;
  usedProduct?: number;
  remainingProduct?: number;
}

const ACTIVITY_LIMIT = 8;
const INVOICE_LIMIT = 5;
const PRODUCT_LIMIT = 5;

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Activity & Invoices state
  const [activityFilter, setActivityFilter] = useState<string>('ALL');
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [invoiceFilter, setInvoiceFilter] = useState<string>('all');
  const [showAllInvoices, setShowAllInvoices] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string>('free');

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const res = await api.get('/dashboard');
      setData(res.data.data);
      
      const rawUser = localStorage.getItem('user');
      const user = rawUser && rawUser !== 'undefined' ? JSON.parse(rawUser) : {};

      // Get current plan from user object
      const fullUserRes = await api.get('/auth/me');
      if (fullUserRes.data?.businessObjectId?.plan) {
         setCurrentPlan(fullUserRes.data.businessObjectId.plan);
      }
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { 
    fetchDashboard(); 

    // ── Real-time Socket Sync ──
    const handleDataSync = (payload: any) => {
      console.log("📡 Dashboard Sync Received:", payload);
      fetchDashboard(true);
    };

    const handleProductSync = (payload: any) => {
      console.log("📡 Product Sync Received:", payload);
      setData(prev => prev ? {
        ...prev,
        usedProduct: payload.usedProduct,
        remainingProduct: payload.remainingProduct,
        productCount: payload.usedProduct
      } : prev);
    };

    socketService.on('DATA_SYNC', handleDataSync);
    socketService.on('ProductUpdated', handleProductSync);

    // ── Cross-Tab Sync ──
    const syncChannel = new BroadcastChannel('nexus_sync');
    syncChannel.onmessage = (event) => {
      if (event.data === 'FETCH_PRODUCTS' || event.data === 'FETCH_DASHBOARD') {
        fetchDashboard(true);
      }
    };

    return () => {
      socketService.off('DATA_SYNC', handleDataSync);
      socketService.off('ProductUpdated', handleProductSync);
      syncChannel.close();
    };
  }, [fetchDashboard]);

  const chartData = useMemo(() => {
    const base = data?.monthlySales || 0;
    if (base === 0) {
      return [
        { name: 'Wk 1', revenue: 0 },
        { name: 'Wk 2', revenue: 0 },
        { name: 'Wk 3', revenue: 0 },
        { name: 'Wk 4', revenue: 0 },
      ];
    }
    return [
      { name: 'Wk 1', revenue: base * 0.2 },
      { name: 'Wk 2', revenue: base * 0.3 },
      { name: 'Wk 3', revenue: base * 0.1 },
      { name: 'Wk 4', revenue: base * 0.4 },
    ];
  }, [data]);

  // ── Activity with filter + slice ──────────────────────────────────────────
  const filteredActivities = useMemo(() => {
    const all = data?.recentActivities || [];
    const filtered = activityFilter === 'ALL' ? all : all.filter(a => a.action === activityFilter);
    return showAllActivities ? filtered : filtered.slice(0, ACTIVITY_LIMIT);
  }, [data, activityFilter, showAllActivities]);

  const totalActivityCount = useMemo(() => {
    const all = data?.recentActivities || [];
    return activityFilter === 'ALL' ? all.length : all.filter(a => a.action === activityFilter).length;
  }, [data, activityFilter]);

  // ── Invoices with filter ──────────────────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    const all = data?.recentInvoices || [];
    const filtered = invoiceFilter === 'all' ? all : all.filter(inv => inv.paymentStatus === invoiceFilter);
    return showAllInvoices ? filtered : filtered.slice(0, INVOICE_LIMIT);
  }, [data, invoiceFilter, showAllInvoices]);

  const ACTION_COLORS: Record<string, string> = {
    CREATE: 'bg-indigo-100 text-indigo-600',
    DELETE: 'bg-rose-100 text-rose-600',
    UPDATE: 'bg-amber-100 text-amber-600',
    TRANSACTION: 'bg-emerald-100 text-emerald-600',
  };
  const ACTION_ICONS: Record<string, any> = {
    CREATE: Plus, DELETE: XCircle, UPDATE: Settings, TRANSACTION: ShoppingCart,
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-4  min-h-screen p-1">

      {/* ── Top Banner ──────────────────────────────────────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm overflow-hidden relative group">
        <div className="flex items-center gap-4 z-10">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 shrink-0">
            <Zap size={24} fill="currentColor" className="sm:scale-110" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight leading-tight">Dashboard Overview</h1>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-0.5 uppercase tracking-widest">
              Live Business Telemetry
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 z-10 w-full md:w-auto pt-2 md:pt-0">
          <button
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-50 text-slate-500 rounded-xl hover:text-indigo-600 border border-slate-100 transition-all active:scale-95 ${refreshing ? 'opacity-50' : 'hover:bg-indigo-50 hover:border-indigo-100'}`}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span className="text-[10px] font-black uppercase tracking-widest">{refreshing ? 'Syncing...' : 'Refresh Nodes'}</span>
          </button>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-0.5">
        <StatCard label="TODAY SALES" value={`₹${(data?.todaySales.total || 0).toLocaleString()}`} sub="vs last day" icon={IndianRupee} color="indigo" trend="+12%" />
        <StatCard label="MONTHLY REVENUE" value={`₹${(data?.monthlySales || 0).toLocaleString()}`} sub="vs last month" icon={TrendingUp} color="emerald" trend="+8%" trendColor="text-emerald-500" />
        <StatCard label="MONTHLY INVOICES" value={`${data?.monthlyCount || 0}`} sub="Completed nodes" icon={FileText} color="amber" border />
        <Link to="/inventory?filter=low-stock">
          <StatCard label="LOW STOCK ITEMS" value={data?.lowStockCount || 0} sub="Critical items" icon={AlertTriangle}
            color={data?.lowStockCount && data.lowStockCount > 0 ? 'rose' : 'slate'}
            isAlert={!!(data?.lowStockCount && data.lowStockCount > 0)} border />
        </Link>
      </div>

      {/* ── Chart + Secondary Stats ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-3">
        <div className="lg:col-span-6 bg-white p-3 md:p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900 uppercase tracking-tight">Revenue Flow</h2>
              <p className="text-sm font-normal text-slate-500">Weekly revenue trend analysis</p>
            </div>
          </div>
          <div className="flex-1 w-full h-[200px] md:h-[250px] relative mt-2">
            {(!chartData || chartData.length === 0) ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">NODATA_SYNC</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fill: '#64748b', fontSize: 10, fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: "Inter", fill: '#64748b', fontSize: 10, fontWeight: 500 }} />
                  <Tooltip cursor={{ fill: '#F8FAFC' }}
                    contentStyle={{ fontFamily: "Inter", borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 900, fontSize: 10, background: '#fff' }} />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]} barSize={24}>
                    {chartData.map((_e, i) => (
                      <Cell key={i} fill={i === 3 ? '#4F46E5' : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-3">
          {/* GST card */}
          <div className="bg-slate-900 p-5 rounded-2xl shadow-xl text-white relative overflow-hidden ring-1 ring-slate-800">
            <div className="relative z-10">
              <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 leading-none">GST Liability Node</p>
              <h2 className="text-3xl font-semibold tracking-tight text-white">₹{(data?.gstPayableThisMonth || 0).toLocaleString()}</h2>
              <p className="text-indigo-200 text-sm font-normal mt-3 opacity-90">Estimated liability this month</p>
            </div>
            <div className="absolute -right-2 -bottom-2 opacity-5 scale-110 rotate-12">
              <FileText size={100} />
            </div>
          </div>

          {/* Product Usage Telemetry Box */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2 relative overflow-hidden group">
             <div className="flex justify-between items-end relative z-10">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">NODE CAPACITY (PRODUCT)</p>
                  <h3 className="text-xl font-semibold text-slate-900">
                     {data?.usedProduct ?? 0} <span className="text-slate-300 text-lg">/ {data?.ProductLimit || '∞'}</span>
                  </h3>
                </div>
               <div className="text-right">
                  <p className="text-[8px] font-black uppercase text-slate-400">Remaining</p>
                  <p className={`text-xs font-black ${((data?.remainingProduct ?? 10) < 10) ? 'text-rose-500' : 'text-emerald-500'}`}>
                     {data?.remainingProduct ?? 'Stable'}
                  </p>
               </div>
             </div>
             
             {/* Progress Bar */}
             <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1 relative z-10">
               {data?.ProductLimit && (
                 <div 
                   className={`h-full rounded-full transition-all duration-1000 ${
                     ((data?.usedProduct || 0) / (data?.ProductLimit || 1)) > 0.9 ? 'bg-rose-500' : 'bg-emerald-500'
                   }`}
                   style={{ width: `${Math.min(((data?.usedProduct || 0) / (data?.ProductLimit || 1)) * 100, 100)}%` }}
                 />
               )}
             </div>
             <Package size={80} className="absolute -right-4 -bottom-4 opacity-5 rotate-12 group-hover:rotate-45 transition-transform duration-700 text-emerald-500" />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center group">
              <div>
                 <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest mb-1">PERSONNEL NODES</p>
                 <h3 className="text-xl font-semibold text-slate-900">{data?.staffCount ?? '—'}</h3>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                 <Users size={18} />
              </div>
            </div>
          </div>

          {/* Low stock alert */}
          {(data?.lowStockProducts?.length || 0) > 0 && (
            <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl relative overflow-hidden">
              <div className="flex items-center gap-1.5 mb-2 relative z-10">
                <AlertTriangle size={12} className="text-rose-600" />
                <p className="text-[8px] font-black text-rose-700 uppercase tracking-widest leading-none">Critical Stock Flow</p>
              </div>
              <div className="space-y-1 relative z-10">
                {data?.lowStockProducts.slice(0, 2).map(p => (
                  <div key={p._id} className="flex justify-between text-[10px] font-black text-rose-800 uppercase tracking-tight">
                    <span className="truncate max-w-none">{p.name}</span>
                    <span className="shrink-0 ml-2 font-black">Lvl: {p.stock}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Invoices + Top Products ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-3">
        {/* Invoices with filter */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-800">Recent Invoices</h2>
            <div className="flex items-center gap-1.5">
              {['all', 'paid', 'unpaid'].map(f => (
                <button key={f} onClick={() => setInvoiceFilter(f)}
                  className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-all ${invoiceFilter === f
                    ? f === 'paid' ? 'bg-emerald-600 text-white' : f === 'unpaid' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'
                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                    }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            {filteredInvoices.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-slate-300 font-black uppercase text-[9px] tracking-widest">Zero Protocol History</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                    <th className="px-6 py-3">INVOICE ID</th>
                    <th className="px-6 py-3">CUSTOMER</th>
                    <th className="px-6 py-3">AMOUNT</th>
                    <th className="px-6 py-3">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredInvoices.map(inv => (
                    <tr 
                      key={inv._id} 
                      onClick={() => setSelectedInvoice(inv)}
                      className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-2 font-black text-indigo-600 text-[10px] tracking-tighter group-hover:underline">{inv.invoiceNumber}</td>
                      <td className="px-5 py-2 font-black text-slate-400 text-[10px] truncate max-w-[100px]">{inv.customerName || 'Node'}</td>
                      <td className="px-5 py-2 font-black text-slate-900 text-[10px]">₹{inv.grandTotal}</td>
                      <td className="px-5 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${inv.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'
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

          {/* Load More Invoices */}
          {!showAllInvoices && (data?.recentInvoices?.length || 0) > INVOICE_LIMIT && (
            <div className="p-4 border-t border-slate-50 text-center bg-slate-50/30">
              <button
                onClick={() => setShowAllInvoices(true)}
                className="mx-auto px-6 py-2 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2"
              >
                <ChevronDown size={12} /> Show {data!.recentInvoices.length - INVOICE_LIMIT} More Transactions
              </button>
            </div>
          )}
          {showAllInvoices && (
            <div className="p-4 border-t border-slate-50 text-center bg-slate-50/30">
              <button
                onClick={() => setShowAllInvoices(false)}
                className="mx-auto px-6 py-2 bg-white border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Collapse List
              </button>
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-800 mb-5">Top Selling Products</h2>
          {(data?.topProducts?.length || 0) === 0 ? (
            <div className="py-8 text-center">
              <Package size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 font-semibold text-sm">No sales data yet</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {(showAllProducts ? (data?.topProducts || []) : (data?.topProducts || []).slice(0, PRODUCT_LIMIT)).map((prod, i) => {
                  const max = data!.topProducts[0]?.totalRevenue || 1;
                  const pct = (prod.totalRevenue / max) * 100;
                  return (
                    <div key={i} className="space-y-1.5 group">
                      <div className="flex justify-between text-[10px]">
                        <span className="font-black text-slate-700 truncate group-hover:text-indigo-600 transition-colors uppercase">{prod.name}</span>
                        <span className="font-semibold text-slate-900 ml-2 tracking-tighter text-xl">₹{prod.totalRevenue?.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-900 group-hover:bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {!showAllProducts && (data?.topProducts?.length || 0) > PRODUCT_LIMIT && (
                <button 
                  onClick={() => setShowAllProducts(true)}
                  className="mt-6 w-full py-2 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border border-transparent hover:border-indigo-100"
                >
                  See more performance nodes
                </button>
              )}
              {showAllProducts && (
                <button 
                  onClick={() => setShowAllProducts(false)}
                  className="mt-6 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Collapse Performance
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Activity Stream ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">Recent Activity</h2>
            <p className="text-[8px] text-slate-400 font-medium mt-0.5">
              Showing {filteredActivities.length} of {totalActivityCount} events
            </p>
          </div>
          {/* Activity filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="text-slate-400" />
            {['ALL', 'CREATE', 'UPDATE', 'DELETE', 'TRANSACTION'].map(f => (
              <button key={f} onClick={() => { setActivityFilter(f); setShowAllActivities(false); }}
                className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activityFilter === f
                  ? f === 'DELETE' ? 'bg-rose-600 text-white' :
                    f === 'CREATE' ? 'bg-indigo-600 text-white' :
                      f === 'UPDATE' ? 'bg-amber-500 text-white' :
                        f === 'TRANSACTION' ? 'bg-emerald-600 text-white' :
                          'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {filteredActivities.length === 0 ? (
          <div className="py-16 text-center">
            <Zap size={32} className="text-slate-100 mx-auto mb-3" />
            <p className="text-slate-300 font-black uppercase text-sm tracking-widest">No activity yet</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-50">
              {filteredActivities.map(act => {
                const Icon = ACTION_ICONS[act.action] || Settings;
                const colorClass = ACTION_COLORS[act.action] || 'bg-slate-100 text-slate-500';
                return (
                  <div key={act._id} className="flex items-center gap-4 p-4 hover:bg-slate-50/60 transition-all group">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-slate-900 truncate">{act.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Users size={9} className="text-slate-400 shrink-0" />
                        <span className="text-[9px] font-semibold text-slate-400">{act.userName}</span>
                        <span className="text-slate-200">·</span>
                        <span className="text-[9px] font-semibold text-slate-400">
                          {new Date(act.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${colorClass} opacity-0 group-hover:opacity-100 transition-opacity`}>
                      {act.action}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Load More/Show More */}
            {!showAllActivities && totalActivityCount > ACTIVITY_LIMIT && (
              <div className="p-4 border-t border-slate-50 text-center">
                <button onClick={() => setShowAllActivities(true)}
                  className="flex items-center gap-2 mx-auto px-6 py-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-500 hover:text-indigo-600 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all">
                  <ChevronDown size={13} />
                  see all
                </button>
              </div>
            )}
            {showAllActivities && (
              <div className="p-4 border-t border-slate-50 text-center">
                <button onClick={() => setShowAllActivities(false)}
                  className="flex items-center gap-2 mx-auto px-6 py-2.5 bg-slate-50 border border-slate-200 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all hover:bg-slate-100">
                  see less
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <PlanModal 
        isOpen={isPlanModalOpen} 
        onClose={() => setIsPlanModalOpen(false)} 
        currentPlan={currentPlan}
      />

      <InvoiceModal 
        invoice={selectedInvoice} 
        onClose={() => setSelectedInvoice(null)} 
      />
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
 const StatCard = React.memo(({ label, value, sub, icon: Icon, color, isAlert, trend, trendColor = 'text-emerald-500', border }: any) => {
  const colorMap: Record<string, { bg: string; text: string; accent: string }> = {
    indigo: { bg: 'bg-indigo-50/50', text: 'text-indigo-600', accent: 'border-l-indigo-500' },
    emerald: { bg: 'bg-emerald-50/50', text: 'text-emerald-600', accent: 'border-l-emerald-500' },
    amber: { bg: 'bg-amber-50/50', text: 'text-amber-600', accent: 'border-l-amber-500' },
    rose: { bg: 'bg-rose-50/50', text: 'text-rose-600', accent: 'border-l-rose-500' },
    slate: { bg: 'bg-slate-50/50', text: 'text-slate-500', accent: 'border-l-slate-400' },
  };
  const s = colorMap[color] || colorMap.indigo;
  return (
    <div className={`bg-white p-5 rounded-2xl border ${isAlert ? 'border-rose-200' : 'border-slate-100'} ${border ? s.accent + ' border-l-4' : ''} shadow-sm group hover:shadow-md transition-all relative overflow-hidden`}>
      <div className="flex justify-between items-start mb-4">
        <p className="stat-label">{label}</p>
        <div className={`p-2 rounded-xl ${s.bg} ${s.text}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="stat-value">{value}</h3>
        <div className="flex items-center gap-2">
          {trend ? (
            <span className={`text-[10px] font-semibold ${trendColor}`}>{trend} <span className="text-slate-400">vs last month</span></span>
          ) : (
            <p className="text-[10px] font-semibold text-slate-400">{sub}</p>
          )}
        </div>
      </div>
    </div>
  );
});

// ── Skeleton ──────────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-slate-200 rounded-2xl w-1/3" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-100 rounded-[1.75rem]" />)}
      </div>
      <div className="grid grid-cols-10 gap-5">
        <div className="col-span-6 h-72 bg-slate-100 rounded-[2rem]" />
        <div className="col-span-4 h-72 bg-slate-100 rounded-[2rem]" />
      </div>
      <div className="h-64 bg-slate-100 rounded-[2rem]" />
    </div>
  );
}
