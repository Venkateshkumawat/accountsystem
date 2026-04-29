import React, { useState, useEffect } from 'react';
import { Edit3, Zap, Lock, Filter, Search, ShieldCheck, ShieldAlert, Settings, Package, FileText, RefreshCcw, Trash2, ToggleRight, ToggleLeft, X } from 'lucide-react';
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

  if (!timeLeft) return <span className="text-rose-600 font-semibold animate-pulse">Expired</span>;

  const isLow = timeLeft.days === 0 && timeLeft.hours < 24;

  return (
    <span className={`font-semibold tracking-tight ${isLow ? 'text-rose-500 animate-pulse' : 'text-indigo-500'}`}>
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
      await api.patch(`/superadmin/auth/business-admins/${biz.businessId}/status`, { action, reason: 'Manual override by admin.' });
      notifySuccess(`Business ${biz.businessId} shifted to ${action.toUpperCase()}`);
      fetchBusinesses();
      syncRegistry();
    } catch { alert('Status update failed.'); }
  };

  const handleUpdateFeatures = async (features: any) => {
    try {
      await api.patch(`/superadmin/auth/business-admins/${showFeatureModal.businessId}/features`, { features });
      notifyInfo(`Features updated for business ${showFeatureModal.businessId}`);
      setShowFeatureModal({ ...showFeatureModal, features });
      fetchBusinesses();
      syncRegistry();
    } catch { alert('Update failed.'); }
  };

  const handleUpdateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/superadmin/auth/business-admins/${editModal.businessId}`, editFormData);
      notifySuccess(`Configuration updated for business ${editModal.businessId}`);
      setEditModal(null);
      fetchBusinesses();
      syncRegistry();
    } catch { alert('Sync failed.'); }
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

  // ── Modal Presence Protocol ──────────────────────────────────────────
  useEffect(() => {
    if (showFeatureModal || editModal) {
      document.body.classList.add('modal-open-nexus');
    } else {
      document.body.classList.remove('modal-open-nexus');
    }
    return () => document.body.classList.remove('modal-open-nexus');
  }, [showFeatureModal, editModal]);

  return (
    <div className="p-1 sm:p-3 space-y-2 pb-10 relative font-inter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 px-1">
        <div>
           <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Master Accounts</h1>
           <p className="text-xs font-medium text-slate-400 mt-0.5">Manage business admin accounts and subscription limits</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or ID..."
              className="pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-64"
            />
          </div>
          <button
            onClick={fetchBusinesses}
            className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 transition-all rounded-xl shadow-sm hover:bg-slate-50"
          >
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {['all', 'active', 'suspended', 'expired'].map(f => (
          <button
            key={f} onClick={() => setFilter(f as any)}
            className={`px-5 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all ${filter === f ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
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
              <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-4">BUSINESS DETAILS</th>
                <th className="px-6 py-4">ADMINISTRATOR</th>
                <th className="px-6 py-4">PLAN & STATUS</th>
                <th className="px-6 py-4 text-center">PRIVILEGES</th>
                <th className="px-6 py-4">USAGE LIMITS</th>
                <th className="px-6 py-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-200 uppercase font-black tracking-widest text-sm">Loading Businesses...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-200 uppercase font-black tracking-widest text-sm">No matching businesses</td></tr>
              ) : filtered.map(biz => (
                <tr key={biz._id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-slate-900 leading-tight mb-1">{biz.businessName}</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{biz.businessId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-slate-900 leading-none">{biz.ownerFullName}</p>
                    <p className="text-[11px] font-medium text-slate-400 mt-2 hover:text-indigo-600 transition-colors cursor-pointer">{biz.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 mb-2">
                       <span className={`px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider ${biz.plan === 'enterprise' ? 'bg-violet-600 text-white shadow-sm' : biz.plan === 'pro' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>{biz.plan}</span>
                       <span className={`px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider ${biz.status === 'active' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-rose-500 text-white shadow-sm'}`}>{biz.status}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                        Start: <span className="text-slate-900">{biz.planStartDate ? new Date(biz.planStartDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                      </div>
                      <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                        Exp: <CountdownTimer endDate={biz.planEndDate} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => setShowFeatureModal(biz)} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all border border-slate-200">
                      <Settings size={14} />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-3 w-40">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-semibold uppercase text-slate-400">
                          <span className="flex items-center gap-1">Invoices</span>
                          <span className="text-slate-900">{biz.currentInvoiceCount} / {biz.invoiceLimit}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${((biz.currentInvoiceCount || 0) / biz.invoiceLimit) > 0.9 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                            style={{ width: `${Math.min(100, ((biz.currentInvoiceCount || 0) / biz.invoiceLimit) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-semibold uppercase text-slate-400">
                          <span className="flex items-center gap-1">Products</span>
                          <span className="text-slate-900">{biz.currentSkuCount} / {biz.skuLimit || '∞'}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${((biz.currentSkuCount || 0) / (biz.skuLimit || 1)) > 0.9 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, ((biz.currentSkuCount || 0) / (biz.skuLimit || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleToggleStatus(biz)} className={`p-2.5 rounded-xl transition-all ${biz.status === 'active' ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}>
                      {biz.status === 'active' ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                    </button>
                    <button
                      onClick={() => { setEditModal(biz); setEditFormData({ ...biz, planStartDate: biz.planStartDate?.slice(0, 16) || '', planEndDate: biz.planEndDate?.slice(0, 16) || '', amountPaid: biz.planHistory?.[biz.planHistory.length - 1]?.amountPaid || 0 }); }}
                      className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all border border-slate-200"
                    >
                      <Edit3 size={14} />
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
            <div className="py-20 text-center text-xs font-semibold text-slate-300 tracking-widest">Loading businesses...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-xs font-semibold text-slate-300 tracking-widest">No results found</div>
          ) : filtered.map(biz => (
            <div key={biz._id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-900 leading-none">{biz.businessName}</p>
                  <p className="text-xs font-medium text-slate-400 mt-1.5">{biz.businessId}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${biz.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                  {biz.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-dashed border-slate-200">
                <div>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Invoices</p>
                  <p className="text-xs font-semibold text-slate-700 leading-none">{biz.currentInvoiceCount || 0} / {biz.invoiceLimit}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Products</p>
                  <p className="text-xs font-semibold text-slate-700 leading-none">{biz.currentSkuCount || 0} / {biz.skuLimit}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-[9px] font-semibold text-slate-400 uppercase flex items-center gap-1">
                  EXP: <CountdownTimer endDate={biz.planEndDate} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowFeatureModal(biz)} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400"> <Settings size={14} /> </button>
                  <button onClick={() => handleToggleStatus(biz)} className={`p-2 rounded-lg ${biz.status === 'active' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}> {biz.status === 'active' ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />} </button>
                  <button 
                    onClick={() => { setEditModal(biz); setEditFormData({ ...biz, planStartDate: biz.planStartDate?.slice(0, 16) || '', planEndDate: biz.planEndDate?.slice(0, 16) || '', amountPaid: biz.planHistory?.[biz.planHistory.length - 1]?.amountPaid || 0 }); }}
                    className="p-2 bg-slate-900 text-white rounded-lg"
                  > 
                    <Edit3 size={14} /> 
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showFeatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[340px] rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
               <div>
                <h3 className="text-base font-semibold text-white">Business Privileges</h3>
                <p className="text-indigo-400 text-xs font-medium mt-1">{showFeatureModal.businessName}</p>
              </div>
              <button onClick={() => setShowFeatureModal(null)} className="p-2 text-white/40 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="p-4 space-y-2 overflow-y-auto no-scrollbar">
              <div className="space-y-1.5">
                {[
                  { key: 'pos', name: 'POS (Terminal)' },
                  { key: 'inventory', name: 'Inventory Registry' },
                  { key: 'purchases', name: 'Procurement' },
                  { key: 'accounting', name: 'Accounting' },
                  { key: 'reports', name: 'Reporting' },
                ].map(feat => {
                  const isActive = showFeatureModal.features?.[feat.key] !== false;
                  return (
                    <div key={feat.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-400 transition-all">
                      <span className="text-xs font-semibold text-slate-700 uppercase tracking-widest">{feat.name}</span>
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
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-semibold uppercase text-slate-400">Products Remaining</span>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-900">{Math.max(0, (showFeatureModal.skuLimit || 0) - (showFeatureModal.currentSkuCount || 0))}</span>
                    <span className="text-[9px] font-medium text-slate-300 ml-1">/ {showFeatureModal.skuLimit}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-semibold uppercase text-slate-400">Invoices Remaining</span>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-rose-600">{Math.max(0, (showFeatureModal.invoiceLimit || 0) - (showFeatureModal.currentInvoiceCount || 0))}</span>
                    <span className="text-[9px] font-medium text-slate-300 ml-1">/ {showFeatureModal.invoiceLimit}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center border-t border-slate-50 pt-2">
                  <span className="text-[9px] font-semibold uppercase text-slate-400">Activation</span>
                  <span className="text-[9px] font-medium text-slate-500 uppercase">{showFeatureModal.planStartDate ? new Date(showFeatureModal.planStartDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[9px] font-semibold uppercase text-slate-400">Deadline</span>
                  <div className="text-right flex items-center gap-1.5 justify-end">
                    <span className="text-[9px] font-medium text-slate-300">{showFeatureModal.planEndDate ? new Date(showFeatureModal.planEndDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                    <CountdownTimer endDate={showFeatureModal.planEndDate} />
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                <p className="text-[8px] font-semibold text-indigo-700 leading-tight uppercase tracking-tighter">Deactivating modules will freeze business access immediately.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[400px] rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base font-semibold text-white">Account Details</h3>
                <p className="text-indigo-400 text-xs font-medium mt-1">Edit business account</p>
              </div>
              <button onClick={() => setEditModal(null)} className="p-2 text-white/40 hover:text-white"><X size={20} /></button>
            </div>

            <form onSubmit={handleUpdateNode} className="p-4 space-y-3 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest">Business Name</label>
                  <input
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm font-semibold focus:bg-white outline-none"
                    value={editFormData.businessName}
                    onChange={e => setEditFormData({ ...editFormData, businessName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest">Admin Name</label>
                  <input
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm font-semibold focus:bg-white outline-none"
                    value={editFormData.ownerFullName}
                    onChange={e => setEditFormData({ ...editFormData, ownerFullName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest">Plan</label>
                  <select
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium outline-none"
                    value={editFormData.plan}
                    onChange={e => setEditFormData({ ...editFormData, plan: e.target.value })}
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest">Plan Start Date</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium outline-none"
                    value={editFormData.planStartDate}
                    onChange={e => setEditFormData({ ...editFormData, planStartDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest">Plan End Date</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2.5 bg-slate-50 border-none rounded-lg text-sm font-medium outline-none"
                    value={editFormData.planEndDate}
                    onChange={e => setEditFormData({ ...editFormData, planEndDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest">Amount Paid (₹)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 bg-slate-50 border-none rounded-lg text-sm font-semibold outline-none"
                    value={editFormData.amountPaid || 0}
                    onChange={e => setEditFormData({ ...editFormData, amountPaid: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest">Product Limit</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm font-semibold outline-none"
                    value={editFormData.skuLimit}
                    onChange={e => setEditFormData({ ...editFormData, skuLimit: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest">Invoice Limit</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm font-semibold outline-none"
                    value={editFormData.invoiceLimit}
                    onChange={e => setEditFormData({ ...editFormData, invoiceLimit: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest">Status</label>
                <select
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium outline-none"
                  value={editFormData.status}
                  onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

               <button
                type="submit"
                className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 mt-4"
              >
                Save Changes
              </button>
           </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterAccount;
