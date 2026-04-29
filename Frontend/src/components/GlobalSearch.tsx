import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search as SearchIcon, 
  Package, 
  Users, 
  Receipt, 
  LayoutDashboard, 
  BookOpen, 
  Shield, 
  BarChart2, 
  Cog, 
  ArrowRight,
  Clock,
  Trash2,
  X,
  FileText,
  CreditCard,
  Mic,
  MicOff,
  Volume2,
  Activity,
  Bell,
  Zap
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface SearchResult {
  id: string;
  label: string;
  sub: string;
  path: string;
  type: 'product' | 'invoice' | 'party' | 'page';
  icon: any;
}

const STATIC_PAGES = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'POS Terminal', path: '/pos', icon: CreditCard },
  { label: 'B2B Sales', path: '/b2b', icon: Receipt },
  { label: 'Inventory', path: '/inventory', icon: Package },
  { label: 'Purchases', path: '/purchases', icon: FileText },
  { label: 'Accounting', path: '/accounting', icon: BookOpen },
  { label: 'Parties/CRM', path: '/parties', icon: Users },
  { label: 'Staff Hub', path: '/staff', icon: Shield },
  { label: 'GST Portal', path: '/gst', icon: Shield },
  { label: 'Reports', path: '/reports', icon: BarChart2 },
  { label: 'Settings', path: '/settings', icon: Cog },
];

