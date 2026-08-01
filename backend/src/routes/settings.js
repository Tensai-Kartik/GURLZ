import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { z } from 'zod';
const router = Router();
const settingsSchema = z.object({
    theme: z.string().optional(),
    notifications: z.boolean().optional(),
    cycleLength: z.number().optional(),
    periodLength: z.number().optional(),
});
router.get('/settings', authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
        });
        res.json({
            theme: user?.settings ? JSON.parse(user.settings).theme || 'pink-soft' : 'pink-soft',
            cycleLength: user?.cycleLength || 28,
            periodLength: user?.periodLength || 5,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});
router.put('/settings', authenticateToken, async (req, res) => {
    try {
        const data = settingsSchema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        let currentSettings = {};
        if (user?.settings) {
            try {
                currentSettings = JSON.parse(user.settings);
            }
            catch { }
        }
        const updatedSettings = JSON.stringify({
            ...currentSettings,
            theme: data.theme || currentSettings.theme || 'pink-soft',
        });
        const updated = await prisma.user.update({
            where: { id: req.user.userId },
            data: {
                settings: updatedSettings,
                cycleLength: data.cycleLength !== undefined ? data.cycleLength : undefined,
                periodLength: data.periodLength !== undefined ? data.periodLength : undefined,
            },
        });
        res.json({
            theme: JSON.parse(updated.settings || '{}').theme || 'pink-soft',
            cycleLength: updated.cycleLength,
            periodLength: updated.periodLength,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});
router.delete('/settings/data', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { section } = req.body;
        if (section === 'diary' || section === 'all') {
            await prisma.diary.deleteMany({ where: { userId } });
        }
        if (section === 'reminders' || section === 'all') {
            await prisma.reminder.deleteMany({ where: { userId } });
        }
        if (section === 'notes' || section === 'all') {
            await prisma.note.deleteMany({ where: { userId } });
        }
        if (section === 'chats' || section === 'all') {
            await prisma.chatThread.deleteMany({ where: { userId } });
        }
        if (section === 'account') {
            await prisma.user.delete({ where: { id: userId } });
        }
        res.json({ success: true, message: `Successfully cleared ${section} data` });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to wipe data section' });
    }
});
export default router;
