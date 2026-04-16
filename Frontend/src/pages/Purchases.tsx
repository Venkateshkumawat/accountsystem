import React, { useState, useEffect, useCallback, memo } from 'react';
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

interface Product { _id: string; name: string; purchasePrice: number; sellingPrice: number; stock: number; barcode: string; image?: string; }
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
  const [vendor, setVendor] = useState({ name: '', phone: '', gstin: '', state: '', invoiceNumber: '', poNumber: '', shippingAddress: '', shippingCharges: 0 });
  const [payment, setPayment] = useState({ method: 'cash', status: 'paid', dueDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const { handlePayment } = useRazorpay();

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (!isRefresh && purchases.length === 0) setLoading(true);
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
  }, [search]);


  useEffect(() => {
    fetchAll();

    // ── Real-time Socket Listener ──
    const handleSync = (payload: any) => {
      // Only re-fetch if relevant to purchases
      if (payload.type === 'PURCHASE') {
        fetchAll(true);
      }
    };
    socketService.on('DATA_SYNC', handleSync);

    // ── Cross-Tab Sync (Nexus Local) ──
    const syncChannel = new BroadcastChannel('nexus_sync');
    const handleLocalSync = (event: any) => {
      if (event.data === 'SYNC_PURCHASES') {
        fetchAll(true);
      }
    };
    syncChannel.addEventListener('message', handleLocalSync);

    return () => {
      socketService.off('DATA_SYNC', handleSync);
      syncChannel.removeEventListener('message', handleLocalSync);
      syncChannel.close();
    };
  }, [fetchAll]);


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
          vendorInvoice: vendor.invoiceNumber,
          poNumber: vendor.poNumber,
          shippingAddress: vendor.shippingAddress,
          shippingCharges: Number(vendor.shippingCharges),
          items: cartItems,
          paymentMethod: payment.method,
          paymentStatus: razorpayDetails ? 'paid' : payment.status,
          paymentDueDate: payment.dueDate,
          grandTotal: grandTotal + Number(vendor.shippingCharges),
          subtotal: grandTotal,
          razorpayPaymentId: razorpayDetails?.razorpay_payment_id || null,
          razorpayOrderId: razorpayDetails?.razorpay_order_id || null,
          razorpaySignature: razorpayDetails?.razorpay_signature || null,
          note: razorpayDetails ? `Razorpay: ${razorpayDetails.razorpay_payment_id}` : ''
        });
        setShowForm(false);
        setCartItems([]);
        setVendor({ name: '', phone: '', gstin: '', state: '', invoiceNumber: '', poNumber: '', shippingAddress: '', shippingCharges: 0 });
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
          <span className="text-[9px] font-semibold text-indigo-900/60 uppercase tracking-[0.2em]">Nexus Inbound Logistics</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 leading-tight">Purchases Terminal</h1>
            <p className="text-slate-500 font-semibold text-[10px] uppercase tracking-widest mt-0.5">Real-time stock-in & procurement tracking.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchAll} className="p-2.5 bg-white border border-slate-100 text-slate-300 rounded-xl hover:text-indigo-600 transition-all shadow-sm active:scale-95"><RefreshCcw size={14} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-widest">
              <Plus size={16} /> New Purchase
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cluster - Optimized 4-Card Manifest */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-2 mt-2 font-inter">
        <MetricCard label="Outbound Capital" value={`₹${(stats.totalSpend || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={IndianRupee} color="indigo" />
        <MetricCard label="Current Month" value={`₹${(stats.monthSpend || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={Truck} color="emerald" />
        <MetricCard label="Purchases Volume" value={stats.monthCount?.toString() || '0'} icon={Package} color="amber" />
        <MetricCard label="Order Registry" value={stats.totalCount?.toString() || '0'} icon={CheckCircle} color="rose" />
      </div>

      <div className="px-2">
        <div className="relative group">
          <input value={search} onChange={e => { setSearch(e.target.value); }}
            placeholder="Lookup Vendor Node..." className="w-full px-6 py-3 bg-white border-2 border-slate-200 rounded-2xl text-[11px] font-semibold uppercase tracking-widest focus:outline-none focus:border-indigo-600 transition-all shadow-sm placeholder:text-slate-300" />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {loading && <RefreshCcw size={12} className="animate-spin text-slate-300" />}
            <Zap size={12} className="text-slate-200" />
          </div>
        </div>
      </div>

      <div className="h-4" />

      {/* Purchases Table */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden mx-2 mt-4">
        {loading ? (
          <div className="py-20 text-center text-slate-200 font-semibold uppercase">Loading...</div>
        ) : error ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <Zap size={48} className="text-rose-200 mb-4" />
            <h3 className="text-lg font-semibold text-rose-600 uppercase tracking-tight">Connection Error</h3>
            <p className="text-rose-400/80 text-sm font-semibold mt-2">{error}</p>
            <button onClick={fetchAll} className="mt-6 px-6 py-2 bg-rose-50 text-rose-600 font-semibold tracking-widest text-[10px] uppercase rounded-xl hover:bg-rose-100 transition-all">Retry Sequence</button>
          </div>
        ) : purchases.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <Package size={48} className="text-slate-100 mb-4" />
            <h3 className="text-lg font-semibold text-slate-200 uppercase tracking-tight">No Purchases Yet</h3>
            <p className="text-slate-400 text-sm font-semibold mt-2">Record your first vendor purchase to start tracking stock-in.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Mobile Registry Cards */}
            <div className="lg:hidden divide-y divide-slate-50">
              {(showAllPurchases ? purchases : purchases.slice(0, PURCHASE_LIMIT)).map(p => (
                <div key={p._id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-tighter">Node: {p.billNumber}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-semibold uppercase border ${p.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                      {p.paymentStatus}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 uppercase truncate">{p.vendorName || 'Independent Vendor'}</h4>
                    <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">{new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-slate-100 text-[8px] font-semibold uppercase rounded-lg text-slate-500 border border-slate-200">
                        {p.paymentMethod}
                      </span>
                      <span className="text-[8px] font-semibold text-slate-300 uppercase tracking-widest">{p.items?.length || 1} Load Nodes</span>
                    </div>
                    <p className="money-highlight !text-base !font-semibold font-inter text-slate-900">₹{p.grandTotal.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Procurement Matrix */}
            <div className="hidden lg:block">
              <table className="w-full text-left table-auto">
                <thead className="bg-slate-50/50">
                  <tr className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                    <th className="px-6 py-4">IDC_NODE</th>
                    <th className="px-6 py-4">COUNTERPARTY</th>
                    <th className="px-6 py-4">LOAD_SPEC</th>
                    <th className="px-6 py-4">PROTOCOL</th>
                    <th className="px-6 py-4 text-center">STATUS</th>
                    <th className="px-6 py-4">STAMP</th>
                    <th className="px-6 py-4 text-right">BALANCE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(showAllPurchases ? purchases : purchases.slice(0, PURCHASE_LIMIT)).map(p => (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-all border-b border-slate-50 last:border-0 group cursor-default">
                      <td className="px-6 py-3.5 text-[11px] font-semibold text-indigo-600 uppercase tracking-tighter group-hover:tracking-widest transition-all">{p.billNumber}</td>
                      <td className="px-6 py-3.5 text-[11px] font-semibold text-slate-900 uppercase truncate group-hover:text-indigo-600 transition-all">{p.vendorName || 'Independent Vendor'}</td>
                      <td className="px-6 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none">{p.items?.length || 1} STACKED_PRODUCTS</td>
                      <td className="px-6 py-3.5">
                        <span className="px-2 py-0.5 bg-slate-100 text-[8px] font-semibold uppercase rounded-lg text-slate-500 whitespace-nowrap flex items-center gap-1.5 w-fit border border-slate-200">
                          {p.paymentMethod === 'razorpay' ? <CreditCard size={9} className="text-indigo-600" /> : <Zap size={9} />}
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-semibold uppercase border transition-all ${p.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                          <div className={`w-1 h-1 rounded-full ${p.paymentStatus === 'paid' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} /> {p.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                      <td className="px-6 py-3.5 text-right">
                        <p className="money-highlight !text-sm !font-semibold font-inter text-slate-900">₹{p.grandTotal.toLocaleString()}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination / Show More node */}
            {!showAllPurchases && purchases.length > PURCHASE_LIMIT && (
              <div className="p-6 text-center bg-slate-50/30 border-t border-slate-50">
                <button
                  onClick={() => setShowAllPurchases(true)}
                  className="mx-auto px-8 py-2.5 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-2xl text-[10px] font-semibold uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 justify-center"
                >
                  See {purchases.length - PURCHASE_LIMIT} More Procurement Nodes
                </button>
              </div>
            )}
            {showAllPurchases && (
              <div className="p-6 text-center bg-slate-50/30 border-t border-slate-50">
                <button
                  onClick={() => setShowAllPurchases(false)}
                  className="mx-auto px-8 py-2.5 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[10px] font-semibold uppercase tracking-widest transition-all justify-center"
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
                    <p className="text-[9px] font-semibold text-rose-500 uppercase tracking-tighter ml-1">Invalid Mobile Number</p>
                  )}
                </div>

                <div className="space-y-1">
                  <input placeholder="GSTIN (optional)" value={vendor.gstin} onChange={e => setVendor({ ...vendor, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-600 transition-all" />
                  {vendor.gstin && !validateGSTIN(vendor.gstin) && (
                    <p className="text-[9px] font-semibold text-rose-500 uppercase tracking-tighter ml-1">Invalid GSTIN Pattern</p>
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

                <input placeholder="Supplier Invoice #" value={vendor.invoiceNumber} onChange={e => setVendor({ ...vendor, invoiceNumber: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-600 transition-all placeholder:text-slate-300" />
                
                <input placeholder="Purchase Order (PO) #" value={vendor.poNumber} onChange={e => setVendor({ ...vendor, poNumber: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-600 transition-all placeholder:text-slate-300" />
              </div>

              {/* Logistics & Inventory Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <input placeholder="Shipping / Receiving Address" value={vendor.shippingAddress} onChange={e => setVendor({ ...vendor, shippingAddress: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-600 transition-all placeholder:text-slate-300" />
                </div>
                <div className="md:col-span-1">
                  <input type="number" placeholder="Freight ₹" value={vendor.shippingCharges || ''} onChange={e => setVendor({ ...vendor, shippingCharges: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-indigo-50/30 border border-indigo-100 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-600 transition-all placeholder:text-indigo-300" />
                </div>
              </div>

              {/* Product Search */}
              <div className="relative">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-2">Add Products</label>
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
                            <p className="text-sm font-semibold text-slate-800 truncate uppercase leading-none mb-1">{p.name}</p>
                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest leading-none">
                              Barcode: {p.barcode || 'N/A'} · Current Stock: <span className={p.stock < 10 ? 'text-rose-500' : 'text-emerald-500'}>{p.stock}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-slate-900 leading-none mb-1">₹{p.purchasePrice?.toLocaleString()}</p>
                            <p className="text-[8px] font-semibold text-slate-400 uppercase">Unit Cost</p>
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
                      <div className="grid grid-cols-12 gap-2 px-6 py-4 bg-slate-900 text-[10px] font-semibold text-white uppercase tracking-[0.2em]">
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
                              <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                            </div>
                            <div className="col-span-3">
                              <input type="number" value={item.purchasePrice} min={0}
                                onChange={e => updateCartItem(item.productId, 'purchasePrice', Number(e.target.value))}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-indigo-600 transition-all text-center" />
                            </div>
                            <div className="col-span-2">
                              <input type="number" value={item.qty} min={1}
                                onChange={e => updateCartItem(item.productId, 'qty', Number(e.target.value))}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-indigo-600 transition-all text-center" />
                            </div>
                            <div className="col-span-2 text-right">
                              <p className="text-xs font-semibold text-slate-900">₹{item.total.toFixed(2)}</p>
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
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center font-inter">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-1">Items Subtotal</span>
                      <span className="text-sm font-bold text-slate-900">₹{grandTotal.toFixed(2)}</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-widest leading-none mb-1">Payable Balance</span>
                      <span className="text-2xl font-black text-indigo-600 tracking-tighter">₹{(grandTotal + Number(vendor.shippingCharges)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment & Terms */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-inter">
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-2">Payment Protocol</label>
                  <select value={payment.method} onChange={e => setPayment({ ...payment, method: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-indigo-600 shadow-sm transition-all">
                    <option value="cash">Cash Settlement</option>
                    <option value="upi">Direct UPI</option>
                    <option value="card">Business Card</option>
                    <option value="razorpay">Razorpay Gateway</option>
                    <option value="credit">Trade Credit / AC</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-2">Node Status</label>
                  <select value={payment.status} onChange={e => setPayment({ ...payment, status: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-indigo-600 shadow-sm transition-all">
                    <option value="paid">Fully Settled</option>
                    <option value="pending">Awaiting Sync</option>
                    <option value="partial">Segmented Payment</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-2">Due Date (Terms)</label>
                  <input type="date" value={payment.dueDate} onChange={e => setPayment({ ...payment, dueDate: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-indigo-600 shadow-sm transition-all" />
                </div>
              </div>

              <footer className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 bg-white text-slate-600 rounded-2xl text-xs sm:text-sm font-semibold border border-slate-200 hover:bg-slate-100 transition-all uppercase tracking-widest">
                  Cancel
                </button>
                <button type="submit" disabled={submitting || cartItems.length === 0 || !vendor.name} className="flex-[2] py-4 bg-slate-950 text-white rounded-2xl text-xs sm:text-sm font-semibold shadow-xl hover:bg-indigo-600 transition-all uppercase tracking-widest active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2">
                  {submitting ? "Recording..." : `Record \u2014 ₹${(grandTotal + Number(vendor.shippingCharges)).toFixed(2)}`}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const MetricCard = memo(({ label, value, icon: Icon, color, sub }: any) => {
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


