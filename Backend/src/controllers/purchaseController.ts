import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import mongoose from "mongoose";
import { logActivity } from "../utils/activityLogger.js";
import { createNotification } from "./notificationController.js";
import { getIO } from "../socket.js";
import { getBusinessAdminId } from "../utils/businessUtils.js";

/**
 * @desc  Create a new purchase (stock-in from vendor)
 * @route POST /api/purchases
 */
export const createPurchase = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.tenantModels) {
    res.status(500).json({ success: false, message: "Workspace node offline." });
    return;
  }
  const { Purchase, Product, Transaction } = req.tenantModels;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { businessId, userId, shortBusinessId } = req.user!;
    const adminId = req.user?.businessAdminId || userId;

    const { 
      vendorName, 
      vendorPhone, 
      vendorGstin, 
      items, 
      paymentMethod, 
      paymentStatus, 
      note, 
      purchaseDate,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature
    } = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({ success: false, message: "At least one item is required" });
      return;
    }

    let subtotal = 0;
    const detailedItems = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId }).session(session);
      if (!product) throw new Error(`Product not found: ${item.productId}`);

      const itemTotal = item.purchasePrice * item.qty;
      subtotal += itemTotal;

      // Increase stock on purchase
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stock: item.qty }, $set: { purchasePrice: item.purchasePrice } },
        { session }
      );

      detailedItems.push({
        productId: item.productId,
        name: product.name,
        qty: item.qty,
        purchasePrice: item.purchasePrice,
        total: itemTotal,
      });
    }

    const totalGST = req.body.totalGST || 0;
    const grandTotal = subtotal + totalGST;
    const billNumber = `PUR-${shortBusinessId || 'NODE'}-${Date.now()}`;

    // Auto-set paid for razorpay
    const finalStatus = (paymentMethod === 'razorpay' && razorpayPaymentId) ? 'paid' : (paymentStatus || 'paid');

    const purchaseDocs = await Purchase.create([{
      businessId: businessId as any,
      businessAdminId: adminId as any,
      createdBy: userId as any,
      billNumber,
      vendorName,
      vendorPhone,
      vendorGstin,
      items: detailedItems,
      subtotal,
      totalGST,
      grandTotal,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: finalStatus,
      note,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
    }] as any, { session });

    await session.commitTransaction();
    session.endSession();

    await Transaction.create({
      businessId: businessId as any,
      businessAdminId: adminId as any,
      userId: userId as any,
      type: 'expense',
      amount: grandTotal,
      referenceId: purchaseDocs[0]._id as any,
      referenceModel: 'Purchase',
      paymentMethod: paymentMethod || 'cash',
      description: `Purchase from ${vendorName} (Ref: ${billNumber})`
    });

    await logActivity(req, "CREATE", "PRODUCT", `Recorded purchase from vendor: ${vendorName} (${detailedItems.length} items, ₹${grandTotal})`, (purchaseDocs[0]._id as any).toString());

    await createNotification(
      businessId,
      `Registry Signal: New Stock Purchase of ₹${grandTotal.toFixed(2)} from ${vendorName} (Ref: ${billNumber}).`,
      "info",
      "businessAdmin"
    );

    if (businessId) {
      getIO()?.to(businessId.toString()).emit('DATA_SYNC', { type: 'PURCHASE' });
      getIO()?.to(businessId.toString()).emit('DATA_SYNC', { type: 'PRODUCT' });
    }

    res.status(201).json({ success: true, data: purchaseDocs[0] });
  } catch (error: any) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc  Get all purchases (paginated)
 * @route GET /api/purchases
 */
export const getPurchases = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Workspace node offline." });
      return;
    }
    const { Purchase } = req.tenantModels;
    const adminId = getBusinessAdminId(req);
    const search = req.query.search ? String(req.query.search) : undefined;
    const page   = Number(req.query.page  || 1);
    const limit  = Number(req.query.limit || 20);
    const skip   = (page - 1) * limit;

    const query: any = { businessAdminId: adminId as any };
    if (search) {
      query.$or = [
        { vendorName: { $regex: search, $options: 'i' } },
        { 'items.name': { $regex: search, $options: 'i' } }
      ];
    }

    const total     = await Purchase.countDocuments(query);
    const purchases = await Purchase.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({ success: true, total, page, data: purchases });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * @desc  Get purchase stats (total spend, count, this month)
 * @route GET /api/purchases/stats
 */
export const getPurchaseStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Workspace node offline." });
      return;
    }
    const { Purchase } = req.tenantModels;
    const adminId = getBusinessAdminId(req);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalResult, monthResult, countResult, dailyResult] = await Promise.all([
      Purchase.aggregate([
        { $match: { businessAdminId: adminId as any } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } }
      ]),
      Purchase.aggregate([
        { $match: { businessAdminId: adminId as any, createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$grandTotal" }, count: { $sum: 1 } } }
      ]),
      Purchase.countDocuments({ businessAdminId: adminId as any }),
      Purchase.aggregate([
        { $match: { businessAdminId: adminId as any, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            total: { $sum: "$grandTotal" }
          }
        },
        { $sort: { "_id": 1 } }
      ])
    ]);

    res.status(200).json({
      success: true,
      totalSpend: totalResult[0]?.total || 0,
      monthSpend: monthResult[0]?.total || 0,
      monthCount: monthResult[0]?.count || 0,
      totalCount: countResult,
      dailySpend: dailyResult.map(d => ({ date: d._id, total: d.total }))
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
