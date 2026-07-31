import { FastifyInstance } from 'fastify';
import prisma from '../config/database.js';
import { z } from 'zod';

const noteSchema = z.object({
  content: z.string(),
});

export async function noteRoutes(fastify: FastifyInstance) {
  fastify.get('/notes', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const notes = await prisma.note.findMany({
        where: { userId: request.user.userId },
        orderBy: { createdAt: 'desc' },
      });

      return notes.map((note: any) => ({
        ...note,
        createdAt: note.createdAt.toISOString(),
      }));
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch notes' });
    }
  });

  fastify.post('/notes', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const data = noteSchema.parse(request.body);
      const note = await prisma.note.create({
        data: {
          userId: request.user.userId,
          content: data.content,
        },
      });

      return {
        ...note,
        createdAt: note.createdAt.toISOString(),
      };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.code(500).send({ error: 'Failed to create note' });
    }
  });

  fastify.put('/notes/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const { id } = request.params;
      const data = noteSchema.parse(request.body);

      const updated = await prisma.note.updateMany({
        where: { id, userId: request.user.userId },
        data: { content: data.content },
      });

      return { success: true };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to update note' });
    }
  });

  fastify.delete('/notes/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const { id } = request.params;
      await prisma.note.deleteMany({
        where: { id, userId: request.user.userId },
      });

      return { success: true, message: 'Note deleted' };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to delete note' });
    }
  });
}
