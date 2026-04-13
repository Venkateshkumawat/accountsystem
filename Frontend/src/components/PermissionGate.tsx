import React from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldOff, Lock, AlertOctagon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PermissionGateProps {
  /**
   * The module permission key required (e.g. 'POS', 'INVENTORY', 'REPORTS').
   * If the user has this key in their permissions array — or is a businessAdmin —
   * the children are rendered. Otherwise the fallback / redirect is shown.
   */
  permission: string;
  /**
   * What to render when access is denied.
   * - 'block'    (default) shows an inline "Access Restricted" card
   * - 'redirect' redirects to /dashboard
   * - 'hide'     renders nothing (silent)
   */
  fallback?: 'block' | 'redirect' | 'hide';
  children: React.ReactNode;
}

// ─── Main Component ────────────────────────────────────────────────────────────

/**
 * PermissionGate — Wraps UI sections that require a specific module permission.
 *
 * Usage:
 *   <PermissionGate permission="POS">
 *     <POSContent />
 *   </PermissionGate>
 *
 *   <PermissionGate permission="REPORTS" fallback="hide">
 *     <ReportDownloadButton />
 *   </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  fallback = 'block',
  children,
}) => {
  const { hasPermission, user } = useAuth();

  // No session — bounce to login
  if (!user) return <Navigate to="/login" replace />;

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  // Denied
  if (fallback === 'hide')     return null;
  if (fallback === 'redirect') return <Navigate to="/dashboard" replace />;
  return <AccessDeniedCard permission={permission} userRole={user.role} />;
};

// ─── Route-level guard (full-page) ─────────────────────────────────────────────

interface PermissionRouteProps {
  permission: string;
  children: React.ReactNode;
}

/**
 * PermissionRoute — Full-page gate for route definitions in App.tsx.
 * Shows styled full-page denial screen then redirects to /dashboard.
 */
export const PermissionRoute: React.FC<PermissionRouteProps> = ({
  permission,
  children,
}) => {
  const { hasPermission, user, isPlanExpired } = useAuth();
  const [redirect, setRedirect] = React.useState(false);

  if (!user) return <Navigate to="/login" replace />;

  if (isPlanExpired) {
    return <PlanExpiredScreen />;
  }

  if (hasPermission(permission)) return <>{children}</>;
  if (redirect) return <Navigate to="/dashboard" replace />;

  return <FullPageDenied permission={permission} role={user.role} onExpire={() => setRedirect(true)} />;
};

// ─── Inline Denial Card ────────────────────────────────────────────────────────

function AccessDeniedCard({ permission, userRole }: { permission: string; userRole: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
        <ShieldOff size={24} className="text-rose-400" />
      </div>
      <div>
        <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mb-1">
          Access Restricted
        </p>
        <h3 className="text-lg font-black text-slate-800">
          {permission.replace('_', ' ')} Module Locked
        </h3>
        <p className="text-sm text-slate-400 font-medium mt-1 max-w-xs mx-auto">
          Your <span className="font-black text-indigo-600 capitalize">{userRole}</span> account
          does not have permission to access this module. Contact your Business Admin to request access.
        </p>
      </div>
    </div>
  );
}

// ─── Full-page Denial Screen ───────────────────────────────────────────────────

function FullPageDenied({
  permission,
  role,
  onExpire,
}: {
  permission: string;
  role: string;
  onExpire: () => void;
}) {
  const [count, setCount] = React.useState(3);

  React.useEffect(() => {
    const tick = setInterval(() => {
      setCount(c => {
        if (c <= 1) { clearInterval(tick); onExpire(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [onExpire]);

  return (
    <div className="min-h-[65vh] flex flex-col items-center justify-center gap-6 select-none text-center px-4">
      {/* Icon cluster */}
      <div className="relative">
        <div className="w-24 h-24 rounded-[2rem] bg-rose-50 border-2 border-rose-100 flex items-center justify-center">
          <ShieldOff size={40} className="text-rose-400" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg">
          <Lock size={16} className="text-white" />
        </div>
      </div>

      {/* Text */}
      <div className="space-y-2 max-w-sm">
        <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.25em]">
          Module Access Denied
        </p>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          {permission.replace('_', ' ')} Not Permitted
        </h2>
        <p className="text-slate-400 text-sm font-medium leading-relaxed">
          Your <span className="font-black text-indigo-600 capitalize">{role}</span> account
          has not been granted permission for the{' '}
          <span className="font-black text-slate-700">{permission.replace('_', ' ')}</span> module.
          Please contact your Business Admin.
        </p>
      </div>

      {/* Countdown */}
      <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
          <span className="text-sm font-black text-indigo-600">{count}</span>
        </div>
        <p className="text-xs font-semibold text-slate-500">
          Redirecting to dashboard…
        </p>
      </div>
    </div>
  );
}

// ─── Plan Expired Screen ───────────────────────────────────────────────────────

function PlanExpiredScreen() {
  const navigate = React.useCallback(() => {
    window.location.href = '/settings';
  }, []);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-8 text-center px-6 selection:bg-rose-100">
      <div className="relative group">
        <div className="absolute inset-0 bg-rose-500 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
        <div className="w-28 h-28 rounded-[2.5rem] bg-rose-600 shadow-2xl shadow-rose-200 flex items-center justify-center relative z-10 animate-pulse">
          <AlertOctagon size={48} className="text-white" />
        </div>
      </div>

      <div className="space-y-3 max-w-md">
        <p className="text-[11px] font-black text-rose-600 uppercase tracking-[0.3em]">
          Business Operations Suspended
        </p>
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
          Subscription Expired
        </h2>
        <p className="text-slate-500 font-medium leading-relaxed">
          Your business account has passed its subscription end date. All operational modules are currently locked. 
          Please renew your plan to resume access to invoices, inventory, and accounting.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <button 
          onClick={navigate}
          className="flex-1 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-rose-600 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-200"
        >
          Renew Subscription
        </button>
      </div>

      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest opacity-60">
        Contact support if you believe this is an error
      </p>
    </div>
  );
}

export default PermissionGate;
