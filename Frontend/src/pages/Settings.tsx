import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  User, Shield, Bell, Save, Users, Plus, X, Trash2, Edit3,
  Eye, EyeOff, CheckCircle, XCircle, AlertTriangle,
  Lock, KeyRound, Building2, RefreshCw, ChevronRight, Info, Zap,
  Calendar, Award, ArrowUpCircle, Clock, Check, Box, ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useRazorpay } from '../hooks/useRazorpay';
import { INDIAN_STATES } from '../constants/indianStates';
import { validateGSTIN, validateMobile, validatePincode } from '../utils/validation';

const PLAN_PRICES: Record<string, number> = {
  'free': 0,
  'pro': 999,
  'enterprise': 4999
};

// ─── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ msg, type, close }: { msg: string; type: 'success' | 'error'; close: () => void }) {
  useEffect(() => { const t = setTimeout(close, 4500); return () => clearTimeout(t); }, [close]);
  return (
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-sm font-semibold ${type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
      {msg}
      <button onClick={close} className="ml-2 opacity-70 hover:opacity-100"><X size={13} /></button>
    </div>
  );
}

const ALL_PERMISSIONS = ['POS', 'INVENTORY', 'PURCHASES', 'REPORTS', 'ACCOUNTING', 'GST_PORTAL', 'CUSTOMERS', 'STAFF', 'AUDIT_LOGS', 'SETTINGS'];

