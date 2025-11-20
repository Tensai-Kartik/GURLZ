import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Login
  fastify.post('/auth/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);

      // In demo mode, create or return demo user
      if (process.env.DEMO_MODE === 'true') {
        let user = await prisma.user.findUnique({ where: { email } });
        
        if (!user) {
          // Create demo user
          user = await prisma.user.create({
            data: {
              name: email.split('@')[0],
              email,
              settings: JSON.stringify({ theme: 'baby-pink' }),
            },
          });
        }

        const token = fastify.jwt.sign({ userId: user.id, email: user.email });
        return { token, user: { id: user.id, name: user.name, email: user.email } };
      }

      // In production, verify password
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // For now, accept any password in demo mode
      // In production, use: const valid = await bcrypt.compare(password, user.passwordHash);
      const token = fastify.jwt.sign({ userId: user.id, email: user.email });
      return { token, user: { id: user.id, name: user.name, email: user.email } };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.code(500).send({ error: 'Login failed' });
    }
  });

  // Get current user
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: request.user.userId },
        select: {
          id: true,
          name: true,
          email: true,
          dob: true,
          settings: true,
          createdAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return {
        ...user,
        settings: user.settings ? JSON.parse(user.settings) : {},
      };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch user' });
    }
  });
}

