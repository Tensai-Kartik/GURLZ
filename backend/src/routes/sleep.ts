import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const sleepSchema = z.object({
  hours: z.number().positive(),
  quality: z.string().optional(),
});

router.get('/sleep', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const logs = await prisma.sleep.findMany({
      where: { userId: req.user!.userId },
      orderBy: { date: 'desc' },
      take: 20,
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sleep logs' });
  }
});

router.post('/sleep', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const data = sleepSchema.parse(req.body);
    const log = await prisma.sleep.create({
      data: {
        userId: req.user!.userId,
        hours: data.hours,
        quality: data.quality || 'Good',
        date: new Date(),
      },
    });
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log sleep' });
  }
});

export default router;
