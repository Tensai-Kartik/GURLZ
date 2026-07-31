import { FastifyInstance } from 'fastify';
import geminiManager from '../utils/gemini-adapter.js';
import prisma from '../config/database.js';

export async function chatRoutes(fastify: FastifyInstance) {
  // GET /chat/history - Get latest chat history messages for user
  fastify.get('/chat/history', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const latestThread = await prisma.chatThread.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20, // Cap history returned to frontend to 20 messages
          },
        },
      });

      if (!latestThread) {
        return { history: [] };
      }

      return {
        history: latestThread.messages.map((m) => ({
          type: m.role,
          content: m.content,
          timestamp: m.createdAt,
        })),
        threadId: latestThread.id,
      };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch chat history' });
    }
  });

  // Get all chat threads for authenticated user
  fastify.get('/chat/threads', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { search } = request.query as { search?: string };

      const whereClause: any = { userId };
      if (search) {
        whereClause.title = { contains: search, mode: 'insensitive' };
      }

      const threads = await prisma.chatThread.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return threads;
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch chat threads' });
    }
  });

  // Create new thread
  fastify.post('/chat/threads', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { title = 'New Conversation' } = (request.body as { title?: string }) || {};

      const thread = await prisma.chatThread.create({
        data: { userId, title },
      });

      return thread;
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to create chat thread' });
    }
  });

  // Rename thread
  fastify.put('/chat/threads/:id', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { id } = request.params as { id: string };
      const { title } = request.body as { title: string };

      const thread = await prisma.chatThread.updateMany({
        where: { id, userId },
        data: { title, updatedAt: new Date() },
      });

      return thread;
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to rename chat thread' });
    }
  });

  // Delete thread
  fastify.delete('/chat/threads/:id', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { id } = request.params as { id: string };

      await prisma.chatThread.deleteMany({
        where: { id, userId },
      });

      return { message: 'Chat thread deleted' };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to delete chat thread' });
    }
  });

  // Get messages for a thread
  fastify.get('/chat/threads/:id/messages', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { id } = request.params as { id: string };

      const thread = await prisma.chatThread.findFirst({
        where: { id, userId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });

      if (!thread) return reply.code(404).send({ error: 'Thread not found' });

      return thread.messages;
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch thread messages' });
    }
  });

  // Chat message send endpoint (with thread persistence & streaming)
  fastify.post('/chat', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    try {
      const userId = request.user.userId;
      const { message, threadId, stream = false } = request.body as {
        message: string;
        threadId?: string;
        stream?: boolean;
      };

      let activeThreadId = threadId;

      if (!activeThreadId) {
        const titleSnippet = message.slice(0, 30) + (message.length > 30 ? '...' : '');
        const newThread = await prisma.chatThread.create({
          data: { userId, title: titleSnippet },
        });
        activeThreadId = newThread.id;
      }

      // Save user message to DB thread
      await prisma.chatMessage.create({
        data: {
          threadId: activeThreadId,
          role: 'user',
          content: message,
        },
      });

      // Build lean user context (cycle phase, recent mood/sleep — NOT the full history)
      const user = await prisma.user.findUnique({ where: { id: userId } });

      // Fetch last 5 messages for conversational memory (context trimming)
      const recentMessages = await prisma.chatMessage.findMany({
        where: { threadId: activeThreadId },
        orderBy: { createdAt: 'desc' },
        take: 5, // ← CONTEXT TRIM: only last 5 messages sent to AI
      });
      const conversationHistory = recentMessages
        .reverse()
        .map(m => `${m.role === 'user' ? 'User' : 'GURLZ'}: ${m.content}`)
        .join('\n');

      // Cycle phase calculation for context
      const latestCycle = await prisma.cycle.findFirst({ where: { userId }, orderBy: { startDate: 'desc' } });
      let cyclePhase = 'unknown';
      if (latestCycle) {
        const day = Math.floor((Date.now() - new Date(latestCycle.startDate).getTime()) / 86_400_000) + 1;
        const pl = user?.periodLength || 5;
        if (day <= pl) cyclePhase = 'Menstrual';
        else if (day <= 13) cyclePhase = 'Follicular';
        else if (day <= 16) cyclePhase = 'Ovulatory';
        else cyclePhase = 'Luteal';
      }

      const context = [
        user?.name ? `Name: ${user.name}` : '',
        `Cycle: ${cyclePhase} phase`,
        conversationHistory ? `Recent chat:\n${conversationHistory}` : '',
      ].filter(Boolean).join(' | ');

      if (stream) {
        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache');
        reply.raw.setHeader('Connection', 'keep-alive');
        reply.raw.setHeader('Access-Control-Allow-Origin', '*');
        reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');
        reply.raw.setHeader('X-Accel-Buffering', 'no');

        let fullText = '';
        try {
          for await (const chunk of geminiManager.generateStream(message, context, userId)) {
            fullText += chunk;
            reply.raw.write(`data: ${JSON.stringify({ chunk, threadId: activeThreadId, done: false })}\n\n`);
          }

          // Save assistant message to DB
          await prisma.chatMessage.create({
            data: {
              threadId: activeThreadId,
              role: 'assistant',
              content: fullText,
            },
          });

          await prisma.chatThread.update({
            where: { id: activeThreadId },
            data: { updatedAt: new Date() },
          });

          reply.raw.write(`data: ${JSON.stringify({ chunk: '', threadId: activeThreadId, done: true })}\n\n`);
          reply.raw.end();
        } catch {
          reply.raw.write(`data: ${JSON.stringify({ error: 'Failed streaming response' })}\n\n`);
          reply.raw.end();
        }
      } else {
        const response = await geminiManager.generate(message, context, userId);

        await prisma.chatMessage.create({
          data: {
            threadId: activeThreadId,
            role: 'assistant',
            content: response.text,
          },
        });

        await prisma.chatThread.update({
          where: { id: activeThreadId },
          data: { updatedAt: new Date() },
        });

        return {
          threadId: activeThreadId,
          message: response.text,
          keyUsed: response.keyUsed,
        };
      }
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Chat operation failed' });
    }
  });
}
