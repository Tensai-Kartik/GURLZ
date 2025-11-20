import { FastifyInstance } from 'fastify';
import geminiManager from '../utils/gemini-adapter.js';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  fastify.get('/metrics', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const stats = geminiManager.getStats();
    return {
      gemini: stats,
      timestamp: new Date().toISOString(),
    };
  });
}

