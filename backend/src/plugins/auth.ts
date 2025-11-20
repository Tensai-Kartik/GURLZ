import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user?: {
      userId: string;
      email: string;
    };
  }
}

export default fp(async function (fastify: FastifyInstance) {
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
      const decoded = request.user as any;
      request.user = {
        userId: decoded.userId,
        email: decoded.email,
      };
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
});

