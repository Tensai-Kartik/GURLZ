import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { z } from 'zod';
const router = Router();
const symptomSchema = z.object({
    date: z.string().optional(),
    mood: z.string().optional(),
    painLevel: z.number().min(0).max(10).optional(),
    symptoms: z.array(z.string()).optional(),
});
router.get('/symptoms', authenticateToken, async (req, res) => {
    try {
        const symptoms = await prisma.symptom.findMany({
            where: { userId: req.user.userId },
            orderBy: { date: 'desc' },
        });
        res.json(symptoms);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch symptoms' });
    }
});
router.post('/symptoms', authenticateToken, async (req, res) => {
    try {
        const data = symptomSchema.parse(req.body);
        const symptomDate = data.date ? new Date(data.date) : new Date();
        const symptom = await prisma.symptom.create({
            data: {
                userId: req.user.userId,
                date: symptomDate,
                mood: data.mood || null,
                painLevel: data.painLevel ?? 0,
                symptoms: data.symptoms ? JSON.stringify(data.symptoms) : undefined,
            },
        });
        res.json(symptom);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to record symptom' });
    }
});
export default router;
