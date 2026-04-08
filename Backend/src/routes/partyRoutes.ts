import express from "express";
import { protect, tenantHandler, verifySubscription } from "../middleware/auth.js";
import {
  getParties,
  createParty,
  updateParty,
  deleteParty
} from "../controllers/partyController.js";

const router = express.Router();

/**
 * Nexus Registry Routes: Party Node Management
 * Each endpoint requires dynamic tenant resolution and active subscription verification.
 * 🛰️ Channel: /api/parties
 */
router.use(protect);
router.use(verifySubscription);
router.use(tenantHandler);

router.route("/")
  .get(getParties)
  .post(createParty);

router.route("/:id")
  .put(updateParty)
  .delete(deleteParty);

export default router;
