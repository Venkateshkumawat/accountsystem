import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Business from '../models/Business.js';
import Activity from '../models/Activity.js';
import Plan from '../models/Plan.js';
import SuperAdminConfig from '../models/SuperAdminConfig.js';
import { generateBusinessId } from '../utils/generateBusinessId.js';
import { generateSubscriptionId } from '../utils/generateTransactionId.js';
import { createNotification } from './notificationController.js';
import { generateToken } from '../utils/jwt.js';

// --- VALIDATION SCHEMAS ---

const createBusinessAdminSchema = z.object({
  ownerFullName: z.string().min(2, "Owner name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  mobileNumber: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
  location: z.object({
    address: z.string().optional(),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
  }),
  plan: z.enum(['free', 'pro', 'enterprise']).optional().default('free'),
  planStartDate: z.string().optional(),
  planEndDate: z.string().optional(),
  gstin: z.string().optional(),
  skuLimit: z.number().optional().default(100),
  invoiceLimit: z.number().optional().default(500),
  amountPaid: z.number().optional().default(0),
});

// --- CONTROLLERS ---

/**
 * SuperAdmin Login Protocol
 */
export const loginSuperAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { secretKey } = req.body;
    if (!secretKey) {
      res.status(400).json({ success: false, message: 'Secret key is required' });
      return;
    }

    const envSecretKey = process.env.SUPER_ADMIN_SECRET_KEY;
    if (!envSecretKey) {
      res.status(500).json({ success: false, message: 'SuperAdmin ENV secret key not configured.' });
      return;
    }

    if (secretKey !== envSecretKey) {
      res.status(401).json({ success: false, message: 'Invalid secret key' });
      return;
    }

    // Record login timestamp and IP in config node
    const config = await SuperAdminConfig.findOne();
    if (config) {
      config.lastLoginAt = new Date();
      config.lastLoginIP = req.ip || req.socket.remoteAddress;
      await config.save();
    }

    const token = generateToken({
      userId: 'SUPER_ADMIN_MASTER',
      name: 'Nexus Master',
      role: 'superadmin',
      businessId: undefined,
      shortBusinessId: undefined,
      businessAdminId: undefined,
      permissions: []
    });

    res.status(200).json({
      success: true,
      message: 'Nexus Intelligence Hub Authorized',
      token,
      user: {
        userId: 'SUPER_ADMIN_MASTER',
        role: 'superadmin',
        name: 'Nexus Master',
      },
      expiresIn: '12h'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * SuperAdmin Token Verification
 */
export const verifySuperAdminToken = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, message: 'Nexus Connection Stable' });
};

/**
 * Master Stats Retrieval (Telemetry)
 */
