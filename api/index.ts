import type { Request, Response } from 'express';

let appPromise: Promise<any> | null = null;

async function getApp() {
  if (!appPromise) {
    // Dynamic import allows CommonJS/ESM serverless wrapper to import ES Module backend cleanly
    appPromise = import('../backend/dist/app.js').then((mod) => mod.buildApp());
  }
  return appPromise;
}

export default async function handler(req: Request, res: Response) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error: any) {
    console.error('[Vercel Serverless Handler Error]:', error);
    res.status(500).json({ error: error?.message || 'Serverless initialization error' });
  }
}

// Support CommonJS require() loading on Vercel runtime
if (typeof module !== 'undefined' && module.exports) {
  module.exports = handler;
  module.exports.default = handler;
}
