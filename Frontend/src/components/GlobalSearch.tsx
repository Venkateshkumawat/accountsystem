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
  const { user, isSuperAdmin, hasPermission } = useAuth();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Persistence Lock: Prevents redundant searches
  const lastExecutedQuery = useRef('');
  const lastEmptyQuery = useRef('');

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

      let matchedProducts: SearchResult[] = [];
      let matchedInvoices: SearchResult[] = [];
      let matchedParties: SearchResult[] = [];
      let matchedBusinesses: SearchResult[] = [];

      if (isSuperAdmin) {
        // 🏗️ SuperAdmin Multi-Node Search Protocol
        const bizRes = await api.get(`/businesses?search=${trimmedQ}&limit=5`);
        const bizData = bizRes.data?.data || [];
        matchedBusinesses = bizData.map((b: any) => ({
          id: b._id,
          label: b.businessName,
          sub: `Node ID: ${b.businessId} • Owner: ${b.ownerName}`,
          path: `/superadmin/accounts`, 
          type: 'party',
          icon: Shield
        }));
      } else {
        // 🏢 Business Admin Scoped Search Protocol
        const [prodRes, invRes, partyRes] = await Promise.all([
          api.get(`/products?name=${trimmedQ}&limit=5`).catch(() => ({ data: { data: [] } })),
          api.get(`/invoices?search=${trimmedQ}&limit=5`).catch(() => ({ data: { data: [] } })),
          api.get(`/parties?search=${trimmedQ}&limit=5`).catch(() => ({ data: { data: [] } }))
        ]);

        matchedProducts = (prodRes.data?.data || []).map((p: any) => ({
          id: p._id,
          label: p.name,
          sub: `SKU: ${p.sku} • Stock: ${p.stock} units`,
          path: `/inventory`,
          type: 'product',
          icon: Package
        }));

        matchedInvoices = (invRes.data?.data || []).map((i: any) => ({
          id: i._id,
          label: `Invoice #${i.invoiceNumber}`,
          sub: `${i.customerName} • ₹${i.grandTotal}`,
          path: `/invoices`,
          type: 'invoice',
          icon: FileText
        }));

        matchedParties = (partyRes.data?.data || []).map((p: any) => ({
          id: p._id,
          label: p.name,
          sub: `${p.type.toUpperCase()} • ${p.phone}`,
          path: `/parties`,
          type: 'party',
          icon: Users
        }));
      }

      const allResults = [
        ...matchedBusinesses,
        ...matchedProducts, 
        ...matchedInvoices, 
        ...matchedParties,
        ...matchedPages, 
      ].slice(0, 6);

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
          placeholder="Smart search (Ctrl + K)..."
          className="w-full bg-slate-50 border-none rounded-2xl py-2.5 pl-11 pr-4 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
        />
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
        
        {query && !loading && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
          >
            <X size={16} />
          </button>
        )}

        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

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
              <p className="text-xs text-slate-500 mt-1">Try searching for products, invoices, or navigation nodes.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
