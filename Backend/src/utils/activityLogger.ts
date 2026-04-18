import { AuthRequest } from "../middleware/auth.js";

type Action = "CREATE" | "UPDATE" | "DELETE" | "TRANSACTION";
type Resource = "PRODUCT" | "STAFF" | "INVOICE" | "PAYMENT" | "BUSINESS" | "PARTY" | "PURCHASE";

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

    // 📡 Nexus Unified Dispatcher: Bridge to Real-time Notifications
    const { Notification } = authReq.tenantModels;
    const notifyType = (action === 'DELETE' || action === 'TRANSACTION') ? 'warning' : 'info';
    const category = resource.toLowerCase() as any;

    const notification = await Notification.create({
      businessAdminId: businessAdminId as any,
      message: `${action}: ${description}`,
      type: notifyType,
      category: ['product', 'invoice', 'payment', 'staff'].includes(category) ? category : 'alert',
      isRead: false
    });

    // ⚡ Real-time Socket Emission
    const io = req.app.get('socketio');
    if (io) {
      const room = authReq.user?.businessObjectId || authReq.user?.businessId;
      if (room) {
        io.to(room.toString()).emit('notification-received', notification);
      }
    }

  } catch (error) {
    console.error("🌊 Activity Telemetry Failed:", error);
  }
};