export const getSuperAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const businessCount = await Business.countDocuments();
    const userCount = await User.countDocuments({ role: { $ne: 'superadmin' } });
    const activeSubscriptions = await Business.countDocuments({ status: 'active', planEndDate: { $gte: new Date() } });
    
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    const expiredCount = await Business.countDocuments({ planEndDate: { $lt: now } });

    // ── Global Revenue Telemetry ─────────────────────────────────────────
    const revenueStats = await Business.aggregate([
      { $unwind: "$planHistory" },
      { $group: { _id: null, totalRevenue: { $sum: "$planHistory.amountPaid" } } }
    ]);
    const totalRevenue = revenueStats.length > 0 ? revenueStats[0].totalRevenue : 0;

    // ── Monthly Revenue Flux (Last 6 Months) ────────────────────────────
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Business.aggregate([
      { $unwind: "$planHistory" },
      { $match: { "planHistory.assignedAt": { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$planHistory.assignedAt" } },
          revenue: { $sum: "$planHistory.amountPaid" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);
    
    // 🚩 Actionable Intelligence: Businesses requiring attention
    const expiringSoon = await Business.find({ 
      planEndDate: { $gte: now, $lte: sevenDaysFromNow },
      status: 'active'
    }).select('businessName ownerFullName plan planEndDate businessId').limit(10);

    const recentlyExpired = await Business.find({ 
      planEndDate: { $lt: now } 
    }).sort({ planEndDate: -1 }).select('businessName ownerFullName plan planEndDate businessId').limit(10);

    // ── Granular Registry Feed: Recent Signups ───────────────────────────
    const recentRegistrations = await Business.find()
      .sort({ createdAt: -1 })
      .select('businessId businessName plan createdAt')
      .limit(10);

    // ── Platform Pulse: Registration Trend (Last 30 Days) ──────────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const registrationTrend = await Business.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // ── Plan Distribution: Market Share ───────────────────────────────────
    const planDistribution = await Business.aggregate([
      {
        $group: {
          _id: "$plan",
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats: { 
        businessCount, 
        userCount, 
        activeSubscriptions, 
        securityAlert: 0, 
        expiredCount,
        totalRevenue,
        expiringSoon,
        recentlyExpired,
        recentRegistrations,
        registrationTrend,
        planDistribution,
        monthlyRevenue
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Global Activity Log Auditing
 * RESTRICTED: Only shows system-level administrative events (Nexus Master actions)
 */
export const getGlobalActivityLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    // Strictly isolate business-level audit logs from the SuperAdmin view unless explicitly scoped.
    // By default, only show actions performed by 'superadmin' identity.
    const logs = await Activity.find({ businessAdminId: '000000000000000000000000' as any })
      .sort({ createdAt: -1 })
      .limit(100);
      
    res.status(200).json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Provisions a New Business Admin with Atomicity
 */
export const createBusinessAdmin = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const validatedData = createBusinessAdminSchema.parse(req.body);

    if (await User.findOne({ email: validatedData.email.toLowerCase() })) {
      res.status(409).json({ success: false, message: "Email already exists in Nexus Registry." });
      return;
    }

    // 1. Prepare Business Identity (BB-XXXX-0000)
    const businessId = await generateBusinessId();
    const startDate = validatedData.planStartDate ? new Date(validatedData.planStartDate) : new Date();
    let endDate = validatedData.planEndDate ? new Date(validatedData.planEndDate) : null;

    if (!endDate) {
      const daysToAdd = validatedData.plan === 'enterprise' ? 365 : 30;
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + daysToAdd);
    }

    // 2. Initialize User Node (Do NOT save yet)
    const newUser = new User({
      name: validatedData.ownerFullName.trim(),
      email: validatedData.email.toLowerCase().trim(),
      password: validatedData.password,
      role: 'businessAdmin',
      businessId: businessId,
      isActive: true
    });

    // 3. Initialize Business Node
    const newBusiness = new Business({
      businessId: businessId,
      shortId: businessId.split('-').slice(1).join('-'),
      businessAdminId: newUser._id,
      ownerFullName: validatedData.ownerFullName.trim(),
      businessName: validatedData.businessName.trim(),
      email: validatedData.email.toLowerCase().trim(),
      mobileNumber: validatedData.mobileNumber,
      location: validatedData.location,
      gstin: validatedData.gstin,
      plan: validatedData.plan,
      planStartDate: startDate,
      planEndDate: endDate,
      status: 'active',
      isActive: true,
      createdBySuperAdmin: true,
      planHistory: [{
        plan: validatedData.plan,
        transactionId: await generateSubscriptionId(),
        startDate: startDate,
        endDate: endDate,
        assignedBy: 'superadmin',
        assignedAt: new Date(),
        amountPaid: validatedData.amountPaid
      }],
      skuLimit: validatedData.skuLimit,
      invoiceLimit: validatedData.invoiceLimit
    });

    // 4. Atomic Linkage & Persistence
    newUser.businessAdminId = newUser._id;
    newUser.businessObjectId = newBusiness._id;

    await newBusiness.save({ session });
    await newUser.save({ session });

    await Activity.create({
      businessAdminId: '000000000000000000000000' as any,
      userName: 'Nexus Master',
      action: 'CREATE',
      resource: 'BUSINESS',
      description: `Provisioned new business node: ${validatedData.businessName} (${businessId})`
    });

    await createNotification(
      null,
      `New Node Provisioned: ${validatedData.businessName} initialized under ID ${businessId}.`,
      "success",
      "superadmin",
      "/superadmin/accounts",
      "users"
    );

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "BusinessAdmin created successfully",
      data: {
        businessId, email: validatedData.email, businessName: validatedData.businessName,
        plan: validatedData.plan, planEndDate: endDate,
        loginCredentials: { email: validatedData.email.toLowerCase(), password: validatedData.password, note: "Raw password transmitted once." }
      }
    });

  } catch (error: any) {
    await session.abortTransaction();
    res.status(error instanceof z.ZodError ? 400 : 500).json({ success: false, message: error.message });
  } finally { session.endSession(); }
};

/**
 * Managed Feature Toggling
 */
export const updateBusinessFeatures = async (req: Request, res: Response): Promise<void> => {
  try {
    const { businessId } = req.params;
    const { features } = req.body;
    const biz = await Business.findOne({ businessId });
    if (!biz) { res.status(404).json({ message: "Node not found." }); return; }

    biz.features = { ...biz.features, ...features };
    await biz.save();

    await Activity.create({
      businessAdminId: '000000000000000000000000' as any,
      userName: 'Nexus Master',
      action: 'UPDATE',
      resource: 'BUSINESS',
      description: `Modified capability matrix for node ${businessId}`
    });

    await createNotification(
      null,
      `Master Protocol Update: Capability matrix modified for node ${businessId}.`,
      "info",
      "superadmin",
      "/superadmin/accounts",
      // "settings"
    );

    res.status(200).json({ success: true, message: `Node features updated`, features: biz.features });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

/**
 * Master Business Registry Retrieval
 */
export const getAllBusinesses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    const query: any = {};
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { businessId: { $regex: search, $options: 'i' } },
        { ownerFullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    const businesses = await Business.find(query).sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ success: true, businesses, data: businesses }); // Support both 'businesses' and 'data' keys for compatibility
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

/**
 * Managed Status Shifting
 */
export const updateBusinessStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { businessId } = req.params;
    const { action, reason } = req.body;
    const biz = await Business.findOne({ businessId });
    if (!biz) { res.status(404).json({ message: "Node not found." }); return; }

    if (action === 'activate') {
      biz.isActive = true; biz.status = 'active'; biz.activatedAt = new Date();
      await User.updateMany({ businessId }, { isActive: true });
    } else {
      biz.isActive = false; biz.status = action === 'suspend' ? 'suspended' : 'inactive';
      if (action === 'suspend') { biz.suspendedAt = new Date(); biz.suspendReason = reason; }
      await User.updateMany({ businessId }, { isActive: false });
    }
    await biz.save();

    // 📡 Nexus Protocol: Multi-node Synchronization
    const io = (await import('../socket.js')).getIO();
    if (io) {
      io.to(businessId.toString()).emit('DATA_SYNC', { type: 'PLAN_UPDATE' });
    }

    await Activity.create({
      businessAdminId: '000000000000000000000000' as any,
      userName: 'Nexus Master',
      action: 'UPDATE',
      resource: 'BUSINESS',
      description: `Shifted operational state of node ${businessId} to ${action.toUpperCase()}`
    });

    await createNotification(
      null,
      `Operational Shift: Node ${businessId} status shifted to ${action.toUpperCase()}.`,
      action === 'activate' ? "success" : "warning",
      "superadmin",
      "/superadmin/accounts",
      "alert"
    );

    await createNotification(
      businessId,
      `Governance Alert: Your workspace node has been ${action.toUpperCase()} by Nexus Master. ${reason ? `Reason: ${reason}` : ''}`,
      action === 'activate' ? "success" : "error",
      "businessAdmin",
      "/settings",
      "alert"
    );

    res.status(200).json({ success: true, message: `Node state shifted to ${action}` });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

/**
 * Protocol Subscription Override
 */
export const updateBusinessPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { businessId } = req.params;
    const { plan, planStartDate, planEndDate, amountPaid } = req.body;
    const start = new Date(planStartDate); const end = new Date(planEndDate);
    if (end <= start) { res.status(400).json({ message: "Expiry must be after activation." }); return; }

    const biz = await Business.findOne({ businessId });
    if (!biz) { res.status(404).json({ message: "Node not found." }); return; }

    const txnId = await generateSubscriptionId();
    biz.plan = plan; biz.planStartDate = start; biz.planEndDate = end; biz.status = 'active'; biz.isActive = true;
    biz.planHistory.push({ plan, transactionId: txnId, startDate: start, endDate: end, assignedBy: 'superadmin', assignedAt: new Date(), amountPaid: amountPaid || 0 });
    await biz.save();
    await User.updateOne({ businessId, role: 'businessAdmin' }, { isActive: true });

    // 📡 Nexus Protocol: Multi-node Synchronization
    const io = (await import('../socket.js')).getIO();
    if (io) {
      io.to(businessId.toString()).emit('DATA_SYNC', { type: 'PLAN_UPDATE' });
    }

    await Activity.create({
      businessAdminId: '000000000000000000000000' as any,
      userName: 'Nexus Master',
      action: 'UPDATE',
      resource: 'BUSINESS',
      description: `Subscription Override: Node ${businessId} assigned to ${plan.toUpperCase()} protocol`
    });

    await createNotification(
      null,
      `Subscription Override: Node ${businessId} upgraded/modified to ${plan.toUpperCase()} protocol.`,
      "success",
      "superadmin",
      "/superadmin/accounts",
      "invoice"
    );

    await createNotification(
      businessId,
      `Subscription Synchronized: Your workspace node has been upgraded to ${plan.toUpperCase()}. Expiry: ${end.toLocaleDateString()}.`,
      "success",
      "businessAdmin",
      "/settings",
      "payment"
    );

    res.status(200).json({ success: true, message: `Plan updated to ${plan}` });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

/**
 * Global Node Configuration Override
 */
export const updateBusinessDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { businessId } = req.params;
    const {
      businessName,
      ownerFullName,
      plan,
      skuLimit,
      invoiceLimit,
      planStartDate,
      planEndDate,
      status
    } = req.body;

    const biz = await Business.findOne({ businessId });
    if (!biz) { res.status(404).json({ message: "Node not found." }); return; }

    if (businessName) biz.businessName = businessName;
    if (ownerFullName) biz.ownerFullName = ownerFullName;
    if (plan) biz.plan = plan;
    if (skuLimit !== undefined) biz.skuLimit = skuLimit;
    if (invoiceLimit !== undefined) biz.invoiceLimit = invoiceLimit;
    if (planStartDate) biz.planStartDate = new Date(planStartDate);
    if (planEndDate) biz.planEndDate = new Date(planEndDate);
    if (status) {
      biz.status = status;
      biz.isActive = status === 'active';
      await User.updateMany({ businessId }, { isActive: biz.isActive });
    }

    await biz.save();

    // 📡 Nexus Protocol: Multi-node Synchronization
    const io = (await import('../socket.js')).getIO();
    if (io) {
      io.to(businessId.toString()).emit('DATA_SYNC', { type: 'PLAN_UPDATE' });
    }

    // Notify SuperAdmin Audit Log
    await Activity.create({
      businessAdminId: '000000000000000000000000' as any,
      userName: 'Nexus Master',
      action: 'UPDATE',
      resource: 'BUSINESS',
      description: `Configuration Sync: Updated metadata and limits for Node ${businessId}`
    });

    await createNotification(
      null,
      `Master Protocol Sync: Configuration override executed for Node ${businessId}.`,
      "info",
      "superadmin",
      "/superadmin/accounts",
      // "settings"
    );

    // Notify Affected Business Node
    await createNotification(
      businessId,
      `Infrastructure Update: Your operational plan/limits have been synchronized by Nexus Master. SKU: ${biz.skuLimit}, Invoice: ${biz.invoiceLimit}.`,
      "info",
      "businessAdmin",
      "/settings",
      "alert"
    );

    res.status(200).json({ success: true, message: "Node configuration synchronized." });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

/**
 * Master Password Override
 */
export const resetBusinessPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { businessId } = req.params;
    const { newPassword } = req.body;
    const user = await User.findOne({ businessId, role: 'businessAdmin' });
    if (!user) { res.status(404).json({ message: "Primary Admin not found." }); return; }
    user.password = newPassword; await user.save();

    await Activity.create({
      businessAdminId: '000000000000000000000000' as any,
      userName: 'Nexus Master',
      action: 'UPDATE',
      resource: 'BUSINESS',
      description: `Security Override: Deployed new administrative credentials for node ${businessId}`
    });

    await createNotification(
      null,
      `Security Override: Administrative credentials reset for node ${businessId}.`,
      "warning",
      "superadmin",
      "/superadmin/accounts",
      // "settings"
    );

    res.status(200).json({ success: true, message: "Password reset", newPassword });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
};

/**
 * Nuclear Deletion Protocol
 */
export const deleteBusinessPermanently = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession(); session.startTransaction();
  try {
    const { businessId } = req.params;
    await User.deleteMany({ businessId }).session(session);
    await Business.deleteOne({ businessId }).session(session);
    await session.commitTransaction();

    await Activity.create({
      businessAdminId: '000000000000000000000000' as any,
      userName: 'Nexus Master',
      action: 'DELETE',
      resource: 'BUSINESS',
      description: `Nuclear Purge: Decommissioned and deleted node ${businessId} permanently`
    });

    await createNotification(
      null,
      `Decommissioning Protocol: Node ${businessId} and its telemetry purged permanently.`,
      "error",
      "superadmin",
      "/superadmin/accounts",
      "alert"
    );

    res.status(200).json({ success: true, message: "Node and telemetry purged permanently." });
  } catch (error: any) { await session.abortTransaction(); res.status(500).json({ message: error.message }); }
  finally { session.endSession(); }
};

// Plan Management CRUD
export const getAllPlans = async (req: Request, res: Response) => {
  try { const plans = await Plan.find().sort({ priceMonthly: 1 }); res.json({ success: true, plans }); }
  catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const createPlan = async (req: Request, res: Response) => {
  try { const n = new Plan(req.body); await n.save(); res.status(201).json({ success: true, plan: n }); }
  catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const updatePlan = async (req: Request, res: Response) => {
  try { const u = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ success: true, plan: u }); }
  catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const deletePlan = async (req: Request, res: Response) => {
  try { await Plan.findByIdAndDelete(req.params.id); res.json({ success: true, message: "Plan archived." }); }
  catch (e: any) { res.status(500).json({ message: e.message }); }
};

/**
 * Master Transaction Registry: Global subscription flow forensics
 */
export const getSuperAdminTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const transactions = await Business.aggregate([
      { $unwind: "$planHistory" },
      {
        $project: {
          _id: 0,
          businessId: 1,
          businessName: 1,
          ownerFullName: 1,
          email: 1,
          mobileNumber: 1,
          location: 1,
          gstin: 1,
          transactionId: "$planHistory.transactionId",
          plan: "$planHistory.plan",
          startDate: "$planHistory.startDate",
          endDate: "$planHistory.endDate",
          assignedBy: "$planHistory.assignedBy",
          assignedAt: "$planHistory.assignedAt",
          amountPaid: "$planHistory.amountPaid",
          razorpayPaymentId: "$planHistory.razorpayPaymentId",
          razorpayOrderId: "$planHistory.razorpayOrderId",
          razorpaySignature: "$planHistory.razorpaySignature"
        }
      },
      { $sort: { assignedAt: -1 } },
      { $limit: 100 } // Safety throttle
    ]);

    res.status(200).json({ success: true, transactions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Global Platform Settings
 */
export const getAdminSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    let config = await SuperAdminConfig.findOne();
    if (!config) {
      // Initialize if not exists (failsafe)
      config = await SuperAdminConfig.create({ secretKey: process.env.SUPER_ADMIN_SECRET_KEY || 'NexusMaster2026' });
    }
    res.status(200).json({ 
      success: true, 
      settings: {
        maintenanceMode: config.maintenanceMode,
        allowRegistrations: config.allowRegistrations,
        globalLogging: config.globalLogging,
        earlyAccess: config.earlyAccess,
        adminName: config.name || 'Master Admin',
        lastLogin: config.lastLoginAt
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Global Platform Settings
 */
export const updateAdminSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { settings } = req.body;
    let config = await SuperAdminConfig.findOne();
    if (!config) {
      config = new SuperAdminConfig({ secretKey: process.env.SUPER_ADMIN_SECRET_KEY || 'NexusMaster2026' });
    }

    if (settings.maintenanceMode !== undefined) config.maintenanceMode = settings.maintenanceMode;
    if (settings.allowRegistrations !== undefined) config.allowRegistrations = settings.allowRegistrations;
    if (settings.globalLogging !== undefined) config.globalLogging = settings.globalLogging;
    if (settings.earlyAccess !== undefined) config.earlyAccess = settings.earlyAccess;
    if (settings.adminName) config.name = settings.adminName;

    await config.save();

    await Activity.create({
      businessAdminId: '000000000000000000000000' as any,
      userName: 'Nexus Master',
      action: 'UPDATE',
      resource: 'SYSTEM_CONFIG',
      description: `Global Governance Updated: ${Object.keys(settings).join(', ')} modified.`
    });

    res.status(200).json({ success: true, message: 'Platform protocols synchronized successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

