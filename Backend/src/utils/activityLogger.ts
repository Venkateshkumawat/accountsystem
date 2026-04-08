import { AuthRequest } from "../middleware/auth.js";

type Action = "CREATE" | "UPDATE" | "DELETE" | "TRANSACTION";
type Resource = "PRODUCT" | "STAFF" | "INVOICE" | "PAYMENT" | "BUSINESS" | "PARTY";

/**
 * Log a system activity in the tenant-specific database node
 */
export const logActivity = async (
  req: any,
  action: Action,
  resource: Resource,
  description: string,
  resourceId?: string,
  customAdminId?: string,
  metadata?: any
) => {
  try {
    const authReq = req as AuthRequest;
    
    // We strictly use the tenant-isolated models injected in the request context
    if (!authReq.tenantModels) {
       console.warn(`🛰️ Activity Log Abandoned: No active database node for [${action}:${resource}]`);
       return;
    }
    
    const { Activity } = authReq.tenantModels;

    const businessAdminId = customAdminId || req.user?.businessAdminId || req.user?.userId;

    // Only store userId if it's a valid 24-char hex ObjectId
    const rawUserId = req.user?.userId;
    const isValidObjectId = rawUserId && /^[a-f\d]{24}$/i.test(rawUserId);

    await Activity.create({
      businessAdminId: businessAdminId as any,
      userId: isValidObjectId ? rawUserId : undefined,
      userName: req.user?.name || "System Nexus",
      action,
      resource,
      resourceId,
      description,
      metadata
    });
  } catch (error) {
    console.error("🌊 Activity Telemetry Failed:", error);
  }
};
