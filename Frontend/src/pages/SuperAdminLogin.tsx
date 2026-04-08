import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ShieldAlert, 
  Lock, 
  Zap, 
  ArrowRight,
  ShieldCheck,
  Terminal,
  Server
} from "lucide-react";
import api from "../services/api";

const SuperAdminLogin = () => {
  const [secretKey, setSecretKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/superadmin/auth/login", { secretKey });
      const { token, user } = response.data;
      
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      navigate("/superadmin/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Rejection: Invalid Key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] font-['Outfit'] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Mesh Background */}
      <div className="absolute inset-0 opacity-[0.03] select-none pointer-events-none">
        <div className="grid grid-cols-12 gap-0 h-full w-full">
           {[...Array(144)].map((_, i) => (
             <div key={i} className="border-[0.2px] border-slate-100"></div>
           ))}
        </div>
      </div>

      <div className="w-full max-w-[340px] bg-slate-900 border border-slate-800 rounded-2xl shadow-4xl p-8 relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xl rotate-6 animate-pulse border-b-2 border-indigo-800">
            <Server size={24} />
          </div>
          <h1 className="text-lg font-black text-white tracking-widest uppercase italic leading-none mb-2 mt-4">Nexus Master</h1>
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-1.5 opacity-60">
            <Zap size={8} fill="currentColor" className="text-indigo-400" /> Root Authority
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-1 duration-200">
            <ShieldAlert size={14} className="text-rose-500 shrink-0 mt-0.5" />
            <p className="text-[9px] font-black text-rose-500 uppercase tracking-tight leading-none">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-1 opacity-60 italic">Encryption Key</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors pointer-events-none">
                <Lock size={14} />
              </div>
              <input 
                type="password"
                placeholder="ENTER SECRET KEY"
                className="w-full pl-12 pr-6 py-4 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-black text-white focus:outline-none focus:border-indigo-600 transition-all placeholder:text-slate-800 uppercase h-12"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`w-full h-12 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.3em] h-12 italic flex items-center justify-center gap-2 hover:bg-indigo-500 active:scale-95 transition-all mt-6 shadow-xl shadow-indigo-600/10 ${loading ? 'opacity-50 grayscale' : ''}`}
          >
            {loading ? 'VALIDATING...' : 'INITIATE OVERRIDE'}
            {!loading && <ArrowRight size={14} />}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-800/60 flex flex-col items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800">
               <Terminal size={10} className="text-slate-600" />
               <p className="text-[8px] font-bold text-slate-700 uppercase tracking-tight">Isolated Environment</p>
            </div>
            
            <button onClick={() => window.location.href='/login'} className="text-[9px] font-black text-slate-500 uppercase hover:text-indigo-400 transition-colors tracking-widest">Public Terminal</button>
        </div>
      </div>

      <div className="fixed bottom-6 flex flex-col items-center gap-1 opacity-10 pointer-events-none">
          <ShieldCheck size={14} className="text-slate-500" />
          <p className="text-[8px] font-bold text-slate-700 uppercase tracking-[0.5em] leading-none italic">Secure Restricted Session</p>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
