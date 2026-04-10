import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Shield, 
  Mail, 
  Lock, 
  Zap, 
  ArrowRight,
  Fingerprint,
  Info,
  ShieldCheck,
  Globe
} from "lucide-react";
import api from "../services/api";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    uniqueId: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/login", formData);
      const { token, user } = response.data;
      
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Auth rejection. Check registry details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9]  flex items-center justify-center p-4">
      <div className="w-full max-w-[340px] bg-white border border-slate-100 rounded-2xl shadow-xl p-6 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg mb-4 rotate-3 group scale-150 transform transition-transform hover:rotate-0 relative">
             <Globe size={24} className="text-white" />
             <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          <div className="px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full mb-3">
            <p className="text-[7px] font-black text-indigo-600 uppercase tracking-[0.2em] leading-none">Authentication Required</p>
          </div>
          <h1 className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-none mb-1">Nexus Terminal</h1>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-1.5 opacity-60">
            <Zap size={8} fill="currentColor" className="text-indigo-600" /> Secure Node Access
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2.5 animate-in slide-in-from-top-1 duration-200">
            <Shield size={12} className="text-rose-600 shrink-0 mt-0.5" />
            <p className="text-[9px] font-black text-rose-700 uppercase tracking-tight leading-none">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-2.5" autoComplete="off">
          <CompactInput icon={Fingerprint} name="uniqueId" placeholder="ID" value={formData.uniqueId} onChange={handleChange} autoComplete="new-password" />
          
          <CompactInput icon={Mail} name="email" type="email" placeholder="EMAIL" value={formData.email} onChange={handleChange} />
          <CompactInput icon={Lock} name="password" type="password" placeholder="PASSWORD" value={formData.password} onChange={handleChange} autoComplete="new-password" />

          <button 
            type="submit"
            disabled={loading}
            className={`w-full h-12 bg-slate-900 text-white rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all mt-6 shadow-lg shadow-slate-900/10 border border-slate-700 ${loading ? 'opacity-50 grayscale' : ''}`}
          >
            {loading ? 'SYNCING...' : 'LOGIN NODE'}
            {!loading && <ArrowRight size={14} />}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-5 text-center">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50/50 rounded-full border border-slate-100/50">
               <ShieldCheck size={10} className="text-slate-400" />
               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Verified Security Node</p>
            </div>
            
            <div className="flex items-center gap-6">
               <Link to="/superadmin-login" className="text-[10px] font-bold text-slate-600 uppercase tracking-wider hover:text-indigo-600 transition-all duration-300 relative group">
                  SuperAdmin Portal
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-500 transition-all duration-300 group-hover:w-full"></span>
               </Link>
               <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider cursor-not-allowed transition-colors">
                  Forgot Password
               </span>
            </div>
        </div>
      </div>

      <div className="fixed bottom-6 flex flex-col items-center gap-1 opacity-20 pointer-events-none">
          <ShieldCheck size={14} className="text-slate-900" />
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.5em] leading-none">Powered by qna technologies</p>
      </div>
    </div>
  );
};

const CompactInput = ({ icon: Icon, name, type = "text", placeholder, value, onChange, autoComplete = "off" }: any) => (
  <div className="relative group">
    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors pointer-events-none">
      <Icon size={12} />
    </div>
    <input 
      name={name}
      type={type}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white transition-all placeholder:text-slate-300 uppercase h-11`}
      value={value}
      onChange={onChange}
      required
    />
  </div>
);

export default Login;
