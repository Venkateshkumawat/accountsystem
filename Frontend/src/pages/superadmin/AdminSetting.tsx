import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  User, 
  Bell, 
  RefreshCcw, 
  ShieldCheck,
  Clock,
  Zap,
  Globe,
  Database,
  Lock,
  UserPlus,
  Activity,
  Cpu,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';

const AdminSetting: React.FC = () => {
  const { notifySuccess, notifyError } = useNotify();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    allowRegistrations: true,
    globalLogging: true,
    earlyAccess: false,
    adminName: 'Master Admin',
    lastLogin: null
  });

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/superadmin/auth/settings');
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (err) {
      notifyError("Infrastructure connection failed. Registry offline.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggle = async (key: string, value: boolean, label: string) => {
    const previousSettings = { ...settings };
    setSettings({ ...settings, [key]: value });
    
    try {
      await api.patch('/superadmin/auth/settings', { settings: { [key]: value } });
      notifySuccess(`${label} protocol shifted to ${value ? 'ACTIVE' : 'INACTIVE'}`);
    } catch (err) {
      setSettings(previousSettings);
      notifyError(`Nexus Protocol Sync Failure: ${label} update rejected.`);
    }
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      await api.patch('/superadmin/auth/settings', { settings });
      notifySuccess('Nexus Master Registry synchronized successfully.');
    } catch (err) {
      notifyError('Failed to synchronize global configuration.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="h-96 flex items-center justify-center font-inter">
       <div className="flex flex-col items-center gap-4">
          <RefreshCcw className="animate-spin text-indigo-600" size={40} />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.3em]">Connecting to Nexus Core...</p>
       </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20 relative font-inter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Admin Settings</h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">Configure global platform protocols and master node security.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm relative overflow-hidden">
        <ShieldCheck className="absolute -right-6 -top-6 text-slate-50 rotate-12" size={160} />
        
        <div className="relative z-10 p-6 lg:p-12 space-y-12">
          {/* Section 1: Master Node Profile */}
          <section className="space-y-8">
            <SectionTitle title="Admin Identity" desc="Primary identification for the platform root account" icon={User} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SimpleInput label="ADMIN NAME" value={settings.adminName} onChange={(v: string) => setSettings({...settings, adminName: v})} />
              <SimpleInput label="PRIMARY EMAIL" defaultValue="master@nexusbill.com" disabled />
              <SimpleInput label="LAST LOGIN" value={settings.lastLogin ? new Date(settings.lastLogin).toLocaleString() : 'Never'} disabled />
            </div>
          </section>

          <div className="h-px bg-slate-100" />

          {/* Section 2: Global Governance */}
          <section className="space-y-8">
            <SectionTitle title="System Governance" icon={Globe} desc="Direct control over platform-wide access and operations" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <ToggleFeature 
                 label="Pause All Business Systems" 
                 desc="Emergency Brake: Instantly blocks all business access for critical updates." 
                 icon={Lock}
                 active={settings.maintenanceMode} 
                 onToggle={(v: boolean) => handleToggle('maintenanceMode', v, 'Maintenance Mode')} 
                 color="rose"
               />
               <ToggleFeature 
                 label="Enable New Signups" 
                 desc="Gatekeeper: Control if new businesses can register on the platform." 
                 icon={UserPlus}
                 active={settings.allowRegistrations} 
                 onToggle={(v: boolean) => handleToggle('allowRegistrations', v, 'Public Registration')} 
                 color="emerald"
               />
               <ToggleFeature 
                 label="Track High-Security Activity" 
                 desc="Security Camera: Records every action across all nodes for audit trails." 
                 icon={Activity}
                 active={settings.globalLogging} 
                 onToggle={(v: boolean) => handleToggle('globalLogging', v, 'Activity Tracking')} 
                 color="indigo"
               />
               <ToggleFeature 
                 label="Enable Future Beta Tools" 
                 desc="Innovation Lab: Unlocks experimental AI modules for internal testing." 
                 icon={Zap}
                 active={settings.earlyAccess} 
                 onToggle={(v: boolean) => handleToggle('earlyAccess', v, 'Beta Tools')} 
                 color="amber"
               />
            </div>
          </section>

          <div className="h-px bg-slate-100" />

          {/* Section 3: Resource Quotas */}
          <section className="space-y-8">
            <SectionTitle title="Master Infrastructure" desc="Real-time telemetry from platform core clusters" icon={Database} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
               <QuotaCard label="Cluster Storage" value="38%" color="indigo" sub="2.1TB Remaining" />
               <QuotaCard label="API Throughput" value="0.8k/s" color="emerald" sub="Optimal Load" />
               <QuotaCard label="Master Latency" value="12ms" color="amber" sub="Direct Link Active" />
            </div>
          </section>

          <div className="pt-8 border-t border-slate-100">
            <button 
              onClick={handleSaveAll}
              disabled={loading}
              className="px-12 py-4 bg-slate-900 text-white rounded-2xl text-xs font-semibold uppercase tracking-[0.2em] transition-all shadow-xl hover:bg-indigo-600 active:scale-95 flex items-center gap-3"
            >
              <Cpu size={16} className={loading ? 'animate-spin' : ''} /> {loading ? 'Syncing Nexus...' : 'Commit Master Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Infrastructure Footer */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mt-8">
        <div className="lg:col-span-6 bg-slate-950 p-8 rounded-[2rem] relative overflow-hidden shadow-2xl font-inter">
          <Clock className="absolute -right-4 -bottom-4 text-white opacity-5 rotate-12 scale-150" />
          <h4 className="text-[10px] font-semibold text-indigo-400 uppercase tracking-[0.3em] mb-6">Heartbeat Monitor</h4>
          <div className="space-y-4">
             <div className="flex gap-4 items-center">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 animate-ping"></div>
                <p className="text-[11px] font-semibold text-white/70 uppercase tracking-tight">Node Cluster-Alpha: 100% Operational</p>
             </div>
             <div className="flex gap-4 items-center">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0"></div>
                <p className="text-[11px] font-semibold text-white/40 uppercase tracking-tight">Database Shard Sync: Completed (Success)</p>
             </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-indigo-600 text-white p-8 rounded-[2rem] flex flex-col justify-between shadow-2xl relative overflow-hidden group font-inter cursor-pointer">
           <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
           <RefreshCcw className="mb-4 text-white/30 group-hover:rotate-180 transition-transform duration-700" size={32} />
           <div className="relative z-10">
              <h4 className="text-xl font-semibold tracking-tight uppercase">Flush Cache</h4>
              <p className="text-[9px] font-semibold text-white/60 uppercase tracking-widest mt-1">Clear all global session nodes</p>
           </div>
        </div>
      </div>
    </div>
  );
};

const SectionTitle = ({ title, desc, icon: Icon }: any) => (
  <div className="flex items-start gap-4 font-inter">
    <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-900 shrink-0 shadow-sm">
      <Icon size={24} strokeWidth={1.5} />
    </div>
    <div>
      <h3 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">{title}</h3>
      <p className="text-sm font-semibold text-slate-400">{desc}</p>
    </div>
  </div>
);

const SimpleInput = ({ label, defaultValue, value, disabled, onChange }: any) => (
  <div className="space-y-2 font-inter">
    <label className="text-[10px] font-semibold text-slate-400 ml-1 uppercase tracking-widest">{label}</label>
    <input 
      disabled={disabled}
      defaultValue={defaultValue}
      value={value}
      onChange={(e) => onChange && onChange(e.target.value)}
      className={`w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all uppercase tracking-widest h-12 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    />
  </div>
);

const ToggleFeature = ({ label, desc, active, onToggle, color, icon: Icon }: any) => {
  const colors: any = {
    rose: 'bg-rose-500',
    emerald: 'bg-emerald-500',
    indigo: 'bg-indigo-600',
    amber: 'bg-amber-500'
  };
  
  return (
    <div className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] hover:bg-white hover:border-indigo-200 transition-all group shadow-sm font-inter">
      <div className="flex gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-white shadow-sm transition-all duration-300 ${active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-300'}`}>
           <Icon size={18} />
        </div>
        <div className="max-w-[75%]">
          <p className="text-xs font-semibold text-slate-900 uppercase tracking-widest">{label}</p>
          <p className="text-[10px] font-semibold text-slate-400 mt-1 leading-relaxed">{desc}</p>
        </div>
      </div>
      <button 
        onClick={() => onToggle(!active)}
        className={`w-12 h-6 rounded-full relative transition-all duration-500 ease-in-out shadow-inner ${active ? colors[color] : 'bg-slate-200'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-500 ease-in-out ${active ? 'right-1' : 'left-1'}`}>
           {active ? <CheckCircle2 size={10} className="text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /> : <AlertCircle size={10} className="text-slate-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
        </div>
      </button>
    </div>
  );
};

const QuotaCard = ({ label, value, color, sub }: any) => {
  const barColors: any = { indigo: 'bg-indigo-600', emerald: 'bg-emerald-500', amber: 'bg-amber-500' };
  const textColors: any = { indigo: 'text-indigo-600', emerald: 'text-emerald-500', amber: 'text-amber-500' };
  
  return (
    <div className="p-6 border border-slate-100 rounded-[2rem] hover:shadow-xl hover:-translate-y-1 transition-all bg-white group font-inter">
       <div className="flex justify-between items-start mb-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
          <p className={`text-[10px] font-semibold uppercase ${textColors[color]} tracking-wide`}>{sub}</p>
       </div>
       <p className="text-3xl font-semibold text-slate-900 tracking-tight">{value}</p>
       <div className="w-full h-1.5 bg-slate-50 rounded-full mt-6 overflow-hidden border border-slate-100">
          <div className={`h-full ${barColors[color]} transition-all duration-1000`} style={{ width: value.includes('%') ? value : '60%' }}></div>
       </div>
    </div>
  );
};

export default AdminSetting;
