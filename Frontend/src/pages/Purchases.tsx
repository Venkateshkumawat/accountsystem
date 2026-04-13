import { useState, useEffect } from 'react';
import { Plus, RefreshCcw, Package, X, Truck, CheckCircle, IndianRupee, Zap, CreditCard } from 'lucide-react';
import api from '../services/api';
import { useRazorpay } from '../hooks/useRazorpay';
import { INDIAN_STATES } from '../constants/indianStates';
import { validateGSTIN, validateMobile } from '../utils/validation';
import socketService from '../services/socket';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';

interface Product { _id: string; name: string; purchasePrice: number; sellingPrice: number; stock: number; barcode: string; }
interface PurchaseItem { productId: string; name: string; qty: number; purchasePrice: number; total: number; }
interface Purchase { _id: string; billNumber: string; vendorName: string; grandTotal: number; paymentStatus: string; paymentMethod: string; createdAt: string; items: PurchaseItem[]; }

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<any>({ totalSpend: 0, monthSpend: 0, monthCount: 0, totalCount: 0, dailySpend: [] });
  const [showForm, setShowForm] = useState(false);
  const [showAllPurchases, setShowAllPurchases] = useState(false);
  const PURCHASE_LIMIT = 12;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [cartItems, setCartItems] = useState<PurchaseItem[]>([]);
  const [vendor, setVendor] = useState({ name: '', phone: '', gstin: '', state: '' });
  const [payment, setPayment] = useState({ method: 'cash', status: 'paid' });
  const [submitting, setSubmitting] = useState(false);
  const { handlePayment } = useRazorpay();

  useEffect(() => { 
    fetchAll(); 
    
    // ── Real-time Socket Listener ──
    const handleSync = (payload: any) => {
      if (payload.type === 'PURCHASE' || payload.type === 'PRODUCT') {
        fetchAll();
      }
    };
    socketService.on('DATA_SYNC', handleSync);

    // ── Cross-Tab Sync (Nexus Local) ──
    const syncChannel = new BroadcastChannel('nexus_sync');
    const handleLocalSync = (event: any) => {
      if (event.data === 'FETCH_DASHBOARD' || event.data === 'SYNC_PURCHASES') {
        fetchAll();
      }
    };
    syncChannel.addEventListener('message', handleLocalSync);

    return () => {
      socketService.off('DATA_SYNC', handleSync);
      syncChannel.removeEventListener('message', handleLocalSync);
      syncChannel.close();
    };
  }, []);

  // Debounced Table Search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAll();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => { if (productSearch.length > 1) fetchProducts(productSearch); }, [productSearch]);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const pUrl = search ? `/purchases?search=${search}` : '/purchases';
      const [pRes, sRes] = await Promise.all([
        api.get(pUrl),
        api.get('/purchases/stats'),
      ]);
      setPurchases(pRes.data?.data || []);
      setStats({
         ...sRes.data,
         dailySpend: sRes.data?.dailySpend || []
      });
    } catch (e: any) {
      console.error('Purchase fetch error:', e);
      setPurchases([]);
      setError(e.response?.data?.message || 'Failed to sync with procurement node.');
    }
    finally { setLoading(false); }
  };

  const fetchProducts = async (q: string) => {
    try {
      const pUrl = q ? `/products?search=${q}&limit=8` : '/products?limit=8';
      const res = await api.get(pUrl);
      setProducts(res.data?.data || []);
    } catch (e: any) {
      console.error('Products fetch error:', e);
      setProducts([]);
    }
  };

  const addToCart = (product: Product) => {
    const existing = cartItems.find(i => i.productId === product._id);
    if (existing) {
      setCartItems(cartItems.map(i => i.productId === product._id ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.purchasePrice } : i));
    } else {
      setCartItems([...cartItems, { productId: product._id, name: product.name, qty: 1, purchasePrice: product.purchasePrice || 0, total: product.purchasePrice || 0 }]);
    }
    setProductSearch('');
    setProducts([]);
  };

  const updateCartItem = (productId: string, field: 'qty' | 'purchasePrice', value: number) => {
    setCartItems(cartItems.map(i => {
      if (i.productId !== productId) return i;
      const updated = { ...i, [field]: value };
      return { ...updated, total: updated.qty * updated.purchasePrice };
    }));
  };

  const removeFromCart = (productId: string) => setCartItems(cartItems.filter(i => i.productId !== productId));

  const grandTotal = cartItems.reduce((s, i) => s + i.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor.name || cartItems.length === 0 || submitting) return;

    const processPurchase = async (razorpayDetails?: any) => {
      setSubmitting(true);
      try {
        await api.post('/purchases', {
          vendorName: vendor.name,
          vendorPhone: vendor.phone,
          vendorGstin: vendor.gstin,
          items: cartItems,
          paymentMethod: payment.method,
          paymentStatus: razorpayDetails ? 'paid' : payment.status,
          grandTotal,
          subtotal: grandTotal,
          razorpayPaymentId: razorpayDetails?.razorpay_payment_id || null,
          razorpayOrderId: razorpayDetails?.razorpay_order_id || null,
          razorpaySignature: razorpayDetails?.razorpay_signature || null,
          note: razorpayDetails ? `Razorpay: ${razorpayDetails.razorpay_payment_id}` : ''
        });
        setShowForm(false);
        setCartItems([]);
        setVendor({ name: '', phone: '', gstin: '', state: '' });
        fetchAll();

        const sync = new BroadcastChannel('nexus_sync');
        sync.postMessage('FETCH_DASHBOARD');
        sync.postMessage('FETCH_PRODUCTS');
        sync.postMessage('SYNC_PURCHASES');
        sync.close();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Purchase failed');
      } finally {
        setSubmitting(false);
      }
    };

    if (payment.method === 'razorpay') {
      try {
        await handlePayment({
          amount: Math.round(grandTotal),
          name: 'Nexus Procurement',
          description: `Payment to ${vendor.name}`,
          onSuccess: (details) => processPurchase(details),
          onError: (err) => alert(err.message || 'Payment Cancelled or Failed')
        });
      } catch (err: any) {
        alert(err.message || 'Integrated Gateway Error');
      }
    } else {
      processPurchase();
    }
  };

  return (
    <div className="space-y-4  min-h-screen p-1 sm:p-2">
      {/* Header with Subheader Bar */}
      <div className="flex flex-col gap-4">
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-50/50 rounded-full border border-indigo-100 self-start ml-2 shadow-sm shadow-indigo-100/20">
          <Zap size={12} className="text-amber-500 fill-amber-500" />
          <span className="text-[9px] font-black text-indigo-900/60 uppercase tracking-[0.2em]">Nexus Inbound Logistics</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 leading-tight">Purchases Terminal</h1>
            <p className="text-slate-500 font-semibold text-[10px] uppercase tracking-widest mt-0.5">Real-time stock-in & procurement tracking.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchAll} className="p-2.5 bg-white border border-slate-100 text-slate-300 rounded-xl hover:text-indigo-600 transition-all shadow-sm active:scale-95"><RefreshCcw size={14} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-widest">
              <Plus size={16} /> New Purchase
            </button>
          </div>
        </div>
      </div>

      {/* Stats & Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 px-2">
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Outbound Capital', value: `₹${(stats.totalSpend || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: IndianRupee, color: 'indigo' },
            { label: 'Current Month', value: `₹${(stats.monthSpend || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: Truck, color: 'emerald' },
            { label: 'Purchases Volume', value: stats.monthCount?.toString() || '0', icon: Package, color: 'amber' },
            { label: 'Order Registry', value: stats.totalCount?.toString() || '0', icon: CheckCircle, color: 'rose' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm flex items-center gap-4 transition-all hover:shadow-md group">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110 ${s.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : s.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : s.color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'} border border-white shadow-sm ring-1 ring-slate-100`}>
                <s.icon size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 truncate">{s.label}</p>
                <h3 className="text-xl font-semibold text-slate-900 tracking-tight leading-none truncate">{s.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Procurement Trend Node */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden min-h-[160px] flex flex-col">
           <div className="flex items-center justify-between mb-4">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Procurement Flux</p>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           </div>
           <div className="flex-1 w-full min-h-[100px]">
              {stats.dailySpend?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={stats.dailySpend}>
                      <defs>
                        <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          fontSize: '10px',
                          fontWeight: '900',
                          textTransform: 'uppercase'
                        }}
                        labelStyle={{ display: 'none' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#6366f1" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorSpend)" 
                      />
                   </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20">
                   <RefreshCcw size={20} className="animate-spin mb-2" />
                   <p className="text-[9px] font-black uppercase">Syncing_Nodes</p>
                </div>
              )}
           </div>
        </div>
      </div>

      <div className="px-2">
        <div className="relative group">
          <input value={search} onChange={e => { setSearch(e.target.value); }}
            placeholder="Lookup Vendor Node..." className="w-full px-6 py-3 bg-white border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-indigo-600 transition-all shadow-sm placeholder:text-slate-300" />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {loading && <RefreshCcw size={12} className="animate-spin text-slate-300" />}
            <Zap size={12} className="text-slate-200" />
          </div>
        </div>
      </div>

      <div className="h-4" />

      {/* Purchases Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden mx-2 mt-4">
        {loading ? (
          <div className="py-20 text-center text-slate-200 font-black uppercase">Loading...</div>
        ) : error ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <Zap size={48} className="text-rose-200 mb-4" />
            <h3 className="text-lg font-semibold text-rose-600 uppercase tracking-tight">Connection Error</h3>
            <p className="text-rose-400/80 text-sm font-semibold mt-2">{error}</p>
            <button onClick={fetchAll} className="mt-6 px-6 py-2 bg-rose-50 text-rose-600 font-black tracking-widest text-[10px] uppercase rounded-xl hover:bg-rose-100 transition-all">Retry Sequence</button>
          </div>
        ) : purchases.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <Package size={48} className="text-slate-100 mb-4" />
            <h3 className="text-lg font-semibold text-slate-200 uppercase tracking-tight">No Purchases Yet</h3>
            <p className="text-slate-400 text-sm font-semibold mt-2">Record your first vendor purchase to start tracking stock-in.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50">
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-4">Procurement Node</th>
                  <th className="px-6 py-4">Counterparty</th>
                  <th className="px-6 py-4">Inventory Load</th>
                  <th className="px-6 py-4">Protocol</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(showAllPurchases ? purchases : purchases.slice(0, PURCHASE_LIMIT)).map(p => (
                  <tr key={p._id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 leading-none group">
                    <td className="px-6 py-2.5 text-[10px] font-black text-indigo-600 uppercase tracking-tighter">{p.billNumber}</td>
                    <td className="px-6 py-2.5 text-[10px] font-black text-slate-800 uppercase truncate max-w-[120px]">{p.vendorName}</td>
                    <td className="px-6 py-2.5 text-[10px] font-semibold text-slate-400 uppercase">{p.items?.length || 0} Products In</td>
                    <td className="px-6 py-2.5"><span className="px-1.5 py-0.5 bg-slate-50 border border-slate-100 text-[8px] font-black uppercase rounded text-slate-500 whitespace-nowrap flex items-center gap-1 w-fit">
                      {p.paymentMethod === 'razorpay' && <CreditCard size={8} className="text-indigo-600" />}
                      {p.paymentMethod}
                    </span></td>
                    <td className="px-6 py-2.5">
                      <span className={`flex items-center gap-1 w-fit px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase border ${p.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        <div className={`w-1 h-1 rounded-full ${p.paymentStatus === 'paid' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} /> {p.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 text-[9px] font-semibold text-slate-400 uppercase">{new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                    <td className="px-6 py-2.5 text-right text-[11px] font-black text-slate-900">₹{p.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination / Show More node */}
            {!showAllPurchases && purchases.length > PURCHASE_LIMIT && (
               <div className="p-6 text-center bg-slate-50/30 border-t border-slate-50">
                  <button 
                    onClick={() => setShowAllPurchases(true)}
                    className="mx-auto px-8 py-2.5 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 justify-center"
                  >
                    See {purchases.length - PURCHASE_LIMIT} More Procurement Nodes
                  </button>
               </div>
            )}
            {showAllPurchases && (
               <div className="p-6 text-center bg-slate-50/30 border-t border-slate-50">
                  <button 
                    onClick={() => setShowAllPurchases(false)}
                    className="mx-auto px-8 py-2.5 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all justify-center"
                  >
                    Collapse Procurement Registry
                  </button>
               </div>
            )}
          </div>
        )}
      </div>

      {/* Add Purchase Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in duration-300 max-h-[95vh] flex flex-col">
            <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-semibold tracking-tight uppercase">New Purchase</h3>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest opacity-80 mt-0.5">Record vendor stock-in with automatic inventory update</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-white/10 hover:bg-rose-500 hover:text-white rounded-xl transition-all text-xs font-semibold uppercase tracking-widest text-slate-300">Back</button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
              {/* Vendor Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Vendor Name *" value={vendor.name} onChange={e => setVendor({ ...vendor, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-600 transition-all" />

                <div className="space-y-1">
                  <input placeholder="Phone" value={vendor.phone} onChange={e => setVendor({ ...vendor, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-600 transition-all" />
                  {vendor.phone && !validateMobile(vendor.phone) && (
                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-tighter ml-1">Invalid Mobile Number</p>
                  )}
                </div>

                <div className="space-y-1">
                  <input placeholder="GSTIN (optional)" value={vendor.gstin} onChange={e => setVendor({ ...vendor, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-600 transition-all" />
                  {vendor.gstin && !validateGSTIN(vendor.gstin) && (
                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-tighter ml-1">Invalid GSTIN Pattern</p>
                  )}
                </div>

                <select
                  value={vendor.state}
                  onChange={e => setVendor({ ...vendor, state: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500 transition appearance-none"
                >
                  <option value="">Select Vendor State</option>
                  {INDIAN_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Product Search */}
              <div className="relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Add Products</label>
                <div>
                  <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                    placeholder="Search product to add..." className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-600 transition-all" />
                </div>
                {products.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl mt-2 overflow-hidden animate-in slide-in-from-top-2">
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      {products.map(p => (
                        <button key={p._id} type="button" onClick={() => addToCart(p)}
                          className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-all text-left border-b border-slate-50 last:border-0 group">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 group-hover:border-indigo-300">
                             {p.image ? (
                               <img src={p.image} className="w-full h-full object-cover" />
                             ) : (
                               <Package size={16} className="text-slate-400 group-hover:text-indigo-500" />
                             )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-slate-800 truncate uppercase leading-none mb-1">{p.name}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                               Barcode: {p.barcode || 'N/A'} · Current Stock: <span className={p.stock < 10 ? 'text-rose-500' : 'text-emerald-500'}>{p.stock}</span>
                            </p>
                          </div>
                          <div className="text-right">
                             <p className="text-xs font-black text-slate-900 leading-none mb-1">₹{p.purchasePrice?.toLocaleString()}</p>
                             <p className="text-[8px] font-bold text-slate-400 uppercase">Unit Cost</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Cart Items Area */}
              {cartItems.length > 0 && (
                <div className="border border-slate-100 rounded-[1.5rem] overflow-hidden shadow-sm">
                  <div className="overflow-x-auto custom-scrollbar">
                    <div className="min-w-[500px]">
                      <div className="grid grid-cols-12 gap-2 px-6 py-4 bg-slate-900 text-[10px] font-black text-white uppercase tracking-[0.2em]">
                        <span className="col-span-4">Product / Identifier</span>
                        <span className="col-span-3 text-center">Unit Price</span>
                        <span className="col-span-2 text-center">Qty</span>
                        <span className="col-span-2 text-right">Ext. Total</span>
                        <span className="col-span-1"></span>
                      </div>
                      <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
                        {cartItems.map(item => (
                          <div key={item.productId} className="grid grid-cols-12 gap-4 px-6 py-4 items-center bg-white group hover:bg-indigo-50/30 transition-all">
                            <div className="col-span-4 min-w-0">
                              <p className="text-xs font-black text-slate-800 truncate">{item.name}</p>
                            </div>
                            <div className="col-span-3">
                              <input type="number" value={item.purchasePrice} min={0}
                                onChange={e => updateCartItem(item.productId, 'purchasePrice', Number(e.target.value))}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black outline-none focus:bg-white focus:border-indigo-600 transition-all text-center" />
                            </div>
                            <div className="col-span-2">
                              <input type="number" value={item.qty} min={1}
                                onChange={e => updateCartItem(item.productId, 'qty', Number(e.target.value))}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black outline-none focus:bg-white focus:border-indigo-600 transition-all text-center" />
                            </div>
                            <div className="col-span-2 text-right">
                              <p className="text-xs font-black text-slate-900">₹{item.total.toFixed(2)}</p>
                            </div>
                            <div className="col-span-1 text-right">
                              <button type="button" onClick={() => removeFromCart(item.productId)} className="p-2 text-slate-300 hover:text-rose-500 transition-all active:scale-75">
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Aggregate</span>
                    <span className="text-xl font-black text-indigo-600 tracking-tighter">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Payment */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Payment Method</label>
                  <select value={payment.method} onChange={e => setPayment({ ...payment, method: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-600">
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="razorpay">Razorpay Checkout</option>
                    <option value="credit">Credit / Letter of Credit</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Payment Status</label>
                  <select value={payment.status} onChange={e => setPayment({ ...payment, status: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-600">
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                  </select>
                </div>
              </div>

              <footer className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 bg-white text-slate-600 rounded-2xl text-xs sm:text-sm font-semibold border border-slate-200 hover:bg-slate-100 transition-all uppercase tracking-widest"> 
                  Cancel 
                </button>
                <button type="submit" disabled={submitting || cartItems.length === 0 || !vendor.name} className="flex-[2] py-4 bg-slate-950 text-white rounded-2xl text-xs sm:text-sm font-semibold shadow-xl hover:bg-indigo-600 transition-all uppercase tracking-widest active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2">
                  {submitting ? "Recording..." : `Record — ₹${grandTotal.toFixed(2)}`}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
