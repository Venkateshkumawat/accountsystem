import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { IInvoiceItem } from "../models/Invoice.js";
import { reduceStock } from "../utils/inventory.js";
import { getBusinessAdminId } from "../utils/businessUtils.js";
import mongoose from "mongoose";
import { logActivity } from "../utils/activityLogger.js";
import { createNotification } from "./notificationController.js";
import { getIO } from "../socket.js";
import Business from "../models/Business.js";
import { applyOffer } from "../utils/offerEngine.js";

/**
 * @desc    Create a new invoice with transactional safety
 */
export const createInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.tenantModels) {
    res.status(500).json({ success: false, message: "Workspace node offline." });
    return;
  }
  const { Product, Invoice, Payment, Transaction, Offer } = req.tenantModels;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const businessAdminId = getBusinessAdminId(req);
    const { businessId, userId } = req.user!;

    // Fetch active offers for this business Node
    const activeOffers = await Offer.find({ 
      businessAdminId: new mongoose.Types.ObjectId(businessAdminId),
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).lean();

    // 🏗️ Enforce Monetization Protocol: Invoice Limit Check
    const biz = await Business.findById(businessId);
    if (!biz) {
      res.status(404).json({ success: false, message: "Business node not found. Invoice generation blocked." });
      return;
    }

    if (biz.currentInvoiceCount >= biz.invoiceLimit) {
       // Auto-suspend protocol
       biz.status = 'suspended';
       biz.isActive = false;
       biz.suspendedAt = new Date();
       biz.suspendReason = "FISCAL SURGE: Absolute invoice limit reached.";
       await biz.save();
       
       // De-authorize all users for this node
       const User = mongoose.model("User");
       await User.updateMany({ businessId }, { isActive: false });

       res.status(403).json({ 
         success: false, 
         message: `Infrastructure Lock: Invoice Limit Reached (${biz.invoiceLimit}). Node suspended. Please contact Nexus Master to authorize additional data partitions.` 
       });
       return;
    }
    const { 
      customerName, 
      customerPhone, 
      items, 
      paymentMethod, 
      note, 
      razorpayPaymentId, 
      razorpayOrderId, 
      razorpaySignature,
      paymentStatus: incomingStatus 
    } = req.body;

    if (!businessId) {
      res.status(400).json({ success: false, message: "Business context missing." });
      return;
    }

    if (!items || items.length === 0) {
      res.status(400).json({ success: false, message: "Invoice must have at least one item" });
      return;
    }

    const detailedItems: IInvoiceItem[] = [];
    let subtotal = 0;
    let totalGST = 0;
    let totalDiscount = 0;

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, businessAdminId }).session(session);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const itemQty = Number(item.qty);
      if (itemQty > product.stock) {
        throw new Error(`Protocol Violation: Stock exhausted for ${product.name}. Available: ${product.stock}`);
      }

      //  promoción: Apply Offer Strategy
      const productOffers = activeOffers.filter(o => 
        !o.productId || o.productId.toString() === product._id.toString()
      );
      
      const offerAnalysis = applyOffer(itemQty, product.sellingPrice, productOffers as any);

      const totalManualDiscount = Number(item.discount || 0);
      const totalSystemDiscount = offerAnalysis.discount;
      const combinedDiscount = totalManualDiscount + totalSystemDiscount;

      const priceAfterDiscount = (product.sellingPrice * itemQty - combinedDiscount) / itemQty;
      const gstAmountPerItem = (priceAfterDiscount * (product.gstRate || 0)) / 100;
      const itemTotal = offerAnalysis.finalPrice + (gstAmountPerItem * itemQty);

      detailedItems.push({
        productId: product._id as mongoose.Types.ObjectId,
        name: product.name,
        barcode: product.barcode,
        qty: itemQty,
        price: product.sellingPrice,
        gstRate: product.gstRate,
        gstAmount: gstAmountPerItem * itemQty,
        discount: combinedDiscount,
        freeQty: offerAnalysis.freeQty,
        offerType: offerAnalysis.appliedOfferType || undefined,
        total: itemTotal
      });

      subtotal += product.sellingPrice * itemQty;
      totalGST += gstAmountPerItem * itemQty;
      totalDiscount += combinedDiscount;

      if (offerAnalysis.appliedOfferType) {
        getIO()?.to(businessId.toString()).emit("offerApplied", { 
           product: product.name, 
           type: offerAnalysis.appliedOfferType,
           badge: offerAnalysis.badge
        });
      }
    }

    const grandTotal = subtotal - totalDiscount + totalGST;
    const adminIdStr = businessAdminId.toString();
    const invoiceNumber = `BB-${adminIdStr.slice(-5)}-${Date.now()}`;
    const finalPaymentStatus = (razorpayPaymentId && razorpayOrderId && razorpaySignature) ? 'paid' : (incomingStatus || 'pending');

    if (finalPaymentStatus === 'paid' && razorpayPaymentId && razorpayOrderId && razorpaySignature) {
      const { verifyRazorpaySignature } = await import('../utils/paymentUtils.js');
      const secret = process.env.RAZORPAY_KEY_SECRET || '';
      const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, secret);
      if (!isValid) {
        throw new Error("Security Violation: Invalid Payment signature.");
      }
    }

    const invoiceDocs = await Invoice.create([{
      businessId: businessId as any,
      businessAdminId: businessAdminId as any,
      createdBy: userId as any,
      invoiceNumber,
      customerName,
      customerPhone,
      items: detailedItems,
      subtotal,
      totalGST,
      totalDiscount,
      grandTotal,
      paymentMethod,
      paymentStatus: finalPaymentStatus,
      note,
      razorpayPaymentId,
      razorpayOrderId
    }] as any, { session });
    const invoice = invoiceDocs[0];

    await reduceStock(Product, detailedItems, businessAdminId.toString(), session);

    if (paymentMethod) {
      await Payment.create([{
        invoiceId: invoice._id,
        businessId: businessId as any,
        businessAdminId: businessAdminId as any,
        recordedBy: userId as any,
        amount: grandTotal,
        method: paymentMethod,
        transactionId: razorpayPaymentId || undefined,
        status: 'completed',
        paidAt: new Date()
      }] as any, { session });
    }

    await session.commitTransaction();
    session.endSession();

    // Increment absolute counter for the business node
    await Business.findByIdAndUpdate(businessId, { $inc: { currentInvoiceCount: 1 } });

    await Transaction.create({
      businessId: businessId as any,
      businessAdminId: businessAdminId as any,
      userId: userId as any,
      type: 'sale',
      amount: grandTotal,
      originalAmount: subtotal + totalGST,
      discountAmount: totalDiscount,
      offerDetails: detailedItems.filter(i => i.offerType).map(i => `${i.name}: ${i.offerType}`).join(', '),
      referenceId: invoice._id as any,
      referenceModel: 'Invoice',
      paymentMethod: paymentMethod || 'unknown',
      description: `Sale to ${customerName || 'Walk-in'} (Ref: ${invoiceNumber})`
    });

    await logActivity(req, "TRANSACTION", "INVOICE", `Generated invoice ${invoiceNumber}`, (invoice._id as any).toString());
    
    await createNotification(
      req.user?.businessId,
      `Invoice Generated: ${invoiceNumber} for ${customerName}.`,
      "success",
      "businessAdmin",
      `/invoice-view/${invoice._id}`,
      "invoice"
    );

    if (paymentMethod) {
      await createNotification(
        req.user?.businessId,
        `Revenue Registry: Inbound payment of ₹${grandTotal.toFixed(2)} recorded for ${customerName} (Ref: ${invoiceNumber}).`,
        "success",
        "businessAdmin",
        undefined,
        "payment"
      );
    }

    getIO()?.to(businessId.toString()).emit('DATA_SYNC', { type: 'INVOICE' });
    getIO()?.to(businessId.toString()).emit('DATA_SYNC', { type: 'PRODUCT' });

    res.status(201).json({ success: true, data: invoice });

  } catch (error: any) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error("🌊 Invoice Lifecycle Failure:", error);
    res.status(400).json({ success: false, message: `Node Transaction Failed: ${error.message}` });
  }
};

