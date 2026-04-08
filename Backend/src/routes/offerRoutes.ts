import express from "express";
import { getOffers, createOffer, deleteOffer, updateOffer } from "../controllers/offerController.js";
import { protect, verifySubscription, tenantHandler } from "../middleware/auth.js";

const router = express.Router();

router.use(protect, verifySubscription, tenantHandler);

router.get("/", getOffers);
router.post("/", createOffer);
router.delete("/:id", deleteOffer);

export default router;
