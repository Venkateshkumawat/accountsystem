/**
 * useAuth — Central auth hook for NexusBill SaaS
 *
 * Reads the logged-in user from localStorage and exposes:
 *   - `user`          Full user object (id, name, role, businessId, permissions)
 *   - `role`          Shorthand for user.role
 *   - `permissions`   Array of granted module keys e.g. ['POS','INVENTORY']
 *   - `isBusinessAdmin`   true if role === 'businessAdmin'
 *   - `isSuperAdmin`      true if role === 'superadmin'
 *   - `isStaff`           true for cashier / accountant / manager
 *   - `hasPermission(key)`  Returns true if the user may access a module.
 *                           businessAdmin/superadmin always return true.
 *                           Staff users must have the key in their permissions array.
 *   - `canAccessModule(key)` Alias for hasPermission
 */

import { useMemo } from 'react';

export interface AuthUser {
  id: string;
  name: string;
  role: string;
  businessId: string | null;
  permissions: string[];   // [] means no restrictions (admin) or truly no perms (staff with 0)
  planEndDate: string | null;
}

const STAFF_ROLES = ['cashier', 'accountant', 'manager'];
const ADMIN_ROLES = ['businessAdmin', 'superadmin'];

export function useAuth() {
  const user = useMemo<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      if (!stored || stored === 'undefined') return null;
      const parsed = JSON.parse(stored);
      return {
        id:           parsed.id || parsed._id || '',
        name:         parsed.name || '',
        role:         parsed.role || '',
        businessId:   parsed.businessId || null,
        permissions:  Array.isArray(parsed.permissions) ? parsed.permissions : [],
        planEndDate:  parsed.planEndDate || null,
      };
    } catch {
      return null;
    }
  }, []);

  const role          = user?.role ?? '';
  const isBusinessAdmin = role === 'businessAdmin';
  const isSuperAdmin    = role === 'superadmin';
  const isStaff         = STAFF_ROLES.includes(role);

  /**
   * Returns true if the current user may access a given module.
   * - businessAdmin & superadmin: always allowed (full access)
   * - staff: allowed only if the module key is in their permissions[]
   */
  const hasPermission = (moduleKey: string): boolean => {
    if (!user) return false;
    if (ADMIN_ROLES.includes(user.role)) return true;   // admins bypass all gates
    return user.permissions.includes(moduleKey);
  };

  return {
    user,
    role,
    isBusinessAdmin,
    isSuperAdmin,
    isStaff,
    permissions: user?.permissions ?? [],
    planEndDate: user?.planEndDate ?? null,
    isPlanExpired: user?.planEndDate ? new Date(user.planEndDate).getTime() < Date.now() : false,
    hasPermission,
    canAccessModule: hasPermission,   // alias
  };
}
