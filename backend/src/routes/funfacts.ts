import { FastifyInstance } from 'fastify';
import prisma from '../config/database.js';

export async function funfactsRoutes(fastify: FastifyInstance) {
  fastify.get('/funfacts', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;

      const allMyths = await prisma.mythFact.findMany();

      if (allMyths.length === 0) {
        return {
          id: 'default',
          myth: 'You should avoid exercise during your period.',
          fact: 'Light to moderate exercise can actually ease cramps and boost your mood through endorphin release!',
        };
      }

      const seenRecords = await prisma.userMythSeen.findMany({
        where: { userId },
        select: { mythId: true },
      });

      const seenIds = new Set(seenRecords.map((r: any) => r.mythId));
      let unseenMyths = allMyths.filter((m: any) => !seenIds.has(m.id));

      if (unseenMyths.length === 0) {
        await prisma.userMythSeen.deleteMany({ where: { userId } });
        unseenMyths = allMyths;
      }

      const selectedMyth = unseenMyths[Math.floor(Math.random() * unseenMyths.length)];

      await prisma.userMythSeen.create({
        data: {
          userId,
          mythId: selectedMyth.id,
        },
      }).catch(() => {});

      return selectedMyth;
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch daily myth & fact' });
    }
  });
}