export const getInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Workspace node offline." });
      return;
    }
    const { Invoice } = req.tenantModels;
    const businessAdminId = getBusinessAdminId(req);
    const status = req.query.status ? String(req.query.status) : undefined;
    const page   = Number(req.query.page  || 1);
    const limit  = Number(req.query.limit || 20);
    const skip   = (page - 1) * limit;

    const query: any = { businessAdminId };
    if (status) query.paymentStatus = status;

    const total    = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({ success: true, total, page, limit, data: invoices });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getInvoiceById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Workspace node offline." });
      return;
    }
    const { Invoice } = req.tenantModels;
    const businessAdminId = getBusinessAdminId(req);
    const { id } = req.params;
    const invoice = await Invoice.findOne({ _id: id, businessAdminId });

    if (!invoice) {
      res.status(404).json({ success: false, message: "Invoice not found." });
      return;
    }
    res.status(200).json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateInvoiceStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Workspace node offline." });
      return;
    }
    const { Invoice } = req.tenantModels;
    const businessAdminId = getBusinessAdminId(req);
    const { id } = req.params;
    const { paymentStatus } = req.body;

    const invoice = await Invoice.findOneAndUpdate(
      { _id: id, businessAdminId },
      { paymentStatus },
      { returnDocument: 'after' }
    );

    if (!invoice) {
      res.status(404).json({ success: false, message: "Invoice not found" });
      return;
    }
    res.status(200).json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
