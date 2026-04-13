import { useState, useEffect } from 'react';
import {
  Plus,
  AlertTriangle,
  BarChart3,
  Trash2,
  Box,
  Layout,
  Zap,
  X,
  Clock
} from 'lucide-react';
import api from '../services/api';
import socketService from '../services/socket';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../hooks/useAuth';

export default function Inventory() {
  const { products, categories, refreshAll, remainingProduct } = useProducts();
  const { role } = useAuth();
  const isAuthorized = role === 'businessAdmin' || role === 'manager';
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sellingPrice: '',
    gstRate: '18',
    stock: '100',
    category: 'General',
    unitValue: '1',
    unitType: 'unit',
    image: '',
    discount: '0',
    saleEndDate: '',
    promoPrice: ''
  });

  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  useEffect(() => {
    const handleSync = (payload: any) => {
      console.log('📡 Inventory Sync Received:', payload);
      refreshAll();
    };

    // ── Real-time Socket Sync ──
    socketService.on('DATA_SYNC', handleSync);

    // ── Cross-Tab Sync ──
    const syncChannel = new BroadcastChannel('nexus_sync');
    syncChannel.addEventListener('message', () => refreshAll());

    refreshAll();

    return () => {
      socketService.off('DATA_SYNC', handleSync);
      syncChannel.close();
    };
  }, [refreshAll]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const finalCategory = showCustomCategory ? customCategory : formData.category;
      const payload = {
        ...formData,
        category: finalCategory,
        sellingPrice: Number(formData.sellingPrice),
        stock: Number(formData.stock),
        gstRate: Number(formData.gstRate),
        unitValue: Number(formData.unitValue),
        discount: Number(formData.discount || 0)
      };

      if (editId) {
        await api.put(`/products/${editId}`, payload);
      } else {
        await api.post('/products', payload);
      }

      closeModal();
      refreshAll();

      // Real-time Notification & Analytics Sync
      const sync = new BroadcastChannel('nexus_sync');
      sync.postMessage('FETCH_DASHBOARD');
      sync.postMessage({ type: 'SYNC_NOTIFICATIONS' });
      sync.close();

    } catch (err: any) {
      alert(err.response?.data?.message || "Protocol Error: Product Sync Failed");
    } finally {
      setFormLoading(false);
    }
  };

  const closeModal = () => {
    setShowForm(false);
    setEditId(null);
    setFormData({
      name: '',
      sellingPrice: '',
      gstRate: '18',
      stock: '100',
      category: 'General',
      unitValue: '1',
      unitType: 'unit',
      image: '',
      discount: '0',
      saleEndDate: '',
      promoPrice: ''
    });
  };



  const handleEdit = (p: any) => {
    setEditId(p._id);
    setFormData({
      name: p.name,
      sellingPrice: p.sellingPrice.toString(),
      gstRate: (p.gstRate || 0).toString(),
      stock: (p.stock || 0).toString(),
      category: p.category || 'General',
      unitValue: (p.unitValue || 1).toString(),
      unitType: p.unitType || 'unit',
      image: p.image || '',
      discount: (p.discount || 0).toString(),
      saleEndDate: p.saleEndDate ? p.saleEndDate.split('T')[0] : '',
      promoPrice: (p.discount > 0) ? (p.sellingPrice - p.discount).toString() : ''
    });
    setShowForm(true);
  };




  const deleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to decommission this Product node?")) return;
    try {
      await api.delete(`/products/${id}`);
      refreshAll();

      // Real-time Notification Sync
      const sync = new BroadcastChannel('nexus_sync');
      sync.postMessage({ type: 'SYNC_NOTIFICATIONS' });
      sync.close();

    } catch (err: any) {
      alert("Removal Failed: " + (err.response?.data?.message || "Internal Node Error"));
    }
  };

  const lowStockCount = products.filter(p => p.stock <= (p.lowStockThreshold || 10)).length;
  const totalValuation = products.reduce((acc, p) => acc + (p.sellingPrice * p.stock), 0);

  // Group products by category for section-wise identification
  const groupedProducts = products.reduce((acc: any, p) => {
    const cat = p.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const getCategoryStyles = (cat: string) => {
    const mapping: any = {
      'Food': 'bg-emerald-50 text-emerald-600 border-emerald-100 ring-emerald-500/20',
      'Dairy': 'bg-blue-50 text-blue-600 border-blue-100 ring-blue-500/20',
      'Grocery': 'bg-amber-50 text-amber-600 border-amber-100 ring-amber-500/20',
      'Cloths': 'bg-indigo-50 text-indigo-600 border-indigo-100 ring-indigo-500/20',
      'Beverages': 'bg-cyan-50 text-cyan-600 border-cyan-100 ring-cyan-500/20',
      'Toy': 'bg-rose-50 text-rose-600 border-rose-100 ring-rose-500/20',
      'Stationary': 'bg-violet-50 text-violet-600 border-violet-100 ring-violet-500/20',
      'General': 'bg-slate-50 text-slate-600 border-slate-100 ring-slate-500/20'
    };
    return mapping[cat] || mapping['General'];
  };

  const handleCategoryChange = (cat: string) => {
    const weightCats = ['Food', 'Dairy', 'Grocery', 'Beverages'];
    const defaultUnit = weightCats.includes(cat) ? (cat === 'Beverages' ? 'ml' : 'kg') : 'unit';

    setFormData({
      ...formData,
      category: cat,
      unitType: defaultUnit
    });
  };


  return (
    <div className="space-y-6 min-h-screen p-2">
      {/* Header Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Inventory Management</h1>
          <p className="text-sm font-normal text-slate-500 mt-1">Track stock levels, warehouses, and product catalog</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all uppercase tracking-widest shadow-sm">
              <Layout size={16} /> Warehouses
          </button>
          <button
             onClick={() => {
               if (remainingProduct <= 0) {
                 alert("Plan limit reached. Upgrade required to provision more Product nodes.");
                 return;
               }
               setShowForm(true);
             }}
             disabled={remainingProduct <= 0}
             className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase tracking-widest active:scale-95 disabled:opacity-50"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2">
        <InventoryStat label="TOTAL ITEMS" value={products.length.toLocaleString()} icon={Box} color="indigo" />
        <InventoryStat label="LOW STOCK" value={lowStockCount} icon={AlertTriangle} color="rose" />
        <InventoryStat label="STOCK VALUE" value={`₹${totalValuation.toLocaleString()}`} icon={BarChart3} color="emerald" />
        <InventoryStat label="OUT OF STOCK" value={products.filter(p => p.stock <= 0).length} icon={Clock} color="slate" />
      </div>

      <div className="h-4" />


      {/* Dynamic Display / Sectionized Rendering */}
      <div className="space-y-8 px-2 pb-24 md:pb-12">
        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 py-32 text-center">
            <Box size={40} className="mx-auto text-slate-200 mb-4" />
            <h2 className="text-2xl font-semibold text-slate-400">No Inventory Found</h2>
            <p className="text-sm font-normal text-slate-300">Start by adding your first product node.</p>
          </div>
        ) : (
          Object.keys(groupedProducts).sort().map((category) => (
            <div key={category} className="space-y-6">
              <div className="flex items-center gap-4 px-2">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{category}</h2>
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                  {groupedProducts[category].length} Nodes
                </span>
              </div>

              {/* Responsive Layout: Cards on Mobile, Table on Desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4">
                {groupedProducts[category].map((product: any) => (
                  <div key={product._id} className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-4 group relative overflow-hidden">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-[1.5rem] bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center relative">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name} 
                            loading="lazy"
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <Box size={24} className={`text-slate-200 ${product.image ? 'hidden' : ''}`} />
                        {product.discount > 0 && (
                          <div className="absolute top-1 right-1 bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter shadow-lg">
                            -{Math.round((product.discount / product.sellingPrice) * 100)}%
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="font-bold text-slate-900 text-[13px] leading-tight truncate pr-4">
                              {product.name}
                            </span>
                          </div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                            {product.barcode || 'NB-NODE-' + product._id.slice(-6)}
                          </div>
                          <div className="text-[10px] font-medium text-slate-400 mt-1">
                            {product.unitValue} {product.unitType}
                          </div>
                        </div>
                        <div className="flex items-end justify-between mt-2">
                           <div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">MEMBER PRICE</p>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 text-lg tracking-tight">₹{product.sellingPrice - product.discount}</span>
                                {product.discount > 0 && (
                                  <span className="text-[10px] text-slate-300 line-through">₹{product.sellingPrice}</span>
                                )}
                              </div>
                           </div>
                           <div className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${product.stock > (product.lowStockThreshold || 10) ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse'}`}>
                              Stock: {product.stock}
                           </div>
                        </div>
                      </div>
                    </div>
                    {isAuthorized && (
                       <div className="flex gap-2 pt-3 border-t border-slate-50">
                         <button onClick={() => handleEdit(product)} className="flex-1 py-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-100 hover:border-indigo-100">Edit Node</button>
                         <button onClick={() => deleteProduct(product._id)} className="w-12 h-10 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100"><Trash2 size={16} /></button>
                       </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-slate-50/50">
                    <tr className="text-xs font-semibold uppercase text-slate-500 border-b border-slate-100">
                      <th className="px-6 py-4">Product Details</th>
                      <th className="px-6 py-4 text-center">Current Stock</th>
                      <th className="px-6 py-4 text-center">Price</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {groupedProducts[category].map((product: any) => (
                      <tr key={product._id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  loading="lazy"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <Box
                                size={16}
                                className={`text-slate-300 ${product.image ? 'hidden' : ''}`}
                              />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm leading-tight transition-colors">
                                {product.name}
                              </div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{product.barcode || 'NB-' + product._id.slice(-6)}</div>
                            </div>

                          </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-slate-900 text-sm">{product.stock} pcs</span>
                            <span className="text-[10px] font-bold text-emerald-500">+8%</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center font-bold text-slate-900 text-sm">₹{product.sellingPrice}</td>
                        <td className="px-6 py-3 text-center">
                          <span className={`${product.stock > (product.lowStockThreshold || 10) ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'} px-3 py-1 rounded-full text-[10px] font-bold uppercase`}>
                            {product.stock > (product.lowStockThreshold || 10) ? 'IN STOCK' : 'LOW STOCK'}
                          </span>
                        </td>

                        <td className="px-6 py-3.5 text-right">
                          <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isAuthorized && (
                              <>
                                <button
                                  onClick={() => handleEdit(product)}
                                  className="px-2.5 py-1 text-[9px] font-black text-slate-400 hover:text-indigo-600 hover:bg-white border border-slate-100 hover:border-indigo-200 rounded-lg transition-all uppercase tracking-widest shadow-sm shadow-indigo-100/10 active:scale-90"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteProduct(product._id)}
                                  className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all active:scale-75"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>


      {/* FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold tracking-tight uppercase">{editId ? 'Update Product' : 'Product Entry'}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-70">Diagnostic ID: {editId || 'NEW_NODE'}</p>
              </div>
              <button onClick={closeModal} className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all text-white"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Name</label>
                  <input
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter product title..."
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-base font-medium focus:bg-white focus:border-indigo-600 outline-none transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Image URL (Direct Link)</label>
                  <input
                    value={formData.image}
                    onChange={e => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://example.com/item.jpg"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs  outline-none shadow-sm focus:bg-white focus:border-indigo-600"
                  />
                  <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider ml-1">
                    Tip: Right-click image &gt; "Copy image address" for direct link.
                  </p>
                </div>
              </div>


              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                  <select
                    value={showCustomCategory ? "OTHER" : formData.category}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "OTHER") { setShowCustomCategory(true); }
                      else { setShowCustomCategory(false); handleCategoryChange(val); }
                    }}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black outline-none shadow-sm focus:bg-white focus:border-indigo-600"
                  >
                    <option value="General">General</option>
                    {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                    <option value="OTHER" className="text-indigo-600 font-extrabold">+ New Section...</option>
                  </select>
                </div>
                {showCustomCategory && (
                  <input
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    placeholder="Custom Section..."
                    className="w-full px-5 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-black outline-none"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-rose-400 uppercase tracking-widest ml-1">Original MRP (Base ₹)</label>
                  <input
                    required type="number"
                    value={formData.sellingPrice}
                    onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })}
                    placeholder="e.g. 999"
                    className="w-full px-5 py-3.5 bg-rose-50/10 border border-rose-100 rounded-xl text-sm font-black outline-none shadow-sm focus:bg-white focus:border-rose-400 text-rose-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest ml-1">Promo Sale Price (Optional)</label>
                  <input
                    type="number"
                    value={formData.promoPrice}
                    onChange={e => {
                      const promo = e.target.value;
                      const mrp = Number(formData.sellingPrice);
                      const disc = promo && mrp > Number(promo) ? (mrp - Number(promo)).toString() : '0';
                      setFormData({ ...formData, promoPrice: promo, discount: disc });
                    }}
                    placeholder="e.g. 799"
                    className="w-full px-5 py-3.5 bg-emerald-50/20 border border-emerald-100 rounded-xl text-sm font-black text-emerald-700 outline-none shadow-sm focus:bg-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Sale Deadline (Date & Time)</label>
                <input
                  type="datetime-local"
                  value={formData.saleEndDate}
                  onChange={e => setFormData({ ...formData, saleEndDate: e.target.value })}
                  className="w-full px-5 py-3.5 bg-rose-50/20 border border-rose-100 rounded-xl text-xs font-black outline-none shadow-sm focus:bg-white focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Specification</label>
                  <div className="flex gap-2">
                    <input
                      required type="number"
                      min="0"
                      step="any"
                      value={formData.unitValue}
                      onChange={e => setFormData({ ...formData, unitValue: e.target.value })}
                      className="w-20 px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black outline-none"
                    />
                    <select
                      value={formData.unitType}
                      onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
                      className="flex-1 px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-900 outline-none"
                    >
                      <option value="unit">Unit</option><option value="kg">KG</option><option value="gm">GM</option><option value="l">Ltr</option><option value="ml">ML</option><option value="pack">Pack</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">GST Rate (%)</label>
                  <select
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black outline-none appearance-none"
                  >
                    <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Stock</label>
                <input
                  required type="number"
                  min="0"
                  value={formData.stock}
                  onChange={e => setFormData({ ...formData, stock: Math.max(0, Number(e.target.value)).toString() })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-50 rounded-xl text-sm font-black outline-none"
                />
              </div>


              <div className="pt-2 sticky bottom-0 bg-white">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-medium text-sm shadow-xl uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  {formLoading ? "Synchronizing Product..." : "Initialize Product Protocol"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function InventoryStat({ label, value, icon: Icon, color }: any) {
  const colorMap: any = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-600' }
  };
  const s = colorMap[color] || colorMap.indigo;
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${s.bg} ${s.text}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 uppercase tracking-tight mb-0.5">{label}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      </div>
    </div>
  );
}
