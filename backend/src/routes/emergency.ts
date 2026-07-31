import { FastifyInstance } from 'fastify';
import prisma from '../config/database.js';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  relationship: z.string().optional(),
  priority: z.number().optional().default(0),
});

export async function emergencyRoutes(fastify: FastifyInstance) {
  // Get contacts
  fastify.get('/emergency', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const contacts = await prisma.emergencyContact.findMany({
        where: { userId },
        orderBy: { priority: 'asc' },
      });
      return contacts;
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch emergency contacts' });
    }
  });

  // Add contact
  fastify.post('/emergency', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { name, phone, relationship, priority } = contactSchema.parse(request.body);

      const contact = await prisma.emergencyContact.create({
        data: {
          userId,
          name,
          phone,
          relationship: relationship || 'Family',
          priority: priority || 0,
        },
      });

      return contact;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid contact input' });
      }
      return reply.code(500).send({ error: 'Failed to add emergency contact' });
    }
  });

  // Update contact
  fastify.put('/emergency/:id', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { id } = request.params as { id: string };
      const { name, phone, relationship, priority } = contactSchema.parse(request.body);

      const contact = await prisma.emergencyContact.updateMany({
        where: { id, userId },
        data: { name, phone, relationship, priority },
      });

      return contact;
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to update emergency contact' });
    }
  });

  // Delete contact
  fastify.delete('/emergency/:id', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { id } = request.params as { id: string };

      await prisma.emergencyContact.deleteMany({
        where: { id, userId },
      });

      return { message: 'Emergency contact deleted' };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to delete emergency contact' });
    }
  });
}
