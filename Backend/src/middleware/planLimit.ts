import { Response, NextFunction } from "express";
import Business from "../models/Business.js";
import Plan from "../models/Plan.js";
import Product from "../models/Product.js";
import Staff from "../models/Staff.js";
import Invoice from "../models/Invoice.js";
import { AuthRequest } from "./auth.js";
import { getBusinessAdminId } from "../utils/businessUtils.js";

type ResourceType = 'products' | 'staff' | 'invoices';

/**
 * NexusBill Middleware: checkPlanLimit
 * Checks before creating a resource if the business has reached its plan limit.
 * 
 * Logic:
 * 1. Get businessId from req.user
 * 2. Find the Business record -> get plan name
 * 3. Find the Plan record -> get limit for the resource type
 * 4. Count existing active records in the collection filtered by businessAdminId
 * 5. If count >= limit (and limit !== -1): return 403 "Plan limit reached. Upgrade your plan."
 * 6. Otherwise call next()
 */
export const checkPlanLimit = (resource: ResourceType) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const businessId = req.user?.businessId;
      if (!businessId) {
        res.status(401).json({ message: "Unauthorized: No Business ID found" });
        return;
      }

      const businessAdminId = getBusinessAdminId(req);

      // 1. Get Business details to find their current plan name
      const business = await Business.findById(businessId);
      if (!business) {
        res.status(404).json({ message: "Business not found" });
        return;
      }

      // 2. Get the Plan limits for that plan name
      const plan = await Plan.findOne({ name: business.plan });
      if (!plan) {
        res.status(404).json({ message: "Subscription plan rules not found" });
        return;
      }

      // 3. Count current records based on resource type
      let currentCount = 0;
      let limit = 0;

      switch (resource) {
        case 'products':
          currentCount = await Product.countDocuments({ businessAdminId, isActive: true });
          limit = plan.maxProducts;
          break;

        case 'staff':
          currentCount = await Staff.countDocuments({ businessAdminId, isActive: true });
          limit = plan.maxUsers; // Using maxUsers field for staff limit
          break;

        case 'invoices':
          // Monthly volume check
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          currentCount = await Invoice.countDocuments({ 
            businessAdminId, 
            createdAt: { $gte: startOfMonth } 
          });
          limit = plan.maxInvoicesPerMonth;
          break;

        default:
          res.status(400).json({ message: "Invalid resource type for limit check" });
          return;
      }

      // 4. Verification Check (-1 usually means unlimited)
      if (limit !== -1 && currentCount >= limit) {
        res.status(403).json({
          success: false,
          message: "Plan limit reached. Upgrade your plan."
        });
        return;
      }

      // 5. Success
      next();
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
};
