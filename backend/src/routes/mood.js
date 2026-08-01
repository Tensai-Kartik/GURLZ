import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { z } from 'zod';
const router = Router();
const moodSchema = z.object({
    mood: z.string(),
    intensity: z.number().min(1).max(10).optional(),
});
router.get('/mood', authenticateToken, async (req, res) => {
    try {
        const moods = await prisma.moodLog.findMany({
            where: { userId: req.user.userId },
            orderBy: { date: 'desc' },
            take: 20,
        });
        res.json(moods);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch mood logs' });
    }
});
router.post('/mood', authenticateToken, async (req, res) => {
    try {
        const data = moodSchema.parse(req.body);
        const moodLog = await prisma.moodLog.create({
            data: {
                userId: req.user.userId,
                mood: data.mood,
                intensity: data.intensity || 5,
                date: new Date(),
            },
        });
        res.json(moodLog);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to log mood' });
    }
});
export default router;
