import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import websocket from '@fastify/websocket';
import { registerRoutes } from './routes/index.js';
import authPlugin from './plugins/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
    } catch {}
  }

  // Register CORS
  await fastify.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control'],
    exposedHeaders: ['Content-Type'],
  });

  // Register JWT Auth
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  });

  await fastify.register(authPlugin);
  await fastify.register(multipart);

  // Vercel serverless environment check for WebSockets
  if (!process.env.VERCEL) {
    await fastify.register(websocket);
  }

  // Serve uploaded static files if directory exists
  if (fs.existsSync(uploadsDir)) {
    await fastify.register(staticFiles, {
      root: uploadsDir,
      prefix: '/uploads/',
    });
  }

  // Register all API routes
  await fastify.register(registerRoutes);

  return fastify;
}
