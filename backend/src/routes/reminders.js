import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { z } from 'zod';
const router = Router();
const reminderSchema = z.object({
    title: z.string().min(1),
    time: z.string().optional(),
    type: z.string().optional(),
});
router.get('/reminders', authenticateToken, async (req, res) => {
    try {
        const reminders = await prisma.reminder.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(reminders);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch reminders' });
    }
});
router.post('/reminders', authenticateToken, async (req, res) => {
    try {
        const data = reminderSchema.parse(req.body);
        const reminder = await prisma.reminder.create({
            data: {
                userId: req.user.userId,
                message: data.title,
                type: data.type || 'Custom',
            },
        });
        res.json(reminder);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create reminder' });
    }
});
router.delete('/reminders/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.reminder.deleteMany({
            where: { id, userId: req.user.userId },
        });
        res.json({ message: 'Reminder deleted' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete reminder' });
    }
});
export default router;
