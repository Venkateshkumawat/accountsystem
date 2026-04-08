import { XCircle, Zap, Download } from 'lucide-react';

interface InvoiceModalProps {
  invoice: any;
  onClose: () => void;
}

export default function InvoiceModal({ invoice, onClose }: InvoiceModalProps) {
  if (!invoice) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl">
              <Zap size={24} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tighter">Receipt Node #{invoice.invoiceNumber}</h3>
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">NexusBill Transaction Verified</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-white/10 text-white/50 hover:text-white rounded-2xl transition-all"
          >
            <XCircle size={24} />
          </button>
        </div>
        <div className="p-10 overflow-y-auto space-y-8 flex-1" id="receipt-content">
          <div className="flex justify-between items-start border-b border-slate-100 pb-8">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Billed To</p>
                <h4 className="text-2xl font-black text-slate-900 tracking-tighter">{invoice.customerName || 'Walk-in Client'}</h4>
                <p className="text-sm font-bold text-slate-500">{invoice.customerPhone || 'Direct POS Purchase'}</p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-[9px] font-black">
                TIMESTAMP: {new Date(invoice.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Settlement</p>
              <div className={`text-xs font-black uppercase tracking-widest ${invoice.paymentStatus === 'paid' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {invoice.paymentStatus === 'paid' ? 'Fully Secured' : 'Awaiting Hub Sync'}
              </div>
              <div className="text-[10px] font-bold text-slate-300 mt-1 uppercase tracking-widest">{invoice.paymentMethod} Channel</div>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-[9px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-50">
                <th className="py-4 text-left">Service/SKU</th>
                <th className="py-4 text-center">Qty</th>
                <th className="py-4 text-right">Unit Node</th>
                <th className="py-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoice.items?.map((item: any, i: number) => (
                <tr key={i}>
                  <td className="py-5 font-black text-slate-800">{item.name}</td>
                  <td className="py-5 text-center font-bold text-slate-500">x{item.qty}</td>
                  <td className="py-5 text-right font-bold text-slate-500">₹{item.price.toLocaleString()}</td>
                  <td className="py-5 text-right font-black text-slate-900">₹{item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-3 pt-8 border-t border-slate-100">
            <div className="flex justify-between text-sm">
              <span className="font-bold text-slate-400">Sub-Aggregate</span>
              <span className="font-black text-slate-600">₹{(invoice.subtotal || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-bold text-slate-400">Tax Protocol (GST)</span>
              <span className="font-black text-slate-600">₹{(invoice.totalGST || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-6 border-t border-slate-100">
              <span className="text-xl font-black tracking-tighter text-slate-400">Grand Total</span>
              <span className="text-3xl font-black tracking-tighter text-indigo-600">₹{invoice.grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="p-8 bg-slate-50 flex gap-4 shrink-0">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <Download size={14} /> Download Ledger Proof
          </button>
          <button
            onClick={onClose}
            className="px-10 py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:text-slate-600 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
