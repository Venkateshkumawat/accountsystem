import { Request, Response, NextFunction } from "express";
import { verifyToken as decodeJWT } from "../utils/jwt.js";
import Business from "../models/Business.js";
import { getTenantModels, TenantModels } from "../config/tenantModels.js";
import mongoose from "mongoose";


// Extend Express Request interface to include user and tenant context
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    name: string;
    role: string;
    businessId: string | null;       // MongoDB ObjectId of Business doc
    shortBusinessId: string | null;  // 5-char human-readable ref e.g. K9P3Z
    businessAdminId: string | null;
    permissions: string[];           // Module permissions for staff users
  };
  tenantModels?: TenantModels;
}

/**
 * Protect middleware: Ensures the user is logged in
 */
export const protect = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Access Denied: No Token Provided" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const decoded = decodeJWT(token);

  if (!decoded) {
    res.status(403).json({ message: "Invalid or Expired Token" });
    return;
  }

  req.user = decoded;
  next();
};

/**
 * Tenant Handler: Initializes shared collections within 'qna_db'.
 * Isolation is enforced via 'businessId' field filtering in controllers.
 * MUST be called AFTER 'protect'.
 */
export const tenantHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Shared Database Strategy: All tenants use the same collection set.
    // Models are fetched from the root connection, isolation is enforced via businessId field.
    req.tenantModels = getTenantModels(mongoose.connection);
    
    next();
  } catch (err: any) {
    console.error("🌊 Registry Protocol Failure:", err);
    res.status(500).json({ success: false, message: "Integrated Gateway Time-out: Registry Registry Unavailable", error: err.message });
  }
};

/**
 * Role middleware factory: Restricts access based on user role
 * @param allowedRoles List of roles that can access the route
 */
export const role = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: "Unauthorized: Access Restricted" });
      return;
    }
    next();
  };
};

/**
 * Legacy Aliases for existing code compatibility
 */
export const verifyToken = protect;
export const authorizeRoles = role;
/**
 * verifySubscription middleware: Ensures the business has an active plan
 * Blocks access for businessAdmin and staff if plan is expired or inactive
 */
export const verifySubscription = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // No bypass for superadmin here. They should not be in business-restricted routes.
    const businessId = req.user?.businessId;
    if (!businessId) {
      // If it's a staff user but no business ID attached yet
      res.status(401).json({ success: false, message: "Workspace ID missing." });
      return;
    }

    // 2. Fetch Business Node Status
    const business = await Business.findById(businessId);
    if (!business) {
      res.status(404).json({ success: false, message: "Enterprise node not found." });
      return;
    }

    // 3. Expiration Logic: Check planEndDate and isActive flag
    const today = new Date();
    const isExpired = business.planEndDate && new Date(business.planEndDate) < today;

    if (!business.isActive || isExpired) {
      res.status(403).json({
        success: false,
        isExpired: true,
        message: "Your Nexus Subscription has expired. Project access is decommissioned.",
        expiryDate: business.planEndDate,
        action: "Please renew your plan to reactivate the workspace node."
      });
      return;
    }

    // 4. Active Node: Proceed
    next();
  } catch (err: any) {
    res.status(500).json({ success: false, message: "Subscription Audit Failure", error: err.message });
  }
};
