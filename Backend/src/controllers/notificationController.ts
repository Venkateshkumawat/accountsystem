import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { getTenantConnection } from "../config/tenantConnection.js";
import { getTenantModels } from "../config/tenantModels.js";
import GlobalNotification from "../models/Notification.js";
import { getIO } from "../socket.js";
import mongoose from "mongoose";

/**
 * Get all notifications for the logged-in business or superadmin
 */
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    const userRole = req.user?.role;
    const isSuperAdmin = userRole === "superadmin";

    // ── Nexus Protocol: Resolve registry node ────────────────────────────────
    let Notification;
    if (isSuperAdmin) {
      Notification = GlobalNotification;
    } else {
      if (!req.tenantModels) {
        res.status(500).json({ success: false, message: "Workspace telemetry node offline." });
        return;
      }
      Notification = req.tenantModels.Notification;
    }

    let query: any = {};
    if (isSuperAdmin) {
      query = { 
        businessId: null, 
        role: 'superadmin' 
      };
    } else {
      if (!businessId) {
        res.status(401).json({ success: false, message: "Workspace identity void. Audit blocked." });
        return;
      }
      query = { 
        businessId, 
        role: { $ne: 'superadmin' } 
      };
      if (userRole !== 'businessAdmin') {
         query.role = userRole;
      }
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ ...query, isRead: false });

    res.status(200).json({
      success: true,
      unreadCount,
      total,
      page,
      pages: Math.ceil(total / limit),
      notifications,
    });
  } catch (error: any) {
    console.error("🌊 Audit Retrieval Failure:", error);
    res.status(500).json({ success: false, message: "Internal server failure during audit retrieval.", error: error.message });
  }
};

/**
 * Mark a specific notification as read
 */
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const businessId = req.user?.businessId;
    const userRole = req.user?.role;
    const isSuperAdmin = userRole === "superadmin";
    
    let Notification;
    if (isSuperAdmin) {
      Notification = GlobalNotification;
    } else {
      if (!req.tenantModels) {
        res.status(500).json({ success: false, message: "Workspace node offline." });
        return;
      }
      Notification = req.tenantModels.Notification;
    }

    const query = isSuperAdmin ? { _id: id, businessId: null } : { _id: id, businessId };

    const notification = await Notification.findOneAndUpdate(
      query,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
       res.status(404).json({ success: false, message: "Notification record not found." });
       return;
    }

    res.status(200).json({ success: true, message: "Notification cleared successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error during update.", error: error.message });
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    const userRole = req.user?.role;
    const isSuperAdmin = userRole === "superadmin";

    let Notification;
    if (isSuperAdmin) {
      Notification = GlobalNotification;
    } else {
      if (!req.tenantModels) {
        res.status(500).json({ success: false, message: "Workspace node offline." });
        return;
      }
      Notification = req.tenantModels.Notification;
    }

    let query: any = isSuperAdmin ? { businessId: null, isRead: false } : { businessId, isRead: false };
    if (!isSuperAdmin && userRole !== 'businessAdmin') {
      query.role = userRole;
    }

    await Notification.updateMany(query, { isRead: true });

    res.status(200).json({ success: true, message: "All notifications cleared successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server error during batch update.", error: error.message });
  }
};

/**
 * Permanently delete a specific notification (Manual Deletion Protocol)
 */
export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const businessId = req.user?.businessId;
    const userRole = req.user?.role;
    const isSuperAdmin = userRole === "superadmin";

    let Notification;
    if (isSuperAdmin) {
      Notification = GlobalNotification;
    } else {
      if (!req.tenantModels) {
        res.status(500).json({ success: false, message: "Workspace node offline." });
        return;
      }
      Notification = req.tenantModels.Notification;
    }

    const query = isSuperAdmin ? { _id: id, businessId: null } : { _id: id, businessId };

    const notification = await Notification.findOneAndDelete(query);

    if (!notification) {
       res.status(404).json({ success: false, message: "Registry node not found or access restricted." });
       return;
    }

    res.status(200).json({ success: true, message: "Audit node purged permanently." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Internal server fault during manual purge.", error: error.message });
  }
};

/**
 * Mass Registry Purge Protocol
 */
export const deleteAllNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    const userRole = req.user?.role;
    const isSuperAdmin = userRole === "superadmin";

    let Notification;
    if (isSuperAdmin) {
      Notification = GlobalNotification;
    } else {
      if (!req.tenantModels) {
        res.status(500).json({ success: false, message: "Workspace node offline." });
        return;
      }
      Notification = req.tenantModels.Notification;
    }

    let query: any = isSuperAdmin ? { businessId: null, role: 'superadmin' } : { businessId };
    if (!isSuperAdmin && userRole !== 'businessAdmin') {
      query.role = userRole;
    }
    await Notification.deleteMany(query);

    res.status(200).json({ success: true, message: "Registry purged permanently." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Mass purge node failure.", error: error.message });
  }
};

/**
 * Utility function to create a notification (Server-side use)
 */
