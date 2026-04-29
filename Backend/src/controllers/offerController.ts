import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { getBusinessAdminId, verifyManagerOrAdmin } from "../utils/businessUtils.js";
import { logActivity } from "../utils/activityLogger.js";
import { createNotification } from "./notificationController.js";
import { getIO } from "../socket.js";

/**
 * @desc    Get all active offers for a business
 * @route   GET /api/offers
 */
export const getOffers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { Offer } = req.tenantModels!;
    const adminId = getBusinessAdminId(req);

    const offers = await Offer.find({ businessAdminId: adminId as any }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: offers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create a new promotional offer
 * @route   POST /api/offers
 */
export const createOffer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    verifyManagerOrAdmin(req);
    const { Offer } = req.tenantModels!;
    const { businessId, userId } = req.user!;
    const adminId = getBusinessAdminId(req);

    const { name, type, value, productId, buyQty, getQty, minQty, startDate, endDate, isActive } = req.body;

    const newOffer = await Offer.create({
      businessId: businessId as any,
      businessAdminId: adminId as any,
      name,
      type,
      value: value || 0,
      productId: productId || undefined,
      buyQty: buyQty || 0,
      getQty: getQty || 0,
      minQty: minQty || 1,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: isActive !== undefined ? isActive : true
    });

    await logActivity(req, "CREATE", "OFFER", `Launched new offer node: ${name} (${type})`, newOffer._id.toString());
    
    await createNotification(
       businessId as any,
       `Campaign Pulse: New promotional node '${name}' is now active across the grid.`,
       "info",
       "businessAdmin",
       "/settings",
       "alert"
    );

    if (businessId) {
       getIO()?.to(businessId.toString()).emit('DATA_SYNC', { type: 'OFFER_UPDATE' });
    }

    res.status(201).json({ success: true, data: newOffer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Decommission an offer node
 * @route   DELETE /api/offers/:id
 */
export const deleteOffer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    verifyManagerOrAdmin(req);
    const { Offer } = req.tenantModels!;
    const { businessId } = req.user!;
    const adminId = getBusinessAdminId(req);

    const offer = await Offer.findOneAndDelete({ _id: req.params.id, businessAdminId: adminId as any });
    if (!offer) {
       res.status(404).json({ success: false, message: "Offer node not found" });
       return;
    }

    await logActivity(req, "DELETE", "BUSINESS", `Decommissioned offer node: ${offer.name}`, offer._id.toString());
    if (businessId) {
       getIO()?.to(businessId.toString()).emit('DATA_SYNC', { type: 'OFFER_UPDATE' });
    }

    res.status(200).json({ success: true, message: "Offer node purged." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update an existing offer node
 * @route   PUT /api/offers/:id
 */
export const updateOffer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    verifyManagerOrAdmin(req);
    const { Offer } = req.tenantModels!;
    const { businessId } = req.user!;
    const adminId = getBusinessAdminId(req);

    const updatedOffer = await Offer.findOneAndUpdate(
      { _id: req.params.id, businessAdminId: adminId as any },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedOffer) {
      res.status(404).json({ success: false, message: "Offer node not found" });
      return;
    }

    await logActivity(req, "UPDATE", "OFFER", `Refined offer node: ${updatedOffer.name}`, updatedOffer._id.toString());
    if (businessId) {
      getIO()?.to(businessId.toString()).emit('DATA_SYNC', { type: 'OFFER_UPDATE' });
    }

    res.status(200).json({ success: true, data: updatedOffer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
