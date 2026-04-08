import { Router } from "express";
import {
  getAllBusinesses,
  getMyBusiness,
  updateBusiness,
  deleteBusiness,
  createBusiness,
  updateMyBusiness,
  getPlanStatus,
  renewPlan,
  superAdminExtendPlan,
  resetMyWorkspace
} from "../controllers/businessController.js";

import { verifyToken, authorizeRoles } from "../middleware/auth.js";

const router = Router();

// Protect all business routes
router.use(verifyToken);

// businessAdmin can see their own business details
router.get("/me", getMyBusiness);
// Only businessAdmin can update their own business settings — staff cannot manipulate this
router.put("/update-me", authorizeRoles("businessAdmin"), updateMyBusiness);

// Subscription management
router.get("/plan-status", authorizeRoles("businessAdmin"), getPlanStatus);
router.post("/renew-plan", authorizeRoles("businessAdmin"), renewPlan);
router.post("/reset-my-workspace", authorizeRoles("businessAdmin"), resetMyWorkspace);


// SuperAdmin can manage all businesses
router.get("/", authorizeRoles("superadmin"), getAllBusinesses);
router.post("/", authorizeRoles("superadmin"), createBusiness);
router.put("/:id", authorizeRoles("superadmin"), updateBusiness);
router.post("/:id/extend-plan", authorizeRoles("superadmin"), superAdminExtendPlan);
router.delete("/:id", authorizeRoles("superadmin"), deleteBusiness);


export default router;
