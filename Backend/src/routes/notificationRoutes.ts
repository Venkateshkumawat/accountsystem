import { Router } from "express";
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  deleteAllNotifications
} from "../controllers/notificationController.js";
import { protect, tenantHandler } from "../middleware/auth.js";

const router = Router();

// All routes require authentication and tenant resolution
router.use(protect);
router.use(tenantHandler);

// @route   GET /api/notifications
router.get("/", getNotifications);

// @route   GET /api/notifications/unread-count
router.get("/unread-count", getUnreadCount);

// @route   PATCH /api/notifications/:id/read
// @desc    Mark a specific notification as read
router.patch("/:id/read", markAsRead);

// @route   PATCH /api/notifications/read-all
router.patch("/read-all", markAllAsRead);
router.put("/", markAllAsRead);

// @route   PUT /api/notifications/:id
router.put("/:id", markAsRead);

// @route   DELETE /api/notifications/:id
// @desc    Permanently delete a specific notification node
router.delete("/delete-all", deleteAllNotifications);
router.delete("/:id", deleteNotification);

export default router;
