import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
    Plus, Search, Download, MoreVertical, Eye,
    Building2, FileText, CheckCircle2, AlertCircle,
    Calendar, ArrowRight, X, User, ShoppingBag,
    RefreshCcw,
    Zap
} from 'lucide-react';
import api from '../services/api';
import { useNotify } from '../context/NotificationContext';
import { useProducts } from '../context/ProductContext';
import { useRazorpay } from '../hooks/useRazorpay';
import { Banknote, CreditCard as CardIcon } from 'lucide-react';
import InvoiceModal from '../components/InvoiceModal';

/**
 * B2B Sales Terminal: GST-Compliant Nodal Invoicing.
 * Optimized for Inter SemiBold typography and high-density auditing.
 */
export default function B2BSales() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const { notifySuccess, notifyError } = useNotify();
    const [showNewInvoice, setShowNewInvoice] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<any | null>(null);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/invoices?limit=100');
            setInvoices(res.data.data || []);
        } catch (e) {
            notifyError("Nexus Sync Failed: B2B Ledger unreachable.");
        } finally {
            setLoading(false);
        }
    }, [notifyError]);

    useEffect(() => {
        fetchInvoices();
        // Nodal Sync Listener: Automated Hand-to-Hand Updates
        const syncChannel = new BroadcastChannel('nexus_sync');
        syncChannel.onmessage = (event) => {
            if (event.data === 'FETCH_DASHBOARD' || event.data === 'SYNC_PARTIES') {
                fetchInvoices();
            }
        };
        return () => syncChannel.close();
    }, [fetchInvoices]);

    const stats = useMemo(() => {
        const partyInvoices = invoices.filter(inv => inv.customerId || inv.customerGstin);
        const total = partyInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
        const collected = partyInvoices.filter(inv => inv.paymentStatus === 'paid').reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
        const pending = partyInvoices.filter(inv => inv.paymentStatus === 'pending').reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

        // Calculate Reactive Overdue: Pending invoices past their due date
        const overdue = partyInvoices
            .filter(inv => inv.paymentStatus === 'pending' && inv.dueDate && new Date(inv.dueDate) < new Date())
            .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

        return { total, collected, pending, overdue };
    }, [invoices]);

    const handleExport = () => {
        const headers = ["Invoice Number", "Customer", "Date", "Total", "Status", "Payment Method"];
        const rows = filteredInvoices.map(inv => [
            inv.invoiceNumber,
            inv.customerName,
            new Date(inv.createdAt).toLocaleDateString(),
            inv.grandTotal,
            inv.paymentStatus.toUpperCase(),
            inv.paymentMethod || 'Manual'
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `B2B_Sales_Audit_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        notifySuccess("Forensic CSV Dump Successful");
    };

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            // Inclusive Forensic Filter: Show Registered Parties OR GST-Registered Entities
            if (!inv.customerId && !inv.customerGstin) return false;

            const matchesSearch =
                inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
                (inv.customerName || '').toLowerCase().includes(search.toLowerCase());
            const matchesFilter = activeFilter === 'All' || inv.paymentStatus.toLowerCase() === activeFilter.toLowerCase();
            return matchesSearch && matchesFilter;
        });
    }, [invoices, search, activeFilter]);

    const displayedInvoices = useMemo(() => {
        return showAll ? filteredInvoices : filteredInvoices.slice(0, 10);
    }, [filteredInvoices, showAll]);

    return (
        <div className="min-h-screen bg-[#FDFDFF] p-4 sm:p-6 font-inter overflow-y-auto h-[calc(100vh-1rem)] custom-scrollbar">
            {/* Header Module */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 mt-1">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">B2B Sales Invoices</h1>
                    <p className="text-slate-500 font-medium text-xs mt-0.5">Manage your GST-compliant business invoices</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold text-xs hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Download size={16} /> Export
                    </button>
                    <button
                        onClick={() => setShowNewInvoice(true)}
                        className="flex items-center gap-2 px-5 py-2 bg-[#4F46E5] text-white rounded-lg font-semibold text-xs hover:bg-[#4338CA] transition-all shadow-lg shadow-indigo-100"
                    >
                        <Plus size={16} /> New Invoice
                    </button>
                </div>
            </div>

            {/* Metric Flux Nodes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <MetricCard
                    label="TOTAL RECEIVABLES"
                    value={`₹${stats.total.toLocaleString()}`}
                    icon={FileText}
                    color="blue"
                />
                <MetricCard
                    label="COLLECTED"
                    value={`₹${stats.collected.toLocaleString()}`}
                    icon={CheckCircle2}
                    color="emerald"
                />
                <MetricCard
                    label="OVERDUE"
                    value={`₹${stats.overdue.toLocaleString()}`}
                    icon={AlertCircle}
                    color="rose"
                />
            </div>

            {/* Desktop Audit Terminal */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Global Search & Filter Bar */}
                <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search invoices, parties..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex bg-slate-50 p-1 rounded-xl">
                        {['All', 'Paid', 'Pending', 'Overdue'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${activeFilter === filter
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Ledger Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 border-b border-slate-100 bg-slate-50/50 italic">
                                <th className="px-3 py-4 w-[160px]">Invoice Node</th>
                                <th className="px-3 py-4">Entity Identity</th>
                                <th className="px-3 py-4 w-[130px]">Protocol Date</th>
                                <th className="px-3 py-4 w-[130px]">Net Amount</th>
                                <th className="px-3 py-4 w-[110px]">Status</th>
                                <th className="px-3 py-4 text-right pr-6 w-[120px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <RefreshCcw className="animate-spin text-indigo-500" size={32} />
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Synchronizing Nodal Ledger...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : displayedInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center text-slate-400">
                                        No invoices found in this partition.
                                    </td>
                                </tr>
                            ) : displayedInvoices.map((inv) => (
                                <tr key={inv._id} className="group hover:bg-slate-100 transition-all border-b border-slate-100 last:border-0 cursor-pointer">
                                    <td className="px-3 py-3.5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold text-slate-900">{inv.invoiceNumber}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 flex items-center gap-1">
                                                <FileText size={10} /> {inv.transactionId?.slice(-6).toUpperCase() || 'EW-9823'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3.5">
                                        <div className="flex items-center gap-2">
                                            <Building2 size={11} className="text-slate-300" />
                                            <span className="text-[11px] font-bold text-slate-900 uppercase truncate max-w-[150px]">{inv.customerName || 'Direct Node'}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3.5">
                                        <span className="text-[10px] font-bold text-slate-600 uppercase">
                                            {new Date(inv.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3.5">
                                        <span className="text-[12px] font-bold text-slate-900 tracking-tighter">₹{(inv.grandTotal || 0).toLocaleString()}</span>
                                    </td>
                                    <td className="px-3 py-3.5">
                                        <div className="flex items-center">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border transition-all shadow-sm ${inv.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                inv.paymentStatus === 'overdue' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                                }`}>
                                                {inv.paymentStatus || 'PENDING'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 pr-1">
                                            <button
                                                onClick={() => setSelectedInvoiceForView(inv)}
                                                className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                                                title="View Node"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* History Paging Hub: Phased Discovery */}
                {filteredInvoices.length > 10 && (
                    <div className="p-4 border-t border-slate-50 bg-slate-50/30 flex justify-center">
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
                        >
                            {showAll ? 'Show Fewer Nodes' : 'Review Full B2B History'}
                        </button>
                    </div>
                )}
            </div>

            {/* New B2B Invoice Drawer */}
            <NewInvoiceModal
                isOpen={showNewInvoice}
                onClose={() => setShowNewInvoice(false)}
                onSuccess={() => {
                    fetchInvoices();
                    // Global Sync Pulse: Pulse platform-wide hand-to-hand consistency
                    const sync = new BroadcastChannel('nexus_sync');
                    sync.postMessage('FETCH_DASHBOARD');
                    sync.postMessage('FETCH_PRODUCTS');
                    sync.close();
                }}
            />

            {/* Forensic Audit Modal */}
            {selectedInvoiceForView && (
                <InvoiceModal
                    invoice={selectedInvoiceForView}
                    onClose={() => setSelectedInvoiceForView(null)}
                />
            )}
        </div>
    );
}

