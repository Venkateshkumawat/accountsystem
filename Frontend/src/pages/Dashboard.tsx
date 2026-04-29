import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import {
  IndianRupee, FileText, Package, Users, AlertTriangle, AlertCircle,
  Plus, ShoppingCart, TrendingUp, XCircle,
  Settings, ChevronDown, RefreshCw, Filter,
  CheckCircle2, Zap, Activity
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
  todaySales: { total: number; count: number; comparison: number };
  monthlySales: { total: number; count: number; comparison: number };
  yearlySales: { total: number; comparison: number };
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
  skuLimit?: number;
  usedSku?: number;
  remainingSku?: number;
  revenueTrend?: any[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters state
  const [activityFilter, setActivityFilter] = useState<string>('ALL');
  const [invoiceFilter, setInvoiceFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [planStatus, setPlanStatus] = useState<any>(null);

  const initialized = useRef(false);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (!initialized.current && !isRefresh) setLoading(true);
      if (isRefresh) setRefreshing(true);
      
      const res = await api.get('/dashboard');
      setData(res.data.data);
      initialized.current = true;

      const [fullUserRes, planRes] = await Promise.all([
        api.get('/auth/me').catch(() => null),
        api.get('/businesses/plan-status').catch(() => null)
      ]);
      
      if (fullUserRes?.data?.businessObjectId?.plan) {
        setCurrentPlan(fullUserRes.data.businessObjectId.plan);
      }
      
      if (planRes?.data) {
        setPlanStatus(planRes.data);
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

    const handleDataSync = () => fetchDashboard(true);
    const handleProductSync = (payload: any) => {
      setData(prev => prev ? {
        ...prev,
        usedSku: payload.usedSku,
        remainingSku: payload.remainingSku,
        productCount: payload.usedSku
      } : prev);
    };

    socketService.on('DATA_SYNC', handleDataSync);
    socketService.on('ProductUpdated', handleProductSync);

    const syncChannel = new BroadcastChannel('nexus_sync');
    syncChannel.onmessage = (event) => {
      const triggers = ['SYNC_PURCHASES', 'SYNC_PARTIES', 'SYNC_INVOICES', 'SYNC_PRODUCTS', 'FETCH_DASHBOARD'];
      if (triggers.includes(event.data)) {
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
    if (data?.revenueTrend && data.revenueTrend.length > 0) {
      return data.revenueTrend;
    }
    const base = data?.monthlySales?.total || 0;
    if (base === 0) return [{ name: 'Jan', revenue: 0 }, { name: 'Feb', revenue: 0 }, { name: 'Mar', revenue: 0 }, { name: 'Apr', revenue: 0 }];
    return [
      { name: 'Wk 1', revenue: base * 0.2 },
      { name: 'Wk 2', revenue: base * 0.3 },
      { name: 'Wk 3', revenue: base * 0.1 },
      { name: 'Wk 4', revenue: base * 0.4 },
    ];
  }, [data]);

  const filteredActivities = useMemo(() => {
    const all = data?.recentActivities || [];
    return activityFilter === 'ALL' ? all : all.filter(a => a.action === activityFilter);
  }, [data, activityFilter]);

  const filteredInvoices = useMemo(() => {
    const all = data?.recentInvoices || [];
    return invoiceFilter === 'all' ? all : all.filter(inv => inv.paymentStatus === invoiceFilter);
  }, [data, invoiceFilter]);

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
    <div className="space-y-4 min-h-screen p-1">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-200 flex flex-col justify-between gap-4 shadow-sm overflow-hidden relative group">
        
        {/* 📋 Subscription Warning Banner (Visible ONLY in final 7 days) */}
        {planStatus && planStatus.isNearExpiry && planStatus.remainingDays > 0 && planStatus.remainingDays <= 7 && (
           <div className="mb-4 p-3.5 rounded-xl border bg-amber-400 border-amber-300 text-slate-900 flex items-center gap-4 animate-in fade-in duration-500 shadow-sm">
             <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center shrink-0">
               <AlertTriangle size={18} />
             </div>
             <div className="flex-1 min-w-0">
               <h3 className="text-xs font-bold uppercase tracking-tight leading-none truncate">
                 Subscription Ending Soon
               </h3>
               <p className="text-[10px] font-semibold opacity-90 mt-1 truncate">
                 Sync anomaly: Your plan expires in {planStatus.remainingDays} days. Visit settings to renew.
               </p>
             </div>
             <Link 
               to="/settings?tab=Subscription" 
               className="px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-sm shrink-0 bg-slate-900 text-white"
             >
               Renew Protocol
             </Link>
           </div>
        )}

        {/* 📋 Expired Lockout Banner */}
        {planStatus && planStatus.status === 'expired' && (
           <div className="mb-4 p-3.5 rounded-xl border bg-rose-600 border-rose-500 text-white flex items-center gap-4 animate-in fade-in duration-500 shadow-sm">
             <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
               <AlertTriangle size={18} />
             </div>
             <div className="flex-1 min-w-0">
               <h3 className="text-xs font-bold uppercase tracking-tight leading-none truncate">
                 Infrastructure Suspended
               </h3>
               <p className="text-[10px] font-semibold opacity-90 mt-1 truncate">
                 Critical failure: Nexus protocol halted. Restore billing to resume operations.
               </p>
             </div>
             <Link 
               to="/settings?tab=Subscription" 
               className="px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-sm shrink-0 bg-white text-rose-600"
             >
               Configure
             </Link>
           </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 z-10">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 shrink-0">
              <Zap size={24} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight leading-tight font-inter">Dashboard Overview</h1>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-0.5 uppercase tracking-widest font-inter">Live Business Telemetry</p>
            </div>
          </div>
          <button onClick={() => fetchDashboard(true)} disabled={refreshing} className={`flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-50 text-slate-500 rounded-xl hover:text-indigo-600 border border-slate-100 transition-all ${refreshing ? 'opacity-50' : 'hover:bg-indigo-50 hover:border-indigo-100'}`}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span className="text-[10px] font-semibold uppercase tracking-widest">{refreshing ? 'Syncing...' : 'Refresh Nodes'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-0.5">
        <StatCard 
          label="TODAY SALES" 
          value={`₹${(data?.todaySales?.total || 0).toLocaleString()}`} 
          icon={Zap} 
          color="indigo" 
          sub={`${(data?.todaySales?.comparison || 0).toFixed(1)}% vs yesterday`} 
        />
        <StatCard 
          label="MONTHLY REVENUE" 
          value={`₹${(data?.monthlySales?.total || 0).toLocaleString()}`} 
          icon={TrendingUp} 
          color="emerald" 
          sub={`${(data?.monthlySales?.comparison || 0).toFixed(1)}% vs last month`} 
        />
        <StatCard 
          label="MONTHLY INVOICES" 
          value={`${data?.monthlySales?.count || 0}`} 
          icon={FileText} 
          color="amber" 
          sub="COMPLETED NODES" 
        />
        <Link to="/inventory" state={{ alarmFocus: true }} className="h-full transition-transform active:scale-95">
          <StatCard label="ALERT ITEMS" value={`${data?.lowStockCount || 0}`} icon={AlertCircle} color="rose" sub="CRITICAL INTERVENTION" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-3">
        <div className="lg:col-span-6 bg-white p-3 md:p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold font-inter text-slate-900 uppercase tracking-tight">Revenue Flow</h2>
              <p className="text-sm font-normal font-inter text-slate-500">Weekly revenue trend analysis</p>
            </div>
            <div className="px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-xl">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
          <div className="w-full h-[350px] relative mt-2">
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }} 
                  interval={0}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }}
                  dx={-10}
                />
                <Tooltip 
                  cursor={false}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 700, fontSize: 10, fontFamily: 'Inter' }} 
                />
                <Bar 
                  dataKey="revenue" 
                  radius={[6, 6, 0, 0]} 
                  barSize={24}
                  activeBar={{ fill: '#3730A3', stroke: '#4F46E5', strokeWidth: 1 }}
                >
                  {chartData.map((entry: any, index: number) => {
                    const revenues = chartData.map((d: any) => d.revenue);
                    const maxRev = Math.max(...revenues);
                    const minRev = Math.min(...revenues.filter((r: number) => r > 0));
                    
                    // Priority Coloring Protocol
                    let color = '#e2e8f0'; // Default Slate
                    if (index === chartData.length - 1) color = '#4F46E5'; // Today (Deep Indigo)
                    else if (entry.revenue === maxRev && maxRev > 0) color = '#6366F1'; // Maximum (Bright Indigo)
                    else if (entry.revenue === 0) color = '#CBD5E1'; // Zero Revenue (Light Slate)
                    else if (entry.revenue === minRev && minRev > 0) color = '#94A3B8'; // Minimum (Medium Slate)
                    
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-3">
          <div className="bg-slate-900 p-5 rounded-2xl border-2 border-slate-800 shadow-xl text-white relative overflow-hidden">
            <p className="text-indigo-400 text-[10px] font-semibold font-inter uppercase tracking-[0.2em] mb-2">GST Liability Node</p>
            <h2 className="text-white text-2xl font-semibold font-inter">₹ {(data?.gstPayableThisMonth || 0).toLocaleString('en-IN')}</h2>
            <p className="text-indigo-200 text-sm font-inter mt-3 opacity-90">Estimated liability this month</p>
            <FileText size={100} className="absolute -right-2 -bottom-2 opacity-5 scale-110 rotate-12" />
          </div>



          <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-slate-200 flex justify-between items-center group">
            <div>
              <p className="text-slate-400 text-[10px] font-semibold font-inter uppercase tracking-widest mb-1">PERSONNEL NODES</p>
              <h3 className="text-xl font-semibold font-inter text-slate-900">{data?.staffCount ?? '—'}</h3>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Users size={18} /></div>
          </div>

          {data?.lowStockProducts?.length ? (
            <div className="bg-rose-50/50 border-2 border-rose-100 p-4 rounded-2xl shadow-sm shadow-rose-500/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
                  <p className="text-[10px] font-bold font-inter text-rose-700 uppercase tracking-widest leading-none">Alert Items (Action Required)</p>
                </div>
                <AlertCircle size={14} className="text-rose-500 animate-pulse" />
              </div>
              <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                {data.lowStockProducts.map(p => (
                  <div key={p._id} className="flex justify-between items-center text-[11px] font-semibold font-inter text-slate-800 uppercase tracking-tight p-3 border-b-2 border-rose-100/50 hover:bg-rose-100/30 transition-all duration-300 last:border-0 leading-none cursor-pointer">
                    <span className="truncate max-w-[150px]">{p.name}</span>
                    <div className="flex items-center gap-2">
                       <span className="text-rose-600 bg-white border border-rose-100 px-2 py-0.5 rounded text-[8px]">STOCK: {p.stock}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/50 border-2 border-emerald-100 p-4 rounded-2xl flex items-center gap-3">
               <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle2 size={16} />
               </div>
               <div>
                  <p className="text-[10px] font-semibold font-inter text-emerald-700 uppercase tracking-widest leading-none">All Nodes Stable</p>
                  <p className="text-[8px] font-bold font-inter text-emerald-600/60 uppercase mt-1">Zero critical alerts</p>
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-3">
        <div className="lg:col-span-6 bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold font-inter text-slate-400 uppercase tracking-[0.2em]">Recent Invoices</h2>
            <div className="flex items-center gap-1.5">
              {['all', 'paid', 'unpaid'].map(f => (
                <button key={f} onClick={() => setInvoiceFilter(f)} className={`px-2 py-0.5 rounded text-[8px] font-semibold uppercase tracking-widest transition-all ${invoiceFilter === f ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}>{f}</button>
              ))}
            </div>
          </div>
          <div className="h-[500px] overflow-auto custom-scrollbar">
            <table className="w-full text-left min-w-[600px]">
              <thead className="sticky top-0 bg-white z-10 border-b border-slate-50">
                <tr className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="px-6 py-4 text-center min-w-[100px]">ID / Ref</th>
                  <th className="px-6 py-4 min-w-[150px]">Customer</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map(inv => (
                  <tr key={inv._id} onClick={() => setSelectedInvoice(inv)} className="hover:bg-indigo-50/50 transition-all duration-200 cursor-pointer group border-b-2 border-slate-100 last:border-0">
                    <td className="px-6 py-4 text-center font-inter">
                       <span className="text-[10px] font-semibold text-indigo-600 uppercase leading-none block">{inv.transactionId}</span>
                       <span className="text-[8px] font-bold text-slate-300 uppercase mt-0.5 block">{inv.invoiceNumber}</span>
                    </td>
                    <td className="px-6 py-4"><span className="text-xs font-semibold text-slate-900">{inv.customerName || 'Walk-in Client'}</span></td>
                    <td className="px-6 py-4"><span className="text-sm font-semibold text-slate-900">₹ {(inv.grandTotal || inv.totalAmount || 0).toLocaleString('en-IN')}</span></td>
                    <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-widest border ${inv.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{inv.paymentStatus}</span></td>
                    <td className="px-6 py-4"><span className="text-[10px] font-medium text-slate-400">{new Date(inv.createdAt).toLocaleDateString()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col">
          <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-5">Top Selling Products</h2>
          <div className="h-[500px] overflow-y-auto custom-scrollbar pr-2 space-y-4">
            {(data?.topProducts || []).map((prod, i) => {
              const topRevenue = data?.topProducts?.[0]?.totalRevenue || 1;
              const pct = (prod.totalRevenue / topRevenue) * 100;
              return (
                <div key={i} className="space-y-2 group">
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col"><span className="text-[13px] font-semibold font-inter text-slate-900 uppercase tracking-tight truncate max-w-[150px]">{prod.name}</span><span className="text-[10px] font-semibold font-inter text-slate-400 uppercase tracking-widest opacity-80 mt-1">Performance Node</span></div>
                    <div className="text-right"><span className="text-sm font-semibold font-inter text-slate-900">₹ {prod.totalRevenue.toLocaleString('en-IN')}</span><p className="text-[9px] font-medium font-inter text-slate-400 uppercase tracking-widest mt-1">Revenue</p></div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-900 group-hover:bg-indigo-600 transition-all duration-1000" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity — Full-Width Forensic Ledger */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden flex flex-col font-inter mt-3">
         <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold text-slate-800 uppercase tracking-[0.2em]">Recent Activity</h2>
            <div className="flex items-center gap-2">
               <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">Live Registry Status</span>
               <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            </div>
         </div>
         <div className="p-0 max-h-[500px] overflow-y-auto custom-scrollbar">
            {data?.recentActivities?.length ? data.recentActivities.map((activity, idx) => (
               <div key={idx} className="flex items-center gap-6 px-6 py-5 border-b-2 border-slate-50 hover:bg-indigo-50/30 transition-all hover:pl-8 group">
                  <div className={`p-2 rounded-xl shrink-0 ${activity.action === 'DELETE' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                     {ACTION_ICONS[activity.action] ? React.createElement(ACTION_ICONS[activity.action], { size: 16 }) : <RefreshCw size={16} />}
                  </div>
                  
                  <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                     <div className="lg:col-span-2">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border whitespace-nowrap min-w-[90px] text-center ${activity.action === 'DELETE' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                           {activity.action}
                        </span>
                     </div>
                     <div className="lg:col-span-6">
                        <p className="text-[11px] font-semibold text-slate-800 uppercase leading-none tracking-tight truncate" title={activity.description}>{activity.description}</p>
                     </div>
                     <div className="lg:col-span-2">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right lg:text-left truncate">{activity.userName}</p>
                     </div>
                     <div className="lg:col-span-2 text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter whitespace-nowrap">
                           {new Date(activity.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                     </div>
                  </div>
               </div>
            )) : (
               <div className="py-20 text-center">
                  <p className="text-[10px] text-slate-300 italic uppercase tracking-widest">No Activity Logged in registry</p>
               </div>
            )}
         </div>
      </div>

      <PlanModal isOpen={isPlanModalOpen} onClose={() => setIsPlanModalOpen(false)} currentPlan={currentPlan} />
      <InvoiceModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
    </div>
  );
}

const StatCard = memo(({ label, value, icon: Icon, color, sub }: any) => {
  const colors: any = {
    indigo: 'text-indigo-600 bg-indigo-50/50 border-indigo-100',
    rose: 'text-rose-600 bg-rose-50/50 border-rose-100',
    amber: 'text-amber-600 bg-amber-50/50 border-amber-100',
    emerald: 'text-emerald-600 bg-emerald-50/50 border-emerald-100',
    slate: 'text-slate-500 bg-slate-50/50 border-slate-100',
  };
  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3 transition-all hover:border-indigo-200 group relative overflow-hidden h-full">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${colors[color]} border shadow-sm`}><Icon className="w-3.5 h-3.5" /></div>
      <div className="min-w-0 text-center sm:text-left flex-1">
        <p className="text-[9px] font-semibold font-inter text-slate-400 uppercase tracking-widest leading-none mb-1.5 whitespace-nowrap overflow-hidden text-ellipsis">{label}</p>
        <h3 className="text-lg sm:text-xl font-semibold font-inter text-slate-900 leading-tight truncate" title={value}>{value}</h3>
        {sub && <p className={`mt-1.5 text-[8px] font-semibold font-inter uppercase tracking-tighter ${color === 'rose' ? 'text-rose-500' : 'text-emerald-600'} truncate`}>{sub}</p>}
      </div>
    </div>
  );
});

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-4">
      <div className="h-12 bg-slate-200 rounded-2xl w-1/4" />
      <div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-2xl" />)}</div>
      <div className="grid grid-cols-10 gap-4"><div className="col-span-6 h-80 bg-slate-100 rounded-2xl" /><div className="col-span-4 h-80 bg-slate-100 rounded-2xl" /></div>
    </div>
  );
}
