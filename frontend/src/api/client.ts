import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Use relative URL — Vite proxy forwards to backend (eliminates CORS entirely)
const API_URL = import.meta.env.VITE_API_URL || '';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only auto-logout on 401 for non-chat endpoints
    // Chat uses direct fetch() for SSE streaming, so don't redirect on chat 401
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.includes('/chat')) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

