import { Router } from 'express';
import geminiManager from '../utils/gemini-adapter.js';
import prisma from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
const router = Router();
router.get('/chat/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const latestThread = await prisma.chatThread.findFirst({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    take: 20,
                },
            },
        });
        if (!latestThread) {
            return res.json({ history: [] });
        }
        res.json({
            history: latestThread.messages.map((m) => ({
                type: m.role,
                content: m.content,
                timestamp: m.createdAt,
            })),
            threadId: latestThread.id,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});
router.get('/chat/threads', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { search } = req.query;
        const whereClause = { userId };
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
        res.json(threads);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch chat threads' });
    }
});
router.post('/chat/threads', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { title = 'New Conversation' } = req.body || {};
        const thread = await prisma.chatThread.create({
            data: { userId, title },
        });
        res.json(thread);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create chat thread' });
    }
});
router.put('/chat/threads/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { title } = req.body;
        const thread = await prisma.chatThread.updateMany({
            where: { id, userId },
            data: { title, updatedAt: new Date() },
        });
        res.json(thread);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to rename chat thread' });
    }
});
router.delete('/chat/threads/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        await prisma.chatThread.deleteMany({
            where: { id, userId },
        });
        res.json({ message: 'Chat thread deleted' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete chat thread' });
    }
});
router.get('/chat/threads/:id/messages', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const thread = await prisma.chatThread.findFirst({
            where: { id, userId },
            include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
        if (!thread)
            return res.status(404).json({ error: 'Thread not found' });
        res.json(thread.messages);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch thread messages' });
    }
});
router.post('/chat', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { message, threadId, stream = false } = req.body;
        let activeThreadId = threadId;
        if (!activeThreadId) {
            const titleSnippet = message.slice(0, 30) + (message.length > 30 ? '...' : '');
            const newThread = await prisma.chatThread.create({
                data: { userId, title: titleSnippet },
            });
            activeThreadId = newThread.id;
        }
        await prisma.chatMessage.create({
            data: {
                threadId: activeThreadId,
                role: 'user',
                content: message,
            },
        });
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const recentMessages = await prisma.chatMessage.findMany({
            where: { threadId: activeThreadId },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });
        const conversationHistory = recentMessages
            .reverse()
            .map(m => `${m.role === 'user' ? 'User' : 'GURLZ'}: ${m.content}`)
            .join('\n');
        const latestCycle = await prisma.cycle.findFirst({ where: { userId }, orderBy: { startDate: 'desc' } });
        let cyclePhase = 'unknown';
        if (latestCycle) {
            const day = Math.floor((Date.now() - new Date(latestCycle.startDate).getTime()) / 86_400_000) + 1;
            const pl = user?.periodLength || 5;
            if (day <= pl)
                cyclePhase = 'Menstrual';
            else if (day <= 13)
                cyclePhase = 'Follicular';
            else if (day <= 16)
                cyclePhase = 'Ovulatory';
            else
                cyclePhase = 'Luteal';
        }
        const context = [
            user?.name ? `Name: ${user.name}` : '',
            `Cycle: ${cyclePhase} phase`,
            conversationHistory ? `Recent chat:\n${conversationHistory}` : '',
        ].filter(Boolean).join(' | ');
        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('X-Accel-Buffering', 'no');
            let fullText = '';
            try {
                for await (const chunk of geminiManager.generateStream(message, context, userId)) {
                    fullText += chunk;
                    res.write(`data: ${JSON.stringify({ chunk, threadId: activeThreadId, done: false })}\n\n`);
                }
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
                res.write(`data: ${JSON.stringify({ chunk: '', threadId: activeThreadId, done: true })}\n\n`);
                res.end();
            }
            catch {
                res.write(`data: ${JSON.stringify({ error: 'Failed streaming response' })}\n\n`);
                res.end();
            }
        }
        else {
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
            res.json({
                threadId: activeThreadId,
                message: response.text,
                keyUsed: response.keyUsed,
            });
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Chat operation failed' });
    }
});
export default router;
