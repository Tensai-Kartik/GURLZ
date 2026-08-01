import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import apiRoutes from './routes/index.js';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export function buildApp() {
    const app = express();
    // ── Middleware ─────────────────────────────────────────────────────────────
    app.use(cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control'],
    }));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    // Static Uploads
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (fs.existsSync(uploadsDir)) {
        app.use('/uploads', express.static(uploadsDir));
    }
    // ── Routes ─────────────────────────────────────────────────────────────────
    app.use('/api', apiRoutes);
    app.use('/', apiRoutes);
    // ── Global Error Handler ───────────────────────────────────────────────────
    // Must be LAST middleware — catches any error thrown in routes
    // Ensures the response is ALWAYS { error: string }, never a raw object
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app.use((err, _req, res, _next) => {
        console.error('[Global Error Handler]', err);
        // Extract a human-readable message from various error types
        let message = 'Internal server error';
        if (typeof err === 'string') {
            message = err;
        }
        else if (err?.message && typeof err.message === 'string') {
            // Prisma errors, standard Error objects — use message string only
            message = err.message;
        }
        // Never expose Prisma internals (P-codes, stack traces) to client
        const isPrismaError = err?.code && /^P\d{4}$/.test(err.code);
        if (isPrismaError) {
            message = 'Database error. Please try again.';
        }
        const status = typeof err?.status === 'number' ? err.status : 500;
        res.status(status).json({ error: message });
    });
    return app;
}
export default buildApp;
