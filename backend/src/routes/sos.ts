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

      // Get emergency contacts
      const contacts = await prisma.emergencyContact.findMany({
        where: { userId, priority: { gte: 5 } },
        orderBy: { priority: 'desc' },
      });

      // Create SOS event
      const sosEvent = await prisma.sosEvent.create({
        data: {
          userId,
          location: location ? JSON.stringify(location) : null,
          contactsNotified: JSON.stringify(contacts.map(c => ({ name: c.name, phone: c.phone }))),
          status: 'pending',
        },
      });

      // Log SOS event (in production, this would trigger SMS/notifications)
      await prisma.log.create({
        data: {
          userId,
          type: 'sos_triggered',
          payload: JSON.stringify({
            eventId: sosEvent.id,
            contacts: contacts.map(c => ({ name: c.name, phone: c.phone })),
            location,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      // Mock SMS notification (in production, integrate with SMS service)
      const mockSmsResults = contacts.map(contact => ({
        name: contact.name,
        phone: contact.phone,
        status: 'sent', // Mock
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

