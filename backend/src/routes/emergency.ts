import { FastifyInstance } from 'fastify';
import prisma from '../config/database.js';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string(),
  phone: z.string(),
  relationship: z.string().optional(),
  priority: z.number().int().min(0).max(10).optional(),
});

export async function emergencyRoutes(fastify: FastifyInstance) {
  fastify.get('/emergency', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const contacts = await prisma.emergencyContact.findMany({
        where: { userId: request.user.userId },
        orderBy: { priority: 'desc' },
      });

      return contacts;
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch emergency contacts' });
    }
  });

  fastify.post('/emergency', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const data = contactSchema.parse(request.body);
      const contact = await prisma.emergencyContact.create({
        data: {
          userId: request.user.userId,
          name: data.name,
          phone: data.phone,
          relationship: data.relationship || null,
          priority: data.priority || 0,
        },
      });

      return contact;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.code(500).send({ error: 'Failed to create emergency contact' });
    }
  });
}

