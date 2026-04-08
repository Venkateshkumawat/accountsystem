import express from "express";
import { 
  createInvoice, 
  getInvoices, 
  getInvoiceById, 
  updateInvoiceStatus 
} from "../controllers/invoiceController.js";
import { protect, verifySubscription, tenantHandler } from "../middleware/auth.js";

import { checkPlanLimit } from "../middleware/planLimit.js";

const router = express.Router();

router.post("/", protect, verifySubscription, tenantHandler, checkPlanLimit("invoices"), createInvoice);
router.get("/", protect, verifySubscription, tenantHandler, getInvoices);
router.get("/:id", protect, verifySubscription, tenantHandler, getInvoiceById);
router.patch("/:id/status", protect, verifySubscription, tenantHandler, updateInvoiceStatus);


export default router;
