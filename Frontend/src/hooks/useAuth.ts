import { useState, useEffect } from 'react';

export interface AuthUser {
  id: string;
  name: string;
  role: string;
  businessId: string | null;
  businessName?: string;
  permissions: string[];
  planEndDate: string | null;
}

const STAFF_ROLES = ['cashier', 'accountant', 'manager'];
const ADMIN_ROLES = ['businessAdmin', 'superadmin'];

export function useAuth() {
  const [userState, setUserState] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      if (!stored || stored === 'undefined') return null;
      const parsed = JSON.parse(stored);
      return {
        id:           parsed.id || parsed._id || '',
        name:         parsed.name || '',
        role:         parsed.role || '',
        businessId:   parsed.businessId || null,
        businessName: parsed.businessName || '',
        permissions:  Array.isArray(parsed.permissions) ? parsed.permissions : [],
        planEndDate:  parsed.planEndDate || null,
      };
    } catch {
      return null;
    }
  });

  // Listen for storage changes (cross-tab or local updates)
  useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem('user');
      if (!stored) {
        setUserState(null);
        return;
      }
      try {
        const parsed = JSON.parse(stored);
        setUserState({
          id:           parsed.id || parsed._id || '',
          name:         parsed.name || '',
          role:         parsed.role || '',
          businessId:   parsed.businessId || null,
          businessName: parsed.businessName || '',
          permissions:  Array.isArray(parsed.permissions) ? parsed.permissions : [],
          planEndDate:  parsed.planEndDate || null,
        });
      } catch {
        setUserState(null);
      }
    };

    window.addEventListener('storage', handleStorage);
    // Custom event for same-window updates if needed
    window.addEventListener('user-sync', handleStorage);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('user-sync', handleStorage);
    };
  }, []);

  const role          = userState?.role ?? '';
  const isBusinessAdmin = role === 'businessAdmin';
  const isSuperAdmin    = role === 'superadmin';
  const isStaff         = STAFF_ROLES.includes(role);

  const hasPermission = (moduleKey: string): boolean => {
    if (!userState) return false;
    if (ADMIN_ROLES.includes(userState.role)) return true;
    return userState.permissions.includes(moduleKey);
  };

  return {
    user: userState,
    role,
    isBusinessAdmin,
    isSuperAdmin,
    isStaff,
    permissions: userState?.permissions ?? [],
    planEndDate: userState?.planEndDate ?? null,
    isPlanExpired: userState?.planEndDate ? new Date(userState.planEndDate).getTime() < Date.now() : false,
    hasPermission,
    canAccessModule: hasPermission,
  };
}
