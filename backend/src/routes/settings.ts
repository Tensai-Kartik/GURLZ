import { FastifyInstance } from 'fastify';
import prisma from '../config/database.js';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().optional(),
  dob: z.string().optional(),
  age: z.number().optional(),
  cycleLength: z.number().optional(),
  periodLength: z.number().optional(),
  settings: z.any().optional(),
});

export async function settingsRoutes(fastify: FastifyInstance) {
  // Get settings & profile
  fastify.get('/settings', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) return reply.code(404).send({ error: 'User not found' });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        dob: user.dob,
        age: user.age,
        cycleLength: user.cycleLength,
        periodLength: user.periodLength,
        settings: user.settings ? JSON.parse(user.settings) : {},
      };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch settings' });
    }
  });

  // Update profile / settings
  fastify.put('/settings', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const data = updateProfileSchema.parse(request.body);

      const updatePayload: any = {};
      if (data.name !== undefined) updatePayload.name = data.name;
      if (data.dob !== undefined) updatePayload.dob = data.dob;
      if (data.age !== undefined) updatePayload.age = data.age;
      if (data.cycleLength !== undefined) updatePayload.cycleLength = data.cycleLength;
      if (data.periodLength !== undefined) updatePayload.periodLength = data.periodLength;
      if (data.settings !== undefined) updatePayload.settings = JSON.stringify(data.settings);

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updatePayload,
      });

      return {
        ...updatedUser,
        settings: updatedUser.settings ? JSON.parse(updatedUser.settings) : {},
      };
    } catch (error: any) {
      return reply.code(500).send({ error: 'Failed to update settings' });
    }
  });

  // Export full user data as JSON
  fastify.get('/settings/export', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          cycles: true,
          symptoms: true,
          hydrations: true,
          meals: true,
          sleeps: true,
          moodLogs: true,
          diaryEntries: true,
          notes: true,
          reminders: true,
          emergencyContacts: true,
        },
      });

      return user;
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to export user data' });
    }
  });

  // Wipe specific user data section or entire account
  fastify.delete('/settings/data', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { section } = request.query as { section?: string };

      if (section === 'diary') {
        await prisma.diary.deleteMany({ where: { userId } });
      } else if (section === 'reminders') {
        await prisma.reminder.deleteMany({ where: { userId } });
      } else if (section === 'notes') {
        await prisma.note.deleteMany({ where: { userId } });
      } else if (section === 'chats') {
        await prisma.chatThread.deleteMany({ where: { userId } });
      } else if (section === 'account') {
        await prisma.user.delete({ where: { id: userId } });
        return { message: 'Account deleted permanently.' };
      }

      return { message: `Data section '${section || 'all'}' cleared successfully.` };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to wipe data section' });
    }
  });
}
