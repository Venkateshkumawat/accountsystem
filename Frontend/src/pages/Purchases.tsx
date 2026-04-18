import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { 
  Plus, RefreshCcw, Package, X, Truck, CheckCircle, IndianRupee, Zap, 
  CreditCard, TrendingUp, TrendingDown, Users, AlertCircle, ShoppingCart,
  ArrowUpRight, ArrowDownRight, Clock, Star, ShieldCheck, Mail, Phone,
  Search, Filter, ChevronRight, Activity, LayoutDashboard, AlertTriangle,
  Building2, PlusCircle, Layout
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie
} from 'recharts';
import api from '../services/api';
import socketService from '../services/socket';
import { useRazorpay } from '../hooks/useRazorpay';
import InvoiceModal from '../components/InvoiceModal';

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface Product { _id: string; name: string; purchasePrice: number; sellingPrice: number; stock: number; barcode: string; image?: string; gstRate?: number; category?: string; }
interface PurchaseItem { productId: string; name: string; qty: number; purchasePrice: number; total: number; gstRate?: number; category?: string; isNewNode?: boolean; }
interface Purchase { _id: string; transactionId: string; billNumber: string; vendorName: string; vendorCompany?: string; subtotal: number; totalGST: number; grandTotal: number; paymentStatus: string; paymentMethod: string; createdAt: string; items: PurchaseItem[]; }

