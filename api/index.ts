import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildApp } from '../backend/src/app.js';

let appInstance: any;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!appInstance) {
    appInstance = await buildApp();
    await appInstance.ready();
  }

  appInstance.server.emit('request', req, res);
}
