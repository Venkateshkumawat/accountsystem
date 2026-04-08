import { Response, Request } from "express";
import { AuthRequest } from "../middleware/auth.js";
import Business from "../models/Business.js";
import User from "../models/User.js";
import { logActivity } from "../utils/activityLogger.js";
import { verifyRazorpaySignature } from "../utils/paymentUtils.js";
import { getTenantModels } from "../config/tenantModels.js";
import mongoose from "mongoose";

export const createBusiness = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { businessName, name, email, phone, street, city, state, pincode, ownerName } = req.body;
    const newBusiness = new Business({
      businessName: businessName || name,
      ownerName: ownerName || "Owner",
      email, phone,
      address: { street: street || "", city: city || "", state: state || "", pincode: pincode || "" }
    });
    const savedBusiness = await newBusiness.save();
    res.status(201).json(savedBusiness);
  } catch (err: any) {
    res.status(500).json({ message: "Error creating business", error: err.message });
  }
};

export const getAllBusinesses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businesses = await Business.find();
    res.status(200).json(businesses);
  } catch (err: any) {
    res.status(500).json({ message: "Error fetching businesses", error: err.message });
  }
};

export const getMyBusiness = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) throw new Error("No business associated");
    const business = await Business.findById(businessId);
    res.status(200).json(business);
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
};

export const updateBusiness = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const updatedBusiness = await Business.findByIdAndUpdate(req.params.id, { $set: req.body }, { returnDocument: 'after' });
    if (!updatedBusiness) throw new Error("Not found");
    res.status(200).json(updatedBusiness);
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
};

export const deleteBusiness = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.params.id;
    const business = await Business.findById(businessId);
    if (!business) throw new Error("Not found");

    // ── Nexus Protocol: Shared Shard Purge ───────────────────────────────
    // Decommission all associated telemetry across shared collections
    const models = getTenantModels(mongoose.connection);
    const filter = { businessId: businessId as any };

    await Promise.all([
      models.Product.deleteMany(filter),
      models.Invoice.deleteMany(filter),
      models.Party.deleteMany(filter),
      models.Payment.deleteMany(filter),
      models.Staff.deleteMany(filter),
      models.Activity.deleteMany(filter),
      models.Purchase.deleteMany(filter),
      models.Transaction.deleteMany(filter),
      models.Notification.deleteMany(filter),
      User.deleteMany({ businessObjectId: businessId as any })
    ]);

    await Business.findByIdAndDelete(businessId);

    res.status(200).json({ success: true, message: "Node and associated telemetry purged from shared registry." });
  } catch (err: any) {
    res.status(500).json({ message: "Registry Purge Error", error: err.message });
  }
};

export const updateMyBusiness = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    const { gstin, address, city, state, pincode, mobileNumber } = req.body;
    const updateData: any = { gstin, mobileNumber };
    if (address || city || state || pincode) {
      updateData.location = { address: address || "", city: city || "", state: state || "", pincode: pincode || "", country: "India" };
    }
    const updatedBusiness = await Business.findByIdAndUpdate(businessId, { $set: updateData }, { returnDocument: 'after' });
    res.status(200).json(updatedBusiness);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getPlanStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    const business = await Business.findById(businessId);
    if (!business) throw new Error("Not found");

    const today = new Date();
    const expiry = new Date(business.planEndDate || Date.now());
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    res.status(200).json({
      plan: business.plan,
      expiryDate: business.planEndDate,
      remainingDays: Math.max(0, diffDays),
      status: diffDays > 0 && business.status !== 'suspended' ? "active" : business.status,
      isNearExpiry: diffDays > 0 && diffDays <= 7,
      planHistory: business.planHistory || [],
      skuLimit: business.skuLimit,
      invoiceLimit: business.invoiceLimit,
      currentSkuCount: business.currentSkuCount,
      currentInvoiceCount: business.currentInvoiceCount
    });
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
};

export const renewPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    const { planType, months, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    const business = await Business.findById(businessId);
    if (!business) throw new Error("Business not found");

    const Plan = (await import('../models/Plan.js')).default;
    const planDetails = await Plan.findOne({ name: planType || business.plan });
    if (!planDetails) throw new Error("Plan not found");

    const subscriptionMonths = Number(months || 1);
    const amountPaid = (planDetails.priceMonthly || 0) * subscriptionMonths;

    if (amountPaid > 0) {
      const secret = process.env.RAZORPAY_KEY_SECRET || '';
      if (!verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, secret)) {
        throw new Error("Invalid Payment Signature");
      }
    }

    const baseDate = new Date(business.planEndDate || Date.now()) > new Date() ? new Date(business.planEndDate) : new Date();
    const newExpiry = new Date(baseDate.getTime() + subscriptionMonths * 30 * 24 * 60 * 60 * 1000);

    business.plan = planType || (business.plan as string);
    business.planEndDate = newExpiry;
    business.planHistory.push({ plan: business.plan as string, startDate: baseDate, endDate: newExpiry, assignedBy: "Self", assignedAt: new Date(), amountPaid, razorpayPaymentId, razorpayOrderId, razorpaySignature });

    await business.save();
    await logActivity(req, "UPDATE", "BUSINESS", `Self-Renewal: Extended to ${newExpiry.toLocaleDateString()}`, business._id.toString());

    res.status(200).json({ success: true, newExpiryDate: newExpiry });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const superAdminExtendPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { planType, months, amountPaid } = req.body;
    const business = await Business.findById(id);
    if (!business) throw new Error("Not found");

    const subscriptionMonths = Number(months || 1);
    const baseDate = new Date(business.planEndDate || Date.now()) > new Date() ? new Date(business.planEndDate) : new Date();
    const newExpiry = new Date(baseDate.getTime() + subscriptionMonths * 30 * 24 * 60 * 60 * 1000);

    business.plan = planType || (business.plan as string);
    business.planEndDate = newExpiry;
    business.isActive = true;
    business.status = 'active';
    business.planHistory.push({ plan: business.plan as string, startDate: baseDate, endDate: newExpiry, assignedBy: "SuperAdmin", assignedAt: new Date(), amountPaid: Number(amountPaid) });

    await business.save();
    res.status(200).json({ success: true, newExpiry });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const resetMyWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) throw new Error("No business session");
    const business = await Business.findById(businessId);
    if (!business) throw new Error("Workspace not found");

    // ── Nexus Protocol: Targeted Shard Reset ──────────────────────────────
    // Purge operational data while preserving the Node Identity (Business/Users)
    const models = getTenantModels(mongoose.connection);
    const filter = { businessId: businessId as any };

    await Promise.all([
      models.Product.deleteMany(filter),
      models.Invoice.deleteMany(filter),
      models.Party.deleteMany(filter),
      models.Payment.deleteMany(filter),
      models.Activity.deleteMany(filter),
      models.Purchase.deleteMany(filter),
      models.Transaction.deleteMany(filter),
      models.Notification.deleteMany(filter)
    ]);

    await logActivity(req, "UPDATE", "BUSINESS", `GLOBAL_WORKSPACE_RESET: Node ${business.businessName} telemetry decommissioned for fresh rollout.`, business._id.toString());
    res.status(200).json({ success: true, message: "Workspace data successfully purged from shared registry." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
