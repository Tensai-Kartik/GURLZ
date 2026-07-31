/**
 * Vercel Serverless Function Entry Point
 * Self-contained: builds the Express app inline using the shared buildApp factory.
 *
 * Vercel compiles this file via ts-node with project references,
 * so we import the TypeScript source directly (not the compiled dist).
 */
import { buildApp } from '../backend/src/app';

const app = buildApp();

export default app;
