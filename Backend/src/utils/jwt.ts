import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "nexusbill_super_secret_key";

interface JWTPayload {
  userId: string;
  name: string;
  role: string;
  businessId: string | null;       // MongoDB ObjectId of the Business document
  shortBusinessId: string | null;  // 5-char human-readable reference e.g. K9P3Z
  businessAdminId: string | null;
  /**
   * Module permissions (only populated for staff roles; empty for businessAdmin/superadmin).
   * Values mirror the ALL_PERMISSIONS constant on the frontend:
   * 'POS' | 'INVENTORY' | 'PURCHASES' | 'REPORTS' | 'ACCOUNTING' | 'GST_PORTAL' | 'CUSTOMERS' | 'SETTINGS'
   */
  permissions: string[];
  planEndDate?: Date | string | null;
}

/**
 * Generate a JWT token for a user
 * Expires in 7 days as requested
 */
export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  });
};

/**
 * Verify a JWT token
 * Returns decoded payload or null if invalid
 */
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
};
