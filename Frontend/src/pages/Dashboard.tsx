import { useState, useEffect, useMemo, useCallback } from 'react';
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
}

const ACTIVITY_LIMIT = 3;

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessName, setBusinessName] = useState('');

  // Activity & Invoices state
  const [activityFilter, setActivityFilter] = useState<string>('ALL');
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [invoiceFilter, setInvoiceFilter] = useState<string>('all');
  const [showAllInvoices, setShowAllInvoices] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const INVOICE_LIMIT = 10;

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const res = await api.get('/dashboard');
      setData(res.data.data);
      
      const rawUser = localStorage.getItem('user');
      const user = rawUser && rawUser !== 'undefined' ? JSON.parse(rawUser) : {};
      if (user.name) setBusinessName(user.name.split(' ')[0]);

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

    socketService.on('DATA_SYNC', handleDataSync);

    // ── Cross-Tab Sync ──
    const syncChannel = new BroadcastChannel('nexus_sync');
    syncChannel.onmessage = (event) => {
      if (event.data === 'FETCH_PRODUCTS' || event.data === 'FETCH_DASHBOARD') {
        fetchDashboard(true);
      }
    };

    return () => {
      socketService.off('DATA_SYNC', handleDataSync);
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
      <div className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm overflow-hidden relative">
        <div className="flex items-center gap-3 z-10">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Zap size={24} fill="currentColor" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tighter leading-tight">Welcome, {businessName || 'Admin'}</h1>
            <p className="text-slate-400 font-bold text-[9px] mt-0.5 flex items-center gap-1.5 uppercase tracking-widest">
              <CheckCircle2 size={10} className="text-emerald-500" />
              Nexus Sync Active
            </p>
          </div>
        </div>
        <div className="flex gap-3 z-10 w-full md:w-auto">
          <div className="flex gap-2">
            <button
              onClick={() => fetchDashboard(true)}
              disabled={refreshing}
              title="Refreshed Sync Nodes"
              className={`p-2.5 bg-slate-50 text-slate-400 rounded-lg hover:text-indigo-600 transition-all active:scale-90 ${refreshing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-indigo-50'}`}
            >
              <RefreshCw size={16} className={`${refreshing ? 'animate-spin' : 'hover:rotate-180 transition-transform duration-500'}`} />
            </button>
          </div>
        </div>

      </div>

      {/* ── Stat Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 px-1">
        <StatCard label="Today Flow" value={`₹${(data?.todaySales.total || 0).toLocaleString()}`} sub={`${data?.todaySales.count || 0} nodes`} icon={IndianRupee} color="indigo" trend="+12%" />
        <StatCard label="Month Volume" value={`₹${(data?.monthlySales || 0).toLocaleString()}`} sub="Current revenue" icon={TrendingUp} color="emerald" trend="+8%" />
        <StatCard label="Settled Node" value={data?.monthlyCount || 0} sub="This month" icon={FileText} color="amber" />
        <Link to="/inventory?filter=low-stock">
          <StatCard label="Critical SKU" value={data?.lowStockCount || 0} sub="Needs re-stock" icon={AlertTriangle}
            color={data?.lowStockCount && data.lowStockCount > 0 ? 'rose' : 'slate'}
            isAlert={!!(data?.lowStockCount && data.lowStockCount > 0)} />
        </Link>
      </div>

      {/* ── Chart + Secondary Stats ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-3">
        <div className="lg:col-span-6 bg-white p-3 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none underline decoration-indigo-200 underline-offset-4">Settled revenue flow</h3>
              <p className="text-[8px] font-black text-slate-400 mt-1 uppercase tracking-tighter leading-none">Weekly Node Discovery</p>
            </div>
            <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 shadow-sm uppercase tracking-widest">Global Protocol</span>
          </div>
          <div className="h-[250px] w-full min-h-[250px] mt-2">
            {(!chartData || chartData.length === 0) ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">NODATA_SYNC</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 8, fontWeight: 900 }} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 8, fontWeight: 900 }} />
                  <Tooltip cursor={{ fill: '#F8FAFC' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 900, fontSize: 10, background: '#fff' }} />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]} barSize={32}>
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
              <p className="text-indigo-400 text-[8px] font-black uppercase tracking-widest mb-1 leading-none">GST Liability Node</p>
              <h2 className="text-2xl font-black tracking-tight leading-none">₹{(data?.gstPayableThisMonth || 0).toLocaleString()}</h2>
              <div className="flex items-center gap-1.5 text-indigo-400 text-[9px] font-black uppercase mt-3 leading-none">
                <FileText size={10} /> Estimated liability
              </div>
            </div>
            <div className="absolute -right-2 -bottom-2 opacity-5 scale-110 rotate-12">
              <FileText size={100} />
            </div>
          </div>

          {/* Mini stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm transition-all hover:bg-indigo-50/30 group">
              <Users className="text-indigo-600 mb-1.5 group-hover:scale-110 transition-transform" size={14} />
              <p className="text-slate-400 text-[7px] font-black uppercase tracking-widest mb-0.5">Personnel Nodes</p>
              <h3 className="text-lg font-black text-slate-900 leading-none">{data?.staffCount ?? '—'}</h3>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm transition-all hover:bg-emerald-50/30 group">
              <Package className="text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" size={14} />
              <p className="text-slate-400 text-[7px] font-black uppercase tracking-widest mb-0.5">Product SKU Nodes</p>
              <h3 className="text-lg font-black text-slate-900 leading-none">{data?.productCount ?? '—'}</h3>
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
                    <span className="truncate max-w-[120px]">{p.name}</span>
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
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">Node Ledger Protocol</h3>
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
                  <tr className="text-slate-400 font-black uppercase tracking-widest text-[8px] border-b border-slate-100">
                    <th className="px-5 py-2">ID Node</th>
                    <th className="px-5 py-2">Counterparty</th>
                    <th className="px-5 py-2">Value</th>
                    <th className="px-5 py-2">Flow</th>
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
        <div className="lg:col-span-4 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-900 mb-5 uppercase tracking-widest">Top Product Nodes</h3>
          {(data?.topProducts?.length || 0) === 0 ? (
            <div className="py-8 text-center">
              <Package size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 font-bold text-sm">No sales data yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data?.topProducts.map((prod, i) => {
                const max = data.topProducts[0]?.totalRevenue || 1;
                const pct = (prod.totalRevenue / max) * 100;
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="font-bold text-slate-700 truncate">{prod.name}</span>
                      <span className="font-black text-slate-900 ml-2">₹{prod.totalRevenue?.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Activity Stream ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Activity Stream</h3>
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
                        <span className="text-[9px] font-bold text-slate-400">{act.userName}</span>
                        <span className="text-slate-200">·</span>
                        <span className="text-[9px] font-bold text-slate-400">
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
function StatCard({ label, value, sub, icon: Icon, color, isAlert, trend }: any) {
  const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'ring-indigo-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-100' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-500', ring: 'ring-slate-100' },
  };
  const s = colorMap[color] || colorMap.indigo;
  return (
    <div className={`bg-white px-5 py-4 rounded-xl border ${isAlert ? 'border-rose-200 bg-rose-50/10' : 'border-slate-100'} shadow-sm hover:shadow-md hover:scale-[1.03] active:scale-95 transition-all group flex flex-col justify-center min-h-[100px] relative overflow-hidden animate-in fade-in zoom-in-95 duration-500`}>
      <div className="flex items-center justify-between relative z-10 mb-2">
        <div className={`p-2 rounded-xl ${s.bg} ${s.text} bg-white shadow-sm ring-1 ring-slate-100`}>
          <Icon size={14} />
        </div>
        {trend && (
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{trend}</span>
        )}
      </div>
      <div>
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h3 className={`text-xl font-black tracking-tight ${isAlert ? 'text-rose-600' : 'text-slate-900'} leading-none`}>{value}</h3>
        <p className="text-[9px] font-bold text-slate-400 mt-1.5">{sub}</p>
      </div>
    </div>
  );
}

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
