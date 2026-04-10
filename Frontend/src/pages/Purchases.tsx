import { useState, useEffect } from 'react';
import { Plus, RefreshCcw, Package, X, Truck, CheckCircle, IndianRupee, Zap } from 'lucide-react';
import api from '../services/api';
import { INDIAN_STATES } from '../constants/indianStates';
import { validateGSTIN, validateMobile } from '../utils/validation';

interface Product { _id: string; name: string; purchasePrice: number; sellingPrice: number; stock: number; barcode: string; }
interface PurchaseItem { productId: string; name: string; qty: number; purchasePrice: number; total: number; }
interface Purchase { _id: string; billNumber: string; vendorName: string; grandTotal: number; paymentStatus: string; paymentMethod: string; createdAt: string; items: PurchaseItem[]; }

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState({ totalSpend: 0, monthSpend: 0, monthCount: 0, totalCount: 0 });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [cartItems, setCartItems] = useState<PurchaseItem[]>([]);
  const [vendor, setVendor] = useState({ name: '', phone: '', gstin: '', state: '' });
  const [payment, setPayment] = useState({ method: 'cash', status: 'paid' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchAll(); }, []);
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
      setStats(sRes.data || {});
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
    if (!vendor.name || cartItems.length === 0) return;
    setSubmitting(true);
    try {
      await api.post('/purchases', {
        vendorName: vendor.name,
        vendorPhone: vendor.phone,
        vendorGstin: vendor.gstin,
        items: cartItems,
        paymentMethod: payment.method,
        paymentStatus: payment.status,
        grandTotal,
        subtotal: grandTotal,
      });
      setShowForm(false);
      setCartItems([]);
      setVendor({ name: '', phone: '', gstin: '', state: '' });
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Purchase failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6  min-h-screen p-2">
      {/* Header with Subheader Bar */}
      <div className="flex flex-col gap-4">
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-50/50 rounded-full border border-indigo-100 self-start ml-2 shadow-sm shadow-indigo-100/20">
          <Zap size={12} className="text-amber-500 fill-amber-500" />
          <span className="text-[9px] font-black text-indigo-900/60 uppercase tracking-[0.2em]">Nexus Inbound Logistics</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter">Purchases Terminal</h1>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-0.5">Real-time stock-in & procurement tracking.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchAll} className="p-2.5 bg-white border border-slate-100 text-slate-300 rounded-xl hover:text-indigo-600 transition-all shadow-sm active:scale-95"><RefreshCcw size={14} /></button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-widest">
              <Plus size={16} /> New Purchase
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2">
        {[
          { label: 'Outbound Capital', value: `₹${(stats.totalSpend || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: IndianRupee, color: 'indigo' },
          { label: 'Current Month', value: `₹${(stats.monthSpend || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: Truck, color: 'emerald' },
          { label: 'Monthly Volume', value: stats.monthCount?.toString() || '0', icon: Package, color: 'amber' },
          { label: 'Orders Filed', value: stats.totalCount?.toString() || '0', icon: CheckCircle, color: 'rose' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col justify-between group relative overflow-hidden">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 transition-transform duration-500 group-hover:scale-110 ${s.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : s.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : s.color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'} border border-white shadow-sm ring-1 ring-slate-100`}>
              <s.icon size={14} />
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
              <h3 className="text-lg font-black text-slate-900 tracking-tighter leading-none">{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="px-2">
        <input value={search} onChange={e => { setSearch(e.target.value); }} onKeyDown={e => e.key === 'Enter' && fetchAll()}
          placeholder="Lookup Vendor Node..." className="w-full px-6 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-indigo-600 transition-all shadow-sm placeholder:text-slate-300" />
      </div>

      <div className="h-4" />

      {/* Purchases Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden mx-2 mt-4">
        {loading ? (
          <div className="py-20 text-center text-slate-200 font-black uppercase">Loading...</div>
        ) : error ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <Zap size={48} className="text-rose-200 mb-4" />
            <h3 className="text-xl font-black text-rose-600 uppercase tracking-tighter">Connection Error</h3>
            <p className="text-rose-400/80 text-sm font-bold mt-2">{error}</p>
            <button onClick={fetchAll} className="mt-6 px-6 py-2 bg-rose-50 text-rose-600 font-black tracking-widest text-[10px] uppercase rounded-xl hover:bg-rose-100 transition-all">Retry Sequence</button>
          </div>
        ) : purchases.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <Package size={48} className="text-slate-100 mb-4" />
            <h3 className="text-2xl font-black text-slate-200 uppercase tracking-tighter">No Purchases Yet</h3>
            <p className="text-slate-400 text-sm font-bold mt-2">Record your first vendor purchase to start tracking stock-in.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50">
                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 leading-none">
                  <th className="px-6 py-3">Procurement Node</th>
                  <th className="px-6 py-3">Counterparty</th>
                  <th className="px-6 py-3">Inventory Load</th>
                  <th className="px-6 py-3">Protocol</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {purchases.map(p => (
                  <tr key={p._id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 leading-none">
                    <td className="px-6 py-2.5 text-[10px] font-black text-indigo-600 uppercase tracking-tighter">{p.billNumber}</td>
                    <td className="px-6 py-2.5 text-[10px] font-black text-slate-800 uppercase truncate max-w-[120px]">{p.vendorName}</td>
                    <td className="px-6 py-2.5 text-[10px] font-bold text-slate-400 uppercase">{p.items?.length || 0} Products In</td>
                    <td className="px-6 py-2.5"><span className="px-1.5 py-0.5 bg-slate-50 border border-slate-100 text-[8px] font-black uppercase rounded text-slate-500">{p.paymentMethod}</span></td>
                    <td className="px-6 py-2.5">
                      <span className={`flex items-center gap-1 w-fit px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase border ${p.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        <div className={`w-1 h-1 rounded-full ${p.paymentStatus === 'paid' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} /> {p.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase">{new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                    <td className="px-6 py-2.5 text-right text-[11px] font-black text-slate-900">₹{p.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Purchase Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">New Purchase</h2>
                <p className="text-xs font-bold text-slate-400">Record vendor stock-in with automatic inventory update.</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Vendor Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Vendor Name *" value={vendor.name} onChange={e => setVendor({ ...vendor, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 transition-all" />

                <div className="space-y-1">
                  <input placeholder="Phone" value={vendor.phone} onChange={e => setVendor({ ...vendor, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 transition-all" />
                  {vendor.phone && !validateMobile(vendor.phone) && (
                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-tighter ml-1">Invalid Mobile Number</p>
                  )}
                </div>

                <div className="space-y-1">
                  <input placeholder="GSTIN (optional)" value={vendor.gstin} onChange={e => setVendor({ ...vendor, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 transition-all" />
                  {vendor.gstin && !validateGSTIN(vendor.gstin) && (
                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-tighter ml-1">Invalid GSTIN Pattern</p>
                  )}
                </div>

                <select
                  value={vendor.state}
                  onChange={e => setVendor({ ...vendor, state: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-indigo-500 transition appearance-none"
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
                    placeholder="Search product to add..." className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 transition-all" />
                </div>
                {products.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-slate-100 rounded-2xl shadow-xl mt-2 overflow-hidden">
                    {products.map(p => (
                      <button key={p._id} type="button" onClick={() => addToCart(p)}
                        className="w-full flex items-center justify-between px-5 py-3 hover:bg-indigo-50 hover:text-indigo-600 transition-all text-left">
                        <span className="text-sm font-black">{p.name}</span>
                        <span className="text-xs font-bold text-slate-400">Stock: {p.stock}</span>
                      </button>
                    ))}
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600">
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Payment Status</label>
                  <select value={payment.status} onChange={e => setPayment({ ...payment, status: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600">
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                  </select>
                </div>
              </div>

              <button type="submit" disabled={submitting || cartItems.length === 0 || !vendor.name}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-indigo-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                {submitting ? 'Recording...' : `Record Purchase — ₹${grandTotal.toFixed(2)}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
