import React from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Roles that are ALLOWED to access this route */
  allowedRoles: string[];
  /** Where to redirect if access is denied (default: /dashboard) */
  redirectTo?: string;
}

/**
 * ProtectedRoute — Renders children only if the current user's role
 * is listed in `allowedRoles`. Otherwise shows a styled Access Denied
 * screen for 1.5 s then redirects to `redirectTo`.
 *
 * Role is read from localStorage['user'].role which is set at login.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo = '/dashboard',
}) => {
  const [redirect, setRedirect] = React.useState(false);

  const storedUser = localStorage.getItem('user');
  let userRole: string | null = null;

  try {
    userRole = (storedUser && storedUser !== 'undefined') ? JSON.parse(storedUser).role : null;
  } catch {
    userRole = null;
  }

  // If no token at all, force to login
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  // If user is allowed, render the page
  if (userRole && allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  // 🛡️ Nexus Guard: Prevent cross-node drift and loops
  if (userRole === 'superadmin' && !location.pathname.startsWith('/superadmin')) {
    return <Navigate to="/superadmin/dashboard" replace />;
  }
  if (userRole && userRole !== 'superadmin' && location.pathname.startsWith('/superadmin')) {
    return <Navigate to="/dashboard" replace />;
  }

  // Denied — show blocked screen then redirect
  if (redirect) return <Navigate to={redirectTo} replace />;

  return (
    <AccessDeniedScreen onRedirect={() => setRedirect(true)} />
  );
};

// ─── Access Denied UI ────────────────────────────────────────────────────────
function AccessDeniedScreen({
  onRedirect,
}: {
  onRedirect: () => void;
}) {
  React.useEffect(() => {
    const timer = setTimeout(onRedirect, 2500);
    return () => clearTimeout(timer);
  }, [onRedirect]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 select-none">
      {/* Icon */}
      <div className="relative">
        <div className="w-24 h-24 rounded-[2rem] bg-rose-50 border-2 border-rose-100 flex items-center justify-center">
          <Shield size={40} className="text-rose-400" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg">
          <Lock size={16} className="text-white" />
        </div>
      </div>

      {/* Copy */}
      <div className="text-center space-y-2 max-w-sm">
        <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.25em]">
          Access Restricted
        </p>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Insufficient Privileges
        </h2>
        <p className="text-slate-400 text-sm font-medium leading-relaxed">
          This panel is exclusively for{' '}
          <span className="font-black text-indigo-600">Business Administrators</span>.
          Your account role does not have permission to view or modify these settings.
        </p>
      </div>

      {/* Redirect hint */}
      <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <p className="text-xs font-semibold text-slate-500">
          Redirecting to dashboard…
        </p>
      </div>
    </div>
  );
}

export default ProtectedRoute;
