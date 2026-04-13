import { XCircle, ShieldCheck, Share2, Printer, ArrowLeft } from 'lucide-react';

interface InvoiceModalProps {
  invoice: any;
  onClose: () => void;
  type?: 'sale' | 'purchase';
}

export default function InvoiceModal({ invoice, onClose, type = 'sale' }: InvoiceModalProps) {
  if (!invoice) return null;

  const isSale = type === 'sale';
  const themeBg = isSale ? 'bg-[#00bcd4]' : 'bg-amber-500';
  const themeText = isSale ? 'text-[#00bcd4]' : 'text-amber-500';

  const handleWhatsAppShare = () => {
    const text = `*NexusBill Transaction Manifest*%0A%0A*Invoice:* ${invoice.invoiceNumber}%0A*Date:* ${new Date(invoice.createdAt).toLocaleDateString()}%0A*Client:* ${invoice.customerName || 'Walk-in'}%0A*Total Amount:* ₹${invoice.grandTotal.toLocaleString()}%0A%0A_Generated via Nexus Terminal System_`;
    window.open(`https://wa.me/${invoice.customerPhone ? '91' + invoice.customerPhone : ''}?text=${text}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white w-full max-w-2xl rounded-none sm:rounded-[1.5rem] shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto max-h-screen sm:max-h-[96vh] animate-in zoom-in-95 duration-300 font-inter">
        
        {/* Modal Controls (Not Printed) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2">
             <ShieldCheck size={18} className="text-emerald-400" />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
               {isSale ? 'Sale Hub Protocol' : 'Purchase Ledger Node'}
             </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 text-white/50 hover:text-white rounded-xl transition-all"
          >
            <XCircle size={20} />
          </button>
        </div>

        {/* ── PRINT MATERIAL ────────────────────────────────────────────── */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar" id="receipt-content">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 text-slate-900">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-none mb-1">Nexus Electronics</h1>
              <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 tracking-tight uppercase">Strategic Technology Partner</p>
              <div className={`h-1 w-8 ${themeBg} mt-2 rounded-full`} />
            </div>
            
            <div className="grid grid-cols-2 md:flex md:flex-col gap-3 md:gap-2 w-full md:w-auto md:text-right">
              <div className="space-y-0.5">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">Date</p>
                <p className="text-[10px] sm:text-xs font-semibold">{new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">Invoice No</p>
                <p className="text-[10px] sm:text-xs font-semibold">{invoice.invoiceNumber}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">Node Type</p>
                <p className={`text-[10px] sm:text-xs font-semibold uppercase ${isSale ? 'text-indigo-600' : 'text-amber-600'}`}>{type}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">Expiry</p>
                <p className="text-[10px] sm:text-xs font-semibold">{new Date(new Date(invoice.createdAt).getTime() + 15 * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
          </div>

          {/* Billing Info & Large Label */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-8">
            <div className="space-y-3 max-w-xs">
              <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">{isSale ? 'INVOICE TO' : 'PURCHASE FROM'}</p>
              <div>
                <h4 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-0.5">{invoice.customerName || 'Walk-in Client'}</h4>
                <div className="text-[10px] sm:text-xs font-semibold text-slate-500 space-y-0.5">
                  <p>Phone: {invoice.customerPhone || 'N/A'}</p>
                  <p>Email: {invoice.customerEmail || 'nexus@terminal.com'}</p>
                  <p className="leading-relaxed opacity-70">Client Node Location Registered</p>
                </div>
              </div>
            </div>
            
            <div className="text-left sm:text-right w-full sm:w-auto mt-2 sm:mt-0">
              <h2 className={`text-3xl sm:text-4xl font-black ${themeText} tracking-tighter opacity-90 leading-none`}>
                {isSale ? 'SALE' : 'PURCHASE'}
              </h2>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 leading-none">{isSale ? 'GSTIN: 27AAAAA0000A1Z5' : 'VENDOR REG: ACTIVE'}</p>
            </div>
          </div>

          {/* Table Protocol - Scrollable on Mobile */}
          <div className="overflow-x-auto -mx-4 sm:mx-0 mb-8 font-inter">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <div className="overflow-hidden rounded-xl border border-slate-100 shadow-sm">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[9px] font-semibold uppercase tracking-widest">
                      <th className="py-3 px-4 text-left w-12">SL</th>
                      <th className="py-3 px-2 text-left">ITEM</th>
                      <th className="py-3 px-3 text-center">PRICE</th>
                      <th className="py-3 px-3 text-center">QTY</th>
                      <th className={`py-3 px-4 text-right ${themeBg}`}>AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {invoice.items?.map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-300">{(i + 1).toString().padStart(2, '0')}</td>
                        <td className="py-3 px-2">
                           <p className="font-semibold text-slate-900 text-[10px] sm:text-xs uppercase tracking-tight">{item.name}</p>
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-500 whitespace-nowrap">₹{item.price.toLocaleString()}</td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-700">{(item.qty || 0).toString().padStart(2, '0')}</td>
                        <td className="py-3 px-4 text-right font-black text-slate-900 bg-slate-50/30 whitespace-nowrap">₹{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer Aggregate */}
          <div className="flex flex-col lg:flex-row justify-between gap-6 lg:gap-8 pt-4">
            <div className="space-y-4 max-w-xs">
              <div>
                <h5 className="text-xs font-black text-slate-900 uppercase tracking-tight mb-2">Nodal Information</h5>
                <div className="text-[9px] sm:text-[10px] font-semibold text-slate-500 space-y-1 uppercase tracking-wide">
                  <p>Account Type: {isSale ? 'Revenue' : 'Expense'}</p>
                  <p>Bank Sync: Nexus Global Port</p>
                  <p>IFSC Protocol: SBIN0001234</p>
                  <p>Branch: Main Terminal</p>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full lg:max-w-xs ml-auto space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] sm:text-xs">
                  <span className="font-semibold text-slate-400">Sub Total</span>
                  <span className="font-black text-slate-900">₹{(invoice.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] sm:text-xs">
                  <span className="font-semibold text-slate-400">GST Protocol</span>
                  <span className="font-black text-slate-900">₹{(invoice.totalGST || 0).toLocaleString()}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between items-center text-[11px] sm:text-xs text-emerald-600">
                    <span className="font-semibold">Discount Offset</span>
                    <span className="font-black">- ₹{(invoice.discount || 0).toLocaleString()}</span>
                  </div>
                )}
              </div>
              
              <div className={`${themeBg} p-4 rounded-xl flex justify-between items-center shadow-lg transition-colors`}>
                <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-widest">TOTAL</span>
                <span className="text-xl sm:text-2xl font-black text-white">₹{invoice.grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center py-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
             <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Thank You For Synchronizing with Nexus</p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row justify-between items-end gap-6 sm:gap-8">
            <div className="max-w-md w-full">
              <h6 className="text-[8px] font-black text-slate-900 uppercase tracking-tight mb-1">Terms & Conditions</h6>
              <p className="text-[7px] sm:text-[8px] font-medium text-slate-400 leading-relaxed">
                Nodal settlement within 15 intervals. Late pings subject to logic increment. Goods verified on dispatch. 
                Warranty bound by Nexus manufacturer protocol.
              </p>
            </div>
            <div className="text-center w-full sm:w-48 border-t border-slate-200 pt-2">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Terminal Signature</p>
            </div>
          </div>
        </div>

        {/* Modal Footer (Not Printed) */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2 shrink-0 no-print">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2"
          >
            <ArrowLeft size={14} /> Back
          </button>
          
          <button
            onClick={handleWhatsAppShare}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            <Share2 size={14} /> WhatsApp
          </button>

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>
    </div>
  );
}
