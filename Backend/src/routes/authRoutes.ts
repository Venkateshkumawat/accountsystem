import express from "express";
import { register, login, getMe } from "../controllers/authController.js";
import { protect, role } from "../middleware/auth.js";

const router = express.Router();

/**
 * @desc    Public Business Self-signup
 * @route   POST /api/auth/register
 */
router.post("/register", register);

/**
 * @desc    Standard Login (SuperAdmin, businessAdmin, Staff)
 * @route   POST /api/auth/login
 */
router.post("/login", login);

/**
 * @desc    Get Logged-in User Profile
 * @route   GET /api/auth/me
 */
router.get("/me", protect, getMe);

/**
 * @desc    Example SuperAdmin-only creation route
 * @route   POST /api/auth/create-business-admin
 */
router.post("/create-business-admin", protect, role("superadmin"), register);

export default router;
