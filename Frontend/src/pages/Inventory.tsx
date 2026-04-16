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
  Clock,
  Edit3
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


  // Helper to resolve backend image paths
  const getImageUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = api.defaults.baseURL?.replace('/api', '') || 'https://account-billing-system.onrender.com';
    return `${baseUrl}/${path}`;
  };

  return (
    <div className="space-y-6 min-h-screen p-2">
      {/* ... previous header/metric code ... */}

      <div className="space-y-8 px-2 pb-24 md:pb-12">
        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-slate-200 py-24 sm:py-32 text-center overflow-hidden">
            <Box size={40} className="mx-auto text-slate-200 mb-4" />
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-400">No Inventory Found</h2>
            <p className="text-sm font-normal text-slate-300">Start by adding your first product node.</p>
          </div>
        ) : (
          Object.keys(groupedProducts).sort().map((category) => (
            <div key={category} className="space-y-6">
              <div className="flex items-center gap-4 px-2">
                <h2 className="text-lg lg:text-xl font-semibold text-slate-900 tracking-tight">{category}</h2>
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                  {groupedProducts[category].length} Nodes
                </span>
              </div>

              {/* Responsive Layout: Cards on Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4">
                {groupedProducts[category].map((product: any) => {
                  const productImg = getImageUrl(product.image);
                  return (
                    <div key={product._id} className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm hover:border-indigo-200 transition-all flex flex-col gap-4 group relative overflow-hidden">
                      <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-[1.5rem] bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center relative">
                          {productImg ? (
                            <img
                              src={productImg}
                              alt={product.name}
                              loading="lazy"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <Box size={24} className={`text-slate-200 ${productImg ? 'hidden' : ''}`} />
                          {product.discount > 0 && (
                            <div className="absolute top-1 right-1 bg-rose-600 text-white text-[8px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-tighter shadow-lg">
                              -{Math.round((product.discount / product.sellingPrice) * 100)}%
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <span className="font-semibold text-slate-900 text-[13px] leading-tight block truncate mb-1">
                              {product.name}
                            </span>
                            <div className="inline-block text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                              {product.barcode || 'NB-' + product._id.slice(-6)}
                            </div>
                          </div>
                          <div className="flex items-end justify-between mt-2">
                            <div>
                              <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">VALUATION</p>
                              <div className="flex flex-col">
                                {product.discount > 0 && (
                                  <span className="text-[9px] text-slate-300 line-through leading-none mb-1">₹{product.sellingPrice}</span>
                                )}
                                <span className="font-bold text-slate-900 text-lg tracking-tight leading-none">₹{product.sellingPrice - product.discount}</span>
                              </div>
                            </div>
                            <div className={`px-2.5 py-1 rounded-xl text-[9px] font-semibold uppercase tracking-widest border ${product.stock > (product.lowStockThreshold || 10) ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse'}`}>
                              Stock: {product.stock}
                            </div>
                          </div>
                        </div>
                      </div>
                      {isAuthorized && (
                        <div className="flex gap-2 pt-3 border-t border-slate-50">
                          <button onClick={() => handleEdit(product)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all border border-slate-100 hover:border-indigo-100">
                            <Edit3 size={12} /> Edit Node
                          </button>
                          <button onClick={() => deleteProduct(product._id)} className="w-12 h-10 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100"><Trash2 size={16} /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-slate-50/50">
                    <tr className="text-xs font-semibold uppercase text-slate-500 border-b border-slate-100">
                      <th className="px-6 py-4">Product Protocol</th>
                      <th className="px-6 py-4 text-center">Stock Node</th>
                      <th className="px-6 py-4 text-center">Factual Price</th>
                      <th className="px-6 py-4 text-center">Node State</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {groupedProducts[category].map((product: any) => {
                      const productImg = getImageUrl(product.image);
                      return (
                        <tr key={product._id} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                {productImg ? (
                                  <img
                                    src={productImg}
                                    alt={product.name}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                ) : null}
                                <Box size={16} className={`text-slate-300 ${productImg ? 'hidden' : ''}`} />
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 text-sm leading-tight">{product.name}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{product.barcode || 'NB-' + product._id.slice(-6)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className="font-semibold text-slate-900 text-sm">{product.stock} {product.unitType}</span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <div className="flex flex-col items-center">
                              {product.discount > 0 && (
                                <span className="text-[10px] text-slate-300 line-through leading-none mb-1">₹{product.sellingPrice}</span>
                              )}
                              <span className="font-bold text-slate-900 text-sm">₹{product.sellingPrice - (product.discount || 0)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className={`${product.stock > (product.lowStockThreshold || 10) ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border shadow-sm`}>
                              {product.stock > (product.lowStockThreshold || 10) ? 'AVAILABLE' : 'CRITICAL'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {isAuthorized && (
                                <>
                                  <button onClick={() => handleEdit(product)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-lg transition-all active:scale-75 shadow-sm shadow-indigo-100/10"><Edit3 size={13} /></button>
                                  <button onClick={() => deleteProduct(product._id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all active:scale-75"><Trash2 size={13} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>


      {/* FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300 pt-20 pb-20 p-2 sm:p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in duration-300 max-h-full sm:max-h-[95vh] flex flex-col">
            <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-semibold tracking-tight uppercase">{editId ? 'Update Product Node' : 'Product Node Initialization'}</h3>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest opacity-80 mt-0.5">Diagnostic ID: {editId || 'NEW_NODE'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 bg-white/10 hover:bg-rose-500 hover:text-white rounded-xl transition-all text-xs font-semibold uppercase tracking-widest text-slate-300">Back</button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Product Name</label>
                  <input
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter product title..."
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-base font-medium focus:bg-white focus:border-indigo-600 outline-none transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Image URL (Direct Link)</label>
                  <input
                    value={formData.image}
                    onChange={e => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://example.com/item.jpg"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs  outline-none shadow-sm focus:bg-white focus:border-indigo-600"
                  />
                  <p className="text-[7px] text-slate-400 font-semibold uppercase tracking-wider ml-1">
                    Tip: Right-click image &gt; "Copy image address" for direct link.
                  </p>
                </div>
              </div>


              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Category</label>
                  <select
                    value={showCustomCategory ? "OTHER" : formData.category}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "OTHER") { setShowCustomCategory(true); }
                      else { setShowCustomCategory(false); handleCategoryChange(val); }
                    }}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold outline-none shadow-sm focus:bg-white focus:border-indigo-600"
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
                    className="w-full px-5 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-semibold outline-none"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold text-rose-400 uppercase tracking-widest ml-1">Original MRP (Base ₹)</label>
                  <input
                    required type="number"
                    value={formData.sellingPrice}
                    onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })}
                    placeholder="e.g. 999"
                    className="w-full px-5 py-3.5 bg-rose-50/10 border border-rose-100 rounded-xl text-sm font-semibold outline-none shadow-sm focus:bg-white focus:border-rose-400 text-rose-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold text-emerald-500 uppercase tracking-widest ml-1">Promo Sale Price (Optional)</label>
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
                    className="w-full px-5 py-3.5 bg-emerald-50/20 border border-emerald-100 rounded-xl text-sm font-semibold text-emerald-700 outline-none shadow-sm focus:bg-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Sale Deadline (Date & Time)</label>
                <input
                  type="datetime-local"
                  value={formData.saleEndDate}
                  onChange={e => setFormData({ ...formData, saleEndDate: e.target.value })}
                  className="w-full px-5 py-3.5 bg-rose-50/20 border border-rose-100 rounded-xl text-xs font-semibold outline-none shadow-sm focus:bg-white focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Unit Specification</label>
                  <div className="flex gap-2">
                    <input
                      required type="number"
                      min="0"
                      step="any"
                      value={formData.unitValue}
                      onChange={e => setFormData({ ...formData, unitValue: e.target.value })}
                      className="w-20 px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold outline-none"
                    />
                    <select
                      value={formData.unitType}
                      onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
                      className="flex-1 px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-900 outline-none"
                    >
                      <option value="unit">Unit</option><option value="kg">KG</option><option value="gm">GM</option><option value="l">Ltr</option><option value="ml">ML</option><option value="pack">Pack</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest ml-1">GST Rate (%)</label>
                  <select
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold outline-none appearance-none"
                  >
                    <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Initial Stock</label>
                <input
                  required type="number"
                  min="0"
                  value={formData.stock}
                  onChange={e => setFormData({ ...formData, stock: Math.max(0, Number(e.target.value)).toString() })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-50 rounded-xl text-sm font-semibold outline-none"
                />
              </div>


              <footer className="pt-4 border-t border-slate-100 bg-white flex gap-3 shrink-0">
                <button type="button" onClick={closeModal} className="flex-1 py-4 bg-white text-slate-600 rounded-2xl text-xs sm:text-sm font-semibold border border-slate-200 hover:bg-slate-100 transition-all uppercase tracking-widest">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading} className="flex-[2] py-4 bg-slate-950 text-white rounded-2xl text-xs sm:text-sm font-semibold shadow-xl hover:bg-indigo-600 transition-all uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2">
                  {formLoading ? "Synchronizing..." : editId ? 'Update Hardware' : 'Provision Hardware'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function InventoryStat({ label, value, icon: Icon, color, sub }: any) {
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
}

