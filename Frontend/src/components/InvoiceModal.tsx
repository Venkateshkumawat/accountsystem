import { useState, useEffect, useRef } from 'react';
import { XCircle, ShieldCheck, Share2, Printer, ArrowLeft, ZoomIn, ZoomOut, CheckCircle2 } from 'lucide-react';

interface InvoiceModalProps {
  invoice: any;
  onClose: () => void;
  type?: 'sale' | 'purchase';
}

const numberToWords = (num: number) => {
  const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  if (num === 0) return 'ZERO ONLY';
  
  const convert = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + 'hundred ' + (n % 100 !== 0 ? 'and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + 'thousand ' + (n % 1000 !== 0 ? convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + 'lakh ' + (n % 100000 !== 0 ? convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + 'crore ' + (n % 10000000 !== 0 ? convert(n % 10000000) : '');
  };

  return (convert(Math.floor(num)) + 'only').toUpperCase();
};

export default function InvoiceModal({ invoice, onClose, type = 'sale' }: InvoiceModalProps) {
  const [zoom, setZoom] = useState(window.innerWidth < 768 ? 0.35 : 0.85);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setZoom((window.innerWidth - 24) / 850);
      } else {
        setZoom(0.85);
      }
    };

    const container = scrollContainerRef.current;
    const preventDefault = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoom(prev => Math.min(Math.max(prev + delta, 0.1), 2));
      }
    };

    if (container) {
      container.addEventListener('wheel', preventDefault, { passive: false });
    }

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    
    return () => {
      if (container) container.removeEventListener('wheel', preventDefault);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (!invoice) return null;

  // ── DATA PREPARATION ──────────────────────────────────────────────────────
  const items = invoice.items || [];
  const displaySubtotal = Number(invoice.subtotal || items.reduce((acc: number, item: any) => acc + (Number(item.price || item.purchasePrice || 0) * Number(item.qty || 0)), 0));
  const displayDiscount = Number(invoice.totalDiscount || invoice.discount || 0);
  const taxableAmount = displaySubtotal - displayDiscount;
  const displayGST = Number(invoice.totalGST || items.reduce((acc: number, item: any) => acc + ((Number(item.price || item.purchasePrice || 0) * Number(item.qty || 0)) * (Number(item.gstRate || 0) / 100)), 0));
  const cgst = displayGST / 2;
  const sgst = displayGST / 2;
  const displayGrandTotal = taxableAmount + displayGST;

  // Invoice Number Formatting: INV/YYYY/MM/XXXX
  const createdAt = new Date(invoice.createdAt);
  const year = createdAt.getFullYear();
  const month = (createdAt.getMonth() + 1).toString().padStart(2, '0');
  const counter = invoice.invoiceNumber?.split('-').pop() || '0001';
  const formattedInvoiceNumber = `INV/${year}/${month}/${counter}`;

  const handleWhatsAppShare = () => {
    const text = `*NexusBill Transaction*%0A%0A*ID:* ${invoice.transactionId || formattedInvoiceNumber}%0A*No:* ${formattedInvoiceNumber}%0A*Total:* ₹${displayGrandTotal.toFixed(2)}%0A%0A_Generated via Nexus Terminal_`;
    window.open(`https://wa.me/${invoice.customerPhone ? '91' + invoice.customerPhone : ''}?text=${text}`, '_blank');
  };

  const handlePrint = () => window.print();
  const adjustZoom = (delta: number) => setZoom(prev => Math.min(Math.max(prev + delta, 0.1), 2));
  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col font-inter overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @media print {
          @page { size: A4; margin: 10mm; }
          html, body { 
            height: auto !important; 
            overflow: visible !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          * { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body * { visibility: hidden; }
          #receipt-content, #receipt-content * { visibility: visible !important; }
          #receipt-content { 
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            display: block !important;
            width: 100% !important; 
            padding: 0 !important; 
            margin: 0 !important; 
            transform: none !important; 
            box-shadow: none !important; 
            border: none !important; 
            min-height: auto !important;
            height: auto !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Action Dock - Top Navigation */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 sm:p-4 sticky top-0 z-[10000] no-print shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <button onClick={onClose} className="p-2.5 bg-slate-800 text-slate-100 rounded-xl hover:bg-slate-700 transition-all active:scale-95">
                <ArrowLeft size={18} />
             </button>
             <div className="hidden md:block">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-white leading-none">GST Terminal</h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">H-FIDELITY Protocol</p>
             </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 scale-90 sm:scale-100">
             <button onClick={() => adjustZoom(-0.1)} className="p-2 text-slate-400 hover:text-white rounded-lg"><ZoomOut size={16} /></button>
             <button onClick={() => setZoom(1)} className="px-3 text-[10px] font-black text-slate-500 hover:text-sky-400 min-w-[50px]">{Math.round(zoom * 100)}%</button>
             <button onClick={() => adjustZoom(0.1)} className="p-2 text-slate-400 hover:text-white rounded-lg"><ZoomIn size={16} /></button>
          </div>
          
          <div className="hidden sm:flex items-center gap-2">
            <button onClick={handleWhatsAppShare} className="px-4 h-10 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/10">
              <Share2 size={14} /> <span>WhatsApp</span>
            </button>
            <button onClick={handlePrint} className="px-5 h-10 bg-sky-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-sky-500/10">
              <Printer size={16} /> <span>Print Bill</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-hidden overflow-y-auto no-scrollbar bg-slate-50/50 p-0 sm:p-4 pb-32 sm:pb-4 scroll-smooth" ref={scrollContainerRef}>
        <div 
          id="receipt-content" 
          className="relative left-1/2 bg-white border border-slate-200 shadow-2xl p-6 sm:p-10 md:p-16 flex flex-col min-h-[1100px] transition-transform duration-200" 
          style={{ 
            width: '850px',
            transform: `translateX(-50%) scale(${zoom})`,
            transformOrigin: 'top',
            marginBottom: `-${1100 * (1 - zoom)}px` 
          }}
        >
          
          {/* 1. HEADER SECTION */}
          <div className="flex justify-between items-start mb-8 pb-8 border-b-2 border-sky-50">
            <div className="space-y-3">
              <h1 className="text-4xl font-black text-sky-600 tracking-tighter uppercase leading-none">
                {type === 'purchase' ? (invoice.vendorName || invoice.vendorCompany || 'SUPPLIER HUB') : (invoice.businessDetails?.name || 'JIO MART')}
              </h1>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest space-y-1">
                <p>{type === 'purchase' ? (invoice.vendorAddress || 'Vendor Logistics Area') : (invoice.businessDetails?.address || 'Node Area, Maharashtra')}</p>
                <p className="bg-sky-600 text-white px-2 py-0.5 rounded inline-block font-black mt-1">
                  GSTIN: {type === 'purchase' ? (invoice.vendorGstin || 'EXEMPT') : (invoice.businessDetails?.gstin || '27AAAAA1234A1Z1')}
                </p>
              </div>
            </div>

            <div className="text-right space-y-3">
              <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg border-b-4 border-sky-500">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-sky-400 mb-1 leading-none">Transaction Hub</p>
                <p className="text-xl font-semibold tracking-tighter leading-none font-inter">{invoice.transactionId || formattedInvoiceNumber}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Ref: {formattedInvoiceNumber}</p>
              </div>
              <div className="pt-1 text-right space-y-1">
                <div className="flex items-center justify-end gap-2">
                   <span className="text-[9px] font-black text-slate-400 uppercase">Payment Status</span>
                   <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                     <CheckCircle2 size={8} /> PAID
                   </span>
                </div>
                <p className="text-[10px] font-black text-slate-900 uppercase">Date: {createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Time: {createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
              </div>
            </div>
          </div>

          {/* 2. CUSTOMER SECTION */}
          <div className="mb-10 p-6 bg-sky-50/30 border-2 border-sky-50 rounded-[2rem] flex justify-between items-end">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-sky-500 uppercase tracking-[0.3em] leading-none">{type === 'purchase' ? 'Bill To (Buyer)' : 'Bill To'}</p>
              <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                {type === 'purchase' ? (invoice.businessDetails?.name || 'INTERNAL BUSINESS') : (invoice.customerName || 'Walk-in Client')}
              </h4>
              <div className="text-[11px] font-bold text-slate-500 uppercase space-y-0.5">
                 <p>📞 {type === 'purchase' ? (invoice.businessDetails?.phone || 'N/A') : (invoice.customerPhone || 'N/A')}</p>
                 <p>📍 {type === 'purchase' ? (invoice.businessDetails?.address || 'Local HQ') : (invoice.customerAddress || 'Local Area Node')}</p>
                 {(type === 'purchase' ? invoice.businessDetails?.gstin : invoice.customerGstin) && (
                   <p className="text-sky-600 font-black pt-1">GSTIN: {type === 'purchase' ? invoice.businessDetails?.gstin : invoice.customerGstin}</p>
                 )}
              </div>
            </div>
            <div className="text-right border-l-2 border-sky-100 pl-6 space-y-1">
               <p className="text-[9px] font-black text-sky-400 uppercase tracking-widest">Protocol Date</p>
               <p className="text-[12px] font-black text-slate-900 uppercase">{createdAt.toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          {/* 3. ITEMS TABLE */}
          <div className="flex-1 mb-10 overflow-hidden">
            <table className="w-full text-left border-collapse rounded-xl overflow-hidden">
               <thead>
                 <tr className="bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest">
                   <th className="py-4 px-4 text-center w-12">SL</th>
                   <th className="py-4 px-4">Item Description</th>
                   <th className="py-4 px-3 text-right">Qty</th>
                   <th className="py-4 px-3 text-right">Rate</th>
                   <th className="py-4 px-3 text-right">Disc</th>
                   <th className="py-4 px-3 text-right">GST %</th>
                   <th className="py-4 px-4 text-right bg-sky-600">Amount</th>
                 </tr>
               </thead>
               <tbody className="text-slate-900 font-semibold border-x border-slate-100">
                 {items.map((item: any, i: number) => (
                   <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                     <td className="py-3 px-4 text-center text-[10px] text-slate-300 font-black">{(i+1).toString().padStart(2, '0')}</td>
                     <td className="py-3 px-4">
                        <p className="text-[11px] font-black uppercase text-slate-900">{item.name}</p>
                        <p className="text-[9px] text-slate-400 italic">₹{Number(item.price || item.purchasePrice).toFixed(2)} × {item.qty}</p>
                     </td>
                     <td className="py-3 px-3 text-right text-[11px] font-black">{item.qty}</td>
                     <td className="py-3 px-3 text-right text-[11px]">₹{Number(item.price || item.purchasePrice).toFixed(2)}</td>
                     <td className="py-3 px-3 text-right text-[11px] text-rose-500">{(Number(item.discount || 0)).toFixed(2)}</td>
                     <td className="py-3 px-3 text-right text-[11px] text-sky-600 font-black">{item.gstRate || 18}%</td>
                     <td className="py-3 px-4 text-right text-[11px] font-black bg-sky-50/30">₹{Number(item.total).toFixed(2)}</td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>

          {/* 4. BILLING SUMMARY */}
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-10 items-end">
               <div className="space-y-6 pb-2">
                 {/* 6. NET AMOUNT IN WORDS */}
                 <div>
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">Rupees in Words</h5>
                    <p className="text-[11px] font-black text-slate-900 uppercase border-l-4 border-sky-500 pl-4 py-2 bg-slate-50/50 rounded-r-xl leading-relaxed">
                      INDIAN RUPEES {numberToWords(Math.round(displayGrandTotal))}
                    </p>
                 </div>

                 {/* 5. PAYMENT SECTION */}
                 <div className="bg-sky-50/50 p-5 rounded-3xl border border-sky-100 inline-flex items-center gap-5">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-sky-200 shadow-sm">
                       <ShieldCheck size={24} className="text-sky-600" />
                    </div>
                    <div>
                       <p className="text-[10px] font-semibold text-slate-900 uppercase leading-none font-inter">Payment Mode: <span className="text-sky-600">{invoice.paymentMethod || 'CASH'}</span></p>
                       <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 leading-none">Paid On: {createdAt.toLocaleString('en-IN')}</p>
                       <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 leading-none tracking-tighter">TXN: {invoice.transactionId || 'HUB-MANIFEST'}</p>
                    </div>
                 </div>
               </div>

               <div className="space-y-4">
                  <div className="bg-white border-2 border-slate-100 p-6 rounded-[2.5rem] space-y-3 shadow-md shadow-slate-200/20">
                     <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                        <span>Total Items Value</span>
                        <span className="text-slate-900 font-black">₹{displaySubtotal.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between items-center text-[10px] font-bold text-rose-500 uppercase">
                        <span>Corporate Discount</span>
                        <span className="font-black">-₹{displayDiscount.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between items-center text-[11px] font-bold text-slate-900 uppercase pt-2 border-t border-slate-100">
                        <span>Taxable Amount</span>
                        <span className="font-black">₹{taxableAmount.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between items-center text-[10px] font-bold text-sky-600/80 uppercase">
                        <span>CGST (4.5%)</span>
                        <span className="font-black">₹{cgst.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between items-center text-[10px] font-bold text-sky-600/80 uppercase pb-1">
                        <span>SGST (4.5%)</span>
                        <span className="font-black">₹{sgst.toFixed(2)}</span>
                     </div>
                  </div>

                  <div className="bg-sky-600 p-5 rounded-2xl shadow-lg shadow-sky-600/10 flex justify-between items-center text-white group hover:bg-sky-500 transition-colors cursor-default overflow-hidden">
                    <div className="flex items-center gap-3 min-w-0">
                       <div className="w-1.5 h-8 bg-sky-300/40 rounded-full shrink-0" />
                       <div className="min-w-0 overflow-hidden">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-0.5 block leading-none truncate">Final Payable</span>
                          <p className="text-[7px] font-bold text-sky-100/40 uppercase leading-none italic truncate">Inclusive of all taxes</p>
                       </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                       <span className="text-2xl sm:text-3xl font-black text-white tracking-tighter drop-shadow-sm whitespace-nowrap">₹{displayGrandTotal.toFixed(2)}</span>
                    </div>
                  </div>
               </div>
            </div>

            {/* 7. FOOTER (Concise) */}
            <div className="grid grid-cols-2 gap-8 items-end border-t-2 border-slate-100 pt-6 px-4">
              <div className="space-y-4">
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-sky-600 rounded-full" />
                    <h6 className="text-[11px] font-black text-sky-600 uppercase tracking-widest">Standard Terms</h6>
                 </div>
                 <ul className="text-[9px] font-semibold text-slate-400 uppercase space-y-1.5 leading-relaxed italic border-l-2 border-slate-100 pl-4">
                    <li>• GST Subject to Verification.</li>
                    <li>• Goods once sold cannot be returned.</li>
                    <li>• Warranty provided by manufacturer node.</li>
                 </ul>
              </div>
              
              <div className="flex flex-col items-end">
                <div className="w-56 space-y-4">
                   <div className="w-full h-20 border-2 border-dashed border-sky-100 rounded-2xl flex flex-col items-center justify-center bg-slate-50/10 relative">
                      <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest leading-none">Manual Stamp Node</p>
                      <div className="w-8 h-8 bg-sky-50 rounded-lg mt-2 opacity-50 border border-sky-100 outline-dashed outline-1 outline-sky-200" />
                   </div>
                   <div className="space-y-1">
                      <div className="h-[1.5px] bg-slate-900 w-full" />
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] font-inter text-center leading-none mt-2">Authorized Signatory</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Action Hub - Bottom Dock */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 p-4 pb-8 flex items-center gap-3 z-[11000] no-print">
        <button 
          onClick={handleWhatsAppShare} 
          className="flex-1 h-14 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
        >
          <Share2 size={18} />
          <span>WhatsApp Share</span>
        </button>
        <button 
          onClick={handlePrint} 
          className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
        >
          <Printer size={20} />
        </button>
      </div>
    </div>
  );
}
