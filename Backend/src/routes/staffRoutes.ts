import express from "express";
import {
  createStaff,
  getStaff,
  getStaffById,
  updateStaff,
  updatePermissions,
  toggleStatus,
  deleteStaff,
  changePassword
} from "../controllers/staffController.js";
import { protect, role, verifySubscription, tenantHandler } from "../middleware/auth.js";
import { checkPlanLimit } from "../middleware/planLimit.js";

const router = express.Router();

// Password change (any authenticated user)
router.post("/change-password", protect, verifySubscription, tenantHandler, changePassword);

// Staff CRUD (businessAdmin only for mutations)
router.post("/", protect, verifySubscription, tenantHandler, role("businessAdmin"), checkPlanLimit("staff"), createStaff);
router.get("/", protect, verifySubscription, tenantHandler, getStaff);
router.get("/:id", protect, verifySubscription, tenantHandler, getStaffById);
router.put("/:id", protect, verifySubscription, tenantHandler, role("businessAdmin"), updateStaff);
router.put("/:id/permissions", protect, verifySubscription, tenantHandler, role("businessAdmin"), updatePermissions);
router.put("/:id/status", protect, verifySubscription, tenantHandler, role("businessAdmin"), toggleStatus);
router.delete("/:id", protect, verifySubscription, tenantHandler, role("businessAdmin"), deleteStaff);


export default router;
