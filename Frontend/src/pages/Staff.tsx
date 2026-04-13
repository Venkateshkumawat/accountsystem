import { useState, useEffect, useCallback } from 'react';
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
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-sm font-bold transition-all animate-bounce-in ${type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
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
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-rose-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight">Confirm Action</h3>
        </div>
        <p className="text-slate-600 text-sm font-medium mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-2xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition">Delete</button>
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

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

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
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const togglePerm = (perm: string, perms: string[], setPerms: (p: string[]) => void) => {
    setPerms(perms.includes(perm) ? perms.filter(p => p !== perm) : [...perms, perm]);
  };

  const activeCount = staff.filter(s => s.isActive).length;

  return (
    <div className="space-y-6  min-h-screen">
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
          <div className="flex items-center gap-1.5 mb-1">
            <Zap size={12} className="text-amber-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Nexus Personnel Protocol</span>
          </div>
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
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-widest">
              <UserPlus size={16} /> Add Staff
            </button>
          )}
        </div>
      </div>

      {/* ──── Stats Pills ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['manager', 'accountant', 'cashier'] as const).map(role => {
          const m = ROLE_META[role];
          const Icon = m.icon;
          const count = staff.filter(s => s.role === role).length;
          return (
            <div key={role} className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${m.bg} border border-white`}>
              <Icon size={16} className={m.text} />
              <div>
                <p className={`text-xs font-semibold uppercase tracking-widest ${m.text}`}>{role}</p>
                <p className="text-xl font-bold tracking-tight text-slate-900">{count}</p>
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-100 border border-white">
          <CheckCircle size={16} className="text-emerald-700" />
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Active</p>
            <p className="text-lg font-bold tracking-tight text-slate-900">{activeCount}</p>
          </div>
        </div>
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
            className="pl-10 pr-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-indigo-500 transition appearance-none">
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
          <p className="text-slate-400 font-bold">Loading staff members…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl text-center">
          <Users size={48} className="text-slate-200 mb-4" />
          <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight text-slate-400">
            {staff.length === 0 ? 'No Staff Yet' : 'No Results Found'}
          </h3>
          <p className="text-slate-400 text-sm font-medium mt-1 mb-6">
            {staff.length === 0 ? 'Add your first team member to get started.' : 'Try a different search or filter.'}
          </p>
          {staff.length === 0 && (
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 transition">
              <UserPlus size={16} /> Add First Member
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(member => {
            const meta = ROLE_META[member.role] || ROLE_META.cashier;
            const Icon = meta.icon;
            return (
              <div key={member._id}
                className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">

                {/* Card top bar */}
                <div className={`h-1.5 ${meta.bg}`} />

                {/* Header */}
                <div className="p-5 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${meta.bg}`}>
                      <Icon size={22} className={meta.text} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900 tracking-tight truncate">{member.name}</h3>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${meta.bg} ${meta.text} mt-0.5`}>
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
                <div className="px-5 pb-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Mail size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Phone size={12} className="text-slate-400 shrink-0" />
                    <span>{member.mobile}</span>
                  </div>
                </div>

                {/* Permissions */}
                <div className="px-5 pb-4">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2">Permissions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {member.permissions.length === 0
                      ? <span className="text-[10px] text-slate-300">None assigned</span>
                      : member.permissions.map(p => (
                        <span key={p} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg text-[9px] font-black uppercase">
                          {p.replace('_', ' ')}
                        </span>
                      ))
                    }
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${member.isActive ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${member.isActive ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {member.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                  {/* Only businessAdmin can suspend/restore staff */}
                  {isBusinessAdmin && (
                    <button onClick={() => handleToggleStatus(member._id)}
                      className={`text-[10px] font-black uppercase tracking-widest transition-colors ${member.isActive ? 'text-rose-400 hover:text-rose-600' : 'text-emerald-400 hover:text-emerald-600'}`}>
                      {member.isActive ? 'Suspend' : 'Restore'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-300">

            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-white tracking-tight">New Staff Member</h3>
                <p className="text-xs font-normal text-indigo-300 mt-1">Authorizing new staff access node</p>
              </div>
              <button onClick={() => { setShowAdd(false); setForm(defaultForm); }}
                className="p-3 text-slate-400 hover:text-white bg-white/10 rounded-xl transition-all">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="p-6 space-y-5 overflow-y-auto no-scrollbar flex-1">

              {/* Reference ID – highlighted */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={15} className="text-amber-600" />
                  <label className="text-xs font-black text-amber-700 uppercase tracking-widest">
                    Business ID *
                  </label>
                </div>
                <input
                  required
                  placeholder={`e.g. ${user?.businessId || 'BB-XXXX-0000'} (Your Active Node ID)`}
                  value={form.referenceId}
                  onChange={e => setForm({ ...form, referenceId: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-amber-300 rounded-xl text-[10px] font-bold tracking-normal focus:outline-none focus:border-amber-500 transition"
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                  Module Access
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PERMISSIONS.map(p => (
                    <button key={p} type="button"
                      onClick={() => togglePerm(p, form.permissions, v => setForm({ ...form, permissions: v }))}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.permissions.includes(p) ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}>
                      {p.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 active:scale-[.99] transition-all shadow-lg shadow-indigo-200">
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Account…
                  </span>
                ) : 'Create Staff Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────── EDIT STAFF MODAL ─── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-300">

            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-tight">Update Staff</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{editTarget.email}</p>
              </div>
              <button onClick={() => setEditTarget(null)}
                className="p-3 text-slate-400 hover:text-white bg-white/10 rounded-xl transition-all">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-5 overflow-y-auto no-scrollbar flex-1">
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Module Access</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PERMISSIONS.map(p => (
                    <button key={p} type="button"
                      onClick={() => togglePerm(p, editForm.permissions, v => setEditForm({ ...editForm, permissions: v }))}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editForm.permissions.includes(p) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}>
                      {p.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditTarget(null)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
                  {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</> : <><Save size={15} />Save Changes</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared form input ─────────────────────────────────────────────────────────
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
