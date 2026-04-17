import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import InvoiceModal from '../components/InvoiceModal';
import { Activity, ShieldAlert } from 'lucide-react';

export default function InvoiceView() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'sale';
  const navigate = useNavigate();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const endpoint = type === 'sale' ? `/invoices/${id}` : `/purchases/${id}`;
        const res = await api.get(endpoint);
        setRecord(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to retrieve the fiscal record node.");
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [id, type]);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Record Node...</p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="p-4 bg-rose-50 rounded-full mb-6">
          <ShieldAlert size={48} className="text-rose-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Audit Protocol Failure</h2>
        <p className="text-sm font-medium text-slate-500 max-w-sm">{error || "The requested fiscal trace does not exist on this node."}</p>
        <button 
          onClick={() => navigate(-1)}
          className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-slate-200"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <InvoiceModal 
        invoice={record} 
        onClose={() => navigate(-1)} 
        type={type === 'sale' ? 'sale' : 'purchase'} 
      />
    </div>
  );
}
