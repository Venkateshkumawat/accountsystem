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

  useEffect(() => { fetchAll(); }, []);

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

      // Daily revenue trend from reports
      const salesData = salesRes.data?.data?.dailySales || [];
      setChartData(salesData.slice(-14).map((d: any) => ({
        date: new Date(d._id).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        revenue: d.totalSales || 0
      })));

      // Payment method breakdown
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
  const [showAllLedger, setShowAllLedger] = useState(false);
  const LIMIT = 10;
  const displayedLedger = showAllLedger ? filtered : filtered.slice(0, LIMIT);


  const METHOD_COLORS: Record<string, string> = { CASH: '#6366f1', UPI: '#10b981', CARD: '#f59e0b', ONLINE: '#8b5cf6' };

  return (
    <div className="space-y-6  min-h-screen p-2">
      {/* Header with Subheader Bar */}
      <div className="flex flex-col gap-4">
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-50/50 rounded-full border border-emerald-100 self-start ml-2 shadow-sm shadow-emerald-100/20">
          <Zap size={12} className="text-emerald-600 fill-emerald-600" />
          <span className="text-[9px] font-black text-emerald-900/60 uppercase tracking-[0.2em]">Nexus Fiscal Ledger</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter">Financial Protocol</h1>
            <p className="text-slate-500 font-bold text-[10px] mt-0.5 uppercase tracking-widest">Real-time ledger & revenue analytics.</p>
          </div>
          <button onClick={fetchAll} className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95">
            <RefreshCcw size={14} /> Sync Ledger
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2">
        <StatCard label="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={TrendingUp} color="indigo" sub="All time" />
        <StatCard label="Received" value={`₹${stats.paidAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={CheckCircle} color="emerald" sub="Paid" />
        <StatCard label="Outstanding" value={`₹${stats.pendingAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={Clock} color="amber" sub="Pending" />
        <StatCard label="Cash Box" value={`₹${stats.cashIn.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={Wallet} color="rose" sub="Cash only" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col h-[320px]">
          <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3">Revenue Projection Trend</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 900 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 900 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} contentStyle={{ fontSize: 10, fontWeight: 900, borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-slate-200 text-[10px] font-black uppercase">No data yet</div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col h-[320px]">
          <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3">Collection Mix</h3>
          {methodData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={methodData} barSize={20}>
                <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 900 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, '']} contentStyle={{ fontSize: 10, fontWeight: 900, borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {methodData.map((entry) => (
                    <Cell key={entry.name} fill={METHOD_COLORS[entry.name] || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-slate-200 text-[10px] font-black uppercase">No data yet</div>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden mx-2 mt-4">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Transaction Deep-Scan</h3>
          <div className="flex gap-1.5">
            {(['all', 'paid', 'pending'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-sm ${filter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="py-12 text-center text-slate-300 font-black uppercase text-[10px] tracking-[0.2em] animate-pulse">Scanning Nodes...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50">
                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none border-b border-slate-100">
                  <th className="px-6 py-3">Invoice Node</th>
                  <th className="px-6 py-3">Counterparty</th>
                  <th className="px-6 py-3">Protocol</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Balance</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayedLedger.length === 0 ? (
                  <tr><td colSpan={7} className="py-20 text-center text-slate-300 font-black uppercase text-sm">No entries found</td></tr>
                ) : displayedLedger.map(inv => (
                  <tr key={inv._id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 leading-none">
                    <td className="px-6 py-2.5 text-[10px] font-black text-indigo-600">{inv.invoiceNumber || '—'}</td>
                    <td className="px-6 py-2.5 text-[10px] font-bold text-slate-800 uppercase">{inv.customerName || 'Walk-in'}</td>
                    <td className="px-6 py-2.5">
                      <span className="px-1.5 py-0.5 bg-slate-50 border border-slate-100 text-[8px] font-black uppercase tracking-widest text-slate-500 rounded">
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-2.5">
                      <span className={`flex items-center gap-1 w-fit px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase border ${inv.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        <div className={`w-1 h-1 rounded-full ${inv.paymentStatus === 'paid' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 text-[9px] font-bold text-slate-400">
                      {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-6 py-2.5 text-[11px] font-black text-slate-900">₹{inv.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="px-6 py-2.5 text-right">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"
                      >
                        <FileText size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > LIMIT && (
          <div className="p-4 bg-slate-50/50 border-t border-slate-50 text-center">
            <button
              onClick={() => setShowAllLedger(!showAllLedger)}
              className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition"
            >
              {showAllLedger ? 'Collapse Ledger' : `See All Transactions (${filtered.length})`}
            </button>
          </div>
        )}

      </div>

      {/* ── Invoice Modal ─────────────────────────────────────────────────── */}
      <InvoiceModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  const c: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-600',
    rose: 'bg-rose-50 border-rose-100 text-rose-600',
  };
  return (
    <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm relative group bg-white">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${c[color]} mb-3 shadow-sm`}>
        <Icon size={14} />
      </div>
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-lg font-black text-slate-900 tracking-tighter leading-none">{value}</h3>
      <p className="text-[8px] font-bold text-slate-300 mt-1 uppercase leading-none">{sub}</p>
    </div>
  );
}
