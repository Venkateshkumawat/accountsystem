import express from "express";
import { globalSearch } from "../controllers/searchController.js";
import { protect, verifySubscription, tenantHandler } from "../middleware/auth.js";

const router = express.Router();

router.get("/global", protect, verifySubscription, tenantHandler, globalSearch);

export default router;
