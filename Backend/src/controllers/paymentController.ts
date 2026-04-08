import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { getBusinessAdminId } from "../utils/businessUtils.js";
import mongoose from "mongoose";
import { createNotification } from "./notificationController.js";

export const createPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.tenantModels) {
    res.status(500).json({ success: false, message: "Workspace node offline." });
    return;
  }
  const { Payment, Invoice } = req.tenantModels;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const businessAdminId = getBusinessAdminId(req);
    const { businessId, userId } = req.user!;
    const { invoiceId, amount, method, transactionId } = req.body;

    if (!businessId) throw new Error("Business context missing.");

    const invoice = await Invoice.findOne({ _id: invoiceId, businessAdminId }).session(session);
    if (!invoice) throw new Error("Invoice not found.");

    const paymentDocs = await Payment.create([{
      invoiceId,
      businessId:      businessId as any,
      businessAdminId: businessAdminId as any,
      recordedBy:      userId as any,
      amount:          Number(amount),
      method:          String(method),
      transactionId:   transactionId || undefined,
      status:          'completed',
      paidAt:          new Date()
    }] as any, { session });

    const allPayments = await Payment.find({ invoiceId, status: 'completed' }).session(session);
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

    let newStatus: 'paid' | 'partial' | 'pending' = 'partial';
    if (totalPaid >= invoice.grandTotal) {
      newStatus = 'paid';
    } else if (totalPaid <= 0) {
      newStatus = 'pending';
    }

    invoice.paymentStatus = newStatus;
    await invoice.save({ session });

    await session.commitTransaction();
    session.endSession();

    await createNotification(
      req.user?.businessId, 
      `Revenue Node Restored: Manual collection of ₹${amount} recorded for Invoice ID: ${invoice._id}.`, 
      "success", 
      "businessAdmin",
      undefined,
      "payment"
    );
    res.status(201).json({ success: true, data: paymentDocs[0] });

  } catch (error: any) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Workspace node offline." });
      return;
    }
    const { Payment } = req.tenantModels;
    const businessAdminId = getBusinessAdminId(req);
    const payments = await Payment.find({ businessAdminId })
      .populate('invoiceId', 'invoiceNumber grandTotal')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: payments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPaymentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantModels) {
      res.status(500).json({ success: false, message: "Workspace node offline." });
      return;
    }
    const { Payment } = req.tenantModels;
    const businessAdminId = getBusinessAdminId(req);
    const { id } = req.params;
    const payment = await Payment.findOne({ _id: id, businessAdminId })
      .populate('invoiceId', 'invoiceNumber grandTotal');

    if (!payment) {
      res.status(404).json({ success: false, message: "Payment not found" });
      return;
    }
    res.status(200).json({ success: true, data: payment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
