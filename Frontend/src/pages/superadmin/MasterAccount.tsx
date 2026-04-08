import React, { useState, useEffect } from 'react';
import { Edit3, Zap, Lock, Filter, Search, ShieldCheck, ShieldAlert, Settings, Package, FileText, RefreshCcw, Trash2, ToggleRight, ToggleLeft } from 'lucide-react';
import api from '../../services/api';
import socketService from '../../services/socket';
import { useNotify } from '../../context/NotificationContext';

const CountdownTimer: React.FC<{ endDate: string }> = ({ endDate }) => {
  const calculateTimeLeft = () => {
    const difference = new Date(endDate).getTime() - new Date().getTime();
    if (difference <= 0) return null;
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // 1-minute interval for performance
    return () => clearInterval(timer);
  }, [endDate]);

  if (!timeLeft) return <span className="text-rose-600 font-black animate-pulse">EXPIRED 00:00:00</span>;

  const isLow = timeLeft.days === 0 && timeLeft.hours < 24;

  return (
    <span className={`font-black tracking-tighter ${isLow ? 'text-rose-500 animate-pulse' : 'text-indigo-500'}`}>
      {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
    </span>
  );
};

const MasterAccount: React.FC = () => {
  const { notifySuccess, notifyInfo, fetchNotifications: syncRegistry } = useNotify();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended' | 'expired'>('all');
  const [showFeatureModal, setShowFeatureModal] = useState<any>(null);
  const [editModal, setEditModal] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/superadmin/auth/businesses');
      setBusinesses(res.data.businesses);
    } catch { } finally { setLoading(false); }
  };

  const handleToggleStatus = async (biz: any) => {
    const action = biz.status === 'active' ? 'suspend' : 'activate';
    try {
      await api.patch(`/superadmin/auth/business-admins/${biz.businessId}/status`, { action, reason: 'Manual override by master admin.' });
      notifySuccess(`Node ${biz.businessId} shifted to ${action.toUpperCase()}`);
      fetchBusinesses();
      syncRegistry();
    } catch { alert('Deployment state transition failed.'); }
  };

  const handleUpdateFeatures = async (features: any) => {
    try {
      await api.patch(`/superadmin/auth/business-admins/${showFeatureModal.businessId}/features`, { features });
      notifyInfo(`Capability matrix updated for node ${showFeatureModal.businessId}`);
      setShowFeatureModal({ ...showFeatureModal, features });
      fetchBusinesses();
      syncRegistry();
    } catch { alert('Protocol update failed.'); }
  };

  const handleUpdateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/superadmin/auth/business-admins/${editModal.businessId}`, editFormData);
      notifySuccess(`Configuration synchronized for node ${editModal.businessId}`);
      setEditModal(null);
      fetchBusinesses();
      syncRegistry();
    } catch { alert('Protocol sync failed.'); }
  };

  useEffect(() => {
    fetchBusinesses();

    const handleSkuUpdate = (payload: any) => {
      setBusinesses(prev => prev.map(biz => {
        if (biz.businessId === payload.businessId || biz._id === payload.businessId) {
          return { ...biz, currentSkuCount: payload.usedSku };
        }
        return biz;
      }));
    };

    socketService.on('skuUpdated', handleSkuUpdate);
    return () => { socketService.off('skuUpdated', handleSkuUpdate); };
  }, []);

  const filtered = businesses.filter(b => {
    if (search && !(b.businessName?.toLowerCase().includes(search.toLowerCase())) && !(b.businessId?.toLowerCase().includes(search.toLowerCase()))) return false;
    if (filter === 'active' && b.status !== 'active') return false;
    if (filter === 'suspended' && b.status !== 'suspended') return false;
    if (filter === 'expired' && (!b.planEndDate || new Date(b.planEndDate) > new Date())) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-20 relative font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors pointer-events-none" size={14} />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH NODE / ID"
              className="pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-xl shadow-sm text-xs font-black uppercase tracking-widest focus:outline-none focus:border-slate-900 transition-all w-48 lg:w-72 h-11"
            />
          </div>
          <button
            onClick={fetchBusinesses}
            className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 transition-all rounded-xl shadow-sm"
          >
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {['all', 'active', 'suspended', 'expired'].map(f => (
          <button
            key={f} onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-100 rounded-[1.5rem] shadow-sm overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Metadata / Node ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrator</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Monetization</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Capabilities</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usage Registry</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Health</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Overrides</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-200 uppercase font-black tracking-widest text-sm">Indexing Grid...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-200 uppercase font-black tracking-widest text-sm">No matching nodes</td></tr>
              ) : filtered.map(biz => (
                <tr key={biz._id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <p className="text-[11px] font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase leading-none mb-1">{biz.businessName}</p>
                    <span className="text-[8px] font-black text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-100">{biz.businessId}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[11px] font-black text-slate-900 leading-none">{biz.ownerFullName}</p>
                    <p className="text-[9px] font-bold text-slate-400 lowercase mt-0.5 italic leading-none">{biz.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className={`text-[9px] font-black uppercase tracking-tighter mb-0.5 ${biz.plan === 'enterprise' ? 'text-violet-600' : biz.plan === 'pro' ? 'text-indigo-600' : 'text-slate-400'}`}>{biz.plan}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-none mt-1">
                      EXP: <CountdownTimer endDate={biz.planEndDate} />
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setShowFeatureModal(biz)} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-slate-100">
                      <Settings size={12} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[7px] font-black uppercase text-slate-400">
                          <span className="flex items-center gap-1"><FileText size={8} /> INV</span>
                          <span className="text-slate-900">{biz.currentInvoiceCount || 0} / {biz.invoiceLimit}</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${((biz.currentInvoiceCount || 0) / biz.invoiceLimit) > 0.9 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                            style={{ width: `${Math.min(100, ((biz.currentInvoiceCount || 0) / biz.invoiceLimit) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[7px] font-black uppercase text-slate-400">
                          <span className="flex items-center gap-1"><Package size={8} /> SKU</span>
                          <span className="text-slate-900">{biz.currentSkuCount || 0} / {biz.skuLimit || '∞'}</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${((biz.currentSkuCount || 0) / (biz.skuLimit || 1)) > 0.9 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, ((biz.currentSkuCount || 0) / (biz.skuLimit || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${biz.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' : 'bg-rose-50 text-rose-600 border-rose-100/50'}`}>
                      {biz.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1.5">
                    <button onClick={() => handleToggleStatus(biz)} className={`p-2 rounded-lg transition-all shadow-sm ${biz.status === 'active' ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}>
                      {biz.status === 'active' ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
                    </button>
                    <button
                      onClick={() => { setEditModal(biz); setEditFormData({ ...biz, planEndDate: biz.planEndDate?.slice(0, 16) || '' }); }}
                      className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-900 hover:text-white transition-all border border-slate-100"
                    >
                      <Edit3 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View / Cards */}
        <div className="lg:hidden p-4 space-y-4">
          {loading ? (
            <div className="py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">Indexing Nodes...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">No Discovery Result</div>
          ) : filtered.map(biz => (
            <div key={biz._id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-black text-slate-900 uppercase leading-none">{biz.businessName}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase mt-1.5">{biz.businessId}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${biz.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                  {biz.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-dashed border-slate-200">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Invoices</p>
                  <p className="text-[10px] font-black text-slate-700 leading-none">{biz.currentInvoiceCount || 0} / {biz.invoiceLimit}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">SKU Cap</p>
                  <p className="text-[10px] font-black text-slate-700 leading-none">{biz.currentSkuCount || 0} / {biz.skuLimit}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  EXP: <CountdownTimer endDate={biz.planEndDate} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowFeatureModal(biz)} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400"> <Settings size={14} /> </button>
                  <button onClick={() => handleToggleStatus(biz)} className={`p-2 rounded-lg ${biz.status === 'active' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}> {biz.status === 'active' ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />} </button>
                  <button className="p-2 bg-slate-900 text-white rounded-lg"> <Edit3 size={14} /> </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showFeatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[340px] rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden shrink-0">
              <Zap className="absolute -right-4 -top-4 opacity-10 rotate-12" size={60} />
              <div className="relative z-10">
                <h3 className="text-sm font-black italic tracking-tighter uppercase leading-none">Capability Matrix</h3>
                <p className="text-indigo-400 text-[9px] uppercase font-black tracking-widest mt-1">{showFeatureModal.businessName}</p>
              </div>
              <button onClick={() => setShowFeatureModal(null)} className="p-1.5 text-white/40 hover:text-white transition-colors relative z-10"><Trash2 size={16} className="rotate-45" /></button>
            </div>

            <div className="p-4 space-y-2 overflow-y-auto no-scrollbar">
              <div className="space-y-1.5">
                {[
                  { key: 'pos', name: 'POS (Terminal)' },
                  { key: 'inventory', name: 'Inventory Registry' },
                  { key: 'purchases', name: 'Procurement' },
                  { key: 'accounting', name: 'Nexus Ledger' },
                  { key: 'reports', name: 'Reporting' },
                ].map(feat => {
                  const isActive = showFeatureModal.features?.[feat.key] !== false;
                  return (
                    <div key={feat.key} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-all group">
                      <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest italic">{feat.name}</span>
                      <button
                        onClick={() => handleUpdateFeatures({ ...showFeatureModal.features, [feat.key]: !isActive })}
                        className={`transition-all duration-300 ${isActive ? 'text-indigo-600' : 'text-slate-300'}`}
                      >
                        {isActive ? <ToggleRight size={24} strokeWidth={1.5} /> : <ToggleLeft size={24} strokeWidth={1.5} />}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 border border-slate-100 rounded-xl bg-white space-y-2">
                <div className="flex justify-between items-center text-[9px]">
                  <span className="font-black uppercase text-slate-400">SKU REMAINING</span>
                  <div className="text-right">
                    <span className="font-black text-slate-900">{Math.max(0, (showFeatureModal.skuLimit || 0) - (showFeatureModal.currentSkuCount || 0))}</span>
                    <span className="text-[7px] font-bold text-slate-300 uppercase ml-1">/ {showFeatureModal.skuLimit}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[9px]">
                  <span className="font-black uppercase text-slate-400">INVOICE REMAINING</span>
                  <div className="text-right">
                    <span className="font-black text-rose-600">{Math.max(0, (showFeatureModal.invoiceLimit || 0) - (showFeatureModal.currentInvoiceCount || 0))}</span>
                    <span className="text-[7px] font-bold text-slate-300 uppercase ml-1">/ {showFeatureModal.invoiceLimit}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center border-t border-slate-50 pt-2 text-[9px]">
                  <span className="font-black uppercase text-slate-400">DEADLINE</span>
                  <div className="text-right font-black flex items-center gap-1.5 justify-end">
                    <span className="text-slate-300 text-[8px]">{showFeatureModal.planEndDate ? new Date(showFeatureModal.planEndDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                    <CountdownTimer endDate={showFeatureModal.planEndDate} />
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                <p className="text-[8px] font-bold text-indigo-700 leading-tight italic uppercase tracking-tighter">Deactivating modules will freeze node access immediately.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[400px] rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-black italic tracking-tighter uppercase leading-none">Edit Node Configuration</h3>
                <p className="text-indigo-400 text-[9px] uppercase font-black tracking-widest mt-1">ID: {editModal.businessId}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="p-1.5 text-white/40 hover:text-white"><Trash2 size={16} className="rotate-45" /></button>
            </div>

            <form onSubmit={handleUpdateNode} className="p-4 space-y-3 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Business Name</label>
                  <input
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold focus:bg-white outline-none"
                    value={editFormData.businessName}
                    onChange={e => setEditFormData({ ...editFormData, businessName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Admin Name</label>
                  <input
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold focus:bg-white outline-none"
                    value={editFormData.ownerFullName}
                    onChange={e => setEditFormData({ ...editFormData, ownerFullName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Subscription Plan</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold outline-none"
                    value={editFormData.plan}
                    onChange={e => setEditFormData({ ...editFormData, plan: e.target.value })}
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Expiration Date & Time</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold outline-none"
                    value={editFormData.planEndDate}
                    onChange={e => setEditFormData({ ...editFormData, planEndDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">SKU Limit</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold outline-none"
                    value={editFormData.skuLimit}
                    onChange={e => setEditFormData({ ...editFormData, skuLimit: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Invoice Limit</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold outline-none"
                    value={editFormData.invoiceLimit}
                    onChange={e => setEditFormData({ ...editFormData, invoiceLimit: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400">Node Status</label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold outline-none"
                  value={editFormData.status}
                  onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all mt-4"
              >
                Verify & Sync node
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterAccount;
