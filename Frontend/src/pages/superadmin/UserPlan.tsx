import React, { useState } from 'react';
import { 
  Users, Layers, ArrowRight, ShieldCheck, 
  CheckCircle, Clock, Mail, Phone, Briefcase, 
  MapPin, ShoppingBag, Zap, CreditCard,
  Info
} from 'lucide-react';
import api from '../../services/api';
import { INDIAN_STATES } from '../../constants/indianStates';
import { validateGSTIN, validatePincode } from '../../utils/validation';

// Internal Input Block - Defined outside to prevent focus loss on re-render
const IB = ({ label, icon: Icon, type = "text", placeholder, value, onChange, required = false, autoComplete = "off" }: any) => (
  <div className="space-y-1">
    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors pointer-events-none">
        <Icon size={12} />
      </div>
      <input type={type} placeholder={placeholder} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border-none rounded-xl text-[10px] font-black text-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-300 h-9" />
    </div>
  </div>
);

const UserPlan: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    ownerFullName: '', email: '', password: '', businessName: '', mobileNumber: '',
    location: { address: '', city: '', state: '', pincode: '' },
    plan: 'free', price: 0, customDuration: 30,
    planStartDate: new Date().toISOString().slice(0, 16),
    planEndDate: '', gstin: '', skuLimit: 100, invoiceLimit: 500,
  });

  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'none'>('none');
  const [showInvoice, setShowInvoice] = useState(false);
  const [provisionedData, setProvisionedData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.price > 0 && paymentStatus !== 'completed') {
       alert("CRITICAL ERROR: Fiscal protocol incomplete. Payment verification required for non-zero node deployment.");
       return;
    }
    setLoading(true);
    setSuccess(false);

    let finalData = { ...formData };
    if (!finalData.planEndDate) {
      const start = new Date(finalData.planStartDate);
      start.setDate(start.getDate() + finalData.customDuration);
      finalData.planEndDate = start.toISOString().split('T')[0];
    }

    try {
      const res = await api.post('/superadmin/auth/business-admins/create', finalData);
      setSuccess(true);
      setProvisionedData(res.data.data);
      setShowInvoice(true);
      setPaymentStatus('none');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Provisioning sequence failed.');
    } finally { setLoading(false); }
  };

  const handlePayment = async () => {
    if (formData.price <= 0) {
      setPaymentStatus('completed');
      return;
    }

    setLoading(true);
    try {
      // 1. Create order on backend
      const { data: orderData } = await api.post('/superadmin/auth/razorpay/order', {
        amount: formData.price,
        receipt: `PROV_${Date.now()}`
      });

      const options = {
        key: "rzp_test_SZOuTzlTzQbKB9", // Public key from backend env
        amount: orderData.amount,
        currency: orderData.currency,
        name: "NexusBill Provisioning",
        description: `Provisioning ${formData.plan.toUpperCase()} for ${formData.businessName}`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            // 2. Verify payment on backend
            await api.post('/superadmin/auth/razorpay/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            setPaymentStatus('completed');
            alert("PAYMENT VERIFIED: Fiscal node established.");
          } catch {
            alert("PAYMENT FAILED: Cryptographic signature mismatch.");
          }
        },
        prefill: {
          name: formData.ownerFullName,
          email: formData.email,
          contact: formData.mobileNumber
        },
        theme: { color: "#4F46E5" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      alert("GATEWAY ERROR: Request rejected by Nexus Fiscal Pulse.");
    } finally {
      setLoading(false);
    }
  };

  const setPlanPreset = (p: string) => {
    let sku = 100, inv = 500, pr = 0, dur = 30;
    if (p === 'pro') { sku = 1000; inv = 5000; pr = 1499; }
    if (p === 'enterprise') { sku = 10000; inv = 50000; pr = 4999; dur = 365; }
    setFormData({ ...formData, plan: p, skuLimit: sku, invoiceLimit: inv, price: pr, customDuration: dur });
    setPaymentStatus('none');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header Protocol */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">Nexus Provisioning</h1>
            <p className="text-slate-400 font-bold tracking-widest text-[8px] uppercase mt-1">Admin Partition & Subscription Matrix</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
            <Zap size={10} className="animate-pulse" />
            <span className="text-[9px] font-black uppercase">Grid: NOMINAL</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <form onSubmit={handleSubmit} autoComplete="off" className="bg-white border border-slate-200 rounded-[1.5rem] shadow-sm overflow-hidden">
              
              {/* Identity Node */}
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                   <Users size={14} className="text-indigo-600" />
                   <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Administrative Identity</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   <IB label="Admin Name" icon={Users} placeholder="Full Name" value={formData.ownerFullName} onChange={(v: string) => setFormData({...formData, ownerFullName: v})} required />
                   <IB label="Sync Email" icon={Mail} type="email" placeholder="email@nexus.com" value={formData.email} onChange={(v: string) => setFormData({...formData, email: v})} required autoComplete="off" />
                   <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile</label>
                      <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors pointer-events-none">
                          <Phone size={12} />
                        </div>
                        <input type="text" placeholder="10 Digits" value={formData.mobileNumber} 
                          onChange={(e: any) => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setFormData({...formData, mobileNumber: v});
                          }} 
                          required maxLength={10} minLength={10}
                          className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border-none rounded-xl text-[10px] font-black text-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-300 h-9" />
                      </div>
                   </div>
                   <IB label="Password" icon={ShieldCheck} type="password" placeholder="••••••••" value={formData.password} onChange={(v: string) => setFormData({...formData, password: v})} required autoComplete="new-password" />
                </div>
              </div>

              {/* Business Node */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                <div className="flex items-center gap-2 mb-4">
                   <Briefcase size={14} className="text-emerald-600" />
                   <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Business Entity</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   <IB label="Entity Name" icon={Briefcase} placeholder="Nexus Corp" value={formData.businessName} onChange={(v: string) => setFormData({...formData, businessName: v})} required />
                   <div className="space-y-1">
                      <IB label="Tax ID (GSTIN)" icon={Info} placeholder="GSTIN (Opt)" value={formData.gstin} onChange={(v: string) => setFormData({...formData, gstin: v.toUpperCase()})} />
                      {formData.gstin && !validateGSTIN(formData.gstin) && (
                        <p className="text-[7px] font-black text-rose-500 uppercase tracking-tighter ml-1">Invalid Pattern</p>
                      )}
                   </div>
                   <IB label="City" icon={MapPin} placeholder="Mumbai" value={formData.location.city} onChange={(v: string) => setFormData({...formData, location: {...formData.location, city: v}})} required />
                   <div className="grid grid-cols-2 gap-2">
                     <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">State</label>
                        <select 
                          value={formData.location.state} 
                          onChange={e => setFormData({...formData, location: {...formData.location, state: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-[10px] font-black text-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none h-9"
                          required
                        >
                          <option value="">Select State</option>
                          {INDIAN_STATES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                     </div>
                     <div className="space-y-1">
                        <IB label="Zip" icon={MapPin} placeholder="400001" value={formData.location.pincode} onChange={(v: string) => setFormData({...formData, location: {...formData.location, pincode: v.replace(/\D/g, '').slice(0, 6)}})} required />
                        {formData.location.pincode && !validatePincode(formData.location.pincode) && (
                          <p className="text-[7px] font-black text-rose-500 uppercase tracking-tighter ml-1">6 Digits Req.</p>
                        )}
                     </div>
                   </div>
                 </div>
              </div>

              {/* Subscription Node */}
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-2">
                   <Layers size={14} className="text-amber-500" />
                   <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Subscription Controller</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                   {['free', 'pro', 'enterprise', 'custom'].map(p => (
                      <button key={p} type="button" onClick={() => setPlanPreset(p)}
                        className={`py-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                          formData.plan === p ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                        }`}>
                         <span className="text-[9px] font-black uppercase tracking-tighter">{p}</span>
                         {formData.plan === p && <CheckCircle size={10} />}
                      </button>
                   ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <IB label="Manual Price (₹)" icon={CreditCard} type="number" placeholder="0" value={formData.price.toString()} onChange={(v: string) => { setFormData({...formData, price: parseInt(v) || 0, plan: 'custom'}); setPaymentStatus('none'); }} />
                    <IB label="Duration (Days)" icon={Clock} type="number" placeholder="30" value={formData.customDuration.toString()} onChange={(v: string) => setFormData({...formData, customDuration: parseInt(v) || 0, plan: 'custom'})} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-900 rounded-xl p-5 text-white">
                   <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                         <span className="text-[8px] font-black uppercase text-indigo-400">SKU CAP</span>
                         <span className="text-sm font-black">{formData.skuLimit}</span>
                      </div>
                      <input type="range" min="10" max="10000" step="10" value={formData.skuLimit} onChange={e => setFormData({...formData, skuLimit: parseInt(e.target.value)})} className="w-full h-1 bg-white/10 rounded-lg accent-indigo-500 appearance-none cursor-pointer" />
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                         <span className="text-[8px] font-black uppercase text-emerald-400">INV CAP</span>
                         <span className="text-sm font-black">{formData.invoiceLimit}</span>
                      </div>
                      <input type="range" min="50" max="50000" step="50" value={formData.invoiceLimit} onChange={e => setFormData({...formData, invoiceLimit: parseInt(e.target.value)})} className="w-full h-1 bg-white/10 rounded-lg accent-emerald-500 appearance-none cursor-pointer" />
                   </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                   <IB type="datetime-local" label="Activation" icon={Clock} value={formData.planStartDate} placeholder="Select" onChange={(v: string) => setFormData({...formData, planStartDate: v})} />
                   <IB type="datetime-local" label="Expiry" icon={Clock} value={formData.planEndDate} placeholder="Select" onChange={(v: string) => setFormData({...formData, planEndDate: v})} />
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Payment</label>
                      <button type="button" onClick={handlePayment} disabled={loading}
                        className={`w-full h-9 rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase border-2 transition-all ${
                          paymentStatus === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-50 border-transparent text-slate-400 hover:border-indigo-200'
                        }`}>
                        <CreditCard size={12} /> ₹{formData.price} · {paymentStatus === 'completed' ? 'PAID' : 'CONTINUE TO PAY'}
                      </button>
                   </div>
                </div>
              </div>

              <footer className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                   {success && <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-600 rounded-lg font-black text-[9px] uppercase"><CheckCircle size={12}/> DEPLOYED</div>}
                </div>
                <button disabled={loading || (formData.price > 0 && paymentStatus !== 'completed')} className={`w-full sm:w-auto px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 ${loading || (formData.price > 0 && paymentStatus !== 'completed') ? 'opacity-50' : 'hover:-translate-y-0.5 shadow-lg'}`}>
                  {loading ? 'Initializing Node...' : 'Execute Deployment'}
                  {!loading && <ArrowRight size={14} />}
                </button>
              </footer>
            </form>
          </div>

          <div className="space-y-4">
             <div className="bg-slate-950 p-6 rounded-[1.5rem] text-white shadow-xl relative overflow-hidden group">
                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-6 border-b border-white/5 pb-3">Protocol V4.2</h4>
                <ul className="space-y-5 relative z-10">
                   {[
                     { icon: Layers, color: 'indigo', title: 'Isolation', text: 'Separate Database Partitions.' },
                     { icon: ShoppingBag, color: 'emerald', title: 'SKU Protection', text: 'In-registry limit enforces.' },
                     { icon: ShieldCheck, color: 'amber', title: 'Audit Ready', text: 'Real-time telemetry and logs.' }
                   ].map((item, i) => (
                     <li key={i} className="flex gap-3">
                        <div className={`w-7 h-7 rounded-lg bg-${item.color}-500/20 flex items-center justify-center text-${item.color}-400 border border-${item.color}-500/10 shrink-0`}> <item.icon size={12}/> </div>
                        <div>
                           <p className="text-[9px] font-black uppercase text-white/90">{item.title}</p>
                           <p className="text-[8px] text-white/30 font-medium uppercase mt-0.5">{item.text}</p>
                        </div>
                     </li>
                   ))}
                </ul>
             </div>
             <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm space-y-3">
                <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center"> <Zap size={18} /> </div>
                <h4 className="text-[10px] font-black text-slate-900 uppercase">Latency Warning</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed">Workspace node initialization consumes approx 200ms per deployment.</p>
             </div>
          </div>
        </div>
      </div>

      {showInvoice && provisionedData && (
          <InvoiceOverlay data={provisionedData} form={formData} onClose={() => setShowInvoice(false)} />
      )}
    </div>
  );
};

// Post-Deployment Manifest Overlay
const InvoiceOverlay = ({ data, form, onClose }: { data: any, form: any, onClose: () => void }) => (
  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
    <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
      <div className="p-8 border-b-2 border-dashed border-slate-100 flex justify-between items-start bg-slate-50/50">
          <div>
              <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-1">Nexus Deployment Receipt</p>
              <h2 className="text-xl font-black text-slate-900 uppercase leading-none">Manifest Confirmed</h2>
              <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">NODE_ID: <span className="text-indigo-600">{data.businessId}</span></p>
          </div>
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl font-black italic text-lg flex items-center justify-center shadow-lg">NX</div>
      </div>
      <div className="p-8 grid grid-cols-2 gap-8 text-[10px]">
          <div className="space-y-4">
              <div>
                 <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Entity Control</p>
                 <p className="font-black text-slate-900 uppercase leading-none">{form.businessName}</p>
                 <p className="font-bold text-slate-500 mt-1 uppercase leading-none">{form.ownerFullName}</p>
              </div>
              <div>
                 <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Identity Registry</p>
                 <p className="font-bold text-slate-700 leading-none">{form.email}</p>
                 <p className="font-bold text-slate-700 mt-1 leading-none">{form.mobileNumber}</p>
              </div>
          </div>
          <div className="space-y-4 text-right">
              <div>
                 <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Monetization Plan</p>
                 <div className="flex items-center justify-end gap-1.5">
                     <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[7px] font-black uppercase">{form.plan}</span>
                     <span className="font-black text-slate-900 text-xs">₹{form.price}</span>
                 </div>
                 <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Omega: {form.planEndDate}</p>
              </div>
              <div>
                 <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Physical Constraints</p>
                 <p className="font-bold text-slate-700 uppercase leading-none">{form.skuLimit} SKU / {form.invoiceLimit} INV</p>
              </div>
          </div>
      </div>
      <div className="bg-slate-50 p-6 flex items-center justify-between border-t border-slate-100">
          <div className="flex gap-2">
             <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600"> <ShieldCheck size={16}/> </div>
             <div>
                <p className="text-[9px] font-black text-slate-900 uppercase">Paid Status: Nominal</p>
                <p className="text-[7px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest">TXN: NX_PROV_{data.businessId}</p>
             </div>
          </div>
          <div className="flex gap-2">
              <button onClick={() => window.print()} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-[8px] uppercase tracking-widest hover:bg-slate-50">Local Print</button>
              <button onClick={() => { onClose(); window.location.reload(); }} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[8px] uppercase tracking-widest hover:bg-indigo-600 shadow-lg">Finalize Access</button>
          </div>
      </div>
    </div>
  </div>
);

export default UserPlan;
