import React from 'react';
import { X, Check, Zap, Rocket, Shield, Globe } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  color: string;
  icon: any;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Starter Node',
    price: '₹0',
    period: 'Forever',
    icon: Zap,
    color: 'slate',
    features: [
      '1 Staff Account',
      '100 Product SKU Limit',
      '50 Invoices / Month',
      'Standard Thermal Support',
      'Basic Performance Reports'
    ]
  },
  {
    id: 'basic',
    name: 'Growth Node',
    price: '₹499',
    period: 'Month',
    icon: Rocket,
    color: 'indigo',
    popular: true,
    features: [
      '5 Staff Accounts',
      '1,000 Product SKU Limit',
      '500 Invoices / Month',
      'Integrated UPI Gateway',
      'Inventory Alerts (Nodal)',
      'Sales Growth Analytics'
    ]
  },
  {
    id: 'pro',
    name: 'Pro Protocol',
    price: '₹1,499',
    period: 'Month',
    icon: Shield,
    color: 'emerald',
    features: [
      '15 Staff Accounts',
      '5,000 Product SKU Limit',
      'Unlimited Invoices',
      'Multi-Counter Sync',
      'Advanced GST Reporting',
      'Customer Loyalty Hub',
      'Priority Protocol Support'
    ]
  },
  {
    id: 'enterprise',
    name: 'Omni Node',
    price: 'Custom',
    period: 'Scale',
    icon: Globe,
    color: 'violet',
    features: [
      'Unlimited Staff Accounts',
      'Unlimited SKUs & Assets',
      'Custom Branding / White-label',
      'Dedicated Success Node',
      'Custom API Endpoints',
      'SLA-Backed Performance'
    ]
  }
];

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: string;
}

const PlanModal: React.FC<PlanModalProps> = ({ isOpen, onClose, currentPlan }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300 border border-slate-100">

        {/* Header */}
        <header className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-100">
              <Zap size={16} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-none">Subscription Nexus</h2>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Multi-Tenant Protocol Upgrade Hub</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
          >
            <X size={18} />
          </button>
        </header>

        {/* Verification Alert */}
        <div className="px-6 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
          <Shield size={12} className="text-amber-600 shrink-0" />
          <p className="text-[9px] font-black text-amber-700 uppercase tracking-tight leading-none">
            Nexus Protocol Enforcement: All upgrades require SuperAdmin manual verification & payment settlement.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isCurrent = currentPlan?.toLowerCase() === plan.id.toLowerCase();

              const colorClasses: Record<string, string> = {
                slate: 'text-slate-500 bg-slate-50 border-slate-100 hover:border-slate-200',
                indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:border-indigo-300',
                emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:border-emerald-300',
                violet: 'text-violet-600 bg-violet-50 border-violet-100 hover:border-violet-300',
              };

              return (
                <div
                  key={plan.id}
                  className={`
                    relative rounded-2xl p-4 border transition-all duration-300 flex flex-col h-full group
                    ${plan.popular ? 'border-indigo-600 bg-indigo-50/10' : 'border-slate-100 hover:border-slate-300 bg-white'}
                    ${isCurrent ? 'ring-2 ring-emerald-500/20 bg-emerald-50/10' : ''}
                  `}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300 ${colorClasses[plan.color]}`}>
                    <Icon size={16} />
                  </div>

                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-tighter mb-0.5">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-xl font-black text-slate-900 tracking-tighter leading-none">{plan.price}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">/ {plan.period}</span>
                  </div>

                  <div className="space-y-1.5 mb-6 flex-1">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className={`w-3 h-3 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${colorClasses[plan.color]}`}>
                          <Check size={8} strokeWidth={4} />
                        </div>
                        <span className="text-[9px] font-semibold text-slate-600 leading-none">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    className={`
                      w-full py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2
                      ${isCurrent
                        ? 'bg-emerald-600 text-white cursor-default shadow-lg shadow-emerald-100'
                        : 'bg-slate-900 text-white hover:bg-indigo-600'
                      }
                    `}
                  >
                    {isCurrent ? (
                      <><Shield size={10} /> Active Node</>
                    ) : (
                      <><Rocket size={10} /> Request Protocol</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-8 p-6 bg-slate-50 border border-slate-100 rounded-2xl relative overflow-hidden group">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <h4 className="text-slate-900 font-black text-sm mb-1 uppercase tracking-tighter leading-none">Manual Provisioning Required</h4>
                <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-tight">Contact Nexus Network SuperAdmin for final payment settlement and node activation.</p>
              </div>
              <button className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95">
                Dispatch Request →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanModal;
