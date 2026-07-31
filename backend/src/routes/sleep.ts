import { FastifyInstance } from 'fastify';
import prisma from '../config/database.js';
import geminiManager from '../utils/gemini-adapter.js';
import { z } from 'zod';

const logSleepSchema = z.object({
  hours: z.number().min(0).max(24),
  quality: z.enum(['Poor', 'Fair', 'Good', 'Excellent']).optional().default('Good'),
  bedtime: z.string().optional(),
});

export async function sleepRoutes(fastify: FastifyInstance) {
  fastify.get('/sleep', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const logs = await prisma.sleep.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 30,
      });

      return logs;
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch sleep logs' });
    }
  });

  fastify.post('/sleep', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { hours, quality, bedtime } = logSleepSchema.parse(request.body);

      const suggestions = await geminiManager.generateSleepSuggestions(
        { hours, quality },
        { hours, quality }
      );

      const log = await prisma.sleep.create({
        data: {
          userId,
          hours,
          quality,
          bedtime: bedtime || '23:00',
          suggestions,
        },
      });

      return log;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.code(500).send({ error: 'Failed to log sleep' });
    }
  });
}
