import { FastifyInstance } from 'fastify';
import prisma from '../config/database.js';
import { z } from 'zod';

const coachResponseSchema = z.object({
  reminderId: z.string().optional(),
  type: z.enum(['hydration', 'meals', 'mood', 'sleep', 'symptoms', 'diary']),
  action: z.string(), // e.g. '+1 Glass', '+2 Glasses', 'logged', 'later'
  value: z.any().optional(),
});

export async function coachRoutes(fastify: FastifyInstance) {
  // Get active adaptive coach prompts
  fastify.get('/coach/prompts', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;

      // Check last hydration log
      const lastHydration = await prisma.hydration.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
      });

      // Check last meal log
      const lastMeal = await prisma.meal.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
      });

      // Check last mood log
      const lastMood = await prisma.moodLog.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
      });

      const prompts = [];
      const now = Date.now();

      // Hydration Coach Prompt
      const hoursSinceWater = lastHydration ? (now - new Date(lastHydration.date).getTime()) / (1000 * 3600) : 5;
      if (hoursSinceWater >= 3) {
        prompts.push({
          id: 'prompt-hydration',
          type: 'hydration',
          title: 'Hydration Check 💧',
          message: `It's been about ${Math.round(hoursSinceWater)} hours since your last water check-in. Have you had any water?`,
          actions: ['+1 Glass (250ml)', '+2 Glasses (500ml)', 'Custom Amount', 'Later'],
        });
      }

      // Meal Coach Prompt
      const hoursSinceMeal = lastMeal ? (now - new Date(lastMeal.date).getTime()) / (1000 * 3600) : 6;
      if (hoursSinceMeal >= 5) {
        prompts.push({
          id: 'prompt-meal',
          type: 'meals',
          title: 'Nourishment Reminder 🥗',
          message: `Your last meal log was ${Math.round(hoursSinceMeal)} hours ago. Remember to keep your energy up!`,
          actions: ['Log Meal', 'Snack', 'Later'],
        });
      }

      // Mood Coach Prompt
      const hoursSinceMood = lastMood ? (now - new Date(lastMood.date).getTime()) / (1000 * 3600) : 12;
      if (hoursSinceMood >= 8) {
        prompts.push({
          id: 'prompt-mood',
          type: 'mood',
          title: 'How are you feeling? 🌸',
          message: "Taking a brief moment to log your emotional state can help track your cycle trends.",
          actions: ['Log Mood', 'Later'],
        });
      }

      return prompts;
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch coach prompts' });
    }
  });

  // Respond to a coach prompt
  fastify.post('/coach/respond', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { type, action, value } = coachResponseSchema.parse(request.body);

      if (action === 'Later') {
        // If user hits Later, increase ignoreCount or postpone
        return { message: 'Understood! I will check in again later.' };
      }

      if (type === 'hydration') {
        let amountMl = 250;
        if (action.includes('+2')) amountMl = 500;
        if (value && !isNaN(Number(value))) amountMl = Number(value);

        await prisma.hydration.create({
          data: { userId, amountMl, goalMl: 2000 },
        });

        return { message: `Awesome job! Added ${amountMl}ml of water to your daily progress. ✨` };
      }

      return { message: 'Thanks for updating your wellness tracker!' };
    } catch (error: any) {
      return reply.code(500).send({ error: 'Failed to process coach action' });
    }
  });
}
