import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { z } from 'zod';
const router = Router();
const noteSchema = z.object({
    content: z.string().min(1),
});
router.get('/notes', authenticateToken, async (req, res) => {
    try {
        const notes = await prisma.note.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(notes);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});
router.post('/notes', authenticateToken, async (req, res) => {
    try {
        const data = noteSchema.parse(req.body);
        const note = await prisma.note.create({
            data: {
                userId: req.user.userId,
                content: data.content,
            },
        });
        res.json(note);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create note' });
    }
});
router.put('/notes/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const data = noteSchema.partial().parse(req.body);
        const note = await prisma.note.updateMany({
            where: { id, userId: req.user.userId },
            data: {
                content: data.content,
            },
        });
        res.json(note);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update note' });
    }
});
router.delete('/notes/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.note.deleteMany({
            where: { id, userId: req.user.userId },
        });
        res.json({ message: 'Note deleted' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete note' });
    }
});
export default router;