const MetricCard = memo(({ label, value, icon: Icon, color }: any) => {
    const variants: any = {
        blue: { bg: 'bg-[#EFF6FF]', iconBg: 'bg-white', text: 'text-[#1E40AF]', icon: 'text-[#3B82F6]' },
        emerald: { bg: 'bg-[#ECFDF5]', iconBg: 'bg-white', text: 'text-[#065F46]', icon: 'text-[#10B981]' },
        rose: { bg: 'bg-[#FFF1F2]', iconBg: 'bg-white', text: 'text-[#9F1239]', icon: 'text-[#F43F5E]' }
    };
    const v = variants[color] || variants.blue;

    return (
        <div className={`${v.bg} p-6 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm h-full`}>
            <div className={`${v.iconBg} w-11 h-11 rounded-xl flex items-center justify-center shadow-sm shrink-0`}>
                <Icon size={18} className={v.icon} />
            </div>
            <div className="min-w-0">
                <p className={`${v.text} text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5`}>{label}</p>
                <h3 className="text-xl font-semibold text-slate-900 tracking-tight truncate">{value}</h3>
            </div>
        </div>
    );
});

/**
 * High-Density Nodal Form for B2B Invoicing
 */
function NewInvoiceModal({ isOpen, onClose, onSuccess }: any) {
    const [parties, setParties] = useState<any[]>([]);
    const { products, fetchProducts } = useProducts();
    const [searchParty, setSearchParty] = useState('');
    const [searchProduct, setSearchProduct] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
    const { handlePayment } = useRazorpay();
    const [selectedParty, setSelectedParty] = useState<any>(null);
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const { notifySuccess, notifyError } = useNotify();

    useEffect(() => {
        if (isOpen) {
            api.get('/parties').then(res => setParties(res.data.data || []));
            fetchProducts();
        }
    }, [isOpen, fetchProducts]);

    const filteredParties = useMemo(() => {
        if (!searchParty || selectedParty) return [];
        return parties.filter(p => p.name.toLowerCase().includes(searchParty.toLowerCase()));
    }, [parties, searchParty, selectedParty]);

    const filteredProducts = useMemo(() => {
        if (!searchProduct || searchProduct.length < 2) return [];
        return products.filter(p =>
            p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
            (p.barcode || '').includes(searchProduct)
        );
    }, [products, searchProduct]);

    const totals = useMemo(() => {
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const totalGST = items.reduce((sum, item) => sum + (item.price * item.qty * (item.gstRate / 100)), 0);
        return { subtotal, totalGST, grandTotal: subtotal + totalGST };
    }, [items]);

    const handleAddItem = (prod: any) => {
        const existing = items.find(i => i.productId === prod._id);
        if (existing) {
            setItems(items.map(i => i.productId === prod._id ? { ...i, qty: i.qty + 1 } : i));
        } else {
            setItems([...items, {
                productId: prod._id,
                name: prod.name,
                price: prod.sellingPrice,
                qty: 1,
                gstRate: prod.gst ?? 0
            }]);
        }
        setSearchProduct('');
    };

    const handleCreate = async () => {
        if (!selectedParty) return notifyError("Protocol Block: Please select a party node.");
        if (items.length === 0) return notifyError("Protocol Block: No items detected.");

        const executeCreation = async (razorDetails?: any) => {
            setSubmitting(true);
            try {
                const payload = {
                    customerId: selectedParty._id,
                    customerName: selectedParty.name,
                    customerPhone: selectedParty.phone,
                    customerAddress: `${selectedParty.address.street}, ${selectedParty.address.city}, ${selectedParty.address.state}, ${selectedParty.address.pincode}`,
                    customerGstin: selectedParty.gstin,
                    items: items.map(i => ({
                        productId: i.productId,
                        qty: i.qty,
                        price: i.price,
                        name: i.name,
                        gstRate: i.gstRate
                    })),
                    paymentMethod,
                    paymentStatus: 'paid',
                    razorpayPaymentId: razorDetails?.razorpay_payment_id || null,
                    note: razorDetails ? `Verified Online Transaction ID: ${razorDetails.razorpay_payment_id}` : 'Standard Cash Handshake'
                };

                await api.post('/invoices', payload);
                notifySuccess("B2B Invoice Initialized Successfully");
                onSuccess();
                onClose();
            } catch (e: any) {
                notifyError(e.response?.data?.message || "Internal Node Sync Failure");
            } finally {
                setSubmitting(false);
            }
        };

        if (paymentMethod === 'online') {
            try {
                await handlePayment({
                    amount: Math.round(totals.grandTotal),
                    name: 'BharatBill B2B',
                    description: `Professional Invoice - ${selectedParty.name}`,
                    onSuccess: (details: any) => executeCreation(details),
                    onError: (err: any) => notifyError(err.message || "Integrated Payment Failed")
                });
            } catch (err: any) {
                notifyError("Integrated Gateway Error");
            }
        } else {
            executeCreation();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 backdrop-blur-md bg-slate-900/50">
            <div className="bg-white w-full max-w-xl min-h-[450px] max-h-[95vh] rounded-[2.5rem] shadow-[0_32px_120px_-20px_rgba(0,0,0,0.4)] overflow-hidden border border-slate-100 flex flex-col animate-in slide-in-from-bottom-8 duration-500">

                {/* Header Module: Professional Density */}
                <div className="p-8 pb-4 border-b border-slate-50 flex items-center justify-between bg-white/90 backdrop-blur-md sticky top-0 z-[1050]">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter text-inter">New B2B Invoice</h2>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.25em] mt-1 text-inter">FISCAL INITIALIZATION NODE</p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-90 shadow-[0_4px_10px_rgba(0,0,0,0.05)] border border-slate-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 pt-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="space-y-6">
                        {/* Target Party Hub: Inter SemiBold Enforced */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 text-inter">TARGET PARTY NODE</label>
                            <div className="relative">
                                {selectedParty ? (
                                    <div className="p-5 bg-indigo-50 border-2 border-indigo-100/50 rounded-2xl flex items-center justify-between animate-in slide-in-from-left-4 duration-500 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-50">
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 text-inter tracking-tight">{selectedParty.name}</p>
                                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest text-inter">{selectedParty.gstin || 'B2B: NON-GST PARTY'}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedParty(null)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-white hover:text-rose-500 rounded-xl transition-all shadow-sm border border-transparent hover:border-rose-100"><X size={16} /></button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative group">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                            <input
                                                type="text"
                                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-semibold focus:bg-white focus:border-indigo-400 transition-all outline-none text-inter shadow-sm placeholder:text-slate-300"
                                                placeholder="Search registered party registry..."
                                                value={searchParty}
                                                onChange={(e) => setSearchParty(e.target.value)}
                                            />
                                        </div>
                                        {filteredParties.length > 0 && (
                                            <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[2000] overflow-hidden max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1">
                                                {filteredParties.map(p => (
                                                    <button
                                                        key={p._id}
                                                        onClick={() => { setSelectedParty(p); setSearchParty(''); }}
                                                        className="w-full px-6 py-4 text-left hover:bg-slate-50 flex items-center justify-between group transition-all border-b border-slate-50 last:border-none"
                                                    >
                                                        <div>
                                                            <p className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors text-inter">{p.name}</p>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-inter tracking-tighter">{p.gstin || 'BULK BUYER NODE'}</p>
                                                        </div>
                                                        <ArrowRight size={14} className="text-slate-300 group-hover:translate-x-1 group-hover:text-indigo-500 transition-all" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {searchParty.length >= 3 && filteredParties.length === 0 && (
                                            <div className="mt-4 bg-rose-50 border-2 border-rose-100 rounded-2xl p-5 z-[2000] animate-in fade-in slide-in-from-top-1 flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-500 shadow-sm shrink-0">
                                                    <AlertCircle size={20} />
                                                </div>
                                                <p className="text-[11px] font-black text-rose-600 uppercase tracking-tight text-inter leading-snug">
                                                    Registry mismatch: Party not found. Please register this entity in the Parties portal first.
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Phase 2: Transactional Node Hub (Hidden until Party Selected) */}
                        {selectedParty && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                {/* Inventory Selector Hub */}
                                <div className="space-y-2.5">
                                    <label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1 text-inter">Search Inventory</label>
                                    <div className="relative">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                        <input
                                            type="text"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-semibold focus:bg-white focus:border-indigo-400 transition-all outline-none text-inter shadow-sm placeholder:text-slate-300"
                                            placeholder="Search products from inventory..."
                                            value={searchProduct}
                                            onChange={(e) => setSearchProduct(e.target.value)}
                                        />
                                        {filteredProducts.length > 0 && (
                                            <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[2000] overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                                                {filteredProducts.map(p => (
                                                    <button
                                                        key={p._id}
                                                        onClick={() => handleAddItem(p)}
                                                        className="w-full px-5 py-3.5 text-left hover:bg-slate-50 flex items-center justify-between group transition-all border-b border-slate-50 last:border-none"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-all">
                                                                <ShoppingBag size={16} />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-all text-inter">{p.name}</p>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter text-inter">₹{p.sellingPrice} • Stock: {p.stock}</p>
                                                            </div>
                                                        </div>
                                                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all shadow-sm">
                                                            <Plus size={14} />
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Item List Buffer */}
                                <div className="space-y-2">
                                    {items.length > 0 ? (
                                        <div className="space-y-2">
                                            {items.map((item, idx) => (
                                                <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between group shadow-sm">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[11px] font-bold text-slate-900 truncate uppercase tracking-tight text-inter">{item.name}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-inter">Qty: {item.qty}</span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-inter">₹{item.price}</span>
                                                            <span className={`text-[9px] font-black uppercase tracking-widest text-inter ${item.gstRate > 0 ? 'text-indigo-500' : 'text-slate-300'}`}>
                                                                GST {item.gstRate}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center bg-white border border-slate-100 rounded-lg overflow-hidden shadow-sm">
                                                            <button
                                                                onClick={() => setItems(items.map((it, i) => i === idx ? { ...it, qty: Math.max(1, it.qty - 1) } : it))}
                                                                className="p-1 px-1.5 hover:bg-slate-50 text-slate-400 transition-colors"
                                                            >
                                                                <Minus size={10} />
                                                            </button>
                                                            <span className="px-1.5 text-[10px] font-black text-slate-900 border-x border-slate-50 text-inter">{item.qty}</span>
                                                            <button
                                                                onClick={() => setItems(items.map((it, i) => i === idx ? { ...it, qty: it.qty + 1 } : it))}
                                                                className="p-1 px-1.5 hover:bg-slate-50 text-slate-400 transition-colors"
                                                            >
                                                                <Plus size={10} />
                                                            </button>
                                                        </div>
                                                        <p className="text-[11px] font-black text-slate-900 min-w-[70px] text-right text-inter">₹{(item.price * item.qty).toLocaleString()}</p>
                                                        <button
                                                            onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-12 border-2 border-dashed border-slate-100 rounded-[1.5rem] flex flex-col items-center justify-center gap-3 text-slate-300 bg-slate-50/30">
                                            <Plus size={20} className="opacity-20" />
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center text-inter">Draft Empty: Search items to begin</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Payment Mode Selector Hub */}
                        {selectedParty && items.length > 0 && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                                <label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1 text-inter">SETTLEMENT PROTOCOL</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setPaymentMethod('cash')}
                                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'cash' ? 'bg-emerald-50 border-emerald-500/50 text-emerald-700 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'}`}
                                    >
                                        <Banknote size={20} />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-inter">Point-of-Cash</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('online')}
                                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'online' ? 'bg-indigo-50 border-indigo-500/50 text-indigo-700 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'}`}
                                    >
                                        <CardIcon size={20} />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-inter">Digital Verify</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Fiscal Summary Hub: Persistent Gating */}
                {selectedParty && (
                    <div className="p-6 border-t border-slate-50 bg-slate-50/50 backdrop-blur-md space-y-5 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-3 gap-6">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1 text-inter">Subtotal</span>
                                <span className="text-sm font-black text-slate-900 text-inter">₹{totals.subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1 text-inter">Total GST</span>
                                <span className="text-sm font-black text-indigo-600 text-inter">₹{totals.totalGST.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col text-right">
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-0.5 text-inter">Final Payable</span>
                                <span className="text-lg font-black text-[#4F46E5] tracking-tighter text-inter leading-none">₹{totals.grandTotal.toLocaleString()}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleCreate}
                            disabled={submitting || items.length === 0}
                            className="w-full py-4 bg-[#4F46E5] text-white rounded-[1.25rem] font-black text-sm shadow-[0_8px_20px_-8px_rgba(79,70,229,0.5)] hover:bg-[#4338CA] transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-30 disabled:grayscale text-inter"
                        >
                            {submitting ? 'RECOGNIZING PAYLOAD...' : items.length === 0 ? 'ADD ITEMS TO DRAFT' : 'Confirm & Generate'}
                            {!submitting && items.length > 0 && <ArrowRight size={18} />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

const Minus = ({ size, className }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);
