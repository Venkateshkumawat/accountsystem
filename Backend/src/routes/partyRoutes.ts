import express from "express";
import { protect, tenantHandler, verifySubscription } from "../middleware/auth.js";
import {
  getParties,
  createParty,
  updateParty,
  deleteParty,
  recordPartyPayment,
  syncPartiesWithTransactions,
  purgeParties
} from "../controllers/partyController.js";

const router = express.Router();

/**
 * Nexus Registry Routes: Party Node Management
 * Each endpoint requires dynamic tenant resolution and active subscription verification.
 * 🛰️ Channel: /api/parties
 */
router.use(protect);
router.get("/", protect, verifySubscription, tenantHandler, getParties);
router.post("/", protect, verifySubscription, tenantHandler, createParty);
router.put("/:id", protect, verifySubscription, tenantHandler, updateParty);
router.delete("/:id", protect, verifySubscription, tenantHandler, deleteParty);
router.post("/:id/payment", protect, verifySubscription, tenantHandler, recordPartyPayment);
router.post("/sync-lifecycle", protect, verifySubscription, tenantHandler, syncPartiesWithTransactions);
router.delete("/purge-all", protect, verifySubscription, tenantHandler, purgeParties);

export default router;
