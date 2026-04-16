import { XCircle, ShieldCheck, Share2, Printer, ArrowLeft } from 'lucide-react';

interface InvoiceModalProps {
  invoice: any;
  onClose: () => void;
  type?: 'sale' | 'purchase';
}

export default function InvoiceModal({ invoice, onClose, type = 'sale' }: InvoiceModalProps) {
  if (!invoice) return null;

  const isSale = type === 'sale';
  
  // 💎 SKY BLUE & WHITE PREMIUM THEME
  const themeBg = 'bg-[#0ea5e9]'; 
  const themeText = 'text-[#0ea5e9]';
  const themeBorder = 'border-[#0ea5e9]';

  // ── DATA INTEGRITY ──────────────────────────────────────────────────────
  const items = invoice.items || [];
  const calcSubtotal = items.reduce((acc: number, item: any) => acc + (Number(item.price || 0) * Number(item.qty || 0)), 0);
  const calcGST = items.reduce((acc: number, item: any) => acc + ((Number(item.price || 0) * Number(item.qty || 0)) * (Number(item.gstRate || 0) / 100)), 0);
  const calcDisc = items.reduce((acc: number, item: any) => acc + Number(item.discount || 0), 0);

  const displaySubtotal = Number(invoice.subtotal || calcSubtotal);
  const displayGST = Number(invoice.totalGST || calcGST);
  const displayDiscount = Number(invoice.totalDiscount || invoice.discount || calcDisc);
  const displayGrandTotal = Number(invoice.grandTotal || (displaySubtotal + displayGST - displayDiscount));

  const handleWhatsAppShare = () => {
    const text = `*NexusBill Transaction Manifest*%0A%0A*Invoice:* ${invoice.invoiceNumber}%0A*Date:* ${new Date(invoice.createdAt).toLocaleDateString()}%0A*Client:* ${invoice.customerName || 'Walk-in'}%0A*Total Amount:* ₹${displayGrandTotal.toLocaleString()}%0A%0A_Generated via Nexus Terminal System_`;
    window.open(`https://wa.me/${invoice.customerPhone ? '91' + invoice.customerPhone : ''}?text=${text}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-6 bg-slate-900/60 backdrop-blur-md transition-all duration-300 font-inter">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        @media print {
          @page { size: A4; margin: 10mm; }
          body * { visibility: hidden; }
          #receipt-content, #receipt-content * { visibility: visible !important; }
          #receipt-content {
            position: absolute; left: 0; top: 0; width: 100% !important;
            padding: 0 !important; margin: 0 !important;
            box-shadow: none !important; border: none !important;
            background-color: white !important;
          }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          thead { display: table-header-group !important; }
          tr { page-break-inside: avoid !important; }
          .footer-section { break-inside: avoid !important; page-break-inside: avoid !important; }
          
          /* Enforce side-by-side on print regardless of scale */
          .terms-signature-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 40px !important; }
        }
      `}</style>

      <div className="bg-white w-full max-w-4xl rounded-none md:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full md:h-auto max-h-screen md:max-h-[96vh] animate-in zoom-in-95 duration-500 border border-slate-100">
        
        {/* Terminal Header (No-Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center shadow-lg">
                <ShieldCheck size={16} className="text-white" />
             </div>
             <div>
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white leading-none">A4 Display Node</h3>
               <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Stabilized Authorization Grid</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
            <XCircle size={24} />
          </button>
        </div>

        {/* ── INVOICE CONTENT ────────────────────────────────────────────── */}
        <div className="p-8 md:p-12 overflow-y-auto no-scrollbar flex-1 scroll-smooth bg-white" id="receipt-content">
          
          {/* Header Block */}
          <div className="flex justify-between items-start mb-6 border-b-2 border-sky-50 pb-6">
            <div className="space-y-3">
              <h1 className="text-3xl font-black text-sky-600 tracking-tighter uppercase leading-none">
                {invoice.businessDetails?.name || 'Nexus Retail Cluster'}
              </h1>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest space-y-0.5">
                <p>{invoice.businessDetails?.address || 'Mumbai Cluster Node, Maharashtra'}</p>
                <p>{invoice.businessDetails?.city} - {invoice.businessDetails?.pincode}</p>
                <p className="text-sky-50 font-black pt-1 px-2 bg-sky-600 rounded inline-block">GSTIN: {invoice.businessDetails?.gstin || '27AAAAA1234A1Z1'}</p>
              </div>
            </div>

            <div className="text-right space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 leading-none">Receipt Manifest</p>
                <p className="text-lg font-black text-slate-900 tracking-tighter leading-none">#{invoice.invoiceNumber}</p>
                <div className="pt-2 text-right space-y-0.5">
                   <p className="text-[10px] font-black text-slate-900 uppercase">DATE: {new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                   <p className="text-[9px] font-black text-sky-500 uppercase tracking-widest leading-none">TIME: {new Date(invoice.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                </div>
            </div>
          </div>

          {/* Customer & Payment Info */}
          <div className="flex justify-between items-end mb-8 px-6 py-6 bg-sky-50/20 border-2 border-sky-50 rounded-[2rem]">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-sky-400 uppercase tracking-[0.3em] leading-none mb-1">To Invoice</p>
              <h4 className="text-xl font-black text-slate-900 tracking-tight uppercase">{invoice.customerName || 'Walk-in Client'}</h4>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight pt-1">
                 <p>{invoice.customerPhone || 'N/A'} | {invoice.customerAddress || 'Local Area Hub'}</p>
                 {invoice.customerGstin && (
                   <p className="text-sky-600 font-extrabold bg-sky-100/50 px-2 py-0.5 rounded-md inline-block mt-1 tracking-widest text-[9px]">CLIENT GSTIN: {invoice.customerGstin}</p>
                 )}
              </div>
            </div>
            
            <div className="text-right">
               <p className="text-[9px] font-black text-sky-400 uppercase tracking-widest mb-1">Payment Method</p>
               <p className="text-[12px] font-black text-slate-900 uppercase tracking-widest px-3 py-1 bg-white border border-sky-100 rounded-lg shadow-sm inline-block">{invoice.paymentMethod || 'CASH'}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full text-left font-inter border-collapse">
               <thead>
                 <tr className="bg-sky-600 text-white text-[10px] font-black uppercase tracking-widest border border-sky-700">
                   <th className="py-3 px-4 border border-sky-700 w-12 text-center">SL</th>
                   <th className="py-3 px-4 border border-sky-700">Product Manifest Items</th>
                   <th className="py-3 px-3 border border-sky-700 text-center w-20">Rate</th>
                   <th className="py-3 px-3 border border-sky-700 text-center w-16">Qty</th>
                   <th className="py-3 px-4 border border-sky-700 text-right bg-sky-700 w-28">Total Sum</th>
                 </tr>
               </thead>
               <tbody className="text-slate-900 font-semibold border border-slate-200">
                 {items.map((item: any, i: number) => (
                   <tr key={i} className="border border-slate-100">
                     <td className="py-2.5 px-4 border-r border-slate-100 text-sky-300 font-bold text-[10px] text-center">{(i+1).toString().padStart(2, '0')}</td>
                     <td className="py-2.5 px-4 border-r border-slate-100 uppercase text-[10px] font-bold leading-tight">{item.name}</td>
                     <td className="py-2.5 px-3 border-r border-slate-100 text-center text-[10px]">₹{Number(item.price).toLocaleString()}</td>
                     <td className="py-2.5 px-3 border-r border-slate-100 text-center font-black text-[10px] text-sky-600">{Number(item.qty)}</td>
                     <td className="py-2.5 px-4 text-right font-black text-[10px] bg-slate-50/5">₹{Number(item.total).toLocaleString()}</td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>

          <div className="footer-section space-y-12">
            {/* Calculations Group */}
            <div className="flex justify-end pr-2">
              <div className="w-full md:w-80 space-y-2">
                <div className="border border-sky-100 p-5 rounded-[1.5rem] bg-slate-50/30 space-y-3">
                   <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Gross Value</span>
                      <span className="text-slate-900 font-black">₹ {displaySubtotal.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest border-t border-sky-50 pt-3">
                      <span>Taxation load</span>
                      <span className="text-sky-600 font-black">₹ {displayGST.toLocaleString()}</span>
                   </div>
                   {displayDiscount > 0 && (
                     <div className="flex justify-between items-center text-[9px] font-black text-rose-500 uppercase tracking-widest pt-0.5">
                        <span>Discount Offset</span>
                        <span>-₹ {displayDiscount.toLocaleString()}</span>
                     </div>
                   )}
                </div>

                <div className="bg-sky-600 p-6 rounded-[2rem] flex justify-between items-center text-white shadow-xl shadow-sky-900/10">
                   <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] mb-0.5 block leading-none">Total Payable</span>
                      <p className="text-[8px] font-semibold text-sky-100/50 uppercase leading-none">Authorized Settlement</p>
                   </div>
                   <span className="text-3xl md:text-4xl font-black text-white tracking-tighter underline decoration-sky-400/50 decoration-4 underline-offset-8">₹ {displayGrandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Terms & Signature Hub (STRICT SIDE-BY-SIDE GRID) */}
            <div className="terms-signature-grid grid grid-cols-2 gap-10 items-end border-t-2 border-slate-100 pt-8 px-4 w-full">
              
              {/* Left: Standard Terms line */}
              <div className="space-y-4">
                 <div className="flex items-center gap-2">
                    <div className="w-1 h-3 bg-sky-600" />
                    <h6 className="text-[10px] font-black text-sky-600 uppercase tracking-widest leading-none">Standard Terms & Policy</h6>
                 </div>
                 <ul className="text-[8px] font-semibold text-slate-400 uppercase space-y-1.5 leading-relaxed italic border-l-2 border-slate-100 pl-4">
                    <li>• Goods once sold cannot be returned.</li>
                    <li>• Verify items before exit.</li>
                    <li>• Local jurisdiction applies.</li>
                    <li>• Warranty via manufacturer.</li>
                 </ul>
              </div>

              {/* Right: Signature / Stamp Area (STRICTLY ON THE RIGHT) */}
              <div className="text-center space-y-4 flex flex-col items-center">
                 <div className="space-y-2 w-full">
                    <div className="h-0.5 bg-slate-900 w-full mb-1" />
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] font-inter leading-none">Authorized Sign / Stamp</p>
                 </div>
                 <div className="w-full h-16 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center bg-slate-50/50">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.1em]">Place Manual Stamp Here</p>
                 </div>
                 <p className="text-[8px] font-black text-sky-200 uppercase tracking-[0.6em] leading-none pt-2">NXS-HUBSYNC-{invoice._id ? invoice._id.slice(-6).toUpperCase() : 'AUTH'}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Action Dock */}
        <div className="p-4 md:p-6 bg-slate-950 flex justify-center gap-4 no-print border-t border-slate-900">
          <button onClick={onClose} className="px-10 py-5 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-700 transition-all flex items-center gap-3 active:scale-95">
             <ArrowLeft size={16} /> Back Hub
          </button>
          <button onClick={handlePrint} className="px-12 py-5 bg-sky-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-sky-500 transition-all flex items-center gap-3 shadow-xl active:scale-95 relative overflow-hidden group">
             <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
             <Printer size={16} className="relative z-10" /> <span className="relative z-10">Execute Print</span>
          </button>
        </div>
      </div>
    </div>
  );
}
