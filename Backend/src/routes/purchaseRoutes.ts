import express from "express";
import { createPurchase, getPurchases, getPurchaseStats, getPurchaseById, getUniqueVendors } from "../controllers/purchaseController.js";
import { protect, role, verifySubscription, tenantHandler } from "../middleware/auth.js";

const router = express.Router();

router.use(protect, verifySubscription, tenantHandler);

router.get("/stats", getPurchaseStats);
router.get("/vendors", getUniqueVendors);
router.get("/:id", getPurchaseById);
router.get("/", getPurchases);
router.post("/", role("businessAdmin", "manager"), createPurchase);

export default router;
