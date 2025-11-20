import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.js';
import { cycleRoutes } from './cycles.js';
import { chatRoutes } from './chat.js';
import { symptomRoutes } from './symptoms.js';
import { reminderRoutes } from './reminders.js';
import { diaryRoutes } from './diary.js';
import { noteRoutes } from './notes.js';
import { emergencyRoutes } from './emergency.js';
import { sosRoutes } from './sos.js';
import { orderRoutes } from './orders.js';
import { funfactRoutes } from './funfacts.js';
import { healthRoutes } from './health.js';

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(authRoutes);
  await fastify.register(cycleRoutes);
  await fastify.register(chatRoutes);
  await fastify.register(symptomRoutes);
  await fastify.register(reminderRoutes);
  await fastify.register(diaryRoutes);
  await fastify.register(noteRoutes);
  await fastify.register(emergencyRoutes);
  await fastify.register(sosRoutes);
  await fastify.register(orderRoutes);
  await fastify.register(funfactRoutes);
  await fastify.register(healthRoutes);
}