export default function Settings() {
  const { role } = useAuth();
  const { handlePayment } = useRazorpay();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'Profile';
  });
  const [user, setUser] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [planData, setPlanData] = useState<any>(null);
  const [renewing, setRenewing] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  // ── Plan Watch (Live Countdown) ──────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  const updateTimeLeft = useCallback(() => {
    if (!planData?.expiryDate) return;
    const now = new Date().getTime();
    const expiry = new Date(planData.expiryDate).getTime();
    const diff = expiry - now;

    if (diff <= 0) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0 });
      return;
    }

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    setTimeLeft({ days: d, hours: h, minutes: m });
  }, [planData?.expiryDate]);

  useEffect(() => {
    const timer = setInterval(updateTimeLeft, 60000); // Update every minute
    updateTimeLeft();
    return () => clearInterval(timer);
  }, [updateTimeLeft]);



  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type });

  // ── Profile form ────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    name: '', gstin: '', mobileNumber: '', address: '', city: '', state: '', pincode: ''
  });

  // ── Security form ───────────────────────────────────────────────────────────
  const [security, setSecurity] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState({ cur: false, new: false, con: false });
  const [pwdLoading, setPwdLoading] = useState(false);

  // ── Staff modal ─────────────────────────────────────────────────────────────
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editStaff, setEditStaff] = useState<any | null>(null);
  const [deleteStaffId, setDeleteStaffId] = useState<string | null>(null);
  const defaultStaff = { name: '', email: '', mobile: '', password: '', confirmPassword: '', role: 'cashier', permissions: [] as string[], referenceId: '' };
  const [staffForm, setStaffForm] = useState(defaultStaff);
  const [staffSubmitting, setStaffSubmitting] = useState(false);

  // ── Alerts state (localStorage-backed) ─────────────────────────────────────
  const [alerts, setAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem('bb_alerts');
      return saved ? JSON.parse(saved) : {
        lowStock: true,
        invoicePaid: true,
        newStaffLogin: false,
        planExpiry: true,
        dailySummary: false,
        failedLogin: true,
      };
    } catch { return { lowStock: true, invoicePaid: true, newStaffLogin: false, planExpiry: true, dailySummary: false, failedLogin: true }; }
  });

  // ── Offers state ──────────────────────────────────────────────────────────
  const [offers, setOffers] = useState<any[]>([]);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerForm, setOfferForm] = useState({
    name: '', type: 'PERCENTAGE', value: '', productId: '',
    buyQty: '', getQty: '', minQty: '', discountPercentage: '',
    startDate: '', endDate: '',
    isActive: true
  });
  const [productsForOffers, setProductsForOffers] = useState<any[]>([]);
  const [offerCategories, setOfferCategories] = useState<string[]>([]);
  const [selectedOfferCategory, setSelectedOfferCategory] = useState<string>('All');
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [editOfferId, setEditOfferId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [userRes, staffRes, planRes, offerRes, prodRes, catRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/staff'),
        api.get('/businesses/plan-status'),
        api.get('/offers').catch(() => ({ data: { data: [] } })),
        api.get('/products?limit=500').catch(() => ({ data: { data: [] } })),
        api.get('/products/categories').catch(() => ({ data: { data: [] } })),
      ]);
      const u = userRes.data;
      setUser(u);
      const biz = u.businessObjectId || {};
      setBusiness(biz);
      setProfile({
        name: u.name || '',
        gstin: biz.gstin || '',
        mobileNumber: biz.mobileNumber || '',
        address: biz.location?.address || '',
        city: biz.location?.city || '',
        state: biz.location?.state || '',
        pincode: biz.location?.pincode || '',
      });
      setStaff(staffRes.data?.data || []);
      setPlanData(planRes.data);
      setOffers(offerRes.data?.data || []);
      setProductsForOffers(prodRes.data?.data || []);
      setOfferCategories(catRes.data?.data || catRes.data || []);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load settings', 'error');
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 📡 Nexus Global Sync: Real-time Registry Update
  useEffect(() => {
    const syncChannel = new BroadcastChannel('nexus_sync');
    const handleSync = (e: MessageEvent) => {
      if (e.data === 'FETCH_PLAN' || e.data === 'DECOMMISSION_WORKSPACE') {
        fetchData();
      }
    };
    syncChannel.addEventListener('message', handleSync);
    return () => {
      syncChannel.removeEventListener('message', handleSync);
      syncChannel.close();
    };
  }, [fetchData]);

  const handleDeleteOffer = async (id: string) => {
    if (!window.confirm('Decommission this campaign node?')) return;
    try {
      await api.delete(`/offers/${id}`);
      showToast('Offer decommissioned');
      const syncChannel = new BroadcastChannel('nexus_sync');
      syncChannel.postMessage('FETCH_DASHBOARD');
      syncChannel.close();
      fetchData();
    } catch { showToast('Decommissioning failed', 'error'); }
  };

  const handleEditOfferClick = (o: any) => {
    setEditOfferId(o._id);
    setOfferForm({
      name: o.name,
      type: o.type,
      value: o.value || '',
      productId: o.productId?._id || o.productId || '',
      buyQty: o.buyQty || '',
      getQty: o.getQty || '',
      minQty: o.minQty || '',
      discountPercentage: o.discountPercentage || '',
      startDate: o.startDate ? new Date(o.startDate).toISOString().slice(0, 16) : '',
      endDate: o.endDate ? new Date(o.endDate).toISOString().slice(0, 16) : '',
      isActive: o.isActive ?? true
    });
    setShowOfferForm(true);
  };

  // ── Update Profile ──────────────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/businesses/update-me', profile);
      // Also update user name
      showToast('Profile updated successfully!');
      fetchData();

      // Notify other tabs
      const sync = new BroadcastChannel('nexus_sync');
      sync.postMessage('FETCH_DASHBOARD');
      sync.close();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally { setLoading(false); }
  };

  // ── Change Password ─────────────────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (security.newPassword !== security.confirmPassword) {
      showToast('New passwords do not match', 'error'); return;
    }
    if (security.newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error'); return;
    }
    setPwdLoading(true);
    try {
      await api.post('/staff/change-password', {
        currentPassword: security.currentPassword,
        newPassword: security.newPassword,
      });
      showToast('Password changed successfully!');
      setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Password change failed', 'error');
    } finally { setPwdLoading(false); }
  };

  // ── Add Staff (from Settings) ───────────────────────────────────────────────
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (staffForm.password !== staffForm.confirmPassword) {
      showToast('Passwords do not match', 'error'); return;
    }
    if (staffForm.password.length < 6) {
      showToast('Password must be at least 6 characters', 'error'); return;
    }
    if (!staffForm.referenceId.trim()) { showToast('Business Node ID is required', 'error'); return; }
    setStaffSubmitting(true);
    try {
      await api.post('/staff', {
        ...staffForm,
        referenceId: staffForm.referenceId.trim().toUpperCase()
      });
      showToast('Staff added successfully!');
      setShowStaffForm(false);
      setStaffForm(defaultStaff);
      fetchData();

      const sync = new BroadcastChannel('nexus_sync');
      sync.postMessage('FETCH_DASHBOARD');
      sync.postMessage('SYNC_STAFF');
      sync.postMessage({ type: 'SYNC_NOTIFICATIONS' });
      sync.close();

    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to add staff', 'error');
    } finally { setStaffSubmitting(false); }
  };

  // ── Edit Staff ──────────────────────────────────────────────────────────────
  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStaff) return;
    setStaffSubmitting(true);
    try {
      await api.put(`/staff/${editStaff._id}`, {
        name: editStaff.name,
        mobile: editStaff.mobile,
        role: editStaff.role,
        permissions: editStaff.permissions,
      });
      showToast('Staff updated!');
      setEditStaff(null);
      fetchData();

      const sync = new BroadcastChannel('nexus_sync');
      sync.postMessage('SYNC_STAFF');
      sync.postMessage({ type: 'SYNC_NOTIFICATIONS' });
      sync.close();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally { setStaffSubmitting(false); }
  };

  // ── Delete Staff ────────────────────────────────────────────────────────────
  const handleDeleteStaff = async () => {
    if (!deleteStaffId) return;
    try {
      await api.delete(`/staff/${deleteStaffId}`);
      showToast('Staff removed!');
      setDeleteStaffId(null);
      fetchData();

      const sync = new BroadcastChannel('nexus_sync');
      sync.postMessage('SYNC_STAFF');
      sync.postMessage({ type: 'SYNC_NOTIFICATIONS' });
      sync.close();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  // ── Toggle Alert ────────────────────────────────────────────────────────────
  const toggleAlert = (key: string) => {
    const next = { ...alerts, [key]: !alerts[key] };
    setAlerts(next);
    localStorage.setItem('bb_alerts', JSON.stringify(next));
    showToast(`${key} alert ${next[key] ? 'enabled' : 'disabled'}`);
  };

  const handleRenewPlan = async (type: string) => {
    const amount = PLAN_PRICES[type.toLowerCase()] || 0;

    if (amount === 0) {
      // Free plan or unknown plan - direct renewal
      setRenewing(true);
      try {
        await api.post('/businesses/renew-plan', { planType: type, months: 1 });
        showToast("Renewal successful!");
        fetchData();
      } catch (err: any) {
        showToast(err.response?.data?.message || 'Renewal failed', 'error');
      } finally { setRenewing(false); }
      return;
    }

    // Integrated Protocol for Paid Plans
    try {
      await handlePayment({
        amount: amount,
        name: 'NexusBill Subscription',
        description: `Renewing ${type.toUpperCase()} Plan (1 Month)`,
        onSuccess: async (details) => {
          setRenewing(true);
          try {
            await api.post('/businesses/renew-plan', {
              planType: type,
              months: 1,
              razorpayPaymentId: details.razorpay_payment_id,
              razorpayOrderId: details.razorpay_order_id,
              razorpaySignature: details.razorpay_signature
            });
            showToast('Subscription Renewed Successfully!');
            fetchData();
          } catch (err: any) {
            showToast(err.response?.data?.message || 'Backend Verification Failed', 'error');
          } finally { setRenewing(false); }
        },
        onError: (err) => showToast(err.message || 'Payment Cancelled', 'error')
      });
    } catch (err: any) {
      showToast('Payment Gateway Error', 'error');
    }
  };

  const handleResetWorkspace = async () => {
    setResetting(true);
    try {
      const res = await api.post('/businesses/reset-my-workspace');
      showToast(res.data.message);
      setShowResetConfirm(false);
      fetchData();
      // Optional: redirect to dashboard or refresh full app
      setTimeout(() => window.location.href = '/dashboard', 1500);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Workspace reset process failed', 'error');
    } finally { setResetting(false); }
  };


  const ALERT_CONFIG = [
    { key: 'lowStock', label: 'Low Stock Alert', desc: 'Notify when product qty falls below minimum threshold', icon: AlertTriangle, color: 'amber' },
    { key: 'invoicePaid', label: 'Invoice Paid', desc: 'Notify when a customer pays an invoice', icon: CheckCircle, color: 'emerald' },
    { key: 'newStaffLogin', label: 'Staff Login Activity', desc: 'Notify when a staff member logs in', icon: Users, color: 'indigo' },
    { key: 'planExpiry', label: 'Plan Expiry Warning', desc: 'Alert 7 days before your subscription expires', icon: Info, color: 'rose' },
    { key: 'dailySummary', label: 'Daily Business Summary', desc: 'Receive daily sales and activity digest', icon: Bell, color: 'violet' },
    { key: 'failedLogin', label: 'Failed Login Attempts', desc: 'Security alert on suspicious login attempts', icon: Shield, color: 'rose' },
  ];

  const TABS = [
    { id: 'Profile', icon: User, label: 'Profile' },
    { id: 'Staff', icon: Users, label: 'Staff' },
    { id: 'Offers', icon: Zap, label: 'Offers' },
    { id: 'Subscription', icon: Award, label: 'Subscription' },
    { id: 'Security', icon: Shield, label: 'Security' },
    { id: 'Alerts', icon: Bell, label: 'Alerts' },
    { id: 'Advanced', icon: RefreshCw, label: 'Danger Zone' },
  ].filter(tab => {
    if (tab.id === 'Offers' || tab.id === 'Advanced') {
      return role === 'businessAdmin' || role === 'manager';
    }
    return true;
  });


  return (
    <div className=" min-h-screen space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} close={() => setToast(null)} />}

      {/* Reset Workspace Confirm */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-sm w-full border border-rose-100">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-3xl bg-rose-100 flex items-center justify-center mb-4 animate-bounce">
                <AlertTriangle size={32} className="text-rose-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Initialize Global Reset?</h3>
              <p className="text-slate-500 text-xs font-semibold mt-2 uppercase tracking-wide px-4">
                This will permanently purge ALL Product data and Transactions. This cannot be undone.
                This will permanently delete ALL Product data and Transactions. This cannot be undone.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                <label className="text-[10px] font-black text-rose-700 uppercase tracking-widest block mb-2">
                  To proceed, type your Business ID: <span className="font-mono text-rose-900 bg-rose-200 px-1 py-0.5 rounded">{user?.businessId}</span>
                </label>
                <input 
                  type="text" 
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="Enter Business ID"
                  className="w-full px-4 py-3 rounded-xl border border-rose-200 text-sm font-semibold focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all text-center uppercase"
                />
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleResetWorkspace}
                  disabled={resetting || resetConfirmText !== user?.businessId}
                  className="w-full py-4 rounded-2xl bg-rose-600 text-white font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition shadow-xl shadow-rose-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetting ? 'Resetting...' : 'Yes, Reset Workspace'}
                </button>
                <button
                  onClick={() => {
                    setShowResetConfirm(false);
                    setResetConfirmText('');
                  }}
                  disabled={resetting}
                  className="w-full py-3 rounded-2xl bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold font-inter text-slate-900 tracking-tight">System Settings</h1>
          <p className="text-sm font-normal text-slate-500 mt-1">Manage your business profile, team, security, and preferences</p>
        </div>
        {user?.businessId && (
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl w-fit">
            <Building2 size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-700 tracking-tight">BUSINESS ID: {user.businessId}</span>
          </div>
        )}
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ── Sidebar tabs ────────────────────────────────────────── */}
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-medium transition-all whitespace-nowrap w-full ${activeTab === t.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'bg-white text-slate-500 border border-slate-100 hover:border-indigo-200 hover:text-indigo-600'
                }`}>
              <t.icon size={16} />
              {t.label}
              {activeTab === t.id && <ChevronRight size={14} className="ml-auto" />}
            </button>
          ))}
        </div>

        {/* ── Content ─────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-6">

          {/* ════ PROFILE TAB ════ */}
          {activeTab === 'Profile' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Business Profile</h2>
                <p className="text-sm font-normal text-slate-500">Update your business information and address details</p>
              </div>
              <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
                {/* Admin info (read-only) */}
                <div className="p-5 bg-slate-50/80 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Account Owner</p>
                    <p className="text-sm font-semibold text-slate-800">{user?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Registration Email</p>
                    <p className="text-sm font-semibold text-slate-800 break-all">{user?.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Business Name</p>
                    <p className="text-sm font-semibold text-slate-800">{business?.businessName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Business ID</p>
                    <p className="text-sm font-semibold text-indigo-600 font-mono">{user?.businessId || '—'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <SI 
                      label="GSTIN" 
                      placeholder="22AAAAA0000A1Z5" 
                      value={profile.gstin}
                      onChange={(v: string) => setProfile({ ...profile, gstin: v.toUpperCase() })} 
                    />
                    {profile.gstin && !validateGSTIN(profile.gstin) && (
                      <p className="text-[9px] font-black text-rose-500 uppercase tracking-tighter">Invalid GSTIN Pattern</p>
                    )}
                  </div>
                  <SI
                    label="Mobile Number"
                    placeholder="9876543210"
                    value={profile.mobileNumber}
                    onChange={(v: string) => {
                      const clean = v.replace(/\D/g, '').slice(0, 10);
                      setProfile({ ...profile, mobileNumber: clean });
                    }}
                    pattern="[0-9]{10}"
                    maxLength={10}
                    title="Mobile must be exactly 10 digits"
                  />
                  <SI label="City" value={profile.city} onChange={(v: string) => setProfile({ ...profile, city: v })} />
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">State</label>
                    <select 
                      value={profile.state} 
                      onChange={e => setProfile({ ...profile, state: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition appearance-none"
                    >
                      <option value="">Select State</option>
                      {INDIAN_STATES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <SI 
                      label="Pincode" 
                      value={profile.pincode} 
                      onChange={(v: string) => setProfile({ ...profile, pincode: v.replace(/\D/g, '').slice(0, 6) })} 
                    />
                    {profile.pincode && !validatePincode(profile.pincode) && (
                      <p className="text-[9px] font-black text-rose-500 uppercase tracking-tighter">Must be 6 digits</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Address</label>
                  <textarea value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })}
                    rows={3} placeholder="House/Office No, Street, Area…"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:border-indigo-500 transition resize-none" />
                </div>

                <button type="submit" disabled={loading}
                  className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 disabled:opacity-50 transition shadow-lg shadow-indigo-100 active:scale-95">
                  <Save size={16} />
                  {loading ? 'Saving…' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {/* ════ STAFF TAB (in Settings) ════ */}
          {activeTab === 'Staff' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 uppercase tracking-tight">Team Members</h2>
                    <p className="text-slate-500 text-sm font-medium">{staff.length} staff · {staff.filter(s => s.isActive).length} active</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={fetchData} className="p-2.5 border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition">
                      <RefreshCw size={15} />
                    </button>
                    <button onClick={() => setShowStaffForm(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition">
                      <Plus size={15} /> Add Staff
                    </button>
                  </div>
                </div>

                {staff.length === 0 ? (
                  <div className="py-16 text-center">
                    <Users size={40} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-semibold">No staff added yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {staff.map(s => (
                      <div key={s._id} className="p-5 flex items-center justify-between gap-4 group border-b-2 border-slate-100 last:border-b-0 hover:bg-indigo-50/50 transition-colors">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
                            <User size={18} className="text-indigo-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate">{s.name}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase">{s.role}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{s.email}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{s.mobile}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => setEditStaff({ ...s, permissions: s.permissions || [] })}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={async () => {
                            if (confirm(`Remove ${s.name} from team?`)) {
                              setDeleteStaffId(s._id);
                              await handleDeleteStaff();
                            }
                          }}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════ OFFERS TAB ════ */}
          {activeTab === 'Offers' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 uppercase tracking-tight">Offers & Campaigns</h2>
                    <p className="text-slate-500 text-sm font-medium">Manage seasonal discounts, BOGO offers and customer pricing</p>
                  </div>
                  <button onClick={() => setShowOfferForm(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-slate-900 transition shadow-lg shadow-indigo-100">
                    <Plus size={15} /> Create Offer
                  </button>
                </div>

                {offers.length === 0 ? (
                  <div className="py-20 text-center">
                    <Zap size={40} className="text-slate-100 mx-auto mb-4" />
                    <p className="text-slate-400 font-semibold uppercase tracking-widest text-xs">No active offers found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {offers.map(o => (
                      <div key={o._id} className="p-6 flex items-center justify-between gap-4 group border-b-2 border-slate-100 last:border-b-0 hover:bg-indigo-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${o.isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400 opacity-50'}`}>
                            <Award size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className={`text-sm font-black uppercase tracking-tighter ${o.isActive ? 'text-slate-900' : 'text-slate-400'}`}>{o.name}</h3>
                              {!o.isActive && <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase">Inactive</span>}
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">
                              {o.type} • {o.type === 'BUY_X_GET_Y' ? `Buy ${o.buyQty || '?'} Get ${o.getQty || '?'}` : o.type === 'BULK_DISCOUNT' ? `${o.discountPercentage || '0'}% off (min ${o.minQty || '1'})` : `Value: ${o.value || '0'}${o.type === 'PERCENTAGE' ? '%' : '₹'}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditOfferClick(o)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await api.put(`/offers/${o._id}`, { isActive: !o.isActive });
                                fetchData();
                                showToast(`Offer ${!o.isActive ? 'activated' : 'paused'}!`);
                                const sync = new BroadcastChannel('nexus_sync');
                                sync.postMessage('FETCH_PRODUCTS');
                                sync.close();
                              } catch { }
                            }}
                            className={`p-2 rounded-xl transition ${o.isActive ? 'text-indigo-600 bg-indigo-50 hover:bg-rose-50 hover:text-rose-600' : 'text-slate-400 bg-slate-100 hover:bg-indigo-600 hover:text-white'}`}>
                            {o.isActive ? <Lock size={14} /> : <Zap size={14} />}
                          </button>
                          <button
                            onClick={() => handleDeleteOffer(o._id)}
                            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-900 rounded-3xl flex items-center justify-between gap-6 overflow-hidden relative">
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Automated Optimization</p>
                  <h3 className="text-white text-base font-semibold uppercase tracking-tight">Bulk Pricing Active</h3>
                  <p className="text-slate-400 text-xs mt-1 font-semibold">POS Terminal automatically applies the best savings for every transaction.</p>
                </div>
                <Zap size={100} className="text-white/5 absolute -right-4 rotate-12" />
              </div>
            </div>
          )}

          {/* ════ SECURITY TAB ════ */}
          {activeTab === 'Security' && (
            <div className="space-y-5">
              {/* Change Password */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center">
                      <KeyRound size={18} className="text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Change Password</h2>
                      <p className="text-sm font-normal text-slate-500">Update your login password securely</p>
                    </div>
                  </div>
                </div>
                <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                  <PwdInput label="Current Password" value={security.currentPassword}
                    show={showPwd.cur} toggleShow={() => setShowPwd(p => ({ ...p, cur: !p.cur }))}
                    onChange={v => setSecurity({ ...security, currentPassword: v })} />
                  <PwdInput label="New Password" value={security.newPassword}
                    show={showPwd.new} toggleShow={() => setShowPwd(p => ({ ...p, new: !p.new }))}
                    onChange={v => setSecurity({ ...security, newPassword: v })} />
                  <PwdInput label="Confirm New Password" value={security.confirmPassword}
                    show={showPwd.con} toggleShow={() => setShowPwd(p => ({ ...p, con: !p.con }))}
                    onChange={v => setSecurity({ ...security, confirmPassword: v })} />

                  {/* Password strength */}
                  {security.newPassword && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password Strength</p>
                      <div className="flex gap-1">
                        {[6, 8, 12].map((len, i) => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full ${security.newPassword.length >= len ? ['bg-rose-400', 'bg-amber-400', 'bg-emerald-500'][i] : 'bg-slate-200'}`} />
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {security.newPassword.length < 6 ? 'Too short' : security.newPassword.length < 8 ? 'Weak' : security.newPassword.length < 12 ? 'Good' : 'Strong'}
                      </p>
                    </div>
                  )}

                  <button type="submit" disabled={pwdLoading}
                    className="flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black hover:bg-indigo-600 disabled:opacity-50 transition active:scale-95">
                    <Lock size={16} />
                    {pwdLoading ? 'Updating…' : 'Update Password'}
                  </button>
                </form>
              </div>

              {/* Security info */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                      <Shield size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Security Status</h2>
                      <p className="text-sm font-normal text-slate-500">Account security overview</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {[
                    { label: 'Account Email', value: user?.email || '—', ok: true },
                    { label: 'Account Role', value: user?.role || '—', ok: true },
                    { label: 'Account Status', value: user?.isActive ? 'Active' : 'Inactive', ok: user?.isActive },
                    { label: 'Token Validity', value: '7 days rolling', ok: true },
                    { label: 'Encryption', value: 'bcrypt (10 salt rounds)', ok: true },
                    { label: 'Last Updated', value: user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString('en-IN') : '—', ok: true },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-3 border-b-2 border-slate-100 last:border-0 hover:bg-indigo-50/50 transition-colors px-2 rounded-lg">
                      <p className="text-sm font-semibold text-slate-600">{row.label}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{row.value}</span>
                        {row.ok ? <CheckCircle size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-rose-500" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════ ALERTS TAB ════ */}
          {activeTab === 'Alerts' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center">
                    <Bell size={18} className="text-violet-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold font-inter text-slate-900">Notification Preferences</h2>
                    <p className="text-slate-500 text-sm font-semibold font-inter">Configure which business events trigger alerts</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {ALERT_CONFIG.map(a => {
                  const AlertIcon = a.icon;
                  const colorMap: Record<string, string> = {
                    amber: 'bg-amber-100 text-amber-600',
                    emerald: 'bg-emerald-100 text-emerald-600',
                    indigo: 'bg-indigo-100 text-indigo-600',
                    rose: 'bg-rose-100 text-rose-600',
                    violet: 'bg-violet-100 text-violet-600',
                  };
                  return (
                    <div key={a.key} className="flex items-center justify-between p-5 gap-4 group border-b-2 border-slate-100 last:border-b-0 hover:bg-indigo-50/50 transition">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${colorMap[a.color]}`}>
                          <AlertIcon size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold font-inter text-slate-900">{a.label}</p>
                          <p className="text-xs text-slate-400 font-semibold font-inter mt-0.5">{a.desc}</p>
                        </div>
                      </div>
                      <button onClick={() => toggleAlert(a.key)}
                        className={`shrink-0 relative w-12 h-6 rounded-full transition-colors ${alerts[a.key] ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${alerts[a.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="p-5 bg-slate-50/50 border-t border-slate-100">
                <p className="text-[11px] text-slate-400 font-medium">
                  Preferences are saved locally. Email/SMS notifications may require specific setup.
                </p>
              </div>
            </div>
          )}

          {/* ════ SUBSCRIPTION TAB ════ */}
          {activeTab === 'Subscription' && (
            <div className="space-y-4">
              {/* Plan Status Card */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden max-w-5xl">
                <div className="bg-slate-900 p-6 text-white relative">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 bg-indigo-500 rounded-md text-[8px] font-black uppercase tracking-widest">Active</span>
                    </div>
                    <div className="flex items-baseline gap-3 mb-1">
                      <h2 className="text-3xl font-black tracking-tighter capitalize">{planData?.plan || 'Loading…'}</h2>
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Plan</span>
                    </div>
                    <p className="text-slate-400 text-xs font-medium mb-6">Full administrative access to your account.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                           <Clock size={12} />
                           <span className="text-[9px] font-black uppercase tracking-widest">Remaining</span>
                        </div>
                        <p className="text-lg font-black">{timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m</p>
                        <div className="mt-1 text-[8px] font-semibold text-slate-500 uppercase tracking-widest">{planData?.expiryDate ? new Date(planData.expiryDate).toLocaleDateString() : '—'}</div>
                      </div>

                      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                           <ShieldCheck size={12} />
                           <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Inventory</span>
                        </div>
                        <p className="text-lg font-black">{Math.max(0, (planData?.ProductLimit || 0) - (planData?.currentProductCount || 0))} Left</p>
                        <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                           <div 
                            className="h-full bg-indigo-500 transition-all duration-1000" 
                            style={{ width: `${Math.min(100, ((planData?.currentProductCount || 0) / (planData?.ProductLimit || 1)) * 100)}%` }}
                           />
                        </div>
                      </div>

                      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                           <Zap size={12} />
                           <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Invoices</span>
                        </div>
                        <p className="text-lg font-black">{Math.max(0, (planData?.invoiceLimit || 0) - (planData?.currentInvoiceCount || 0))} Left</p>
                        <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                           <div 
                            className="h-full bg-emerald-500 transition-all duration-1000" 
                            style={{ width: `${Math.min(100, ((planData?.currentInvoiceCount || 0) / (planData?.invoiceLimit || 1)) * 100)}%` }}
                           />
                        </div>
                      </div>

                      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                           <Check size={12} className="text-emerald-400" />
                           <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Status</span>
                        </div>
                        <p className={`text-lg font-black uppercase ${planData?.status === 'active' ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`}>
                           {planData?.status || '—'}
                        </p>
                        <div className="mt-1 text-[8px] font-semibold text-slate-500 uppercase tracking-widest">Active</div>
                      </div>
                    </div>
                  </div>
                  <Zap size={150} className="absolute -right-8 -bottom-8 text-white/5 rotate-12" />
                </div>

                {/* Billing Alert if near expiry */}
                {planData?.isNearExpiry && (
                  <div className="p-3 bg-rose-50 border-y border-rose-100 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                      <AlertTriangle size={16} className="text-rose-600 animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <p className="text-rose-900 text-xs font-black">Plan Expiring Soon!</p>
                      <p className="text-rose-600 text-[10px] font-medium">Access expires in {planData.remainingDays} days. Please renew to continue.</p>
                    </div>
                    <button onClick={() => handleRenewPlan(planData?.plan)} disabled={renewing}
                      className="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-black hover:bg-rose-700 transition active:scale-95">
                      {renewing ? 'Processing...' : 'Pay & Renew'}
                    </button>
                  </div>
                )}

                <div className="p-6">
                  <h3 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-widest">Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-slate-100 rounded-2xl group hover:border-indigo-600 transition">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
                          <RefreshCw size={18} />
                        </div>
                        <span className="text-[9px] font-black text-indigo-600 uppercase">30-Day Extension</span>
                      </div>
                      <h4 className="font-black text-slate-900 text-xs mb-1">Renew {planData?.plan}</h4>
                      <p className="text-slate-500 text-[10px] font-medium mb-4">Extend your current plan.</p>
                      <button onClick={() => handleRenewPlan(planData?.plan)} disabled={renewing}
                        className="w-full py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition">
                        {renewing ? 'Processing...' : 'Pay & Renew'}
                      </button>
                    </div>

                    <div className="p-4 border border-slate-100 rounded-2xl group hover:border-amber-500 transition bg-slate-50/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition">
                          <ArrowUpCircle size={18} />
                        </div>
                        <span className="text-[9px] font-black text-amber-600 uppercase">Upgrade</span>
                      </div>
                      <h4 className="font-black text-slate-900 text-xs mb-1">Upgrade Plan</h4>
                      <p className="text-slate-500 text-[10px] font-medium mb-4">Contact support to upgrade to a higher tier.</p>
                      <button onClick={() => showToast('Contacting support...', 'success')}
                        className="w-full py-2 bg-white border border-slate-200 text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-amber-500 transition">
                        Contact Support
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ/Help */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                  <Info size={24} className="text-amber-600" />
                </div>
                <div>
                  <h5 className="font-black text-slate-900">Need help?</h5>
                  <p className="text-slate-500 text-sm font-medium">Contact our support team at support@nexusbill.com for any queries.</p>
                </div>
              </div>

              {/* Plan History Table */}
              {planData?.planHistory?.length > 0 && (
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mt-6">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center">
                      <Clock size={18} className="text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Payment History</h3>
                      <p className="text-slate-500 text-sm font-medium">View your past subscription invoices</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Plan</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Period</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Payment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {planData.planHistory.slice().reverse().map((h: any, i: number) => (
                          <tr key={i} className="hover:bg-indigo-50/50 transition-colors group">
                            <td className="p-4">
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                                {h.plan}
                              </span>
                              <div className="text-[9px] text-slate-400 font-semibold mt-1 uppercase">ID: NX-{i + 1}</div>
                            </td>
                            <td className="p-4">
                              <div className="text-xs font-black text-slate-700">
                                {new Date(h.startDate).toLocaleDateString()} — {new Date(h.endDate).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="p-4 text-xs font-black text-emerald-600 text-right">
                              {h.amountPaid ? `₹${h.amountPaid}` : '₹0'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ ADVANCED / DANGER ZONE ════ */}
          {activeTab === 'Advanced' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-rose-50 bg-rose-50/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
                      <AlertTriangle size={18} className="text-rose-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-rose-900 leading-none">Danger Zone</h2>
                      <p className="text-rose-600/60 text-xs font-semibold mt-1">High-priority account operations</p>
                    </div>
                  </div>
                </div>
                <div className="p-8 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl border border-rose-100 bg-rose-50/10">
                    <div className="flex-1">
                      <h4 className="font-black text-slate-900 mb-1">Clear Workspace</h4>
                      <p className="text-slate-500 text-[11px] font-medium leading-relaxed">
                        Delete all Products, Invoices, Staff, and Sales records.
                        This will empty your business data permanently.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowResetConfirm(true)}
                      className="px-6 py-3 bg-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition shadow-lg shadow-rose-100 active:scale-95"
                    >
                      Clear Data
                    </button>
                  </div>
                </div>
                <div className="px-6 py-4 bg-slate-900 flex items-center gap-3">
                  <Info size={14} className="text-slate-400 shrink-0" />
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Use with caution</p>
                </div>
              </div>
            </div>
          )}


        </div>
      </div>

      {/* ──── ADD STAFF MODAL (from Settings) ──── */}
      {showStaffForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm pt-20 pb-20 sm:p-4">
          <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden max-h-full sm:max-h-[95vh] flex flex-col">
            <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-lg tracking-tight">Add Staff Member</h3>
                <p className="text-xs text-indigo-300 font-medium mt-0.5">Authorization required</p>
              </div>
              <button onClick={() => { setShowStaffForm(false); setStaffForm(defaultStaff); }}
                className="p-2 text-slate-400 hover:text-white bg-white/10 rounded-xl transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddStaff} className="p-6 space-y-4 overflow-y-auto">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={15} className="text-amber-600" />
                  <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-none">
                    Business ID *
                  </label>
                </div>
                <input
                  required
                  placeholder={`e.g. NX-XXXX-0000`}
                  value={staffForm.referenceId}
                  onChange={e => setStaffForm({ ...staffForm, referenceId: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-amber-300 rounded-xl text-[10px] font-semibold tracking-normal focus:outline-none focus:border-amber-500 transition"
                />
                <p className="text-[10px] text-amber-600 font-medium mt-1.5 leading-none">
                  Enter your business ID to confirm authorization.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SI label="Full Name *" required value={staffForm.name} onChange={v => setStaffForm({ ...staffForm, name: v })} />
                <SI label="Email *" required value={staffForm.email} onChange={v => setStaffForm({ ...staffForm, email: v })} type="email" />
                <SI label="Mobile *" required value={staffForm.mobile} onChange={v => setStaffForm({ ...staffForm, mobile: v })} type="tel" maxLength={10} />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role *</label>
                  <select value={staffForm.role} onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500 transition">
                    <option value="cashier">Cashier</option>
                    <option value="accountant">Accountant</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <SI label="Password *" required type="password" value={staffForm.password}
                  onChange={v => setStaffForm({ ...staffForm, password: v })} placeholder="Min 6 chars" />
                <SI label="Confirm Password *" required type="password" value={staffForm.confirmPassword}
                  onChange={v => setStaffForm({ ...staffForm, confirmPassword: v })} placeholder="Confirm Password" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Permissions</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PERMISSIONS.map(p => (
                    <button key={p} type="button"
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${staffForm.permissions.includes(p) 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' 
                        : 'bg-rose-50 border-rose-100 text-rose-500 hover:bg-rose-100 hover:text-rose-600'
                        }`}>
                      {p.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={staffSubmitting}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 disabled:opacity-50 transition">
                {staffSubmitting ? 'Adding…' : 'Add Staff Member'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ──── EDIT STAFF MODAL (from Settings) ──── */}
      {editStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="font-black text-lg">Edit Staff</h3>
              <button onClick={() => setEditStaff(null)} className="p-2 text-slate-400 hover:text-white bg-white/10 rounded-xl transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditStaff} className="p-6 space-y-4 overflow-y-auto">
              <SI label="Full Name" required value={editStaff.name} onChange={v => setEditStaff({ ...editStaff, name: v })} />
              <SI label="Mobile" type="tel" maxLength={10} value={editStaff.mobile} onChange={v => setEditStaff({ ...editStaff, mobile: v })} />
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</label>
                <select value={editStaff.role} onChange={e => setEditStaff({ ...editStaff, role: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500 transition">
                  <option value="cashier">Cashier</option>
                  <option value="accountant">Accountant</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Permissions</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PERMISSIONS.map(p => (
                    <button key={p} type="button"
                      onClick={() => setEditStaff((prev: any) => ({
                        ...prev, permissions: prev.permissions.includes(p)
                          ? prev.permissions.filter((x: string) => x !== p)
                          : [...prev.permissions, p]
                      }))}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${editStaff.permissions.includes(p) 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' 
                        : 'bg-rose-50 border-rose-100 text-rose-500 hover:bg-rose-100 hover:text-rose-600'
                        }`}>
                      {p.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditStaff(null)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition">Cancel</button>
                <button type="submit" disabled={staffSubmitting}
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 disabled:opacity-50 transition">
                  {staffSubmitting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──── OFFER CREATE TERMINAL (CLEAN FOCUSED VERSION) ──── */}
      {showOfferForm && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in duration-300 max-h-[95vh] flex flex-col">
            <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-semibold tracking-tight uppercase">Create Offer</h3>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest opacity-80 mt-0.5">Campaign Setup</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowOfferForm(false)} className="px-4 py-2 bg-white/10 hover:bg-rose-500 hover:text-white rounded-xl transition-all text-xs font-semibold uppercase tracking-widest text-slate-300">Back</button>
              </div>
            </div>

            <form className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar" onSubmit={async (e) => {
              e.preventDefault();
              setOfferSubmitting(true);
              try {
                const payload: any = { ...offerForm };
                if (payload.type === 'BOGO') payload.type = 'B2G1';
                if (payload.type === 'BULK_DISCOUNT') payload.type = 'BULK';
                
                payload.value = parseFloat(payload.value) || 0;
                if (payload.type === 'BULK' && payload.discountPercentage) payload.value = parseFloat(payload.discountPercentage);
                
                if (payload.buyQty) payload.buyQty = parseInt(payload.buyQty);
                if (payload.getQty) payload.getQty = parseInt(payload.getQty);
                if (payload.minQty) payload.minQty = parseInt(payload.minQty);

                if (!payload.productId || payload.productId === "") delete payload.productId;
                if (!payload.startDate) payload.startDate = new Date().toISOString();
                if (!payload.endDate) payload.endDate = new Date(Date.now() + 30*24*60*60*1000).toISOString();

                if (editOfferId) {
                  await api.put(`/offers/${editOfferId}`, payload);
                  showToast('Offer updated!');
                } else {
                  await api.post('/offers', payload);
                  showToast('Offer started!');
                }

                const syncChannel = new BroadcastChannel('nexus_sync');
                syncChannel.postMessage('FETCH_DASHBOARD');
                syncChannel.close();

                setShowOfferForm(false);
                setEditOfferId(null);
                setOfferForm({
                  name: '', type: 'PERCENTAGE', value: '', productId: '',
                  buyQty: '', getQty: '', minQty: '', discountPercentage: '',
                  startDate: '', endDate: '',
                  isActive: true
                });
                fetchData();
              } catch (err: any) {
                showToast(err.response?.data?.message || 'Campaign linkage failed', 'error');
              } finally { setOfferSubmitting(false); }
            }}>
              <SI label="Campaign Name" placeholder="e.g. Bulk Clearance" value={offerForm.name} onChange={v => setOfferForm({ ...offerForm, name: v })} />
              <div className="space-y-1.5 ring-indigo-500 rounded-2xl transition">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Strategy Type</label>
                <select
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:bg-white outline-none"
                  value={offerForm.type}
                  onChange={e => setOfferForm({ ...offerForm, type: e.target.value })}
                >
                  <option value="PERCENTAGE">Global % Storewide</option>
                  <option value="FLAT">Global ₹ Cash-Off</option>
                  <option value="BOGO">B2G1 Node (Buy X Get Y Free)</option>
                  <option value="BULK_DISCOUNT">Bulk Slab Discount</option>
                </select>
              </div>

              {(offerForm.type === 'PERCENTAGE' || offerForm.type === 'FLAT') && (
                <SI label={offerForm.type === 'FLAT' ? "Discount Value (₹)" : "Discount Percent (%)"} placeholder="0.00" value={offerForm.value} onChange={v => setOfferForm({ ...offerForm, value: v })} />
              )}

              {(offerForm.type === 'BOGO' || offerForm.type === 'BULK_DISCOUNT') && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Node Section</label>
                    <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black outline-none"
                      value={selectedOfferCategory} onChange={e => setSelectedOfferCategory(e.target.value)}>
                      <option value="All">All Categories</option>
                      {offerCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Product Product</label>
                    <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black outline-none"
                      value={offerForm.productId} onChange={e => setOfferForm({ ...offerForm, productId: e.target.value })} required>
                      <option value="">Choose Node...</option>
                      {productsForOffers.filter(p => selectedOfferCategory === 'All' || p.category === selectedOfferCategory).map(p => (
                        <option key={p._id} value={p._id}>{p.name} ({p.barcode || 'NO-Product'})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {offerForm.type === 'BOGO' && (
                <div className="grid grid-cols-2 gap-4">
                  <SI label="Buy Quantity" type="number" placeholder="2" value={offerForm.buyQty} onChange={v => setOfferForm({ ...offerForm, buyQty: v })} />
                  <SI label="Get Quantity Free" type="number" placeholder="1" value={offerForm.getQty} onChange={v => setOfferForm({ ...offerForm, getQty: v })} />
                </div>
              )}

              {offerForm.type === 'BULK_DISCOUNT' && (
                <div className="grid grid-cols-2 gap-4">
                  <SI label="Min Qty Required" type="number" placeholder="10" value={offerForm.minQty} onChange={v => setOfferForm({ ...offerForm, minQty: v })} />
                  <SI label="Discount (%)" type="number" placeholder="15" value={offerForm.discountPercentage} onChange={v => setOfferForm({ ...offerForm, discountPercentage: v })} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <SI label="Start Date" type="datetime-local" value={offerForm.startDate} onChange={v => setOfferForm({ ...offerForm, startDate: v })} />
                <SI label="End Date" type="datetime-local" value={offerForm.endDate} onChange={v => setOfferForm({ ...offerForm, endDate: v })} />
              </div>

              <footer className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button type="button" onClick={() => setShowOfferForm(false)} className="flex-1 py-4 bg-white text-slate-600 rounded-2xl text-xs sm:text-sm font-semibold border border-slate-200 hover:bg-slate-100 transition-all uppercase tracking-widest">
                  Cancel
                </button>
                <button type="submit" disabled={offerSubmitting} className="flex-[2] py-4 bg-slate-950 text-white rounded-2xl text-xs sm:text-sm font-semibold shadow-xl hover:bg-indigo-600 transition-all uppercase tracking-widest active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                  {offerSubmitting ? 'Syncing...' : (editOfferId ? 'Update Node' : 'Activate Node')}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared inputs ──────────────────────────────────────────────────────────────
function SI({ label, value, onChange, required, type = 'text', placeholder, maxLength, disabled, pattern, title, min }: {
  label: string; value: string; onChange?: (v: string) => void;
  required?: boolean; type?: string; placeholder?: string; maxLength?: number; disabled?: boolean;
  pattern?: string; title?: string; min?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <input type={type} value={value} required={required} placeholder={placeholder}
        maxLength={maxLength} disabled={disabled} pattern={pattern} title={title} min={min}
        onChange={e => onChange?.(e.target.value)}
        className={`w-full px-4 py-3 rounded-2xl text-sm font-semibold transition focus:outline-none ${disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-100'
          : 'bg-slate-50 border border-slate-200 text-slate-900 focus:border-indigo-500 focus:bg-white'
          }`}
      />
    </div>
  );
}

function PwdInput({ label, value, onChange, show, toggleShow }: {
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; toggleShow: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} required
          onChange={e => onChange(e.target.value)} placeholder="••••••••"
          className="w-full px-4 py-3 pr-11 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
        />
        <button type="button" onClick={toggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
