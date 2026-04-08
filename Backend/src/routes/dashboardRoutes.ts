import express from "express";
import { getDashboardStats } from "../controllers/dashboardController.js";
import { protect, verifySubscription, tenantHandler } from "../middleware/auth.js";


const router = express.Router();

router.get("/", protect, verifySubscription, tenantHandler, getDashboardStats);


export default router;
