import { FastifyInstance } from 'fastify';
import prisma from '../config/database.js';
import { z } from 'zod';

const cycleSchema = z.object({
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  flowLevel: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function cycleRoutes(fastify: FastifyInstance) {
  fastify.get('/cycles', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const cycles = await prisma.cycle.findMany({
        where: { userId: request.user.userId },
        orderBy: { startDate: 'desc' },
      });

      return cycles.map((cycle: any) => ({
        ...cycle,
        startDate: cycle.startDate.toISOString(),
        endDate: cycle.endDate?.toISOString(),
        createdAt: cycle.createdAt.toISOString(),
      }));
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch cycles' });
    }
  });

  fastify.post('/cycles', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const data = cycleSchema.parse(request.body);
      const cycle = await prisma.cycle.create({
        data: {
          userId: request.user.userId,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          flowLevel: data.flowLevel || null,
          notes: data.notes || null,
        },
      });

      return {
        ...cycle,
        startDate: cycle.startDate.toISOString(),
        endDate: cycle.endDate?.toISOString(),
        createdAt: cycle.createdAt.toISOString(),
      };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.code(500).send({ error: 'Failed to create cycle' });
    }
  });

  fastify.put('/cycles/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const { id } = request.params;
      const data = cycleSchema.partial().parse(request.body);

      const cycle = await prisma.cycle.findFirst({
        where: { id, userId: request.user.userId },
      });

      if (!cycle) {
        return reply.code(404).send({ error: 'Cycle not found' });
      }

      const updated = await prisma.cycle.update({
        where: { id },
        data: {
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
          flowLevel: data.flowLevel !== undefined ? data.flowLevel : undefined,
          notes: data.notes !== undefined ? data.notes : undefined,
        },
      });

      return {
        ...updated,
        startDate: updated.startDate.toISOString(),
        endDate: updated.endDate?.toISOString(),
        createdAt: updated.createdAt.toISOString(),
      };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.code(500).send({ error: 'Failed to update cycle' });
    }
  });

  fastify.delete('/cycles/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const { id } = request.params;
      const cycle = await prisma.cycle.findFirst({
        where: { id, userId: request.user.userId },
      });

      if (!cycle) {
        return reply.code(404).send({ error: 'Cycle not found' });
      }

      await prisma.cycle.delete({ where: { id } });
      return { success: true, id };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to delete cycle' });
    }
  });
}
