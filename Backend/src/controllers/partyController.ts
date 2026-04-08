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
    const { name, phone, type, email, gstin, openingBalance, address } = req.body;

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

    await logActivity(req, "DELETE", "PARTY", `Decommissioned ${party.type}: ${party.name}`, (party._id as any).toString());

    res.status(200).json({ success: true, message: "Party decommissioned successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
