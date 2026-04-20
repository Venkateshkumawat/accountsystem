import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { logActivity } from "../utils/activityLogger.js";

/**
 * @desc    Get all parties for current business
 * @route   GET /api/parties
 */
export const getParties = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Workspace telemetry node offline." });
      return;
    }
    const { Party } = req.tenantModels;
    const businessAdminId = req.user?.businessAdminId || req.user?.userId;
    const parties = await Party.find({ businessAdminId, isActive: true }).sort({ name: 1 });
    res.status(200).json({ success: true, data: parties });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create new party node (Customer / Supplier)
 * @route   POST /api/parties
 */
export const createParty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Workspace telemetry node offline." });
      return;
    }
    const { Party } = req.tenantModels;
    let { name, phone, type, email, gstin, openingBalance, address } = req.body;

    // Terminology Alignment Node: Map Vendor -> Supplier
    if (type === 'Vendor') type = 'Supplier';

    if (!name || !phone || !type) {
      res.status(400).json({ success: false, message: "Name, phone, and type are required." });
      return;
    }

    const businessAdminId = req.user?.businessAdminId || req.user?.userId;

    const party = await Party.create({
      businessAdminId,
      name,
      phone,
      type,
      email,
      gstin,
      openingBalance: openingBalance || 0,
      currentBalance: openingBalance || 0,
      address
    });

    await logActivity(req, "CREATE", "PARTY", `Initialized ${type}: ${name}`, (party._id as any).toString());

    res.status(201).json({ success: true, data: party });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update party details
 * @route   PUT /api/parties/:id
 */
export const updateParty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Workspace telemetry node offline." });
      return;
    }
    const { Party } = req.tenantModels;
    const { id } = req.params;

    const party = await Party.findOneAndUpdate(
      { _id: id },
      req.body,
      { returnDocument: 'after', runValidators: true }
    );

    if (!party) {
      res.status(404).json({ success: false, message: "Party node not found or access denied." });
      return;
    }

    await logActivity(req, "UPDATE", "PARTY", `Updated details for: ${party.name}`, (party._id as any).toString());

    res.status(200).json({ success: true, data: party });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Soft-delete/Deactivate party node
 * @route   DELETE /api/parties/:id
 */
export const deleteParty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Workspace telemetry node offline." });
      return;
    }
    const { Party } = req.tenantModels;
    const { id } = req.params;

    const party = await Party.findOneAndUpdate(
      { _id: id },
      { isActive: false },
      { returnDocument: 'after' }
    );

    if (!party) {
      res.status(404).json({ success: false, message: "Party node not found or access denied." });
      return;
    }

    await logActivity(req, "DELETE", "PARTY", `Deleted ${party.type}: ${party.name}`, (party._id as any).toString());

    res.status(200).json({ success: true, message: "Party deleted successfully." });
} catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
}
};

/**
 * @desc    Record a manual settlement (Payment to Vendor / Receipt from Customer)
 * @route   POST /api/parties/:id/payment
 */
export const recordPartyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Workspace telemetry node offline." });
      return;
    }
    const { Party } = req.tenantModels;
    const { id } = req.params;
    const { amount, method, note } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({ success: false, message: "Valid amount is required." });
      return;
    }

    const party = await Party.findById(id);
    if (!party) {
      res.status(404).json({ success: false, message: "Party node not found." });
      return;
    }

    // Decree balance based on party type (Settlement reduces liability/receivable)
    const reduction = Number(amount);
    party.currentBalance = (party.currentBalance || 0) - reduction;
    
    await party.save();

    await logActivity(req, "TRANSACTION", "PARTY", `Recorded ${method} settlement of ₹${amount} for ${party.name}. Note: ${note || 'N/A'}`, id);

    res.status(200).json({ success: true, data: party });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Sync Parties registry with historical transactions (Purchases & Invoices)
 * @route   POST /api/parties/sync-lifecycle
 */
export const syncPartiesWithTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Node offline." });
      return;
    }
    const { Party, Purchase, Invoice } = req.tenantModels;
    const businessAdminId = req.user?.businessAdminId || req.user?.userId;

    // 1. Audit Purchases for unique Suppliers
    const purchases = await Purchase.find({ businessAdminId });
    for (const p of purchases) {
      if (p.vendorPhone && p.vendorPhone.length === 10) {
        const balanceInc = p.paymentStatus === 'paid' ? 0 : p.grandTotal;
        await Party.findOneAndUpdate(
          { businessAdminId, phone: p.vendorPhone, type: 'Supplier' },
          { 
            $set: { 
              name: p.vendorName || p.vendorCompany || 'Auto-Synced Vendor', 
              type: 'Supplier', 
              isActive: true,
              email: p.vendorEmail,
              gstin: p.vendorGstin,
              'address.street': p.vendorAddress,
              group: p.vendorCompany || 'General'
            },
            $inc: { 
              currentBalance: balanceInc, 
              totalPurchases: p.grandTotal 
            }
          },
          { upsert: true, new: true }
        );
      }
    }

    // 2. Audit Invoices for unique Customers
    const invoices = await Invoice.find({ businessAdminId });
    for (const i of invoices) {
      if (i.customerPhone && i.customerPhone.length === 10) {
        const balanceInc = i.paymentStatus === 'paid' ? 0 : i.grandTotal;
        await Party.findOneAndUpdate(
          { businessAdminId, phone: i.customerPhone, type: 'Customer' },
          { 
            $set: { 
              name: i.customerName || 'Auto-Synced Customer', 
              type: 'Customer', 
              isActive: true,
              'address.street': i.customerAddress 
            },
            $inc: { 
              currentBalance: balanceInc, 
              totalSales: i.grandTotal 
            }
          },
          { upsert: true, new: true }
        );
      }
    }

    res.status(200).json({ success: true, message: "Registry Cycle Synchronized & Enriched." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Absolute Registry Purge: Delete all party nodes for this business
 * @route   DELETE /api/parties/purge-all
 */
export const purgeParties = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Node offline." });
      return;
    }
    const { Party } = req.tenantModels;
    const businessAdminId = req.user?.businessAdminId || req.user?.userId;

    console.log(`[PURGE_INIT] Internal request to clear registry for ID: ${businessAdminId}`);

    // ABSOLUTE ISOLATION: This operation strictly targets the 'Party' collection.
    // It does NOT affect Purchases, Invoices, or Products by design to maintain historical integrity.
    const result = await Party.deleteMany({ businessAdminId });

    console.log(`[PURGE_COMPLETE] Removed ${result.deletedCount} nodes successfully.`);

    await logActivity(req, "DELETE", "PARTY", `ABSOLUTE PURGE: Deleted ${result.deletedCount} party nodes.`, "SYSTEM");

    res.status(200).json({ success: true, message: `Registry Purged: ${result.deletedCount} nodes removed.` });
  } catch (error: any) {
    console.error(`[PURGE_CRITICAL_FAIL] Error during registry decommissioning: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
