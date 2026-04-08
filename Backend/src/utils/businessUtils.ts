import { AuthRequest } from "../middleware/auth.js";

/**
 * Check if the current user is a SuperAdmin (Nexus Master)
 */
export const isNexusMaster = (req: AuthRequest): boolean => {
  return req.user?.role === 'superadmin';
};

/**
 * NexusBill Helper: getBusinessAdminId
 * Extracted from req.user based on roles
 * @param req 
 */
export const getBusinessAdminId = (req: AuthRequest): string => {
  if (!req.user) {
    throw new Error("P0_AUTH_REQD: Authentication required to get business context");
  }

  const { role, userId, businessAdminId } = req.user;

  // superadmin: return dummy ID to prevent business-scoped queries from matching
  if (role === 'superadmin') {
     return '000000000000000000000000'; // Standard valid ObjectId format dummy
  }

  // businessAdmin: they ARE the admin — their userId is the businessAdminId
  if (role === 'businessAdmin') {
    return userId;
  }

  // Staff roles (manager, accountant, cashier): use the businessAdminId from token
  if (businessAdminId) {
    return businessAdminId;
  }

  // Final fallback
  if (userId) {
    return userId;
  }

  throw new Error("P0_CONTEXT_LOST: Unable to determine businessAdminId from user context. Try re-authentication.");
};

/**
 * Role Gate: verifyManagerOrAdmin
 * Throws an error if the user is not a businessAdmin or a manager.
 * Used for pricing, inventory, and offer management.
 */
export const verifyManagerOrAdmin = (req: AuthRequest): void => {
  if (!req.user) throw new Error("Authentication required");
  const { role } = req.user;
  if (role !== 'businessAdmin' && role !== 'manager') {
    throw new Error("P0_PERMISSION_DENIED: Only Business Admins or Managers can perform this action");
  }
};