export const createNotification = async (
  businessId: string | any | null,
  message: string,
  type: "success" | "error" | "info" | "warning" = "info",
  role: 'superadmin' | 'businessAdmin' | 'manager' | 'cashier' | 'accountant' = 'businessAdmin',
  link?: string,
  category: "product" | "invoice" | "payment" | "alert" | "staff" | "users" = "alert"
) => {
  try {
    const normalizedRole = role || 'businessAdmin';
    let notification;

    if (normalizedRole === 'superadmin') {
      notification = await GlobalNotification.create({
        businessId: null,
        role: 'superadmin',
        message,
        type,
        category,
        link,
      });
    } else {
      const bizIdStr = businessId?.toString();
      if (!bizIdStr) return null;

      const { Notification: TenantNotification } = getTenantModels(mongoose.connection);

      notification = await TenantNotification.create({
        businessId: businessId,
        role: normalizedRole,
        message,
        type,
        category,
        link,
      });
    }

    const io = getIO();
    if (io && notification) {
      const room = role === 'superadmin' ? 'superadmin' : (businessId ? businessId.toString() : null);
      if (room) {
        io.to(room).emit('notification-received', notification);
      }
    }

    return notification;
  } catch (error) {
    console.error("Failed to propagate system notification:", error);
    return null;
  }
};

/**
 * @desc Get ONLY the unread count for the current node context
 */
export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.businessId;
    const userRole = req.user?.role;
    const isSuperAdmin = userRole === "superadmin";

    let Notification;
    if (isSuperAdmin) {
      Notification = GlobalNotification;
    } else {
      if (!req.tenantModels) {
        res.status(500).json({ success: false, message: "Workspace node offline." });
        return;
      }
      Notification = req.tenantModels.Notification;
    }

    let query: any = isSuperAdmin ? { businessId: null, role: 'superadmin' } : { businessId, role: { $ne: 'superadmin' } };
    
    if (!isSuperAdmin && userRole !== 'businessAdmin') {
       query.role = userRole;
    }

    const unreadCount = await Notification.countDocuments({ ...query, isRead: false });

    res.status(200).json({ success: true, count: unreadCount });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Telemetry count node failure." });
  }
};
/**
 * @desc    Toggle bookmark status of a notification
 */
export const toggleBookmark = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const businessId = req.user?.businessId;
    const userRole = req.user?.role;
    const isSuperAdmin = userRole === "superadmin";

    let Notification;
    if (isSuperAdmin) {
      Notification = GlobalNotification;
    } else {
      if (!req.tenantModels) {
        res.status(500).json({ success: false, message: "Workspace node offline." });
        return;
      }
      Notification = req.tenantModels.Notification;
    }

    const query = isSuperAdmin ? { _id: id, businessId: null } : { _id: id, businessId };
    const notification = await Notification.findOne(query);

    if (!notification) {
      res.status(404).json({ success: false, message: "Registry node not found." });
      return;
    }

    notification.isBookmarked = !notification.isBookmarked;
    await notification.save();

    res.status(200).json({ 
      success: true, 
      message: notification.isBookmarked ? "Message saved successfully." : "Message removed from saved list.",
      isBookmarked: notification.isBookmarked 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Batch delete notifications
 */
export const batchDelete = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    const businessId = req.user?.businessId;
    const userRole = req.user?.role;
    const isSuperAdmin = userRole === "superadmin";

    if (!ids || !Array.isArray(ids)) {
      res.status(400).json({ success: false, message: "Payload error: Array of IDs required." });
      return;
    }

    let Notification;
    if (isSuperAdmin) {
      Notification = GlobalNotification;
    } else {
      if (!req.tenantModels) {
        res.status(500).json({ success: false, message: "Workspace node offline." });
        return;
      }
      Notification = req.tenantModels.Notification;
    }

    const query = isSuperAdmin 
      ? { _id: { $in: ids }, businessId: null, isBookmarked: false } 
      : { _id: { $in: ids }, businessId, isBookmarked: false };

    const result = await Notification.deleteMany(query);

    res.status(200).json({ 
      success: true, 
      message: `${result.deletedCount} messages purged. Saved messages were preserved.`,
      deletedCount: result.deletedCount 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Batch mark notifications as read
 */
export const batchRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    const businessId = req.user?.businessId;
    const userRole = req.user?.role;
    const isSuperAdmin = userRole === "superadmin";

    if (!ids || !Array.isArray(ids)) {
      res.status(400).json({ success: false, message: "Payload error: Array of IDs required." });
      return;
    }

    let Notification;
    if (isSuperAdmin) {
      Notification = GlobalNotification;
    } else {
      if (!req.tenantModels) {
        res.status(500).json({ success: false, message: "Workspace node offline." });
        return;
      }
      Notification = req.tenantModels.Notification;
    }

    const query = isSuperAdmin 
      ? { _id: { $in: ids }, businessId: null } 
      : { _id: { $in: ids }, businessId };

    const result = await Notification.updateMany(query, { isRead: true });

    res.status(200).json({ 
      success: true, 
      message: `${result.modifiedCount} messages marked as read.`,
      modifiedCount: result.modifiedCount 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
