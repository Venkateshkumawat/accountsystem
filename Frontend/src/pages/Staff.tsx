import { useState, useEffect, useCallback, memo } from 'react';
import {
  Users, UserPlus, Trash2, CheckCircle, X,
  ShieldCheck, Edit3, Save, RefreshCw, AlertTriangle,
  Crown, Briefcase, CreditCard as CashierIcon, Mail, Phone,
  Eye, EyeOff, Filter, Zap, Lock
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  isActive: boolean;
  permissions: string[];
  createdAt: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    lastLoginAt?: string;
  };
}

const ROLE_META: Record<string, { icon: any; color: string; bg: string; text: string }> = {
  manager: { icon: Crown, color: 'violet', bg: 'bg-violet-100', text: 'text-violet-700' },
  accountant: { icon: Briefcase, color: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  cashier: { icon: CashierIcon, color: 'sky', bg: 'bg-sky-100', text: 'text-sky-700' },
};

const ALL_PERMISSIONS = [
  'POS', 'INVENTORY', 'PURCHASES', 'REPORTS',
  'ACCOUNTING', 'GST_PORTAL', 'CUSTOMERS', 'AUDIT_LOGS', 'SETTINGS'
];

// ─── Toast component ───────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-sm font-semibold transition-all animate-bounce-in ${type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
      {type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

// ─── Confirmation Dialog ────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-2xl p-8 max-w-sm w-full overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-rose-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 uppercase tracking-tight">Confirm Action</h3>
        </div>
        <p className="text-slate-600 text-sm font-medium mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-2xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition">Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function Staff() {
  const { isBusinessAdmin, user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Modals — only usable by businessAdmin
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Add form
  const defaultForm = { name: '', email: '', mobile: '', password: '', confirmPassword: '', role: 'cashier', permissions: [] as string[], referenceId: '' };
  const [form, setForm] = useState(defaultForm);
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({ name: '', mobile: '', role: 'cashier', permissions: [] as string[] });
  const [saving, setSaving] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/staff');
      setStaff(res.data.data || []);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load staff', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchStaff(); 
    
    // ── Cross-Tab Sync ──
    const syncChannel = new BroadcastChannel('nexus_sync');
    const handleSync = (event: any) => {
      if (event.data === 'FETCH_DASHBOARD' || event.data === 'SYNC_STAFF') {
        fetchStaff();
      }
    };
    syncChannel.addEventListener('message', handleSync);

    return () => {
      syncChannel.removeEventListener('message', handleSync);
      syncChannel.close();
    };
  }, [fetchStaff]);

  // ── Filtered staff list ────────────────────────────────────────────────────
  const filtered = staff.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase())
      || s.email.toLowerCase().includes(search.toLowerCase())
      || s.mobile.includes(search);
    const matchRole = filterRole === 'all' || s.role === filterRole;
    return matchSearch && matchRole;
  });

  // ── Add Staff ──────────────────────────────────────────────────────────────
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      showToast('Passwords do not match', 'error'); return;
    }
    if (form.password.length < 6) {
      showToast('Password must be at least 6 characters', 'error'); return;
    }
    if (!form.referenceId.trim()) {
      showToast('Business Admin Reference ID is required', 'error'); return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        mobile: form.mobile,
        password: form.password,
        role: form.role,
        permissions: form.permissions,
        referenceId: form.referenceId.trim().toUpperCase(),
      };
      await api.post('/staff', payload);
      showToast('Staff member added successfully!');
      setShowAdd(false);
      setForm(defaultForm);
      fetchStaff();

      // Notify other tabs
      const sync = new BroadcastChannel('nexus_sync');
      sync.postMessage('FETCH_DASHBOARD');
      sync.postMessage('SYNC_STAFF');
      sync.close();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Staff creation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Open Edit Modal ────────────────────────────────────────────────────────
  const openEdit = (member: StaffMember) => {
    setEditTarget(member);
    setEditForm({
      name: member.name,
      mobile: member.mobile,
      role: member.role,
      permissions: [...member.permissions],
    });
  };

  // ── Save Edit ──────────────────────────────────────────────────────────────
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      await api.put(`/staff/${editTarget._id}`, editForm);
      showToast('Staff details updated!');
      setEditTarget(null);
      fetchStaff();

      // Notify other tabs
      const sync = new BroadcastChannel('nexus_sync');
      sync.postMessage('SYNC_STAFF');
      sync.close();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle Status ──────────────────────────────────────────────────────────
  const handleToggleStatus = async (id: string) => {
    try {
      const res = await api.put(`/staff/${id}/status`);
      showToast(res.data.message || 'Status updated');
      fetchStaff();

      // Notify other tabs
      const sync = new BroadcastChannel('nexus_sync');
      sync.postMessage('SYNC_STAFF');
      sync.close();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Status update failed', 'error');
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/staff/${deleteTarget}`);
      showToast('Staff member removed successfully!');
      setDeleteTarget(null);
      fetchStaff();

      // Notify other tabs
      const sync = new BroadcastChannel('nexus_sync');
      sync.postMessage('SYNC_STAFF');
      sync.close();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const togglePerm = (perm: string, perms: string[], setPerms: (p: string[]) => void) => {
    setPerms(perms.includes(perm) ? perms.filter(p => p !== perm) : [...perms, perm]);
  };

  const activeCount = staff.filter(s => s.isActive).length;

  return (
    <div className="space-y-4  min-h-screen">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {/* Confirm Delete */}
      {deleteTarget && (
        <ConfirmDialog
          message="This will permanently delete the staff member and their login access. This cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ──── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Staff Management</h1>
          <p className="text-sm font-normal text-slate-500 mt-1">
            {staff.length} active staff managing operations.
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={fetchStaff}
            className="p-2.5 bg-white border border-slate-200 text-slate-300 rounded-xl hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm active:scale-95">
            <RefreshCw size={14} />
          </button>
          {/* Only businessAdmin can add staff */}
          {isBusinessAdmin && (
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-widest">
              <UserPlus size={16} /> Add Staff
            </button>
          )}
        </div>
      </div>

      {/* ──── Stats Pills ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
        {(['manager', 'accountant', 'cashier'] as const).map(role => {
          const m = ROLE_META[role];
          const count = staff.filter(s => s.role === role).length;
          const colors: any = {
            manager: 'border-l-indigo-500 text-indigo-600 bg-indigo-50/50',
            accountant: 'border-l-emerald-500 text-emerald-600 bg-emerald-50/50',
            cashier: 'border-l-amber-500 text-amber-600 bg-amber-50/50',
          };
          return (
            <MetricCard key={role} label={role.toUpperCase()} value={count.toString()} icon={m.icon} color={role === 'manager' ? 'indigo' : role === 'accountant' ? 'emerald' : 'amber'} />
          );
        })}
        <MetricCard label="ACTIVE_NODES" value={activeCount.toString()} icon={CheckCircle} color="emerald" />
      </div>

      {/* ──── Search & Filter ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text" placeholder="Search by name, email, mobile…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
        <div className="relative">
          <Filter size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="pl-10 pr-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500 transition appearance-none">
            <option value="all">All Roles</option>
            <option value="manager">Manager</option>
            <option value="accountant">Accountant</option>
            <option value="cashier">Cashier</option>
          </select>
        </div>
      </div>

      {/* ──── Staff Grid ───────────────────────────────────────────── */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-semibold">Loading staff members…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl text-center">
          <Users size={48} className="text-slate-200 mb-4" />
          <h3 className="text-base font-semibold text-slate-900 uppercase tracking-tight text-slate-400">
            {staff.length === 0 ? 'No Staff Yet' : 'No Results Found'}
          </h3>
          <p className="text-slate-400 text-sm font-medium mt-1 mb-6">
            {staff.length === 0 ? 'Add your first team member to get started.' : 'Try a different search or filter.'}
          </p>
          {staff.length === 0 && (
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-semibold hover:bg-indigo-700 transition">
              <UserPlus size={16} /> Add First Member
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-2">
          {filtered.map(member => {
            const meta = ROLE_META[member.role] || ROLE_META.cashier;
            const Icon = meta.icon;
            return (
              <div key={member._id}
                className="bg-white border-b-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden group hover:shadow-md hover:bg-indigo-50/30 transition-all duration-300">

                {/* Card top bar */}
                <div className={`h-1.5 ${meta.bg}`} />

                {/* Header */}
                <div className="p-4 flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.bg}`}>
                      <Icon size={18} className={meta.text} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900 tracking-tight truncate">{member.name}</h3>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${meta.bg} ${meta.text} mt-0.5`}>
                        {member.role}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Edit/Delete only for businessAdmin */}
                    {isBusinessAdmin ? (
                      <>
                        <button onClick={() => openEdit(member)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => setDeleteTarget(member._id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition">
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <div className="p-2 text-slate-200" title="View only">
                        <Lock size={13} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact info */}
                <div className="px-4 pb-3 space-y-1">
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                    <Mail size={10} className="text-slate-400 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                    <Phone size={10} className="text-slate-400 shrink-0" />
                    <span>{member.mobile}</span>
                  </div>
                </div>

                {/* Permissions */}
                <div className="px-4 pb-3">
                  <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">Module Access</p>
                  <div className="flex flex-wrap gap-1">
                    {member.permissions.length === 0
                      ? <span className="text-[10px] text-slate-300">None</span>
                      : member.permissions.map(p => (
                        <span key={p} className="px-2 py-0.5 bg-indigo-50/50 text-indigo-500 border border-indigo-100 rounded text-[8px] font-bold uppercase">
                          {p.replace('_', ' ')}
                        </span>
                      ))
                    }
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${member.isActive ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                    <span className={`text-[9px] font-bold uppercase tracking-wide ${member.isActive ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {member.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                  {/* Only businessAdmin can suspend/restore staff */}
                  {isBusinessAdmin && (
                    <button onClick={() => handleToggleStatus(member._id)}
                      className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${member.isActive ? 'text-rose-400 hover:text-rose-600' : 'text-emerald-400 hover:text-emerald-600'}`}>
                      {member.isActive ? 'Limit' : 'Restore'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ──────────────────────────────────────────── ADD STAFF MODAL ─── */}
      {showAdd && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border-2 border-slate-800 overflow-hidden animate-in zoom-in duration-300 max-h-[95vh] flex flex-col">

            {/* Header */}
            <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-semibold tracking-tight uppercase">New Staff Member</h3>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest opacity-80 mt-0.5">Authorizing new staff access node</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setShowAdd(false); setForm(defaultForm); }} className="px-4 py-2 bg-white/10 hover:bg-rose-500 hover:text-white rounded-xl transition-all text-xs font-semibold uppercase tracking-widest text-slate-300">
                  Back
                </button>
              </div>
            </div>

            <form onSubmit={handleAddStaff} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">

              {/* Reference ID – highlighted */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={15} className="text-amber-600" />
                  <label className="text-xs font-semibold text-amber-700 uppercase tracking-widest">
                    Business ID *
                  </label>
                </div>
                <input
                  required
                  placeholder={`e.g. ${user?.businessId || 'BB-XXXX-0000'} (Your Active Node ID)`}
                  value={form.referenceId}
                  onChange={e => setForm({ ...form, referenceId: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-amber-300 rounded-xl text-[10px] font-semibold tracking-normal focus:outline-none focus:border-amber-500 transition"
                />
                <p className="text-[10px] text-amber-600 font-medium mt-1.5">
                  Confirm authorization by entering your unique Business ID.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput label="Full Name *" placeholder="e.g. Ravi Kumar" required
                  value={form.name} onChange={v => setForm({ ...form, name: v })} />
                <FormInput label="Email Address *" placeholder="staff@email.com" required type="email"
                  value={form.email} onChange={v => setForm({ ...form, email: v })} />
                <FormInput label="Mobile Number *" placeholder="9XXXXXXXX9" required type="tel" maxLength={10}
                  value={form.mobile} onChange={v => setForm({ ...form, mobile: v })} />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-500 ml-1">Role *</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-normal text-slate-900 focus:outline-none focus:border-indigo-500 transition">
                    <option value="cashier">Cashier — POS billing</option>
                    <option value="accountant">Accountant — Finance</option>
                    <option value="manager">Manager — Full access</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-500 ml-1">Password *</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} placeholder="Min 6 characters" required
                      value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-normal text-slate-900 pr-10 focus:outline-none focus:border-indigo-500 transition" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <FormInput label="Confirm Password *" required type="password" placeholder="Re-enter password"
                  value={form.confirmPassword} onChange={v => setForm({ ...form, confirmPassword: v })} />
              </div>

              {/* Permissions */}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-2">
                  Module Access
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PERMISSIONS.map(p => (
                    <button key={p} type="button"
                      onClick={() => togglePerm(p, form.permissions, v => setForm({ ...form, permissions: v }))}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all ${form.permissions.includes(p) ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}>
                      {p.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <footer className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button type="button" onClick={() => { setShowAdd(false); setForm(defaultForm); }} className="flex-1 py-4 bg-white text-slate-600 rounded-2xl text-xs sm:text-sm font-semibold border border-slate-200 hover:bg-slate-100 transition-all uppercase tracking-widest">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-[2] py-4 bg-slate-950 text-white rounded-2xl text-xs sm:text-sm font-semibold shadow-xl hover:bg-indigo-600 transition-all uppercase tracking-widest active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? "Creating Account..." : "Create Staff Account"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────── EDIT STAFF MODAL ─── */}
      {editTarget && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border-2 border-slate-800 overflow-hidden animate-in zoom-in duration-300 max-h-[95vh] flex flex-col">

            <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-semibold tracking-tight uppercase">Update Staff</h3>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest opacity-80 mt-0.5">{editTarget.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setEditTarget(null)} className="px-4 py-2 bg-white/10 hover:bg-rose-500 hover:text-white rounded-xl transition-all text-xs font-semibold uppercase tracking-widest text-slate-300">
                  Back
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput label="Full Name" required
                  value={editForm.name} onChange={v => setEditForm({ ...editForm, name: v })} />
                <FormInput label="Mobile Number" type="tel" maxLength={10}
                  value={editForm.mobile} onChange={v => setEditForm({ ...editForm, mobile: v })} />
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-sm font-medium text-slate-500 ml-1">Role</label>
                  <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-normal text-slate-900 focus:outline-none focus:border-indigo-500 transition">
                    <option value="cashier">Cashier</option>
                    <option value="accountant">Accountant</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-2">Module Access</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PERMISSIONS.map(p => (
                    <button key={p} type="button"
                      onClick={() => togglePerm(p, editForm.permissions, v => setEditForm({ ...editForm, permissions: v }))}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all ${editForm.permissions.includes(p) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}>
                      {p.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <footer className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button type="button" onClick={() => setEditTarget(null)} className="flex-1 py-4 bg-white text-slate-600 rounded-2xl text-xs sm:text-sm font-semibold border border-slate-200 hover:bg-slate-100 transition-all uppercase tracking-widest">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-[2] py-4 bg-slate-950 text-white rounded-2xl text-xs sm:text-sm font-semibold shadow-xl hover:bg-indigo-600 transition-all uppercase tracking-widest active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? "Saving..." : "Save Changes"}
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
    <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-4 transition-all hover:border-indigo-200 group relative overflow-hidden">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${colors[color]} border shadow-sm`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0 text-center sm:text-left flex-1">
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <h3 className="text-xl font-semibold text-slate-900 leading-tight">{value}</h3>
        {sub && <p className={`mt-1 text-[8px] font-semibold uppercase tracking-tighter ${color === 'rose' ? 'text-rose-500' : 'text-emerald-600'}`}>{sub}</p>}
      </div>
    </div>
  );
});




function FormInput({ label, value, onChange, required, type = 'text', placeholder, maxLength }: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string; placeholder?: string; maxLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-500 ml-1">{label}</label>
      <input
        type={type} value={value} required={required} placeholder={placeholder} maxLength={maxLength}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-normal text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
      />
    </div>
  );
}