export const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const { user, isSuperAdmin, hasPermission } = useAuth();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Persistence Lock: Prevents redundant searches
  const lastExecutedQuery = useRef('');
  const lastEmptyQuery = useRef('');

  // 🔊 Audio Feedback Engine (Works with Earbuds/Earphones)
  const playSound = (type: 'start' | 'stop') => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(type === 'start' ? 880 : 440, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  };

  // 🛡️ Access Control: Filter static pages based on role
  const allowedPages = useMemo(() => {
    return STATIC_PAGES.filter(page => {
      if (isSuperAdmin) return page.path.startsWith('/superadmin') || page.path === '/dashboard';
      // Basic permission check (can be expanded)
      return true; 
    });
  }, [isSuperAdmin]);

  const performSearch = useCallback(async (q: string) => {
    const trimmedQ = q.trim();
    if (trimmedQ.length < 1) {
      setResults([]);
      return;
    }

    // Optimization: Skip if we already know this prefix yields no results
    if (lastEmptyQuery.current && trimmedQ.startsWith(lastEmptyQuery.current)) {
      return;
    }

    if (trimmedQ === lastExecutedQuery.current) return;
    
    setLoading(true);
    try {
      // 1. Filter Static Pages
      const matchedPages: SearchResult[] = allowedPages
        .filter(p => p.label.toLowerCase().includes(trimmedQ.toLowerCase()))
        .map(p => ({
          id: p.path,
          label: p.label,
          sub: 'System Navigation',
          path: p.path,
          type: 'page',
          icon: p.icon
        }));

      // 2. Multi-Node Database Search Protocol
      const searchUrl = isSuperAdmin ? '/superadmin/auth/search' : '/search/global';
      const globalRes = await api.get(`${searchUrl}?query=${trimmedQ}`);
      const dbResults: SearchResult[] = (globalRes.data?.data || []).map((r: any) => ({
        id: r.id,
        label: r.label,
        sub: r.sub,
        path: r.path,
        type: r.type,
        icon: isSuperAdmin 
          ? (r.type === 'business' ? Users : r.type === 'plan' ? Zap : r.type === 'setting' ? Cog : Activity)
          : (r.type === 'product' ? Package : r.type === 'invoice' ? FileText : r.type === 'party' ? Users : r.type === 'transaction' ? CreditCard : r.type === 'notification' ? Bell : SearchIcon)
      }));

      const allResults = [
        ...matchedPages, 
        ...dbResults,
      ].slice(0, 8);

      setResults(allResults);
      lastExecutedQuery.current = trimmedQ;
      
      if (allResults.length === 0) {
        lastEmptyQuery.current = trimmedQ;
      } else {
        lastEmptyQuery.current = '';
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [allowedPages, isSuperAdmin]);

  const [voiceRetries, setVoiceRetries] = useState(0);
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startVoiceSearch = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setHasNetworkError(false);
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-IN'; 
    recognition.interimResults = !hasNetworkError; // Adaptive: Disable interim on flaky networks
    recognition.continuous = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setIsListening(true);
      playSound('start');
      setVoiceRetries(0);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      
      setQuery(transcript);
      setIsOpen(true);
      
      const cmd = transcript.toLowerCase();
      if (cmd.includes('open') || cmd.includes('go to') || cmd.includes('show')) {
        const target = allowedPages.find(p => cmd.includes(p.label.toLowerCase()));
        if (target) {
          handleSelect(target as any);
          recognition.stop();
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn(`🎙️ Voice Protocol Alert [${event.error}]: Attempting recovery...`);
      
      if (event.error === 'network') {
        setHasNetworkError(true);
        recognition.lang = 'en-US';
      }

      if (event.error === 'no-speech' && voiceRetries < 2) {
        setVoiceRetries(prev => prev + 1);
        recognition.stop();
        setTimeout(() => {
           try { recognition.start(); } catch(e) {}
        }, 200);
        return;
      }

      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      playSound('stop');
      recognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  }, [allowedPages, voiceRetries, hasNetworkError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) performSearch(query);
      else setResults([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleSelect = (result: SearchResult) => {
    setQuery('');
    setIsOpen(false);
    navigate(result.path);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full max-w-md" ref={searchRef}>
      <div className="relative group">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Smart search..."
          className="w-full bg-slate-50 border-none rounded-2xl py-2.5 pl-11 pr-24 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
        />
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
        
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pr-1">
          {/* ❌ Clear Search Text */}
          {query && !loading && !isListening && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setIsOpen(false);
              }}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
              title="Clear Search"
            >
              <X size={16} />
            </button>
          )}

          {/* 🔊 Voice Waveform Feedback */}
          {isListening && (
            <div className="flex gap-1 pr-1.5 animate-in fade-in duration-300">
              <div className="w-1 h-3 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1 h-5 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1 h-3 bg-rose-500 rounded-full animate-bounce" />
            </div>
          )}

          {/* 🎙️ Voice Search Action Node */}
          <div className="flex items-center gap-1">
            {isListening && (
              <button
                type="button"
                onClick={() => {
                  try {
                    recognitionRef.current?.abort(); // Immediate halt
                    setIsListening(false);
                    setQuery('');
                  } catch (e) {
                    console.error("Cancel failed:", e);
                  }
                }}
                className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl transition-all mr-1 animate-in zoom-in duration-200"
                title="Cancel Voice Search"
              >
                <X size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={isListening ? () => {} : startVoiceSearch}
              className={`relative p-2.5 rounded-xl transition-all duration-500 ${
                isListening 
                  ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] scale-110' 
                  : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
              title={isListening ? "Listening..." : "Smart Voice Search"}
            >
              {isListening ? (
                <>
                  <MicOff size={16} className="relative z-10" />
                  <span className="absolute inset-0 rounded-xl bg-rose-500 animate-ping opacity-20" />
                </>
              ) : (
                <Mic size={16} />
              )}
            </button>
          </div>
        </div>
      </div>

      {hasNetworkError && (
        <div className="absolute -bottom-5 left-4 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
           <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" />
           <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest opacity-80">Network Lag Detected: Optimized Sync Mode Active</p>
        </div>
      )}

      {isOpen && query.length >= 1 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[200] animate-in fade-in slide-in-from-top-2 duration-200">
          {results.length > 0 ? (
            <div className="p-2">
              <div className="px-4 py-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock size={12} /> Search Results
                </p>
              </div>
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-left ${
                    index === selectedIndex ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    index === selectedIndex ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <result.icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{result.label}</p>
                    <p className={`text-[11px] font-medium truncate ${index === selectedIndex ? 'text-white/70' : 'text-slate-400'}`}>
                      {result.sub}
                    </p>
                  </div>
                  <ArrowRight size={16} className={`shrink-0 transition-all ${
                    index === selectedIndex ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                  }`} />
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <SearchIcon size={24} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-900">No results found for "{query}"</p>
              <p className="text-xs text-slate-500 mt-1">
                {isSuperAdmin 
                  ? 'Try searching for businesses, subscription plans, or governance settings.'
                  : 'Try searching for products, invoices, or navigation nodes.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
