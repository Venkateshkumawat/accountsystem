import axios from "axios";

// Create instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
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
    const { response } = error;
    
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
