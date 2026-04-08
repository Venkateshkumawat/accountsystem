import express from "express";
import { protect, verifySubscription, tenantHandler } from "../middleware/auth.js";
import {
  getActivityLog,
  getSalesReport,
  getInventoryReport,
  getTransactionReport,
  getGSTReport,
  getPurchaseReport
} from "../controllers/reportController.js";

const router = express.Router();

/**
 * All reports are protected: requires login
 * RBAC: restricted by businessAdminId (multi-tenant)
 */
router.use(protect, verifySubscription, tenantHandler);

router.get("/activity", getActivityLog);
router.get("/sales", getSalesReport);
router.get("/inventory", getInventoryReport);
router.get("/transactions", getTransactionReport);
router.get("/gst", getGSTReport);
router.get("/purchase", getPurchaseReport);

export default router;
