import { useState, useEffect, useCallback, memo } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, Layout, Clock, ShieldCheck, RefreshCcw
} from 'lucide-react';
import api from '../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid } from 'recharts';
import InvoiceModal from '../components/InvoiceModal';

interface LedgerEntry {
  _id: string;
  transactionId?: string;
  invoiceNumber?: string;
  billNumber?: string;
  customerName?: string;
  grandTotal: number;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
}

export default function Accounting() {
  const [invoices, setInvoices] = useState<LedgerEntry[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalRevenue: 0, paidAmount: 0, pendingAmount: 0, cashIn: 0 });
  const [unifiedLedger, setUnifiedLedger] = useState<any[]>([]);
  const [showAllLedger, setShowAllLedger] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [methodData, setMethodData] = useState<any[]>([]);
  const [plData, setPlData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const fetchAll = useCallback(async () => {
    if (invoices.length === 0) setLoading(true); 
    
    try {
      const [invRes, salesRes, plRes, purRes] = await Promise.all([
        api.get('/invoices?limit=50'),
        api.get('/reports/sales'),
        api.get('/reports/pl'),
        api.get('/purchases?limit=50')
      ]);

      const allInvoices: any[] = invRes.data?.data || [];
      const allPurchases: any[] = purRes.data?.data || [];
      
      const unified = [
        ...allInvoices.map(i => ({ ...i, entryType: 'SALE' })),
        ...allPurchases.map(p => ({ ...p, entryType: 'PURCHASE' }))
      ].sort((a, b) => new Date(b.createdAt || b.purchaseDate).getTime() - new Date(a.createdAt || a.purchaseDate).getTime());

      setUnifiedLedger(unified);
      
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
        let m = (i.paymentMethod || 'CASH').toUpperCase();
        if (m === 'UPI') m = 'ONLINE'; // Unified Financial Node
        methods[m] = (methods[m] || 0) + i.grandTotal;
      });
      const methArr = Object.entries(methods).map(([name, value]) => ({ 
        name: name, 
        value 
      })).sort((a, b) => b.value - a.value);

      setInvoices(allInvoices);
      setStats({ totalRevenue, paidAmount, pendingAmount, cashIn });
      setChartData(trend);
      setMethodData(methArr);
      setPlData(plRes.data?.data);
      setPurchases(allPurchases);
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
      const triggers = ['SYNC_PURCHASES', 'SYNC_PARTIES', 'SYNC_INVOICES', 'SYNC_PRODUCTS'];
      if (triggers.includes(event.data)) {
        fetchAll();
      }
    };
    syncChannel.addEventListener('message', handleSync);

    return () => {
      syncChannel.removeEventListener('message', handleSync);
      syncChannel.close();
    };
  }, [fetchAll]);

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
        <AccountingStat label="TOTAL REVENUE" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={TrendingUp} color="emerald" />
        <AccountingStat label="PAID AMOUNT" value={`₹${stats.paidAmount.toLocaleString()}`} icon={ShieldCheck} color="indigo" />
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
          <h2 className="text-lg font-semibold text-slate-800 mb-4 uppercase tracking-tight">Payment Methods</h2>
          {methodData.length > 0 && !loading ? (
            <div className="flex-1 w-full h-[250px]">
              <ResponsiveContainer width="100%" height={260} minWidth={0}>
                <BarChart data={methodData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis dataKey="name" tick={{ fontFamily: "Inter", fontSize: 10, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
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

      <div className="w-full bg-white border-2 border-slate-100 rounded-[2rem] p-4 sm:p-6 shadow-sm my-2 sm:my-4 overflow-hidden">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-8 px-2 sm:px-0">
            <div>
               <h2 className="text-lg lg:text-xl font-semibold text-slate-900 tracking-tight font-inter leading-tight">Profit & Loss Summary</h2>
               <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.2em] mt-1.5">Real-time Fiscal Forensics</p>
            </div>
            <span className="inline-block px-3 py-1.5 bg-slate-50 text-[9px] font-black text-slate-400 rounded-xl border border-slate-100 uppercase tracking-widest whitespace-nowrap">
               All Operations
            </span>
         </div>
         
         <div className="space-y-3 sm:space-y-4 w-full">
            <PLRow label="Total Sales" value={plData?.totalSales} color="emerald" type="positive" />
            <PLRow label="Cost of Goods Sold" value={plData?.cogs} color="rose" type="negative" />
            <PLRow label="Operating Expenses" value={plData?.operatingExpenses} color="rose" type="negative" />
            <PLRow label="Tax Liabilities" value={plData?.taxLiabilities} color="rose" type="negative" />
            
            <div className="pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-slate-50 flex items-center justify-between px-2 sm:px-0">
               <span className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight font-inter uppercase">
                  {plData?.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
               </span>
               <span className={`text-sm sm:text-xl font-semibold tracking-tighter ${plData?.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {plData?.netProfit >= 0 ? '+' : '-'}₹{Math.abs(plData?.netProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
               </span>
            </div>
         </div>
      </div>

      {/* Unified Financial Activity — The Master Ledger */}
      <div className="bg-white border-2 border-slate-200 rounded-[2rem] shadow-sm overflow-hidden mt-6 font-inter">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
             <div className="w-1.5 h-8 bg-indigo-600 rounded-full" />
             <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight uppercase">Unified Financial Activity</h2>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Dual-Axis Liquidity Protocol</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase">Received</span>
             </div>
             <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase">Paid Out</span>
             </div>
          </div>
        </div>

        {/* Mobile Ledger Cards — Visible Only on Mobile/Tablet */}
        <div className="lg:hidden divide-y divide-slate-100 border-t border-slate-50">
          {unifiedLedger.length === 0 ? (
            <div className="py-20 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">No Fiscal Nodes Found</div>
          ) : (showAllLedger ? unifiedLedger : unifiedLedger.slice(0, 10)).map((entry: any) => {
            const isSale = entry.entryType === 'SALE';
            const Icon = isSale ? TrendingUp : TrendingDown;
            return (
              <div key={entry._id} onClick={() => setSelectedInvoice(entry)} className="p-5 flex flex-col gap-4 active:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${isSale ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                      <Icon size={16} strokeWidth={3} />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-900 tracking-tight uppercase truncate max-w-[150px]">
                        {entry.transactionId || entry.invoiceNumber || entry.billNumber}
                      </h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                        {isSale ? (entry.customerName || 'Walk-in Client') : (entry.vendorName || 'General Node')}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${entry.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
                    {entry.paymentStatus || 'pending'}
                  </span>
                </div>
                <div className="flex justify-between items-end pt-2 border-t border-slate-50/50">
                  <div>
                    <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.2em] mb-1">Settlement</p>
                    <p className={`text-base font-bold tracking-tight ${isSale ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isSale ? '+' : '-'} ₹{Math.abs(Number(entry.grandTotal || 0)).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-900 uppercase">{new Date(entry.createdAt || entry.purchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">{entry.paymentMethod?.toUpperCase() || 'SYSTEM NODE'}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Master Ledger Table — Hidden on Mobile */}
        <div className="hidden lg:block w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-5 text-center min-w-[60px]">FLOW</th>
                <th className="px-4 py-5 text-left min-w-[200px]">TRANSACTION / ID</th>
                <th className="px-4 py-5 text-left min-w-[200px]">NAME</th>
                <th className="px-4 py-5 text-left pl-0 min-w-[100px]">METHOD</th>
                <th className="px-4 py-5 text-center min-w-[100px]">STATUS</th>
                <th className="px-4 py-5 text-right min-w-[100px]">DATE</th>
                <th className="px-4 py-5 text-right pr-6 min-w-[120px]">NET VALUE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {unifiedLedger.length === 0 ? (
                <tr><td colSpan={7} className="py-24 text-center text-slate-200 font-semibold uppercase text-xs tracking-widest font-inter">Zero fiscal activity on this node</td></tr>
              ) : (showAllLedger ? unifiedLedger : unifiedLedger.slice(0, 10)).map((entry: any) => {
                const isSale = entry.entryType === 'SALE';
                const Icon = isSale ? TrendingUp : TrendingDown;
                
                return (
                  <tr key={entry._id} onClick={() => setSelectedInvoice(entry)} className="hover:bg-slate-50/80 transition-all cursor-pointer group border-b border-slate-50 last:border-0">
                   <td className="px-4 py-4 text-center">
                       <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-sm transition-transform group-hover:scale-110 ${
                         isSale 
                           ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                           : 'bg-rose-50 border-rose-100 text-rose-600'
                       }`}>
                          <Icon size={14} strokeWidth={3} />
                       </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col min-w-0">
                        <span className={`text-[11px] font-semibold transition-all uppercase tracking-tight truncate font-inter ${isSale ? 'text-indigo-600 hover:underline' : 'text-emerald-600 hover:underline'}`}>
                          {entry.transactionId || entry.invoiceNumber || entry.billNumber}
                        </span>
                        <span className="text-[8px] font-bold text-slate-300 uppercase mt-0.5 block truncate">Ref: {entry.invoiceNumber || entry.billNumber}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight truncate">
                          {isSale ? (entry.customerName || 'Walk-in Client') : (entry.vendorName || 'General Node')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-left pl-0">
                       <span className="px-2 py-0.5 bg-slate-50 text-[8px] font-black uppercase rounded-lg text-slate-400 border border-slate-100">
                          {entry.paymentMethod?.toUpperCase() || 'SYSTEM'}
                       </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase border transition-all shadow-sm ${
                        entry.paymentStatus === 'paid' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : 'bg-rose-50 text-rose-500 border-rose-100'
                      }`}>
                        {entry.paymentStatus || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                       <p className="text-[10px] font-bold text-slate-900 uppercase leading-none">
                         {new Date(entry.createdAt || entry.purchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                       </p>
                    </td>
                    <td className="px-4 py-4 text-right pr-6">
                       <p className={`text-sm font-semibold tracking-tight ${isSale ? 'text-emerald-600' : 'text-rose-600'}`}>
                         {isSale ? '+' : '-'} ₹{Math.abs(Number(entry.grandTotal || 0)).toLocaleString('en-IN')}
                       </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {unifiedLedger.length > 10 && (
          <div className="p-6 bg-slate-50/50 border-t border-slate-100 text-center">
            <button
              onClick={() => setShowAllLedger(!showAllLedger)}
              className="mx-auto px-10 py-3 bg-white border-2 border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-100 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 justify-center active:scale-95"
            >
              <Layout size={14} />
              {showAllLedger ? 'SEE LESS' : `SEE ALL (${unifiedLedger.length} RECORDS)`}
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

const PLRow = memo(({ label, value, color, type }: any) => (
   <div className="flex flex-row items-center justify-between border-b border-slate-50 pb-3 last:border-0 font-inter gap-2">
      <span className="text-[11px] sm:text-xs font-semibold text-slate-500 tracking-tight capitalize shrink-0">{label}</span>
      <div className="flex items-center gap-1 shrink-0">
         <span className={`text-[12px] sm:text-sm font-semibold tracking-tight whitespace-nowrap ${color === 'emerald' ? 'text-emerald-500' : 'text-rose-500'}`}>
            {type === 'positive' ? '+' : '-'}₹{Math.abs(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
         </span>
      </div>
   </div>
));



