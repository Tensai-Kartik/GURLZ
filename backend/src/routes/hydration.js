import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { z } from 'zod';
const router = Router();
const hydrationSchema = z.object({
    amountMl: z.number().positive(),
});
router.get('/hydration', authenticateToken, async (req, res) => {
    try {
        const logs = await prisma.hydration.findMany({
            where: { userId: req.user.userId },
            orderBy: { date: 'desc' },
            take: 20,
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch hydration' });
    }
});
router.post('/hydration', authenticateToken, async (req, res) => {
    try {
        const data = hydrationSchema.parse(req.body);
        const log = await prisma.hydration.create({
            data: {
                userId: req.user.userId,
                amountMl: data.amountMl,
                date: new Date(),
            },
        });
        res.json(log);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to record hydration' });
    }
});
export default router;
