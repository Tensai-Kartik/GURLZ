import { FastifyInstance } from 'fastify';
import prisma from '../config/database.js';
import { z } from 'zod';

const logHydrationSchema = z.object({
  amountMl: z.number().positive(),
  goalMl: z.number().positive().optional().default(2000),
});

export async function hydrationRoutes(fastify: FastifyInstance) {
  fastify.get('/hydration', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const logs = await prisma.hydration.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 30,
      });

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const todayLogs = logs.filter((l: any) => new Date(l.date) >= startOfDay);
      const totalToday = todayLogs.reduce((sum: number, l: any) => sum + l.amountMl, 0);
      const currentGoal = todayLogs[0]?.goalMl || 2000;

      return {
        totalToday,
        goalMl: currentGoal,
        percentage: Math.min(100, Math.round((totalToday / currentGoal) * 100)),
        logs,
      };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch hydration logs' });
    }
  });

  fastify.post('/hydration', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { amountMl, goalMl } = logHydrationSchema.parse(request.body);

      const log = await prisma.hydration.create({
        data: {
          userId,
          amountMl,
          goalMl,
        },
      });

      return log;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.code(500).send({ error: 'Failed to log hydration' });
    }
  });

  fastify.delete('/hydration/:id', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { id } = request.params as { id: string };

      await prisma.hydration.deleteMany({
        where: { id, userId },
      });

      return { message: 'Hydration log deleted' };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to delete hydration log' });
    }
  });
}
