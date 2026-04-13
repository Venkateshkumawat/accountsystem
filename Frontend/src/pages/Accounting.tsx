import { useState, useEffect } from 'react';
import {
  Wallet, RefreshCcw, TrendingUp,
  FileText, CheckCircle, Clock, Zap
} from 'lucide-react';
import api from '../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid } from 'recharts';
import InvoiceModal from '../components/InvoiceModal';

interface LedgerEntry {
  _id: string;
  invoiceNumber?: string;
  customerName?: string;
  grandTotal: number;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
}

export default function Accounting() {
  const [invoices, setInvoices] = useState<LedgerEntry[]>([]);
  const [stats, setStats] = useState({ totalRevenue: 0, paidAmount: 0, pendingAmount: 0, cashIn: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [methodData, setMethodData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [showAllLedger, setShowAllLedger] = useState(false);
  const LIMIT = 5;

  useEffect(() => { 
    fetchAll(); 
    
    // ── Cross-Tab Sync ──
    const syncChannel = new BroadcastChannel('nexus_sync');
    const handleSync = (event: any) => {
      // Invoices or Dashboard updates affect accounting
      if (event.data === 'FETCH_DASHBOARD' || event.data === 'SYNC_PARTIES') {
        fetchAll();
      }
    };
    syncChannel.addEventListener('message', handleSync);

    return () => {
      syncChannel.removeEventListener('message', handleSync);
      syncChannel.close();
    };
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [invRes, salesRes] = await Promise.all([
        api.get('/invoices?limit=50'),
        api.get('/reports/sales')
      ]);

      const allInvoices: LedgerEntry[] = invRes.data?.data || [];
      setInvoices(allInvoices);

      const totalRevenue = allInvoices.reduce((s, i) => s + i.grandTotal, 0);
      const paidAmount = allInvoices.filter(i => i.paymentStatus === 'paid').reduce((s, i) => s + i.grandTotal, 0);
      const pendingAmount = allInvoices.filter(i => i.paymentStatus === 'pending').reduce((s, i) => s + i.grandTotal, 0);
      const cashIn = allInvoices.filter(i => i.paymentMethod === 'cash' && i.paymentStatus === 'paid').reduce((s, i) => s + i.grandTotal, 0);
      setStats({ totalRevenue, paidAmount, pendingAmount, cashIn });

      // Daily revenue trend
      const salesData = salesRes.data?.data?.dailySales || [];
      setChartData(salesData.slice(-14).map((d: any) => ({
        date: new Date(d._id).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        revenue: d.totalSales || 0
      })));

      // Payment method
      const methods: Record<string, number> = {};
      allInvoices.forEach(i => {
        if (i.paymentStatus === 'paid') {
          methods[i.paymentMethod] = (methods[i.paymentMethod] || 0) + i.grandTotal;
        }
      });
      setMethodData(Object.entries(methods).map(([name, value]) => ({ name: name.toUpperCase(), value })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.paymentStatus === filter);
  const displayedLedger = showAllLedger ? filtered : filtered.slice(0, LIMIT);

  const METHOD_COLORS: Record<string, string> = { CASH: '#6366f1', UPI: '#10b981', CARD: '#f59e0b', ONLINE: '#8b5cf6' };

  return (
    <div className="space-y-4  min-h-screen p-1 sm:p-2">
      {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Accounts & Ledger</h1>
            <p className="text-sm font-normal text-slate-500 mt-1">Financial reports, receivables and payment settlement tracking</p>
          </div>
          <button onClick={fetchAll} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95">
            <RefreshCcw size={14} /> Refresh Ledger
          </button>
        </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2">
        <AccountingStat label="TOTAL REVENUE" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={TrendingUp} color="indigo" trend="+12.5%" />
        <AccountingStat label="PAID AMOUNT" value={`₹${stats.paidAmount.toLocaleString()}`} icon={CheckCircle} color="emerald" trend="+8.2%" />
        <AccountingStat label="PENDING DUES" value={`₹${stats.pendingAmount.toLocaleString()}`} icon={Clock} color="amber" trend="-3.1%" trendColor="text-rose-500" />
        <AccountingStat label="CASH IN HAND" value={`₹${stats.cashIn.toLocaleString()}`} icon={Wallet} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col h-[360px]">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Revenue Trend</h2>
          {chartData.length > 0 && !loading ? (
            <div className="flex-1 w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="date" tick={{ fontFamily: "Inter", fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontFamily: "Inter", fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} contentStyle={{ fontFamily: "Inter", fontSize: 10, fontWeight: 900, borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }} />
              </LineChart>
            </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-200 text-[10px] font-black uppercase">No data sync</div>
          )}
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col h-[360px]">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Payment Methods</h2>
          {methodData.length > 0 && !loading ? (
             <div className="flex-1 w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
              <BarChart data={methodData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="name" tick={{ fontFamily: "Inter", fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, '']} contentStyle={{ fontFamily: "Inter", fontSize: 10, fontWeight: 900, borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {methodData.map((entry) => (
                    <Cell key={entry.name} fill={METHOD_COLORS[entry.name] || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-200 text-[10px] font-black uppercase">No data sync</div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden mt-4">
        <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Transaction History</h2>
          <div className="flex gap-2">
            {(['all', 'paid', 'pending'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all ${filter === f ? 'bg-slate-900 text-white shadow-lg shadow-slate-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="py-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-[0.2em] animate-pulse">Scanning Nodes...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-4">Invoice No</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayedLedger.length === 0 ? (
                  <tr><td colSpan={6} className="py-20 text-center text-slate-200 font-semibold uppercase text-xs tracking-widest">No transactions filed</td></tr>
                ) : displayedLedger.map(inv => (
                  <tr key={inv._id} onClick={() => setSelectedInvoice(inv)} className="hover:bg-slate-50/50 transition-all cursor-pointer group">
                    <td className="px-6 py-4 text-xs font-black text-indigo-600 tracking-tighter group-hover:underline">{inv.invoiceNumber || '—'}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500">{inv.customerName || 'Walk-in'}</td>
                    <td className="px-6 py-4">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${inv.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[10px] font-semibold text-slate-400">
                      {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-black text-slate-900">₹{inv.grandTotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > LIMIT && (
          <div className="p-6 bg-slate-50/30 border-t border-slate-50 text-center">
            <button
              onClick={() => setShowAllLedger(!showAllLedger)}
              className="mx-auto px-8 py-2.5 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 justify-center"
            >
              {showAllLedger ? 'Collapse Ledger' : `See All Transactions (${filtered.length})`}
            </button>
          </div>
        )}
      </div>

      <InvoiceModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}

function AccountingStat({ label, value, icon: Icon, color, trend, trendColor = 'text-emerald-500' }: any) {
  const colorMap: any = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' }
  };
  const s = colorMap[color] || colorMap.indigo;
  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${s.bg} ${s.text}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-xl font-semibold text-slate-900 tracking-tight leading-none">{value}</h3>
        {trend && (
           <p className={`text-[9px] font-semibold mt-1.5 ${trendColor}`}>{trend} <span className="text-slate-400 font-medium whitespace-nowrap">vs last month</span></p>
        )}
      </div>
    </div>
  );
}
