import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { getBusinessAdminId } from "../utils/businessUtils.js";

/**
 * @desc    Global Search across all business modules
 * @route   GET /api/search/global
 */
export const globalSearch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { 
      Product, 
      Invoice, 
      Party, 
      Transaction, 
      Purchase, 
      Staff, 
      Offer,
      Payment,
      Notification
    } = req.tenantModels!;
    
    const businessAdminId = getBusinessAdminId(req);
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ success: false, message: "Search query is required" });
      return;
    }

    const searchRegex = new RegExp(query, 'i');
    const limit = 5;

    // Execute searches in parallel for performance
    const [
      products,
      invoices,
      parties,
      transactions,
      purchases,
      staff,
      offers,
      notifications
    ] = await Promise.all([
      Product.find({ businessAdminId, isActive: true, $or: [{ name: searchRegex }, { barcode: searchRegex }, { category: searchRegex }] }).limit(limit).lean(),
      Invoice.find({ businessAdminId, $or: [{ invoiceNumber: searchRegex }, { customerName: searchRegex }, { transactionId: searchRegex }] }).limit(limit).lean(),
      Party.find({ businessAdminId, $or: [{ name: searchRegex }, { phone: searchRegex }, { email: searchRegex }, { type: searchRegex }] }).limit(limit).lean(),
      Transaction.find({ businessAdminId, $or: [{ transactionId: searchRegex }, { description: searchRegex }, { paymentMethod: searchRegex }] }).limit(limit).lean(),
      Purchase.find({ businessAdminId, $or: [{ purchaseNumber: searchRegex }, { supplierName: searchRegex }] }).limit(limit).lean(),
      Staff.find({ businessAdminId, $or: [{ name: searchRegex }, { role: searchRegex }, { phone: searchRegex }] }).limit(limit).lean(),
      Offer.find({ businessAdminId, isActive: true, $or: [{ name: searchRegex }, { type: searchRegex }] }).limit(limit).lean(),
      Notification.find({ businessAdminId, $or: [{ message: searchRegex }, { type: searchRegex }] }).limit(limit).lean()
    ]);

    // Format results for frontend
    const results = [
      ...products.map(p => ({ id: p._id, label: p.name, sub: `Stock: ${p.stock} • ₹${p.sellingPrice}`, type: 'product', path: '/inventory' })),
      ...invoices.map(i => ({ id: i._id, label: `Inv #${i.invoiceNumber}`, sub: `${i.customerName} • ₹${i.grandTotal}`, type: 'invoice', path: '/pos' })),
      ...parties.map(p => ({ id: p._id, label: p.name, sub: `${p.type.toUpperCase()} • ${p.phone}`, type: 'party', path: '/parties' })),
      ...transactions.map(t => ({ id: t._id, label: `TXN ${t.transactionId?.slice(-6)}`, sub: `${t.description} • ₹${t.amount}`, type: 'transaction', path: '/accounting' })),
      ...purchases.map(p => ({ id: p._id, label: `PUR #${p.purchaseNumber}`, sub: `${p.supplierName} • ₹${p.totalAmount}`, type: 'purchase', path: '/purchases' })),
      ...staff.map(s => ({ id: s._id, label: s.name, sub: `Role: ${s.role}`, type: 'staff', path: '/staff' })),
      ...offers.map(o => ({ id: o._id, label: o.name, sub: `Type: ${o.type}`, type: 'offer', path: '/pos' })),
      ...notifications.map(n => ({ id: n._id, label: n.message, sub: `Time: ${new Date(n.createdAt).toLocaleDateString()}`, type: 'notification', path: '/dashboard' }))
    ];

    res.status(200).json({
      success: true,
      data: results.slice(0, 15) // Return top 15 results across all modules
    });

  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
