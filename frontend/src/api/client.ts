import axios from 'axios';
import { useAuthStore } from '../store/authStore';

/**
 * API Base URL Resolution:
 * - In development (Vite dev server): empty string → Vite proxy forwards to localhost:3001
 * - In production (Vercel): empty string → same-origin, Vercel rewrites route to /api/index
 *
 * NEVER hardcode localhost here. VITE_API_URL must be empty or unset in Vercel env vars.
 */
const getBaseURL = (): string => {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;

  // If running in browser on a real domain (not localhost), always use relative URLs
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
    return '';
  }

  // In dev (localhost), use env var if set, otherwise empty (Vite proxy handles it)
  return envUrl || '';
};

export const apiClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to all requests
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors globally & log clearly for DevTools Inspect Console
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const method = (error.config?.method || 'get').toUpperCase();
    const status = error.response?.status;
    const data = error.response?.data;

    // Log prominent error details to browser inspect console
    console.error(`🚨 [GURLZ API Error] ${method} ${url}`, {
      status: status || 'Network / CORS Failure',
      statusText: error.response?.statusText || 'N/A',
      data: data || 'No response payload',
      message: error.message,
      config: {
        baseURL: error.config?.baseURL,
        url: error.config?.url,
        headers: error.config?.headers,
      },
      rawError: error,
    });

    // Only redirect to login if token is expired/invalid on protected routes (not auth endpoints or already on /login)
    if (
      status === 401 &&
      !url.includes('/chat') &&
      !url.includes('/auth/') &&
      window.location.pathname !== '/login'
    ) {
      console.warn('🔒 [GURLZ Auth] Session invalid or expired — redirecting to /login');
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
