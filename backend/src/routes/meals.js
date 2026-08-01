import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { z } from 'zod';
const router = Router();
const mealSchema = z.object({
    mealType: z.string(),
    description: z.string(),
    calories: z.number().optional(),
});
router.get('/meals', authenticateToken, async (req, res) => {
    try {
        const meals = await prisma.meal.findMany({
            where: { userId: req.user.userId },
            orderBy: { date: 'desc' },
            take: 20,
        });
        res.json(meals);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch meals' });
    }
});
router.post('/meals', authenticateToken, async (req, res) => {
    try {
        const data = mealSchema.parse(req.body);
        const meal = await prisma.meal.create({
            data: {
                userId: req.user.userId,
                mealType: data.mealType,
                description: data.description,
                calories: data.calories || 0,
                date: new Date(),
            },
        });
        res.json(meal);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to record meal' });
    }
});
export default router;
