/**
 * Vercel Serverless Entry Point
 * @vercel/node bundles this file with esbuild — resolves .js imports to .ts sources automatically.
 * ESM "type": "module" in backend/package.json is scoped to that package only;
 * this file is compiled independently by @vercel/node in the root workspace context.
 */
import { buildApp } from '../backend/src/app';
const app = buildApp();
export default app;
