import { FastifyInstance } from 'fastify';
import prisma from '../config/database.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { z } from 'zod';

const diarySchema = z.object({
  title: z.string(),
  content: z.string(),
  entryDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function diaryRoutes(fastify: FastifyInstance) {
  fastify.get('/diary', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const entries = await prisma.diary.findMany({
        where: { userId: request.user.userId },
        orderBy: { createdAt: 'desc' },
      });

      return entries.map((entry: any) => ({
        id: entry.id,
        title: entry.title,
        content: entry.contentEncrypted ? decrypt(entry.contentEncrypted) : '',
        tags: entry.tags ? JSON.parse(entry.tags) : [],
        createdAt: entry.createdAt.toISOString(),
      }));
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch diary entries' });
    }
  });

  fastify.post('/diary', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const data = diarySchema.parse(request.body);
      const encryptedContent = encrypt(data.content);
      const customDate = data.entryDate ? new Date(data.entryDate) : new Date();

      const entry = await prisma.diary.create({
        data: {
          userId: request.user.userId,
          title: data.title,
          contentEncrypted: encryptedContent,
          createdAt: customDate,
          tags: data.tags ? JSON.stringify(data.tags) : null,
        },
      });

      return {
        id: entry.id,
        title: entry.title,
        content: data.content,
        tags: data.tags || [],
        createdAt: entry.createdAt.toISOString(),
      };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.code(500).send({ error: 'Failed to create diary entry' });
    }
  });

  fastify.put('/diary/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const { id } = request.params;
      const data = diarySchema.partial().parse(request.body);

      const entry = await prisma.diary.findFirst({
        where: { id, userId: request.user.userId },
      });

      if (!entry) {
        return reply.code(404).send({ error: 'Diary entry not found' });
      }

      const updateData: any = {};
      if (data.title) updateData.title = data.title;
      if (data.content) updateData.contentEncrypted = encrypt(data.content);
      if (data.entryDate) updateData.createdAt = new Date(data.entryDate);
      if (data.tags) updateData.tags = JSON.stringify(data.tags);

      const updated = await prisma.diary.update({
        where: { id },
        data: updateData,
      });

      return {
        id: updated.id,
        title: updated.title,
        content: updated.contentEncrypted ? decrypt(updated.contentEncrypted) : '',
        tags: updated.tags ? JSON.parse(updated.tags) : [],
        createdAt: updated.createdAt.toISOString(),
      };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to update diary entry' });
    }
  });

  fastify.delete('/diary/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const { id } = request.params;
      const entry = await prisma.diary.findFirst({
        where: { id, userId: request.user.userId },
      });

      if (!entry) {
        return reply.code(404).send({ error: 'Diary entry not found' });
      }

      await prisma.diary.delete({ where: { id } });
      return { success: true, message: 'Diary entry deleted' };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to delete diary entry' });
    }
  });
}
