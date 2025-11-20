import { FastifyInstance } from 'fastify';
import geminiManager from '../utils/gemini-adapter.js';
import prisma from '../config/database.js';

export async function chatRoutes(fastify: FastifyInstance) {
  // Chat endpoint with streaming support
  fastify.post('/chat', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          context: { type: 'string' },
          stream: { type: 'boolean', default: false },
        },
        required: ['message'],
      },
    },
  }, async (request: any, reply) => {
    try {
      const { message, context = '', stream = false } = request.body as {
        message: string;
        context?: string;
        stream?: boolean;
      };

      const userId = request.user.userId;

      // Save user message to logs
      await prisma.log.create({
        data: {
          userId,
          type: 'chat_message',
          payload: JSON.stringify({ message, timestamp: new Date().toISOString() }),
        },
      });

      if (stream) {
        // Streaming response
        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache');
        reply.raw.setHeader('Connection', 'keep-alive');

        let fullResponse = '';
        try {
          for await (const chunk of geminiManager.generateStream(message, context, userId)) {
            fullResponse += chunk;
            reply.raw.write(`data: ${JSON.stringify({ chunk, done: false })}\n\n`);
          }
          reply.raw.write(`data: ${JSON.stringify({ chunk: '', done: true })}\n\n`);
          reply.raw.end();

          // Save assistant response
          await prisma.log.create({
            data: {
              userId,
              type: 'chat_response',
              payload: JSON.stringify({
                message: fullResponse,
                timestamp: new Date().toISOString(),
              }),
            },
          });
        } catch (error) {
          reply.raw.write(`data: ${JSON.stringify({ error: 'Failed to generate response' })}\n\n`);
          reply.raw.end();
        }
      } else {
        // Non-streaming response
        const response = await geminiManager.generate(message, context, userId);
        
        // Save assistant response
        await prisma.log.create({
          data: {
            userId,
            type: 'chat_response',
            payload: JSON.stringify({
            message: response.text,
            timestamp: new Date().toISOString(),
          }),
        },
      });

        return {
          message: response.text,
          keyUsed: response.keyUsed,
          cached: response.cached,
        };
      }
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Chat failed' });
    }
  });

  // Get chat history
  fastify.get('/chat/history', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const logs = await prisma.log.findMany({
        where: {
          userId: request.user.userId,
          type: { in: ['chat_message', 'chat_response'] },
        },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });

      const history = logs.map(log => ({
        type: log.type === 'chat_message' ? 'user' : 'assistant',
        content: JSON.parse(log.payload).message,
        timestamp: log.createdAt.toISOString(),
      }));

      return { history };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch chat history' });
    }
  });
}

