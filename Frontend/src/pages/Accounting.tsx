import { useState, useEffect, useCallback, memo } from 'react';
import {
  Wallet, RefreshCcw, TrendingUp,
  CheckCircle, Clock
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

  const fetchAll = useCallback(async () => {
    // Only set loading if we don't have data yet to prevent frequent blinking
    if (invoices.length === 0) setLoading(true); 
    
    try {
      const [invRes, salesRes] = await Promise.all([
        api.get('/invoices?limit=50'),
        api.get('/reports/sales')
      ]);

      const allInvoices: LedgerEntry[] = invRes.data?.data || [];
      
      // Batch updates together
      const totalRevenue = allInvoices.reduce((s, i) => s + i.grandTotal, 0);
      const paidAmount = allInvoices.filter(i => i.paymentStatus === 'paid').reduce((s, i) => s + i.grandTotal, 0);
      const pendingAmount = allInvoices.filter(i => i.paymentStatus === 'pending').reduce((s, i) => s + i.grandTotal, 0);
      const cashIn = allInvoices.filter(i => i.paymentMethod === 'cash' && i.paymentStatus === 'paid').reduce((s, i) => s + i.grandTotal, 0);
      
      const salesData = salesRes.data?.data?.dailySales || [];
      const trend = salesData.slice(-14).map((d: any) => ({
        date: new Date(d._id).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        revenue: d.totalSales || 0
      }));

      const methods: Record<string, number> = {};
      allInvoices.forEach(i => {
        if (i.paymentStatus === 'paid') {
          methods[i.paymentMethod] = (methods[i.paymentMethod] || 0) + i.grandTotal;
        }
      });
      const methArr = Object.entries(methods).map(([name, value]) => ({ name: name.toUpperCase(), value }));

      // Set all at once to minimize re-renders
      setInvoices(allInvoices);
      setStats({ totalRevenue, paidAmount, pendingAmount, cashIn });
      setChartData(trend);
      setMethodData(methArr);
    } catch (err) {
      console.error('Accounting Sync Error:', err);
    } finally {
      setLoading(false);
    }
  }, [invoices.length]);

  useEffect(() => { 
    fetchAll(); 
    
    const syncChannel = new BroadcastChannel('nexus_sync');
    const handleSync = (event: any) => {
      if (event.data === 'SYNC_PURCHASES' || event.data === 'SYNC_PARTIES') {
        fetchAll();
      }
    };
    syncChannel.addEventListener('message', handleSync);

    return () => {
      syncChannel.removeEventListener('message', handleSync);
      syncChannel.close();
    };
  }, [fetchAll]);

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.paymentStatus === filter);
  const displayedLedger = showAllLedger ? filtered : filtered.slice(0, LIMIT);
  const METHOD_COLORS: Record<string, string> = { CASH: '#6366f1', UPI: '#10b981', CARD: '#f59e0b', ONLINE: '#8b5cf6' };

  return (
    <div className="space-y-4 min-h-screen p-1 sm:p-2">
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
        <AccountingStat label="TOTAL REVENUE" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={TrendingUp} color="rose" />
        <AccountingStat label="PAID AMOUNT" value={`₹${stats.paidAmount.toLocaleString()}`} icon={CheckCircle} color="amber" />
        <AccountingStat label="PENDING DUES" value={`₹${stats.pendingAmount.toLocaleString()}`} icon={Clock} color="amber" />
        <AccountingStat label="CASH IN HAND" value={`₹${stats.cashIn.toLocaleString()}`} icon={Wallet} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-[360px] overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Revenue Trend</h2>
          {chartData.length > 0 && !loading ? (
            <div className="flex-1 w-full h-[250px]">
              <ResponsiveContainer width="100%" height={260} minWidth={0}>
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
            <div className="h-full flex items-center justify-center text-slate-200 text-[10px] font-black uppercase tracking-widest animate-pulse">Synchronizing Data Nodes...</div>
          )}
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-[360px] overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Payment Methods</h2>
          {methodData.length > 0 && !loading ? (
            <div className="flex-1 w-full h-[250px]">
              <ResponsiveContainer width="100%" height={260} minWidth={0}>
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
            <div className="h-full flex items-center justify-center text-slate-200 text-[10px] font-black uppercase tracking-widest animate-pulse">Syncing Nodes...</div>
          )}
        </div>
      </div>

      <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-4">
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
          <div className="flex flex-col">
            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-slate-50">
              {displayedLedger.length === 0 ? (
                <div className="py-20 text-center text-slate-200 font-semibold uppercase text-xs tracking-widest">No transactions filed</div>
              ) : (
                displayedLedger.map(inv => (
                  <div key={inv._id} onClick={() => setSelectedInvoice(inv)} className="p-4 active:bg-slate-50 transition-colors flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{inv.invoiceNumber || 'NO_ID'}</span>
                         <span className="text-sm font-semibold text-slate-900 truncate max-w-[150px]">{inv.customerName || 'Walk-in Client'}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        inv.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                        {inv.paymentStatus}
                      </span>
                    </div>
                    <div className="flex justify-between items-end border-t border-slate-50 pt-3">
                       <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Protocol</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-[8px] font-black uppercase rounded-lg text-slate-500 border border-slate-200 w-fit">
                            {inv.paymentMethod.toUpperCase()}
                          </span>
                       </div>
                       <div className="text-right">
                          <p className="text-[8px] font-semibold text-slate-300 uppercase tracking-widest mb-0.5">Settled Amount</p>
                          <p className="text-lg font-semibold text-slate-900 tracking-tighter">₹ {(Number(inv.grandTotal || 0)).toLocaleString('en-IN')}</p>
                       </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left table-fixed min-w-[900px]">
                <thead>
                  <tr className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-4 w-[25%]">INVOICE NO</th>
                    <th className="px-6 py-4 w-[25%]">CUSTOMER</th>
                    <th className="px-6 py-4 w-[15%]">METHOD</th>
                    <th className="px-6 py-4 w-[12%] text-center">STATUS</th>
                    <th className="px-6 py-4 w-[10%]">DATE</th>
                    <th className="px-6 py-4 w-[13%] text-right">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayedLedger.length === 0 ? (
                    <tr><td colSpan={6} className="py-20 text-center text-slate-200 font-semibold uppercase text-xs tracking-widest">No transactions filed</td></tr>
                  ) : displayedLedger.map(inv => (
                    <tr key={inv._id} onClick={() => setSelectedInvoice(inv)} className="hover:bg-slate-50/80 transition-all cursor-pointer group border-b border-slate-50 last:border-0">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-widest">
                            {inv.invoiceNumber || '—'}
                          </span>
                          <span className="text-[9px] font-semibold text-slate-400 mt-1 uppercase tracking-widest">
                            Audit Log Linked
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-widest">{inv.customerName || 'Walk-in'}</span>
                          <span className="text-[9px] font-semibold text-slate-400 mt-1 uppercase tracking-widest">Business Entity</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <span className="px-2 py-0.5 bg-slate-100 text-[8px] font-black uppercase rounded-lg text-slate-500 border border-slate-200">
                            {inv.paymentMethod.toUpperCase()}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase border transition-all ${
                          inv.paymentStatus === 'paid' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                          {inv.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                         <p className="text-[10px] font-semibold text-slate-900 uppercase">
                           {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                         </p>
                         <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">Registered</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <p className="text-base font-semibold text-slate-900">₹ {(Number(inv.grandTotal || 0)).toLocaleString('en-IN')}</p>
                         <p className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.1em] mt-0.5">Settled Amt</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

const AccountingStat = memo(({ label, value, icon: Icon, color, sub }: any) => {
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
});



