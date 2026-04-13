import axios from "axios";

// Create instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://account-billing-system.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach JWT token to every industrial request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      console.error("🚨 Nexus Gateway Offline: Connection Refused. Ensure backend is running.");
    }
    const response = error.response;

    // Check for Stale/Expired Session (401 Unauthorized)
    if (response && response.status === 401) {
      const isLoginPage = window.location.pathname.includes('/login') || window.location.pathname.includes('/superadmin-login');
      if (!isLoginPage) {
         console.error("🔐 Nexus Identity Expired: Re-authentication Required.");
         localStorage.clear();
         window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Check for Decommissioned Business Nodes (404 - Stale Session)
    if (response && response.status === 404 && response.data?.message?.includes('Enterprise node not found')) {
      const isLoginPage = window.location.pathname.includes('/login') || window.location.pathname.includes('/superadmin-login');
      if (!isLoginPage) {
         console.error("🚨 Nexus Workspace Purged: Session Decommissioned.");
         localStorage.clear();
         window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Check for Subscription Expiration (Industrial Gatekeeper)
    if (response && response.status === 403 && response.data?.isExpired) {
      // Only redirect if we're not already on the settings page to avoid loops
      if (!window.location.pathname.includes('/settings')) {
        console.warn("🔐 Nexus Subscription Decommissioned: Access Denied.");
        window.location.href = '/settings';
      }
    }

    return Promise.reject(error);
  }
);


export default api;
