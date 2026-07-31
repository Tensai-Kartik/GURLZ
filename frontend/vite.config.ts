import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Proxy ALL backend routes directly — eliminates CORS entirely in dev
      '/auth': { target: 'http://localhost:3001', changeOrigin: true },
      '/chat': { target: 'http://localhost:3001', changeOrigin: true },
      '/dashboard': { target: 'http://localhost:3001', changeOrigin: true },
      '/hydration': { target: 'http://localhost:3001', changeOrigin: true },
      '/meals': { target: 'http://localhost:3001', changeOrigin: true },
      '/sleep': { target: 'http://localhost:3001', changeOrigin: true },
      '/mood': { target: 'http://localhost:3001', changeOrigin: true },
      '/cycles': { target: 'http://localhost:3001', changeOrigin: true },
      '/symptoms': { target: 'http://localhost:3001', changeOrigin: true },
      '/reminders': { target: 'http://localhost:3001', changeOrigin: true },
      '/emergency': { target: 'http://localhost:3001', changeOrigin: true },
      '/diary': { target: 'http://localhost:3001', changeOrigin: true },
      '/notes': { target: 'http://localhost:3001', changeOrigin: true },
      '/sos': { target: 'http://localhost:3001', changeOrigin: true },
      '/orders': { target: 'http://localhost:3001', changeOrigin: true },
      '/funfacts': { target: 'http://localhost:3001', changeOrigin: true },
      '/settings': { target: 'http://localhost:3001', changeOrigin: true },
      '/health': { target: 'http://localhost:3001', changeOrigin: true },
      '/ask-ai': { target: 'http://localhost:3001', changeOrigin: true },
      '/coach': { target: 'http://localhost:3001', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3001', changeOrigin: true },
      // Legacy /api prefix kept for compatibility
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});