// ─── Sub-Components ─────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color, sub, trend }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm relative overflow-hidden group hover:border-indigo-100 transition-all duration-300">
    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-2xl" style={{ backgroundColor: `${color}10`, color }}>
          <Icon size={20} />
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-bold ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-slate-400'}`}>
          {trend === 'up' ? <ArrowUpRight size={12} /> : trend === 'down' ? <ArrowDownRight size={12} /> : <Activity size={12} />}
          {trend !== 'neutral' && '12%'}
        </div>
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <h3 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">{value}</h3>
      <p className="text-[9px] text-slate-400 mt-2 font-medium italic opacity-70">{sub}</p>
    </div>
  </div>
);

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<any>({ totalSpend: 0, totalITC: 0, monthSpend: 0, monthCount: 0, totalCount: 0, dailySpend: [] });
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);
  const [receiptConfig, setReceiptConfig] = useState<{ show: boolean; data: any }>({ show: false, data: null });
  const [categories, setCategories] = useState<string[]>([]);
  const [showAllPurchases, setShowAllPurchases] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [cartItems, setCartItems] = useState<PurchaseItem[]>([]);
  const [vendor, setVendor] = useState({ name: '', phone: '', email: '', company: '', gstin: '', invoiceNumber: '', shippingAddress: '', shippingCharges: 0 });
  const [payment, setPayment] = useState({ method: 'cash', status: 'paid' });
  const [submitting, setSubmitting] = useState(false);
  const [prevVendors, setPrevVendors] = useState<any[]>([]);
  const { handlePayment } = useRazorpay();

  // ─── Data Fetching ────────────────────────────────────────────────────────
  const fetchAll = useCallback(async (isRefresh = false) => {
    if (!isRefresh && purchases.length === 0) setLoading(true);
    try {
      const pUrl = search ? `/purchases?search=${search}&limit=50` : '/purchases?limit=50';
      const [pRes, sRes, lRes] = await Promise.all([
        api.get(pUrl),
        api.get('/purchases/stats'),
        api.get('/products?limit=1000')
      ]);
      setPurchases(pRes.data?.data || []);
       setStats(sRes.data || { totalSpend: 0, totalITC: 0, monthSpend: 0, monthCount: 0, totalCount: 0, dailySpend: [] });
       const allProds = lRes.data?.data || [];
       setLowStock(allProds.filter((p: Product) => p.stock < 15));
       setCategories(Array.from(new Set(allProds.map((p: any) => p.category).filter(Boolean))) as string[]);
       
       // Fetch unique vendors for recognition
       api.get('/purchases/vendors').then(vRes => setPrevVendors(vRes.data?.data || []));
    } catch (e) {
      console.error('Purchase fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [search, purchases.length]);

  useEffect(() => {
    fetchAll();
    const handleSync = () => fetchAll(true);
    socketService.on('DATA_SYNC', handleSync);
    const syncChannel = new BroadcastChannel('nexus_sync');
    syncChannel.onmessage = (event) => {
       if (['SYNC_PURCHASES', 'FETCH_DASHBOARD', 'DATA_SYNC', 'PURCHASE'].includes(event.data)) fetchAll(true);
    };
    return () => {
      socketService.off('DATA_SYNC', handleSync);
      syncChannel.close();
    };
  }, [fetchAll]);

  const supplierData = useMemo(() => {
     if (!purchases.length) return [{ name: 'N/A', value: 1 }];
     const groups: any = {};
     purchases.forEach(p => {
        const v = p.vendorName || 'Independent';
        groups[v] = (groups[v] || 0) + p.grandTotal;
     });
     return Object.entries(groups).map(([name, value]) => ({ name, value })).sort((a: any, b: any) => b.value - a.value).slice(0, 5);
  }, [purchases]);

  const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#1e293b'];

  const subtotal = useMemo(() => cartItems.reduce((s, i) => s + i.total, 0), [cartItems]);

   const handleBuyAgain = (p: Purchase) => {
      setVendor({
         name: p.vendorName,
         phone: (p as any).vendorPhone || '',
         email: (p as any).vendorEmail || '',
         company: p.vendorCompany || '',
         gstin: (p as any).vendorGstin || '',
         invoiceNumber: '',
         shippingAddress: (p as any).vendorAddress || '',
         shippingCharges: 0
      });
      setShowForm(true);
   };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor.name || cartItems.length === 0 || submitting) return;
    const process = async (rzp?: any) => {
      setSubmitting(true);
      try {
        const itemGst = cartItems.map(i => ({ 
           ...i, 
           gstAmount: (i.purchasePrice * i.qty * (i.gstRate || 0)) / 100 
        }));
        const tGst = itemGst.reduce((s, i) => s + i.gstAmount, 0);
        
        const response = await api.post('/purchases', {
          vendorName: vendor.name,
          vendorCompany: vendor.company,
          vendorPhone: vendor.phone,
          vendorEmail: vendor.email,
          vendorAddress: vendor.shippingAddress,
          vendorGstin: vendor.gstin,
          vendorInvoice: vendor.invoiceNumber,
          items: itemGst,
          paymentMethod: payment.method,
          paymentStatus: 'paid',
          totalGST: tGst,
          grandTotal: subtotal + tGst + Number(vendor.shippingCharges),
          subtotal,
          razorpayPaymentId: rzp?.razorpay_payment_id || null
        });
        
        setReceiptConfig({ show: true, data: response.data?.data });
        setShowForm(false);
        setCartItems([]);
        setVendor({ name: '', phone: '', email: '', company: '', gstin: '', invoiceNumber: '', shippingAddress: '', shippingCharges: 0 });
        fetchAll();
        
        const sync = new BroadcastChannel('nexus_sync');
        sync.postMessage('FETCH_DASHBOARD');
        sync.postMessage('SYNC_PURCHASES');
        sync.postMessage('DATA_SYNC');
        sync.close();
      } catch (err: any) { alert(err.response?.data?.message || 'Sync failed'); }
      finally { setSubmitting(false); }
    };

    if (payment.method === 'razorpay') {
      handlePayment({
        amount: Math.round(subtotal),
        name: 'Nexus Settlement',
        description: `Purchase from ${vendor.company || vendor.name}`,
        onSuccess: (res) => process(res),
        onError: () => alert('Gateway Fault.')
      });
    } else process();
  };

  const addToCart = (product: any, isNew: boolean = false) => {
    setCartItems(prev => {
      const id = isNew ? 'NEW_NODE_' + Date.now() : product._id;
      const existing = prev.find(i => i.productId === id);
      if (existing) {
        return prev.map(i => i.productId === id ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.purchasePrice } : i);
      }
      return [...prev, { 
        productId: id, 
        name: product.name, 
        qty: 1, 
        purchasePrice: product.purchasePrice || 0, 
        gstRate: product.gstRate || 0,
        category: product.category || 'General',
        total: product.purchasePrice || 0,
        isNewNode: isNew
      }];
    });
    setProductSearch('');
    setProducts([]);
  };

  const updateCartItem = (id: string, field: string, val: any) => {
    setCartItems(prev => prev.map(i => {
      if (i.productId === id) {
        const updated = { ...i, [field]: val };
        updated.total = updated.qty * updated.purchasePrice;
        return updated;
      }
      return i;
    }));
  };
  const removeFromCart = (id: string) => setCartItems(prev => prev.filter(i => i.productId !== id));

  const chartData = useMemo(() => stats?.dailySpend?.length > 0 ? stats.dailySpend : [
    { name: 'Mon', total: 4000 }, { name: 'Tue', total: 3000 }, { name: 'Wed', total: 6000 },
    { name: 'Thu', total: 2780 }, { name: 'Fri', total: 1890 }, { name: 'Sat', total: 2390 }, { name: 'Sun', total: 3490 }
  ], [stats]);

  if (loading) return <PurchaseSkeleton />;

  return (
    <div className="space-y-6 min-h-screen p-1 sm:p-4 bg-[#fcfcfd] font-inter">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 uppercase tracking-tight">Purchases Terminal</h1>
          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest italic">Linked to GST Portal History</p>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-semibold hover:bg-indigo-700 transition-all uppercase tracking-widest shadow-lg shadow-indigo-100">
             <Plus size={16} /> New Purchase
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-4 font-inter">
        <StatCard label="Total Outbound" value={`₹${(stats.totalSpend || 0).toLocaleString()}`} icon={IndianRupee} color="#6366f1" sub="Global Spend Node" trend="neutral" />
        <StatCard label="ITC (Input GST)" value={`₹${(stats.totalITC || 0).toLocaleString()}`} icon={Zap} color="#10B981" sub="Linked to GST Portal" trend="neutral" />
        <StatCard label="Monthly Spend" value={`₹${(stats.monthSpend || 0).toLocaleString()}`} icon={Users} color="#F59E0B" sub="Current Cycle Flux" trend="neutral" />
        <StatCard label="Order Volume" value={stats.totalCount?.toString() || '0'} icon={ShoppingCart} color="#1E293B" sub="Total Ledger Entries" trend="neutral" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 font-inter">
        <div className="lg:col-span-8 bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm relative overflow-hidden">
           <h3 className="text-base font-semibold text-slate-900 uppercase mb-8">Sales Overview</h3>
           <div className="h-[340px] w-full min-h-[340px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                 <AreaChart data={chartData}>
                    <defs><linearGradient id="p" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dx={-10} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: 10, fontWeight: 700 }} />
                    <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={4} fill="url(#p)" />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
           <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm flex flex-col items-center">
              <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4 w-full text-center">Supplier Distribution</h3>
              <div className="h-[200px] w-full relative min-h-[200px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie data={supplierData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {supplierData.map((e, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                       </Pie>
                       <Tooltip contentStyle={{ fontSize: 10, borderRadius: 12, border: 'none', fontWeight: 600 }} />
                    </PieChart>
                 </ResponsiveContainer>
              </div>
           </div>

           <div onClick={() => setShowLowStock(true)} className="bg-white p-6 rounded-[2rem] border-2 border-rose-50 shadow-sm cursor-pointer hover:border-rose-200 transition-all group">
              <div className="flex items-center justify-between mb-2">
                 <h3 className="text-[10px] font-semibold text-rose-600 uppercase tracking-widest">Critical Alerts Node</h3>
                 <AlertTriangle size={16} className="text-rose-500 animate-bounce" />
              </div>
              <p className="text-[11px] font-semibold text-slate-600">You have <span className="text-rose-600 font-bold">{lowStock.length} items</span> with low stock. Click to resolve inventory.</p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border-2 border-slate-50 shadow-sm mx-4 overflow-hidden mt-4">
         <div className="px-10 py-6 border-b border-slate-50 flex items-center justify-between bg-[#fbfcfd]">
            <h3 className="text-base font-semibold text-slate-900 uppercase">Recent Transactions</h3>
            <button className="text-[10px] font-bold text-indigo-600 uppercase" onClick={() => setShowAllPurchases(!showAllPurchases)}>
               {showAllPurchases ? 'See Less' : 'See All'}
            </button>
         </div>
         <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
               <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                     <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center min-w-[120px]">Reference ID</th>
                     <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[180px]">Supplier Base</th>
                     <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center min-w-[110px]">Net Settlement</th>
                     <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center min-w-[110px]">Payment Status</th>
                     <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center min-w-[100px]">Buy Protocol</th>
                     <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center min-w-[100px]">Manifest</th>
                     <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-6 min-w-[110px]">Date</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 font-inter">
                  {(showAllPurchases ? purchases : purchases.slice(0, 8)).map(p => (
                     <tr key={p._id} className="hover:bg-slate-50/80 transition-all border-b border-slate-50 group">
                        <td className="px-4 py-5 text-center group/id">
                            <div className="flex flex-col items-center">
                               <span className="text-[10px] font-semibold text-slate-900 leading-none">{p.transactionId}</span>
                               <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{p.billNumber}</span>
                            </div>
                        </td>
                        <td className="px-4 py-5">
                           <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight truncate">{p.vendorName || 'General Node'}</span>
                              <span className="text-[9px] text-slate-400 uppercase tracking-tighter truncate opacity-70 mt-0.5">{p.vendorCompany || 'Nexus Entity'}</span>
                           </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                           <span className="text-xs font-semibold text-slate-900 tracking-tighter">₹{p.grandTotal.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-5 text-center">
                           <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border transition-all shadow-sm ${p.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                              {p.paymentStatus || 'pending'}
                           </span>
                        </td>
                        <td className="px-4 py-5 text-center">
                           <button onClick={() => handleBuyAgain(p)} className="mx-auto w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100/50 active:scale-90 group/buy" title="Buy Again">
                              <PlusCircle size={14} className="group-hover/buy:rotate-90 transition-transform" />
                           </button>
                        </td>
                        <td className="px-4 py-5 text-center">
                           <button onClick={() => { setSelectedPurchase(p); setShowPrintModal(true); }} className="mx-auto w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all border border-slate-100 active:scale-90" title="View Hub Invoice">
                              <Layout size={14} />
                           </button>
                        </td>
                        <td className="px-4 py-5 text-right pr-6">
                           <p className="text-[10px] font-bold text-slate-900 uppercase leading-none">
                             {new Date(p.createdAt || p.purchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                           </p>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

       {showForm && (
          <PurchaseForm 
             onCancel={() => { setShowForm(false); setVendor({ name: '', phone: '', email: '', company: '', gstin: '', invoiceNumber: '', shippingAddress: '', shippingCharges: 0 }); }} 
             onSubmit={handleSubmit} 
             vendor={vendor} 
             setVendor={setVendor} 
             payment={payment} 
             setPayment={setPayment} 
             cartItems={cartItems} 
             updateCartItem={updateCartItem} 
             removeFromCart={removeFromCart} 
             addToCart={addToCart} 
             productSearch={productSearch} 
             setProductSearch={setProductSearch} 
             products={products} 
             setProducts={setProducts} 
             submitting={submitting} 
             subtotal={subtotal} 
             categories={categories}
          />
       )}
       
        {showPrintModal && selectedPurchase && (
           <InvoiceModal 
              invoice={selectedPurchase} 
              onClose={() => { setShowPrintModal(false); setSelectedPurchase(null); }} 
              type="purchase" 
           />
        )}
       
       {showLowStock && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
             <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden font-inter">
                <div className="px-8 py-6 bg-rose-600 text-white flex justify-between items-center">
                   <h3 className="text-xl font-bold uppercase">Critical Stock Node Alerts</h3>
                   <button onClick={() => setShowLowStock(false)} className="hover:bg-white/10 p-2 rounded-xl"><X size={20} /></button>
                </div>
                <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4">
                   {lowStock.map(i => (
                      <div key={i._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <div><p className="text-sm font-bold text-slate-800 uppercase">{i.name}</p> <p className="text-[10px] text-slate-400">Barcode: {i.barcode}</p></div>
                         <div className="text-right"><p className="text-xs font-bold text-rose-600">Stock: {i.stock}</p></div>
                      </div>
                   ))}
                </div>
                <div className="p-6 bg-slate-50 border-t flex justify-end">
                   <button onClick={() => setShowLowStock(false)} className="px-8 py-2 bg-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded-xl">Close</button>
                </div>
             </div>
          </div>
       )}

        {receiptConfig.show && (
           <div className="fixed inset-0 z-[400] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xl overflow-y-auto">
              <div className="bg-white w-full max-w-3xl rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden font-inter border-2 border-indigo-50 animate-in zoom-in-95 duration-300">
                 <div className="p-4 sm:p-10 space-y-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-slate-50 pb-8">
                       <div className="space-y-4">
                          <div className="flex items-center gap-3">
                             <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200">B</div>
                             <div>
                                <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">Purchase Invoice</h1>
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1.5">{receiptConfig.data?.transactionId}</p>
                             </div>
                          </div>
                          <div className="space-y-1">
                             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase"><Clock size={12} /> {new Date(receiptConfig.data?.createdAt).toLocaleString()}</div>
                             <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase"><ShieldCheck size={12} /> Payment Verified ({receiptConfig.data?.paymentMethod})</div>
                          </div>
                       </div>
                       <div className="text-left sm:text-right space-y-2">
                          <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">Vendor Identity</h2>
                          <div className="space-y-0.5">
                             <p className="text-sm font-black text-indigo-600 uppercase">{receiptConfig.data?.vendorCompany || 'Independent Node'}</p>
                             <p className="text-[10px] font-bold text-slate-500 uppercase">{receiptConfig.data?.vendorName}</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{receiptConfig.data?.vendorPhone}</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic max-w-xs">{receiptConfig.data?.vendorAddress || 'No Location Logged'}</p>
                          </div>
                          {receiptConfig.data?.vendorGstin && (
                             <div className="inline-block px-3 py-1 bg-slate-900 text-white text-[9px] font-black rounded-lg uppercase tracking-widest mt-4">GSTIN: {receiptConfig.data?.vendorGstin}</div>
                          )}
                       </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-[1.5rem] border border-slate-100">
                       <table className="w-full text-left">
                          <thead>
                             <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                <th className="px-6 py-4">Item Node</th>
                                <th className="px-6 py-4 text-center">Qty</th>
                                <th className="px-6 py-4 text-center">Rate</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                             {receiptConfig.data?.items?.map((item: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-all font-inter">
                                   <td className="px-6 py-4">
                                      <div className="space-y-0.5">
                                         <p className="text-xs font-black text-slate-800 uppercase leading-none">{item.name}</p>
                                         <p className="text-[9px] font-bold text-slate-400">GST Allocation: {item.gstRate}%</p>
                                      </div>
                                   </td>
                                   <td className="px-6 py-4 text-center text-xs font-bold text-slate-600 tabular-nums">{item.qty}</td>
                                   <td className="px-6 py-4 text-center text-xs font-bold text-slate-600 tabular-nums">₹{item.purchasePrice?.toLocaleString()}</td>
                                   <td className="px-6 py-4 text-right text-xs font-black text-slate-900 tabular-nums">₹{item.total?.toLocaleString()}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>

                    {/* Summary */}
                    <div className="flex flex-col sm:flex-row justify-between items-end gap-10">
                       <div className="p-6 bg-slate-50 rounded-3xl flex-1 border border-dashed border-slate-200 w-full">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Compliance Trace</p>
                          <p className="text-[11px] font-bold text-slate-600 italic leading-relaxed">Recorded as an industrial expense. All tax allocations (ITC) will be synchronized with the GST Portal's GSTR-2B simulation node. Digital receipt secured for professional auditing.</p>
                       </div>
                       <div className="w-full sm:w-80 space-y-3">
                          <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest"><span>Taxable Value</span><span>₹{receiptConfig.data?.subtotal?.toLocaleString()}</span></div>
                          <div className="flex justify-between text-[11px] font-bold text-emerald-600 uppercase tracking-widest"><span>Input Tax (GST)</span><span>(+) ₹{receiptConfig.data?.totalGST?.toLocaleString()}</span></div>
                          <div className="pt-4 border-t-2 border-slate-100 flex justify-between items-center group">
                             <div className="space-y-0.5"><p className="text-[10px] font-black text-indigo-600 uppercase leading-none">Grand Total</p><p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Net Procurement Val</p></div>
                             <p className="text-3xl font-black text-slate-900 tabular-nums flex items-start gap-1"><span className="text-sm mt-1">₹</span>{receiptConfig.data?.grandTotal?.toLocaleString()}</p>
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 no-print">
                       <button onClick={() => window.print()} className="py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200 hover:scale-[1.02] transition-all">Print Document</button>
                       <button onClick={() => setReceiptConfig({ show: false, data: null })} className="py-4 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-100 transition-all">Dismiss Terminal</button>
                    </div>
                 </div>
              </div>
           </div>
        )}
    </div>
  );
}

const PurchaseForm = memo(({ onCancel, onSubmit, vendor, setVendor, payment, setPayment, cartItems, updateCartItem, removeFromCart, addToCart, productSearch, setProductSearch, products, setProducts, submitting, subtotal, categories, prevVendors }: any) => {
   useEffect(() => {
      if (productSearch.length > 1) {
         api.get(`/products?search=${productSearch}&limit=6`).then(res => setProducts(res.data?.data || []));
      } else setProducts([]);
   }, [productSearch]);

   const handleVendorChange = (e: any) => {
      const val = e.target.value;
      setVendor({...vendor, name: val.replace(/[^a-zA-Z\s]/g, '')});
      
      const match = prevVendors?.find((v: any) => v.name.toLowerCase() === val.toLowerCase());
      if (match) {
         setVendor({
            ...vendor,
            name: match.name,
            phone: match.phone || '',
            email: match.email || '',
            company: match.company || '',
            gstin: match.gstin || '',
            shippingAddress: match.address || ''
         });
      }
   };

   const totalGst =  cartItems.reduce((s,i) => s + (i.purchasePrice * i.qty * (i.gstRate || 0)) / 100, 0);
   const grandTotal = subtotal + totalGst + Number(vendor.shippingCharges);

   return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300 font-inter">
         <div className="bg-white w-[98%] sm:max-w-3xl rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 max-h-[96vh]">
            <div className="px-8 py-5 bg-[#1e293b] text-white flex justify-between items-center shrink-0">
               <div>
                  <h3 className="text-lg font-bold tracking-tight uppercase px-1">Procurement Node</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 opacity-70 italic px-1">Linkage to GST Ledger Active</p>
               </div>
               <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-xl transition-all border border-white/10"><X size={18} /></button>
            </div>

            <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar">
               <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                  <div className="col-span-full sm:col-span-3 space-y-1.5">
                     <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vendor Name</label>
                     <input list="vendor-suggestions" required value={vendor.name} onChange={handleVendorChange} placeholder="Search or Type Name" className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:bg-white focus:border-indigo-600 outline-none shadow-sm shadow-slate-100/50" />
                     <datalist id="vendor-suggestions">
                        {prevVendors?.map((v: any, idx: number) => (
                           <option key={idx} value={v.name}>{v.company || 'Individual Vendor'}</option>
                        ))}
                     </datalist>
                  </div>
                  <div className="col-span-full sm:col-span-3 space-y-1.5">
                     <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mobile No</label>
                     <input required maxLength={10} value={vendor.phone} onChange={e => setVendor({...vendor, phone: e.target.value.replace(/\D/g, '')})} placeholder="10 Digits" className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:bg-white focus:border-indigo-600 outline-none shadow-sm shadow-slate-100/50" />
                  </div>
                  <div className="col-span-full sm:col-span-3 space-y-1.5">
                     <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Company Entity</label>
                     <input value={vendor.company} onChange={e => setVendor({...vendor, company: e.target.value})} placeholder="Business Name Node" className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:bg-white focus:border-indigo-600 outline-none shadow-sm shadow-slate-100/50" />
                  </div>
                  <div className="col-span-full sm:col-span-3 space-y-1.5">
                     <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email (Optional)</label>
                     <input value={vendor.email} onChange={e => setVendor({...vendor, email: e.target.value})} placeholder="vendor@node.com" className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:bg-white focus:border-indigo-600 outline-none shadow-sm shadow-slate-100/50" />
                  </div>
                  <div className="col-span-full space-y-1.5 pt-1">
                     <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Supplier Location</label>
                     <input value={vendor.shippingAddress} onChange={e => setVendor({...vendor, shippingAddress: e.target.value})} placeholder="Street, City, State Node" className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:bg-white focus:border-indigo-600 outline-none shadow-sm shadow-slate-100/50" />
                  </div>
               </div>

               <div className="relative pt-2">
                  <div className="relative group">
                     <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                     <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="SEARCH PRODUCT REGISTRY..." className="w-full pl-12 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-bold uppercase tracking-widest focus:border-indigo-600 outline-none shadow-xl shadow-indigo-100/20" />
                     {(products.length > 0 || productSearch.length > 1) && (
                        <div className="absolute z-50 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl mt-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
                           {products.map(p => (
                              <button key={p._id} type="button" onClick={() => addToCart(p)} className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-all border-b border-slate-50 text-left group">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-white transition-colors"><Package size={14} className="text-slate-400" /></div>
                                    <div><p className="text-[11px] font-bold text-slate-900 uppercase">{p.name}</p><p className="text-[9px] text-slate-400 font-bold uppercase">Price: ₹{p.purchasePrice?.toLocaleString()}</p></div>
                                 </div>
                                 <Plus size={14} className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-all" />
                              </button>
                           ))}
                           <button type="button" onClick={() => addToCart({ name: productSearch, purchasePrice: 0, gstRate: 18 }, true)} className="w-full px-6 py-3 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                              <PlusCircle size={14} /> Provision New Node: "{productSearch}"
                           </button>
                        </div>
                     )}
                  </div>
               </div>

               {cartItems.length > 0 && (
                  <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm bg-slate-50/50">
                     <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                        <table className="w-full border-collapse">
                           <thead className="sticky top-0 bg-[#f8fafc] text-slate-400 text-[8px] font-bold uppercase border-b border-slate-100">
                              <tr>
                                 <th className="px-3 sm:px-6 py-3 text-left uppercase whitespace-nowrap">Internal Node</th>
                                 <th className="px-3 sm:px-6 py-3 text-center uppercase whitespace-nowrap">Price / Unit</th>
                                 <th className="px-3 sm:px-6 py-3 text-center uppercase whitespace-nowrap">Qty</th>
                                 <th className="px-3 sm:px-6 py-3 text-right uppercase whitespace-nowrap">Total</th>
                                 <th className="px-3 sm:px-6 py-3"></th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 bg-white">
                              {cartItems.map(item => (
                                 <tr key={item.productId} className="hover:bg-slate-50 transition-all font-inter">
                                    <td className="px-3 sm:px-6 py-3">
                                       <div className="flex flex-col gap-1">
                                          <span className="text-[10px] font-bold text-slate-800 uppercase">{item.name}</span>
                                          {item.isNewNode && (
                                             <div className="flex gap-1">
                                                <input 
                                                   list="inventory-categories"
                                                   placeholder="Category" 
                                                   value={item.category} 
                                                   onChange={e => updateCartItem(item.productId, 'category', e.target.value)} 
                                                   className="text-[8px] px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-md outline-none text-indigo-600 font-bold uppercase w-20" 
                                                />
                                                <datalist id="inventory-categories">
                                                   {categories.map((cat: string) => <option key={cat} value={cat} />)}
                                                </datalist>
                                                <select value={item.gstRate} onChange={e => updateCartItem(item.productId, 'gstRate', Number(e.target.value))} className="text-[8px] px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-md outline-none text-emerald-600 font-bold uppercase">
                                                   {[0, 5, 12, 18, 28].map(g => <option key={g} value={g}>{g}% GST</option>)}
                                                </select>
                                             </div>
                                          )}
                                       </div>
                                    </td>
                                    <td className="px-2 sm:px-6 py-3"><input type="number" min="0" value={item.purchasePrice} onChange={e => updateCartItem(item.productId, 'purchasePrice', Number(e.target.value))} className="w-full py-1.5 bg-slate-50 rounded-lg text-center font-bold text-[10px] text-indigo-600 border border-transparent focus:border-indigo-200 outline-none transition-all" /></td>
                                    <td className="px-2 sm:px-6 py-3"><input type="number" min="1" value={item.qty} onChange={e => updateCartItem(item.productId, 'qty', Number(e.target.value))} className="w-full py-1.5 bg-slate-50 rounded-lg text-center font-bold text-[10px] text-slate-800 border border-transparent focus:border-indigo-200 outline-none transition-all" /></td>
                                    <td className="px-2 sm:px-6 py-3 text-right font-bold text-slate-950 text-xs">₹{item.total.toLocaleString()}</td>
                                    <td className="px-2 sm:px-6 py-3 text-center"><button type="button" onClick={() => removeFromCart(item.productId)} className="text-slate-300 hover:text-rose-500 transition-all"><X size={16} /></button></td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               <div className="grid grid-cols-12 gap-6 pt-2 border-t border-slate-100 items-end">
                  <div className="col-span-full md:col-span-5 space-y-3">
                     <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><CreditCard size={10} /> Payment Protocol</label>
                     <div className="flex gap-2">
                        {['cash', 'razorpay'].map(m => (
                           <button key={m} type="button" onClick={() => setPayment({...payment, method: m})} className={`flex-1 py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${payment.method === m ? 'bg-indigo-50 border-indigo-600 text-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white border-slate-50 text-slate-400 hover:border-slate-100'}`}>
                              {m === 'razorpay' ? <Zap size={14} className={payment.method === m ? 'animate-pulse' : ''} /> : <IndianRupee size={12} />}
                              <span className="text-[10px] font-bold uppercase tracking-widest">{m}</span>
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="col-span-full md:col-span-7 flex items-center justify-between p-4 sm:p-6 bg-slate-900 rounded-[1.2rem] sm:rounded-[1.5rem] shadow-xl shadow-slate-200">
                     <div className="space-y-0.5 text-left">
                        <p className="text-[7px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Settlement Balance</p>
                        <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tighter tabular-nums mb-1">₹{grandTotal.toLocaleString()}</h2>
                        <div className="flex gap-2 sm:gap-3">
                           <span className="text-[6px] sm:text-[7px] font-bold text-emerald-400 uppercase">ITC: ₹{totalGst.toLocaleString()}</span>
                           <span className="text-[6px] sm:text-[7px] font-bold text-slate-500 uppercase">Taxable: ₹{subtotal.toLocaleString()}</span>
                        </div>
                     </div>
                     <button type="submit" disabled={submitting || cartItems.length === 0} className="px-4 sm:px-8 py-2.5 sm:py-3.5 bg-indigo-600 text-white font-bold rounded-xl text-[9px] sm:text-[10px] uppercase shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50">
                        {submitting ? 'RECONCILING...' : 'PAY & DONE'}
                     </button>
                  </div>
               </div>
            </form>
         </div>
      </div>
   );
});



function PurchaseSkeleton() { return <div className="p-10 space-y-10 animate-pulse"><div className="h-20 bg-slate-100 rounded-[2rem] w-1/3" /><div className="grid grid-cols-4 gap-8"><div className="h-40 bg-slate-100 rounded-[2rem]" /><div className="h-40 bg-slate-100 rounded-[2rem]" /><div className="h-40 bg-slate-100 rounded-[2rem]" /><div className="h-40 bg-slate-100 rounded-[2rem]" /></div></div>; }
