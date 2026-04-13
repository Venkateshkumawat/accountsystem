import { useState, useEffect, useRef, useMemo } from 'react';
import {
  ShoppingCart, Plus, Minus, X, CreditCard, Box,
  Printer, CheckCircle, Trash2, Package2, AlertTriangle, Zap,
  Banknote, ArrowLeft, Camera, RefreshCcw
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useCart } from '../hooks/useCart';
import api from '../services/api';
import { useProducts } from '../context/ProductContext';
import { useRazorpay } from '../hooks/useRazorpay';
import { useNotify } from '../context/NotificationContext';
import InvoiceModal from '../components/InvoiceModal';

interface InvoiceReceipt {
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  items: any[];
  subtotal: number;
  totalGST: number;
  totalDiscount: number;
  grandTotal: number;
  paymentMethod: string;
  createdAt: string;
}

interface CartItem {
  productId: string;
  name: string;
  sellingPrice: number;
  qty: number;
  discount: number;
  gstRate: number;
  category?: string;
  saleEndDate?: string;
}

export default function POS() {
  const { products, categories, fetchProducts, fetchCategories, loading } = useProducts();
  const {
    cart, addItem, removeItem, updateQty, clearCart, applyDiscount,
    subtotal: cartSubtotal,
    totalGST: cartGST,
    totalDiscount: cartDiscount,
    grandTotal: cartTotal
  } = useCart();
  const { handlePayment } = useRazorpay();
  const { fetchNotifications } = useNotify();
  const [search, setSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<InvoiceReceipt | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [addedFlash, setAddedFlash] = useState<string | null>(null); // productId flash
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isInvoiceConfirmed, setIsInvoiceConfirmed] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    barcodeRef.current?.focus();
  }, [fetchProducts, fetchCategories]);

  // Terminal Sync Node: Listen for platform-wide updates
  useEffect(() => {
    const syncChannel = new BroadcastChannel('nexus_sync');
    const handleSync = () => {
       fetchProducts();
    };
    syncChannel.addEventListener('message', handleSync);

    return () => {
      syncChannel.removeEventListener('message', handleSync);
      syncChannel.close();
    };
  }, []);



  useEffect(() => {
    api.get('/auth/me').catch(() => {});
  }, []);


  const [visibleCount, setVisibleCount] = useState(24);
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayedProducts = useMemo(() => {
    const filtered = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode || "").toLowerCase().includes(search.toLowerCase());

      const isOnSale = (p.discount || 0) > 0 && (!p.saleEndDate || new Date(p.saleEndDate).setHours(23, 59, 59, 999) > Date.now());

      const matchesCategory = selectedCategory === 'All' ? true :
        (selectedCategory === 'SALE' || selectedCategory === 'FLASH SALE')
          ? isOnSale
          : p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
    return filtered.slice(0, visibleCount);
  }, [products, search, selectedCategory, visibleCount]);

  // Reset visibility when searching or changing categories
  useEffect(() => {
    setVisibleCount(24);
  }, [search, selectedCategory]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (visibleCount < products.length) {
        setVisibleCount(prev => prev + 24);
      }
    }
  };

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
  };

  const handleAddItem = (product: any) => {
    if (!product || !product._id || product.stock === 0) return;
    addItem(product);
    setAddedFlash(product._id);
    setTimeout(() => setAddedFlash(null), 600);
  };

  const findAndAddProduct = async (barcode: string) => {
    if (!barcode) return;
    try {
      const res = await api.get(`/products/barcode/${barcode}`);
      if (res.data?.success && res.data?.data) {
        handleAddItem(res.data.data);
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.error('Barcode lookup failed:', err);
      return false;
    }
  };

  const handleBarcodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;
    const success = await findAndAddProduct(barcodeInput);
    if (success) {
      setBarcodeInput('');
    } else {
      alert('Product not found in local registry');
    }
  };

  const startScanner = async () => {
    setIsScannerOpen(true);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("scanner-region");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
          },
          async (decodedText) => {
            const success = await findAndAddProduct(decodedText);
            if (success) {
              stopScanner();
            }
          },
          () => {}
        );
      } catch (err) {
        console.error("Scanner start error:", err);
        setIsScannerOpen(false);
      }
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(err => console.error("Scanner stop error:", err));
      scannerRef.current = null;
    }
    setIsScannerOpen(false);
  };

  const handleProceedToCheckout = () => {
    if (cart.length === 0) return;
    setShowCheckout(true);
  };

  const handleGenerateInvoice = async () => {
    if (cart.length === 0 || submitting) return;
    if (!customer.name.trim() || !customer.phone.trim()) {
      alert('Please enter both Customer Name and Mobile Number to finalize the bill.');
      return;
    }

    const processInvoice = async (razorpayDetails?: any) => {
      setSubmitting(true);
      try {
        const payload = {
          customerName: customer.name,
          customerPhone: customer.phone,
          items: cart.map((item: CartItem) => ({
            productId: item.productId,
            qty: item.qty,
            discount: item.discount,
          })),
          paymentMethod,
          note: razorpayDetails ? `Integrated Payment ID: ${razorpayDetails.razorpay_payment_id}` : 'POS Terminal',
          razorpayPaymentId: razorpayDetails?.razorpay_payment_id || null,
          razorpayOrderId: razorpayDetails?.razorpay_order_id || null,
          razorpaySignature: razorpayDetails?.razorpay_signature || null,
          paymentStatus: razorpayDetails ? 'paid' : 'pending'
        };
        const res = await api.post('/invoices', payload);
        if (res.data.success) {
          setLastInvoice(res.data.data);
          setShowReceipt(true);
          setShowCheckout(false);
          clearCart();
          setCustomer({ name: '', phone: '' });
          // Synchronize system alerts after successful transaction
          fetchNotifications();

          // Real-time Global Sync Pulse
          const sync = new BroadcastChannel('nexus_sync');
          sync.postMessage('FETCH_DASHBOARD');
          sync.postMessage({ type: 'SYNC_NOTIFICATIONS' });
          sync.close();
        }
      } catch (err: any) {
        alert(err.response?.data?.message || 'Invoice generation failed');
      } finally { setSubmitting(false); }
    };

    // ── Integrated Protocol Gate ──────────────────────────────────────────────
    if (paymentMethod === 'upi') {
      try {
        await handlePayment({
          amount: Math.round(cartTotal),
          name: 'NexusBill POS',
          description: `Invoice for ${customer.name}`,
          onSuccess: (details) => processInvoice(details),
          onError: (err) => alert(err.message || 'Integrated Payment Failed')
        });
      } catch (err: any) {
        alert(err.message || 'Integrated Payment Gateway Error');
      }
    } else {
      // Manual Node Protocol (Cash/Card Recorded)
      processInvoice();
    }
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-100px)] bg-[#F8FAFF]  overflow-hidden lg:rounded-2xl border border-slate-100 relative">

        {/* Mobile Header Toggle */}
        <div className="lg:hidden flex items-center justify-between p-3 bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
              <ShoppingCart size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-900 uppercase">Cart Check</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase">{cart.length} Nodes Loaded</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileCartOpen(!isMobileCartOpen)}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2"
          >
            {isMobileCartOpen ? 'Back to Shop' : 'Review Bill'}
            <Zap size={10} className="text-amber-400 fill-amber-400" />
          </button>
        </div>

        {/* ── LEFT: Product Discovery ─────────────────────────────────────── */}
        <div className={`flex-[3] flex flex-col p-3 lg:p-5 border-r border-slate-100 overflow-hidden min-w-0 ${isMobileCartOpen ? 'hidden lg:flex' : 'flex'}`}>

          {/* Header */}
          <header className="flex items-center justify-between gap-2 mb-4 p-0.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full shadow-sm max-w-[60%] sm:max-w-none">
              <Zap size={10} className="text-amber-500 fill-amber-500 shrink-0" />
              <span className="text-sm sm:text-2xl font-bold text-indigo-900 uppercase tracking-tight truncate">Nexus Terminal Protocol</span>
            </div>

            <button
              onClick={() => handleCategoryClick('SALE')}
              className={`px-3 py-1.5 ml-2 rounded-full text-[8px] font-medium uppercase tracking-widest whitespace-nowrap transition-all border animate-pulse shadow-sm ${selectedCategory === 'SALE'
                ? 'bg-rose-600 text-white border-rose-600 shadow-rose-200'
                : 'bg-rose-50 text-rose-500 border-rose-100 hover:border-rose-300'
                }`}
            >
              <Zap size={10} className="inline mr-1" /> Flash
            </button>

            <div className="hidden sm:flex items-center gap-1.5 ml-auto">
              <div className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-sm text-center">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Node Cart</p>
                <p className="text-xs font-black text-slate-900 leading-none mt-0.5">{cart.length}</p>
              </div>
              <div className="px-2.5 py-1 bg-slate-900 border border-slate-900 rounded-lg shadow-md text-center">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Net Payable</p>
                <p className="text-xs font-black text-white leading-none mt-0.5">₹{Math.round(cartTotal)}</p>
              </div>
            </div>
          </header>

          {/* Search & Barcode — NO ICONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 shrink-0">
            <div className="relative group">
              <form onSubmit={handleBarcodeSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <input ref={barcodeRef} value={barcodeInput}
                    onChange={e => setBarcodeInput(e.target.value)}
                    placeholder="Scan barcode Product…"
                    className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black focus:outline-none focus:border-indigo-500 shadow-sm transition placeholder:text-slate-300"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 border-l border-slate-100 pl-2">
                    <button
                      type="button"
                      onClick={startScanner}
                      className="text-indigo-600 hover:text-indigo-700 active:scale-95 transition-all p-1"
                      title="Open Camera Scanner"
                    >
                      <Camera size={14} />
                    </button>
                  </div>
                </div>
              </form>
            </div>
            <input value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search product…"
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black focus:outline-none focus:border-slate-600 shadow-sm transition placeholder:text-slate-300"
            />
          </div>

          <div className="flex items-center gap-1.5 mb-5 overflow-x-auto no-scrollbar py-0.5 shrink-0">
            {['All', ...categories].map(cat => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`px-4 py-2 rounded-xl text-[9px] font-medium uppercase tracking-widest whitespace-nowrap transition-all border ${selectedCategory === cat
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300 hover:text-slate-600'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Low Stock Alert Banner */}
          <div className="mb-6 px-4 sm:px-5 py-3 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse shadow-sm min-h-[60px]">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="text-sm sm:text-base font-bold text-amber-900 uppercase tracking-tight">Low Stock Alerts</p>
                <p className="text-[10px] sm:text-[9px] font-bold text-amber-600 mt-0.5">Critical thresholds reached in this category.</p>
              </div>
            </div>
            <button onClick={() => fetchProducts('', 'All')} className="w-full sm:w-auto px-6 py-2 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition shadow-sm whitespace-nowrap">
              Check Inventory
            </button>
          </div>

          {/* Product Grid */}
          <div 
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 content-start pb-4">
            {loading ? (
              <div className="col-span-full py-24 text-center opacity-20">
                <ShoppingCart size={32} className="mx-auto mb-2 animate-bounce" />
                <p className="text-xs font-black uppercase tracking-widest">Syncing Nodes…</p>
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="col-span-full py-24 text-center opacity-20">
                <Box size={32} className="mx-auto mb-2" />
                <p className="text-xs font-black uppercase">No Nodes Found</p>
              </div>
            ) : displayedProducts.map(product => {
              const inCart = cart.find(i => i.productId === product._id);
              const isFlash = addedFlash === product._id;
              const outOfStock = product.stock === 0;
              return (
                <div key={product._id}
                  onClick={() => handleAddItem(product)}
                  className={`bg-white p-1.5 rounded-lg border transition-all cursor-pointer active:scale-95 flex flex-col items-center text-center relative overflow-hidden h-[120px] justify-between
                    ${outOfStock ? 'opacity-50 cursor-not-allowed border-slate-100' :
                      product.stock <= (product.lowStockThreshold || 5) ? 'border-amber-400 bg-amber-50/10' :
                        isFlash ? 'border-indigo-500 scale-95 shadow-inner shadow-indigo-100' :
                          'border-slate-100 hover:border-indigo-400 shadow-sm'}
                  `}>

                  {/* Absolute Overlays Area */}
                  <div className="absolute top-0.5 right-0.5 z-30">
                    {inCart && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeItem(product._id); }}
                        className="w-5 h-5 bg-rose-500 text-white rounded-lg flex items-center justify-center shadow-lg hover:bg-rose-600 active:scale-110 transition-all border border-white"
                      >
                        <X size={10} strokeWidth={4} />
                      </button>
                    )}
                  </div>

                  {(() => {
                    const hasDiscount = (product.discount || 0) > 0;
                    const isNotExpired = !product.saleEndDate || new Date(product.saleEndDate).setHours(23, 59, 59, 999) > Date.now();
                    const isSaleActive = hasDiscount && isNotExpired;

                    return isSaleActive && (
                      <div className="absolute top-0.5 right-6 z-30 bg-rose-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-md shadow-sm ring-1 ring-white uppercase tracking-tighter">
                        -{Math.round(((product.discount || 0) / product.sellingPrice) * 100)}%
                      </div>
                    );
                  })()}

                  <div className="absolute top-0.5 left-0.5 z-30 flex flex-col gap-1 items-start">
                    {inCart && (
                      <div className="min-w-[14px] h-[14px] bg-indigo-600 text-white rounded-lg text-[9px] font-black flex items-center justify-center px-1 shadow-lg ring-1 ring-white">
                        {inCart.qty}
                      </div>
                    )}
                    {!outOfStock && product.stock <= (product.lowStockThreshold || 5) && (
                      <div className="flex items-center justify-center p-0.5 bg-amber-500 text-white rounded-sm text-[6px] font-black uppercase ring-1 ring-white">
                        LOW
                      </div>
                    )}
                  </div>

                  {outOfStock && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg z-20">
                      <span className="text-[7px] font-black text-rose-500 uppercase tracking-tighter bg-rose-50 px-1 py-0.5 rounded border border-rose-100">Out Node</span>
                    </div>
                  )}

                  <div className="flex flex-col items-center w-full min-h-0 pt-0.5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-1 transition-all overflow-hidden border ${inCart ? 'bg-indigo-600 border-indigo-500 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                      {product.image ? (
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <Package2 
                        size={16} 
                        className={`${inCart ? 'text-white/40' : 'text-slate-300'} ${product.image ? 'hidden' : ''}`} 
                      />
                    </div>
                    <h3 className="text-slate-900 font-semibold text-sm uppercase leading-none line-clamp-2 w-full px-0.5 min-h-[18px]">
                      {product.name}
                    </h3>
                    <p className="text-[6.5px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-1 rounded-sm border border-slate-100 mt-1 truncate w-full max-w-[50px]">
                      {product.barcode || 'NO-Product'}
                    </p>
                  </div>

                  <div className="w-full flex flex-col items-center pb-0.5">
                    {(() => {
                      const hasDiscount = (product.discount || 0) > 0;
                      const isNotExpired = !product.saleEndDate || new Date(product.saleEndDate).setHours(23, 59, 59, 999) > Date.now();
                      const isSaleActive = hasDiscount && isNotExpired;

                      if (isSaleActive) {
                        return (
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1">
                              <span className="text-[7px] text-slate-400 line-through leading-none mb-0.5">₹{product.sellingPrice}</span>
                              <span className="text-[6px] font-black text-rose-500 bg-rose-50 px-1 rounded-sm uppercase tracking-tighter shadow-sm border border-rose-100">Sale Node</span>
                            </div>
                            <div className="font-bold text-emerald-600 text-base leading-none mb-1">
                              <span className="text-[7px] font-bold mr-0.5">₹</span>
                              {product.sellingPrice - (product.discount || 0)}
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="font-bold text-slate-900 text-base leading-none mb-1">
                            <span className="text-[7px] text-slate-400 font-bold mr-0.5">₹</span>
                            {product.sellingPrice}
                          </div>
                        );
                      }
                    })()}
                    <div className={`w-full py-0.5 rounded-sm text-[6px] font-black uppercase tracking-widest transition-all ${inCart ? 'bg-indigo-600 text-white opacity-100' : 'bg-slate-900 text-white opacity-0'}`}>
                      {inCart ? 'Node Active' : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Cart & Checkout ──────────────────────────────────────── */}
        <div className={`
          ${isMobileCartOpen ? 'flex absolute inset-0 z-50 bg-white' : 'hidden lg:flex'}
          lg:static lg:w-[320px] lg:lg:w-[360px] bg-white flex-col shadow-xl shrink-0 border-l border-slate-100
        `}>
          <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                <ShoppingCart size={15} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 leading-none">Cart</h2>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                  {cart.length === 0 ? 'Empty' : `${cart.length} item${cart.length > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart}
                className="flex items-center gap-1 text-[9px] font-black text-slate-300 hover:text-rose-500 uppercase tracking-widest transition-colors">
                <Trash2 size={11} /> Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <ShoppingCart size={36} className="text-slate-100 mb-3" />
                <p className="text-xs font-black text-slate-200 uppercase tracking-widest">Cart is empty</p>
                <p className="text-[10px] text-slate-300 font-medium mt-1">Click a product to add</p>
              </div>
            ) : cart.map((item: CartItem) => {
              const lineTotal = (item.sellingPrice - (item.discount || 0)) * item.qty;
              const lineGST = ((item.sellingPrice - (item.discount || 0)) * (item.gstRate || 0) / 100) * item.qty;
              return (
                <div key={item.productId} className="bg-slate-50 rounded-xl p-2 border border-slate-100 hover:border-indigo-200 transition-all group flex flex-col min-h-[90px] justify-between">
                  {/* Top: Name and Unit Details (Small Font) */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-sm font-semibold text-slate-900 uppercase truncate leading-none">{item.name}</p>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mt-1">
                          {item.discount > 0 && (!item.saleEndDate || new Date(item.saleEndDate).setHours(23, 59, 59, 999) > Date.now()) ? (
                            <span className="text-[7px] font-bold uppercase tracking-tighter text-slate-400">
                              MRP: <span className="line-through">₹{item.sellingPrice}</span> · Sale Rate: ₹{(item.sellingPrice - item.discount).toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-[7px] font-bold uppercase tracking-tighter text-slate-400">Rate: ₹{item.sellingPrice}</span>
                          )}
                          {item.gstRate > 0 && <span className="text-[7px] font-black text-indigo-500 bg-indigo-50 px-1 rounded-sm">GST: {item.gstRate}%</span>}
                        </div>
                        {item.discount > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-[7px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm animate-pulse w-fit border border-emerald-100 shadow-sm transition-all uppercase leading-none">
                            <Zap size={8} className="fill-emerald-500" />
                            SALE: Saved ₹{(item.discount * item.qty).toFixed(0)}
                          </div>
                        )}
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.productId)}
                      className="w-4 h-4 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all group-hover:opacity-100">
                      <X size={10} strokeWidth={4} />
                    </button>
                  </div>

                  {/* Promotion Signals */}
                  {(item.qty >= 25 || item.qty >= 3) && (
                    <div className="flex flex-wrap gap-1 mb-1">
                       {item.qty >= 25 && (
                         <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[7px] font-black rounded-sm uppercase tracking-tighter shadow-sm animate-pulse">
                           BULK SLAB ACTIVE
                         </span>
                       )}
                       {item.qty >= 3 && (
                         <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[7px] font-black rounded-sm uppercase tracking-tighter shadow-sm">
                           B2G1 ELIGIBLE
                         </span>
                       )}
                    </div>
                  )}

                  {/* Middle: Qty & Editable Discount (Compact) */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm scale-90 -ml-1 origin-left">
                      <button onClick={() => item.qty > 1 ? updateQty(item.productId, item.qty - 1) : removeItem(item.productId)}
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors">
                        <Minus size={9} strokeWidth={3} />
                      </button>
                      <input 
                        type="number" 
                        step="1"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateQty(item.productId, Math.floor(Number(e.target.value)))}
                        className="w-10 h-6 flex items-center justify-center text-[10px] font-black text-slate-900 border-x border-slate-100 text-center bg-transparent outline-none"
                      />
                      <button onClick={() => updateQty(item.productId, item.qty + 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                        <Plus size={9} strokeWidth={3} />
                      </button>
                    </div>
                    <div className="relative flex-1 max-w-[80px]">
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[7px] font-bold text-slate-400">₹disc</span>
                      <input type="number" min={0} max={item.sellingPrice}
                        value={item.discount || ''}
                        onChange={e => applyDiscount(item.productId, Number(e.target.value))}
                        className="w-full pl-6 pr-1 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black outline-none focus:border-indigo-400 text-right h-6"
                      />
                    </div>
                    <div className="ml-auto text-right">
                      <span className="block text-base font-bold text-slate-900 leading-none">₹{lineTotal.toFixed(0)}</span>
                      {lineGST > 0 && <span className="block text-[7px] font-bold text-indigo-400 opacity-70">tax +₹{lineGST.toFixed(1)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`
             p-4 bg-slate-50/80 border-t border-slate-100 space-y-2 shrink-0
             ${isMobileCartOpen ? 'mb-safe' : ''}
          `}>

            {cart.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-3 space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-500"><span>Subtotal</span><span>₹{cartSubtotal.toFixed(2)}</span></div>
                {cartDiscount > 0 && <div className="flex justify-between text-xs font-medium text-rose-500"><span>Discount</span><span>-₹{cartDiscount.toFixed(2)}</span></div>}

                <div className="flex justify-between text-xs font-medium text-indigo-600 border-b border-indigo-50 pb-1">
                  <span>GST Liability</span>
                  <span>₹{cartGST.toFixed(2)}</span>
                </div>



                <div className="flex justify-between items-center pt-1.5 border-t border-slate-100">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Grand Total</span>
                  <span className="text-lg font-bold text-slate-900 tracking-tighter">₹{Math.round(cartTotal)}</span>
                </div>
              </div>
            )}
            <button onClick={handleProceedToCheckout}
              disabled={cart.length === 0}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-100 transition-all uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed">
              <CreditCard size={14} /> Finalize Bill
            </button>
          </div>
        </div>
      </div>

      {showReceipt && lastInvoice && (
        <InvoiceModal 
          invoice={lastInvoice} 
          onClose={() => {
            setShowReceipt(false);
            setLastInvoice(null);
            clearCart();
          }} 
        />
      )}
      {/* ── CHECKOUT MODAL: Finalize Hub ─────────────────────────────── */}
      {showCheckout && (
        <div className="fixed inset-0 z-[60] backdrop-blur-sm bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <header className="p-3 border-b border-slate-50 flex items-center justify-between bg-white shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                  <CreditCard size={14} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 uppercase tracking-tight leading-none">Checkout Hub</h3>
                  <p className="text-[7px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">FINALIZE TRANSACTION NODE</p>
                </div>
              </div>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-1 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </header>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Totals Summary */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Payable</span>
                  <span className="text-xl font-black text-slate-900 tracking-tighter">₹{Math.round(cartTotal)}</span>
                </div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{cart.length} Nodes Indexed</p>
              </div>

              {/* Customer Info */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Name</label>
                  <input
                    required autoFocus
                    value={customer.name}
                    pattern="[A-Za-z\s]+"
                    onChange={e => setCustomer({ ...customer, name: e.target.value })}
                    placeholder="Enter full name..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Number</label>
                  <input
                    required
                    value={customer.phone}
                    pattern="[0-9]{10}"
                    maxLength={10}
                    title="Mobile must be exactly 10 digits"
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setCustomer({ ...customer, phone: val });
                    }}
                    placeholder="9876543210"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Protocol</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'upi', 'card'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`
                        flex flex-col items-center justify-center gap-1 py-3 rounded-xl border transition-all
                        ${paymentMethod === m
                          ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]'
                          : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                        }
                      `}
                    >
                      {m === 'cash' && <Banknote size={14} className={paymentMethod === m ? 'text-amber-400' : 'text-slate-200'} />}
                      {m === 'upi' && <Zap size={14} className={paymentMethod === m ? 'text-amber-400' : 'text-slate-200'} />}
                      {m === 'card' && <CreditCard size={14} className={paymentMethod === m ? 'text-amber-400' : 'text-slate-200'} />}
                      <span className="text-[9px] font-black uppercase tracking-widest leading-none mt-1">{m}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Authorization Protocol ─────────────────────────────────── */}
              <div className="pt-2">
                <label className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100 cursor-pointer group transition-all hover:bg-slate-50">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={isInvoiceConfirmed}
                      onChange={e => setIsInvoiceConfirmed(e.target.checked)}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 transition-all checked:bg-indigo-600 checked:border-indigo-600"
                    />
                    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                      <CheckCircle size={14} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest leading-none">Authorization Hub</p>
                    <p className="text-[7px] font-bold text-slate-400 mt-1 uppercase leading-snug">Confirm payment method and customer hub connection is authenticated.</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-slate-50 bg-slate-50/30 space-y-2">
              <button
                onClick={handleGenerateInvoice}
                disabled={submitting || !customer.name || customer.phone.length !== 10 || !isInvoiceConfirmed}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-100 transition-all uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle size={16} /> Complete Transaction
                  </>
                )}
              </button>
              <button
                onClick={() => setShowCheckout(false)}
                className="w-full py-2.5 bg-white text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-slate-600 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft size={10} /> Return to Cart
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── SCANNER MODAL: Camera Protocol ─────────────────────────────── */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[70] backdrop-blur-md bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col items-center">
            <header className="w-full p-4 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg animate-pulse">
                  <Camera size={16} />
                </div>
                <div>
                  <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest leading-none">Scanning Node</h3>
                  <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Align barcode within frame</p>
                </div>
              </div>
              <button
                onClick={stopScanner}
                className="p-2 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </header>

            <div className="p-6 w-full flex flex-col items-center">
              <div 
                id="scanner-region" 
                className="w-full aspect-square bg-slate-100 rounded-2xl overflow-hidden border-2 border-dashed border-indigo-200 shadow-inner relative"
              >
                <div className="absolute inset-0 z-10 pointer-events-none border-[30px] border-white/20">
                    <div className="w-full h-full border-2 border-indigo-500 rounded-lg shadow-[0_0_0_1000px_rgba(0,0,0,0.3)]"></div>
                </div>
                {/* Scan Animation Line */}
                <div className="absolute left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] z-20 animate-[scan_2s_ease-in-out_infinite]"></div>
              </div>
              
              <div className="mt-8 flex flex-col items-center gap-4 w-full">
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 animate-bounce">
                  <Zap size={14} className="fill-indigo-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Active Search Protocol</span>
                </div>
                
                <button 
                  onClick={stopScanner}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] shadow-xl hover:bg-slate-800 transition-all uppercase tracking-[0.2em] active:scale-95 flex items-center justify-center gap-3"
                >
                  Terminate Scanner
                </button>
              </div>
            </div>
            
            <footer className="w-full p-4 bg-slate-50 border-t border-slate-100 text-center">
               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Nexus Optical Interface v2.4.0</p>
            </footer>
          </div>
        </div>
      )}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 10%; }
          50% { top: 90%; }
        }
        #scanner-region video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 1rem !important;
        }
      `}</style>
    </>
  );
}
