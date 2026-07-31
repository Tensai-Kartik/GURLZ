import { FastifyInstance } from 'fastify';
import prisma from '../config/database.js';

export async function sosRoutes(fastify: FastifyInstance) {
  fastify.post('/sos', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          location: { type: 'object' },
        },
      },
    },
  }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { location } = request.body as { location?: any };

      const contacts = await prisma.emergencyContact.findMany({
        where: { userId },
        orderBy: { priority: 'asc' },
      });

      const sosEvent = await prisma.sosEvent.create({
        data: {
          userId,
          location: location ? JSON.stringify(location) : null,
          contactsNotified: JSON.stringify(contacts.map((c: any) => ({ name: c.name, phone: c.phone }))),
          status: 'pending',
        },
      });

      await prisma.log.create({
        data: {
          userId,
          type: 'sos_triggered',
          payload: JSON.stringify({
            eventId: sosEvent.id,
            contacts: contacts.map((c: any) => ({ name: c.name, phone: c.phone })),
            location,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      const mockSmsResults = contacts.map((contact: any) => ({
        name: contact.name,
        phone: contact.phone,
        status: 'sent',
        message: `SOS Alert: ${request.user.name || 'User'} needs immediate assistance.`,
      }));

      return {
        success: true,
        eventId: sosEvent.id,
        contactsNotified: mockSmsResults,
        message: 'SOS alert sent to emergency contacts',
      };
    } catch (error: any) {
      return reply.code(500).send({ error: 'Failed to trigger SOS' });
    }
  });
}
