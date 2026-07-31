import { FastifyInstance } from 'fastify';
import prisma from '../config/database.js';
import { z } from 'zod';

const reminderSchema = z.object({
  type: z.string(),
  message: z.string(),
  scheduleCron: z.string().optional(),
  nextRun: z.string().optional(),
  enabled: z.boolean().optional(),
});

export async function reminderRoutes(fastify: FastifyInstance) {
  fastify.get('/reminders', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const reminders = await prisma.reminder.findMany({
        where: { userId: request.user.userId },
        orderBy: { createdAt: 'desc' },
      });

      return reminders.map((r: any) => ({
        ...r,
        nextRun: r.nextRun?.toISOString(),
        createdAt: r.createdAt.toISOString(),
      }));
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch reminders' });
    }
  });

  fastify.post('/reminders', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const data = reminderSchema.parse(request.body);
      const reminder = await prisma.reminder.create({
        data: {
          userId: request.user.userId,
          type: data.type,
          message: data.message,
          scheduleCron: data.scheduleCron || null,
          nextRun: data.nextRun ? new Date(data.nextRun) : null,
          enabled: data.enabled !== undefined ? data.enabled : true,
        },
      });

      return {
        ...reminder,
        nextRun: reminder.nextRun?.toISOString(),
        createdAt: reminder.createdAt.toISOString(),
      };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.code(500).send({ error: 'Failed to create reminder' });
    }
  });
}
