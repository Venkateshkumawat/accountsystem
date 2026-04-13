import { XCircle, Download, ShieldCheck } from 'lucide-react';

interface InvoiceModalProps {
  invoice: any;
  onClose: () => void;
}

export default function InvoiceModal({ invoice, onClose }: InvoiceModalProps) {
  if (!invoice) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-6 bg-slate-900/60 backdrop-blur-md transition-all duration-300">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[96vh] animate-in zoom-in-95 duration-300">
        
        {/* Modal Controls (Not Printed) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2">
             <ShieldCheck size={18} className="text-emerald-400" />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Node Secure Invoice Protocol</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 text-white/50 hover:text-white rounded-xl transition-all"
          >
            <XCircle size={20} />
          </button>
        </div>

        {/* ── PRINT MATERIAL ────────────────────────────────────────────── */}
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 font-inter" id="receipt-content">
          
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-12">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">Nexus Electronics</h1>
              <p className="text-sm font-semibold text-slate-400 tracking-tight">Your Trusted Technology Partner</p>
              <div className="h-1.5 w-16 bg-[#00bcd4] mt-4 rounded-full" />
            </div>
            
            <div className="text-right space-y-3">
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Invoice Date:</p>
                <p className="text-sm font-bold text-slate-900">{new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Invoice No:</p>
                <p className="text-sm font-bold text-slate-900">{invoice.invoiceNumber}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Account No:</p>
                <p className="text-sm font-bold text-slate-900">ACC-2941-7830</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Due Date:</p>
                <p className="text-sm font-bold text-slate-900">{new Date(new Date(invoice.createdAt).getTime() + 15 * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
          </div>

          {/* Billing Info & Large Label */}
          <div className="flex flex-col sm:flex-row justify-between items-end gap-8 mb-12">
            <div className="space-y-4 max-w-sm">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">INVOICE TO</p>
              <div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-1">{invoice.customerName || 'Walk-in Client'}</h4>
                <div className="text-sm font-bold text-slate-500 space-y-1">
                  <p>Phone: {invoice.customerPhone || 'N/A'}</p>
                  <p>Email: {invoice.customerEmail || 'direct-purchase@nexus.com'}</p>
                  <p className="leading-relaxed opacity-70">45, MG Road, Sector 12, Jaipur, Rajasthan - 302001</p>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <h2 className="text-7xl font-black text-[#00bcd4] tracking-tighter opacity-90 leading-none">INVOICE</h2>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">GSTIN: 27AAAAA0000A1Z5</p>
            </div>
          </div>

          {/* Table Protocol */}
          <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm mb-12">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest">
                  <th className="py-4 px-6 text-left w-16">SL</th>
                  <th className="py-4 px-2 text-left">ITEM DESCRIPTION</th>
                  <th className="py-4 px-4 text-center">PRICE</th>
                  <th className="py-4 px-4 text-center">QTY</th>
                  <th className="py-4 px-6 text-right bg-[#00bcd4]">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoice.items?.map((item: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-6 font-bold text-slate-300">{(i + 1).toString().padStart(2, '0')}</td>
                    <td className="py-5 px-2">
                       <p className="font-bold text-slate-900">{item.name}</p>
                    </td>
                    <td className="py-5 px-4 text-center font-bold text-slate-500">₹{item.price.toLocaleString()}</td>
                    <td className="py-5 px-4 text-center font-bold text-slate-700">{(item.qty || 0).toString().padStart(2, '0')}</td>
                    <td className="py-5 px-6 text-right font-black text-slate-900 bg-slate-50/30">₹{item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Aggregate */}
          <div className="flex flex-col sm:flex-row justify-between gap-12 pt-8">
            <div className="space-y-6 max-w-xs">
              <div>
                <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-3">Payment Info</h5>
                <div className="text-[11px] font-bold text-slate-500 space-y-1.5 uppercase tracking-wide">
                  <p>Account No: 1234567890</p>
                  <p>Bank Name: State Bank of India</p>
                  <p>IFSC: SBIN0001234</p>
                  <p>Branch: Jaipur Main</p>
                </div>
              </div>
            </div>

            <div className="flex-1 max-w-xs ml-auto space-y-4">
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-400">Sub Total</span>
                  <span className="font-black text-slate-900">₹{(invoice.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-400">CGST (9%)</span>
                  <span className="font-black text-slate-900">₹{Math.round((invoice.totalGST || 0) / 2).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-400">SGST (9%)</span>
                  <span className="font-black text-slate-900">₹{Math.round((invoice.totalGST || 0) / 2).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-400">Discount</span>
                  <span className="font-black text-emerald-600">- ₹{(invoice.discount || 0).toLocaleString()}</span>
                </div>
              </div>
              
              <div className="bg-[#00bcd4] p-5 rounded-xl flex justify-between items-center shadow-lg shadow-[#00bcd4]/10">
                <span className="text-sm font-black text-white uppercase tracking-widest">TOTAL</span>
                <span className="text-2xl font-black text-white">₹{invoice.grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-16 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
             <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Thank You For Your Business</p>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row justify-between items-end gap-12">
            <div className="max-w-md">
              <h6 className="text-xs font-black text-slate-900 uppercase tracking-tight mb-2">Terms & Conditions</h6>
              <p className="text-[10px] font-medium text-slate-400 leading-relaxed">
                Payment is due within 15 days from the invoice date. Late payments are subject to a 2% monthly interest charge. Goods once sold will not be taken back. Warranty as per manufacturer terms.
              </p>
            </div>
            <div className="text-center w-64 border-t-2 border-slate-100 pt-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Authorised Signature</p>
            </div>
          </div>
        </div>

        {/* Modal Footer (Not Printed) */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0 no-print">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          >
            <Download size={16} /> DOWNLOAD LEDGER PROOF
          </button>
          <button
            onClick={onClose}
            className="px-8 py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:text-slate-600 transition-all hover:bg-slate-50"
          >
            Back to Grid
          </button>
        </div>
      </div>
    </div>
  );
}
