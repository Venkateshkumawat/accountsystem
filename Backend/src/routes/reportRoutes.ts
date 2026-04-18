import express from "express";
import { protect, verifySubscription, tenantHandler } from "../middleware/auth.js";
import {
  getActivityLog,
  deleteActivity,
  getSalesReport,
  getInventoryReport,
  getTransactionReport,
  getGSTReport,
  getPurchaseReport,
  getProfitLoss
} from "../controllers/reportController.js";

const router = express.Router();

/**
 * All reports are protected: requires login
 * RBAC: restricted by businessAdminId (multi-tenant)
 */
router.use(protect, verifySubscription, tenantHandler);

router.get("/activity", getActivityLog);
router.delete("/activity/:id", deleteActivity);
router.get("/sales", getSalesReport);
router.get("/inventory", getInventoryReport);
router.get("/transactions", getTransactionReport);
router.get("/gst", getGSTReport);
router.get("/purchase", getPurchaseReport);
router.get("/pl", getProfitLoss);

export default router;
