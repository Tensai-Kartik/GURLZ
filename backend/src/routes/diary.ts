import { FastifyInstance } from 'fastify';
import prisma from '../config/database.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { z } from 'zod';

const diarySchema = z.object({
  title: z.string(),
  content: z.string(),
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

      return entries.map(entry => ({
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
      
      const entry = await prisma.diary.create({
        data: {
          userId: request.user.userId,
          title: data.title,
          contentEncrypted: encryptedContent,
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
}

