import { FastifyInstance } from 'fastify';
import prisma from '../config/database.js';
import geminiManager from '../utils/gemini-adapter.js';
import { z } from 'zod';

const askAISchema = z.object({
  query: z.string().min(1),
  includeContext: z.array(z.string()).optional(),
});

export async function askAIRoutes(fastify: FastifyInstance) {
  fastify.post('/ask-ai', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { query } = askAISchema.parse(request.body);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      const cycles = await prisma.cycle.findMany({ where: { userId }, orderBy: { startDate: 'desc' }, take: 3 });
      const symptoms = await prisma.symptom.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 5 });
      const hydrations = await prisma.hydration.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 5 });
      const sleep = await prisma.sleep.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 3 });
      const meals = await prisma.meal.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 3 });
      const moodLogs = await prisma.moodLog.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 5 });
      const diaryEntries = await prisma.diary.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 3 });

      const contextPayload = {
        userName: user?.name,
        recentCycles: cycles.map((c: any) => ({ start: c.startDate, end: c.endDate, flow: c.flowLevel })),
        recentSymptoms: symptoms.map((s: any) => ({ date: s.date, mood: s.mood, pain: s.painLevel, symptoms: s.symptoms })),
        recentHydration: hydrations.map((h: any) => ({ date: h.date, amount: h.amountMl, goal: h.goalMl })),
        recentSleep: sleep.map((sl: any) => ({ hours: sl.hours, quality: sl.quality })),
        recentMeals: meals.map((m: any) => ({ type: m.mealType, desc: m.description })),
        recentMoods: moodLogs.map((ml: any) => ({ mood: ml.mood, intensity: ml.intensity, date: ml.date })),
        diaryTitles: diaryEntries.map((d: any) => d.title),
      };

      const responseText = await geminiManager.generateAskAIResponse(contextPayload, query);

      return {
        query,
        answer: responseText,
        disclaimer: 'GURLZ AI provides personalized wellness guidance based on your activity and is not a substitute for professional medical advice.',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid query input' });
      }
      return reply.code(500).send({ error: 'Failed to process Ask AI request' });
    }
  });
}
