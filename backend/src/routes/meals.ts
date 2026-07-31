import { FastifyInstance } from 'fastify';
import prisma from '../config/database.js';
import geminiManager from '../utils/gemini-adapter.js';
import { z } from 'zod';

const logMealSchema = z.object({
  mealType: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']),
  description: z.string().min(1),
  calories: z.number().optional(),
});

export async function mealRoutes(fastify: FastifyInstance) {
  // Get meal logs
  fastify.get('/meals', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const meals = await prisma.meal.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 30,
      });

      return meals;
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch meal logs' });
    }
  });

  // Log a meal + get Gemini nutritional advice
  fastify.post('/meals', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { mealType, description, calories } = logMealSchema.parse(request.body);

      // Get user's latest cycle phase context for tailored nutrition
      const latestCycle = await prisma.cycle.findFirst({
        where: { userId },
        orderBy: { startDate: 'desc' },
      });

      const recommendation = await geminiManager.generateMealSuggestions(
        { mealType, description, latestCycle },
        { mealType, description }
      );

      const meal = await prisma.meal.create({
        data: {
          userId,
          mealType,
          description,
          calories: calories || null,
          recommendation,
        },
      });

      return meal;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.code(500).send({ error: 'Failed to log meal' });
    }
  });

  // Delete meal
  fastify.delete('/meals/:id', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { id } = request.params as { id: string };

      await prisma.meal.deleteMany({
        where: { id, userId },
      });

      return { message: 'Meal log deleted' };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to delete meal log' });
    }
  });
}
