import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  loginSuperAdmin,
  verifySuperAdminToken,
  getSuperAdminStats,
  getAllBusinesses,
  getGlobalActivityLogs,
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
  createBusinessAdmin,
  updateBusinessStatus,
  updateBusinessPlan,
  updateBusinessFeatures,
  updateBusinessDetails,
  resetBusinessPassword,
  deleteBusinessPermanently
} from '../controllers/superAdmin.controller.js';
import { 
  createRazorpayOrder, 
  verifyRazorpayPayment 
} from '../controllers/razorpayController.js';
import { protect, role as authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Rate limiting for SuperAdmin login
const loginLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'CRITICAL SECURITY LOCKOUT: Too many login attempts. Interface locked for 30 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// @route   POST /api/superadmin/auth/login
router.post('/login', loginSuperAdmin);

// All routes below require superadmin protection
router.use(protect, authorizeRoles('superadmin'));

// Master Authentication Protocol
router.post('/verify', verifySuperAdminToken);
router.get('/stats', getSuperAdminStats);
router.get('/logs', getGlobalActivityLogs);

// Business Admin Governance Node
router.get('/businesses', getAllBusinesses);
router.post('/business-admins/create', createBusinessAdmin);
router.patch('/business-admins/:businessId/status', updateBusinessStatus);
router.patch('/business-admins/:businessId/plan', updateBusinessPlan);
router.patch('/business-admins/:businessId/features', updateBusinessFeatures);
router.put('/business-admins/:businessId', updateBusinessDetails);
router.patch('/business-admins/:businessId/reset-password', resetBusinessPassword);
router.delete('/business-admins/:businessId', deleteBusinessPermanently);

// Monetization Registry (Plan Management)
router.get('/plans', getAllPlans);
router.post('/plans', createPlan);
router.patch('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);

// Fiscal Gateways (Razorpay Operations)
router.post('/razorpay/order', createRazorpayOrder);
router.post('/razorpay/verify', verifyRazorpayPayment);

export default router;
