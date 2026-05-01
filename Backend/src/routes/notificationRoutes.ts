import { Router } from "express";
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  deleteAllNotifications,
  toggleBookmark,
  batchDelete,
  batchRead
} from "../controllers/notificationController.js";
import { protect, tenantHandler } from "../middleware/auth.js";

const router = Router();

// All routes require authentication and tenant resolution
router.use(protect);
router.use(tenantHandler);

// ── Static Master Routes (Must be first to avoid :id collisions) ────────────

// @route   GET /api/notifications
router.get("/", getNotifications);

// @route   GET /api/notifications/unread-count
router.get("/unread-count", getUnreadCount);

// @route   PATCH /api/notifications/read-all
router.patch("/read-all", markAllAsRead);

// @route   DELETE /api/notifications/delete-all
router.delete("/delete-all", deleteAllNotifications);

// @route   POST /api/notifications/batch-delete
router.post("/batch-delete", batchDelete);

// @route   POST /api/notifications/batch-read
router.post("/batch-read", batchRead);


// ── Dynamic ID-based Routes ────────────────────────────────────────────────

// @route   PATCH /api/notifications/:id/read
router.patch("/:id/read", markAsRead);

// @route   PUT /api/notifications/:id 
// (Legacy support/Alternative)
router.put("/:id", markAsRead);

// @route   DELETE /api/notifications/:id
router.delete("/:id", deleteNotification);

// @route   PATCH /api/notifications/:id/bookmark
router.patch("/:id/bookmark", toggleBookmark);

export default router;
