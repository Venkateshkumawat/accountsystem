import { Request, Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { AuthRequest } from "../middleware/auth.js";
import { verifyRazorpaySignature } from "../utils/paymentUtils.js";
import dotenv from "dotenv";
dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

/**
 * @desc    Create a new Razorpay order
 * @route   POST /api/payments/razorpay/order
 */
export const createRazorpayOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, currency = "INR", receipt } = req.body;

    if (!amount) {
      res.status(400).json({ success: false, message: "Amount is required" });
      return;
    }

    const options = {
      amount: Math.round(Number(amount) * 100), // Amount in paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: {
        userId: req.user?.userId || 'anonymous',
        businessId: req.user?.businessId || 'anonymous',
        terminal: 'Nexus POS Node'
      }
    };

    console.log("⏳ Initializing Razorpay Order with Options:", options);
    const order = await razorpay.orders.create(options);
    console.log("✅ Razorpay Order Created Successfully:", order.id);

    res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error: any) {
    console.error("❌ Razorpay Order Deep Failure:", {
      message: error.message,
      description: error.description,
      metadata: error.metadata,
      statusCode: error.statusCode,
      stack: error.stack
    });
    
    // Pass along the Razorpay failure context
    const status = error.statusCode || 500;
    const message = error.description || error.message || "Integrated Gateway Protocol Failure";
    
    res.status(status).json({ success: false, message });
  }
};

/**
 * @desc    Verify Razorpay payment signature
 * @route   POST /api/payments/razorpay/verify
 */
export const verifyRazorpayPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || '';

    const isAuthentic = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      secret
    );

    if (isAuthentic) {
      // Here you would typically update your database (e.g., mark subscription as paid)
      // For now, we return success as requested
      res.status(200).json({ 
        success: true, 
        message: "Payment verified successfully",
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature
      });
    } else {
      res.status(400).json({ success: false, message: "Invalid payment signature" });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

