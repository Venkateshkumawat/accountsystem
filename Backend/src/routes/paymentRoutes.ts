import express from "express";
import { 
  createPayment, 
  getPayments, 
  getPaymentById 
} from "../controllers/paymentController.js";
import { 
  createRazorpayOrder, 
  verifyRazorpayPayment
} from "../controllers/razorpayController.js";
import { protect, verifySubscription, tenantHandler } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, verifySubscription, tenantHandler, createPayment);
router.get("/", protect, verifySubscription, tenantHandler, getPayments);
router.get("/:id", protect, verifySubscription, tenantHandler, getPaymentById);

// Razorpay specific digital pipelines
router.post("/razorpay/order", protect, verifySubscription, tenantHandler, createRazorpayOrder);
router.post("/razorpay/verify", protect, verifySubscription, tenantHandler, verifyRazorpayPayment);

export default router;
