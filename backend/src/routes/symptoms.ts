import { FastifyInstance } from 'fastify';
import prisma from '../config/database.js';
import { z } from 'zod';

const symptomSchema = z.object({
  date: z.string(),
  mood: z.string().optional(),
  painLevel: z.number().int().min(0).max(10).optional(),
  cravings: z.any().optional(),
  symptoms: z.any().optional(),
  voiceBlob: z.string().optional(),
});

export async function symptomRoutes(fastify: FastifyInstance) {
  fastify.get('/symptoms', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const symptoms = await prisma.symptom.findMany({
        where: { userId: request.user.userId },
        orderBy: { date: 'desc' },
      });

      return symptoms.map((s: any) => ({
        ...s,
        date: s.date.toISOString(),
        cravings: s.cravings ? JSON.parse(s.cravings) : null,
        symptoms: s.symptoms ? JSON.parse(s.symptoms) : null,
      }));
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch symptoms' });
    }
  });

  fastify.post('/symptoms', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const data = symptomSchema.parse(request.body);
      const symptom = await prisma.symptom.create({
        data: {
          userId: request.user.userId,
          date: new Date(data.date),
          mood: data.mood || null,
          painLevel: data.painLevel || null,
          cravings: data.cravings ? JSON.stringify(data.cravings) : null,
          symptoms: data.symptoms ? JSON.stringify(data.symptoms) : null,
          voiceBlob: data.voiceBlob || null,
        },
      });

      return {
        ...symptom,
        date: symptom.date.toISOString(),
        cravings: symptom.cravings ? JSON.parse(symptom.cravings) : null,
        symptoms: symptom.symptoms ? JSON.parse(symptom.symptoms) : null,
      };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.code(500).send({ error: 'Failed to create symptom' });
    }
  });
}
