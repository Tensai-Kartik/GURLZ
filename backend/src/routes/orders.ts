import { FastifyInstance } from 'fastify';
import prisma from '../config/database.js';
import { z } from 'zod';

const orderSchema = z.object({
  items: z.array(z.any()),
  partner: z.enum(['swiggy', 'zomato', 'blinkit', 'zepto', 'jiomart']),
});

export async function orderRoutes(fastify: FastifyInstance) {
  fastify.post('/orders', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const data = orderSchema.parse(request.body);
      
      // Mock order creation (in production, integrate with partner APIs)
      const mockEta = Math.floor(Math.random() * 30) + 15; // 15-45 minutes
      const mockAmount = data.items.reduce((sum: number, item: any) => sum + (item.price || 0), 0);

      const order = await prisma.order.create({
        data: {
          userId: request.user.userId,
          items: JSON.stringify(data.items),
          partner: data.partner,
          status: 'pending',
          eta: mockEta,
          amountCents: Math.round(mockAmount * 100),
        },
      });

      return {
        ...order,
        items: JSON.parse(order.items),
        createdAt: order.createdAt.toISOString(),
      };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.code(500).send({ error: 'Failed to create order' });
    }
  });

  fastify.get('/orders/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const { id } = request.params;
      const order = await prisma.order.findFirst({
        where: { id, userId: request.user.userId },
      });

      if (!order) {
        return reply.code(404).send({ error: 'Order not found' });
      }

      return {
        ...order,
        items: JSON.parse(order.items),
        createdAt: order.createdAt.toISOString(),
      };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch order' });
    }
  });
}

