import React, { useState } from 'react';
import { 
  Shield, 
  User, 
  Bell, 
  RefreshCcw, 
  ArrowRight,
  ShieldCheck,
  Clock,
  ChevronRight
} from 'lucide-react';

const AdminSetting: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'profile', label: 'PROFILE', icon: User },
    { id: 'security', label: 'SECURITY', icon: Shield },
    { id: 'notifications', label: 'NOTIFICATIONS', icon: Bell },
  ];

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert('Admin settings updated successfully.');
    }, 1000);
  };

  return (
    <div className="space-y-6 pb-20 relative ">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Admin Settings</h1>
          <p className="text-sm font-normal text-slate-500 mt-1">Manage your admin profile and security settings</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="w-full lg:w-48 shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto no-scrollbar pb-2 lg:pb-0">
          {tabs.map(t => (
            <button 
              key={t.id} onClick={() => setActiveTab(t.id as any)}
              className={`flex-1 lg:flex-none flex items-center justify-center lg:justify-between px-5 py-3 rounded-xl text-sm font-${activeTab === t.id ? 'semibold' : 'medium'} tracking-wide transition-all min-w-[120px] lg:min-w-0 ${activeTab === t.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-2.5">
                <t.icon size={16} />
                <span>{t.label}</span>
              </div>
              <ChevronRight size={14} className="hidden lg:block opacity-40" />
            </button>
          ))}
        </aside>

        <div className="flex-1 bg-white border border-slate-200 rounded-[1.5rem] shadow-sm p-6 lg:p-10 relative overflow-hidden">
          <Shield className="absolute -right-6 -top-6 text-slate-50 rotate-12" size={120} />
          
          <div className="relative z-10 space-y-8 mb-6">
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                 <SectionTitle title="Admin Profile" desc="Manage your administrator details" />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SimpleInput label="ADMIN NAME" defaultValue="Master Admin" />
                    <SimpleInput label="PRIMARY EMAIL" defaultValue="master@nexusbill.com" disabled />
                    <SimpleInput label="ADMIN ID" defaultValue="ADMIN-ROOT-001" disabled />
                 </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                 <SectionTitle title="Security Settings" desc="Manage your password and access" />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SimpleInput label="CURRENT PASSWORD" type="password" placeholder="••••••••••••" />
                    <SimpleInput label="NEW PASSWORD" type="password" placeholder="••••••••••••" />
                    <div className="md:col-span-2">
                       <SimpleInput label="VERIFY PASSWORD" type="password" placeholder="••••••••••••" />
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                 <SectionTitle title="Notification Alerts" desc="Manage system alerts" />
                 <div className="space-y-3">
                    {[
                      { l: 'Push Notifications to Dashboard', d: 'Get important alerts on your dashboard.' },
                      { l: 'Subscription Expiry Warnings', d: 'Notify 7 days prior to business account expiry.' },
                      { l: 'Security Alerts', d: 'Immediate lockout on suspicious activity.' },
                    ].map(i => (
                      <div key={i.l} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white transition-colors gap-4">
                        <div>
                          <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{i.l}</p>
                          <p className="text-[10px] font-semibold text-slate-400 mt-1 leading-none">{i.d}</p>
                        </div>
                        <div className="w-10 h-5 bg-indigo-600 rounded-full relative shadow-inner shrink-0 scale-90">
                          <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}
          </div>

          <div className="pt-8 border-t border-slate-100 mt-10">
            <button 
              onClick={handleSave}
              disabled={loading}
              className="w-full sm:w-auto px-10 py-3.5 bg-slate-900 text-white rounded-xl text-sm font-medium transition-all shadow-xl flex items-center justify-center gap-2 group"
            >
              {loading ? 'Saving Changes...' : 'Save Changes'}
              {!loading && <ArrowRight size={16} className="group-hover:translate-x-1" />}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-950 p-8 rounded-[1.5rem] relative overflow-hidden">
          <Clock className="absolute -right-4 -bottom-4 text-white opacity-5 rotate-12 scale-150" />
          <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 leading-none">Admin Access Logs</h4>
          <div className="space-y-4">
            <div className="flex gap-3">
               <div className="w-1 h-1 bg-indigo-500 rounded-full mt-1.5 shrink-0 opacity-50"></div>
               <p className="text-xs font-semibold text-white/70 leading-relaxed">Last admin login authenticated from: IPv4 121.242.xx.xx</p>
            </div>
            <div className="flex gap-3">
               <div className="w-1 h-1 bg-white/20 rounded-full mt-1.5 shrink-0"></div>
               <p className="text-xs font-semibold text-white/30 leading-relaxed">Security settings updated: 04-03-2026 11:21:13</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-8 rounded-[1.5rem] flex flex-col justify-between items-start group shadow-xl">
           <div>
              <RefreshCcw className="mb-4 text-indigo-200 group-hover:rotate-180 transition-transform duration-1000" size={24} />
              <h4 className="text-lg font-black tracking-tighter leading-none mb-1 uppercase">System Status</h4>
              <p className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none">System sync: Steady</p>
           </div>
           <button className="mt-8 text-[9px] font-black uppercase tracking-[0.2em] bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-xl transition-all border border-white/10 leading-none">Force System Sync</button>
        </div>
      </div>
    </div>
  );
};

const SectionTitle = ({ title, desc }: { title: string, desc: string }) => (
  <div>
    <h3 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2 mb-1">
      <ShieldCheck size={20} className="text-indigo-600" /> {title}
    </h3>
    <p className="text-sm font-normal text-slate-500">{desc}</p>
  </div>
);

const SimpleInput = ({ label, type = "text", defaultValue, disabled, placeholder }: any) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-slate-600 ml-1">{label}</label>
    <input 
      type={type}
      disabled={disabled}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className={`w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-900 transition-all uppercase tracking-widest h-11 ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
    />
  </div>
);

export default AdminSetting;
