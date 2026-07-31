import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import prisma from '../config/database.js';
import supabase from '../config/supabase.js';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  authId?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async function (fastify: FastifyInstance) {
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Missing or invalid Authorization header' });
      }

      const token = authHeader.split(' ')[1];
      
      let userId: string | null = null;
      let email: string | null = null;
      let authId: string | null = null;

      try {
        const decoded = fastify.jwt.verify(token) as any;
        userId = decoded.userId;
        email = decoded.email;
      } catch {
        // Fallback to Supabase JWT verification
        const { data: { user: sbUser }, error } = await supabase.auth.getUser(token);
        if (error || !sbUser) {
          return reply.code(401).send({ error: 'Invalid authentication token' });
        }
        authId = sbUser.id;
        email = sbUser.email || '';

        // Lookup or sync user record in database
        let dbUser = await prisma.user.findFirst({
          where: { OR: [{ authId: sbUser.id }, { email: sbUser.email || '' }] }
        });

        if (!dbUser && sbUser.email) {
          dbUser = await prisma.user.create({
            data: {
              authId: sbUser.id,
              email: sbUser.email,
              name: sbUser.user_metadata?.name || sbUser.email.split('@')[0],
              settings: JSON.stringify({ theme: 'pink-soft', animationIntensity: 'high', fontSize: 'medium' }),
            }
          });
        }

        if (dbUser) {
          userId = dbUser.id;
        }
      }

      if (!userId) {
        return reply.code(401).send({ error: 'User not found in system' });
      }

      (request as any).user = {
        userId,
        email: email || '',
        authId: authId || undefined,
      };
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized access' });
    }
  });
});
