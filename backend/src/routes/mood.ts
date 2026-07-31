import { FastifyInstance } from 'fastify';
import prisma from '../config/database.js';
import { z } from 'zod';

const logMoodSchema = z.object({
  mood: z.string().min(1),
  intensity: z.number().min(1).max(10).optional().default(5),
  note: z.string().optional(),
});

export async function moodRoutes(fastify: FastifyInstance) {
  fastify.get('/mood', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const logs = await prisma.moodLog.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 30,
      });

      return logs;
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch mood logs' });
    }
  });

  fastify.post('/mood', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { mood, intensity, note } = logMoodSchema.parse(request.body);

      const log = await prisma.moodLog.create({
        data: {
          userId,
          mood,
          intensity,
          note,
        },
      });

      return log;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.code(500).send({ error: 'Failed to log mood' });
    }
  });
}
