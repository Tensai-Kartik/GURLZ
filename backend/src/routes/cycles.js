import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { z } from 'zod';
const router = Router();
const cycleSchema = z.object({
    startDate: z.string(),
    endDate: z.string().optional().nullable(),
    flowLevel: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});
router.get('/cycles', authenticateToken, async (req, res) => {
    try {
        const cycles = await prisma.cycle.findMany({
            where: { userId: req.user.userId },
            orderBy: { startDate: 'desc' },
        });
        res.json(cycles.map((cycle) => ({
            ...cycle,
            startDate: cycle.startDate.toISOString(),
            endDate: cycle.endDate?.toISOString(),
            createdAt: cycle.createdAt.toISOString(),
        })));
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch cycles' });
    }
});
router.post('/cycles', authenticateToken, async (req, res) => {
    try {
        const data = cycleSchema.parse(req.body);
        const cycle = await prisma.cycle.create({
            data: {
                userId: req.user.userId,
                startDate: new Date(data.startDate),
                endDate: data.endDate ? new Date(data.endDate) : null,
                flowLevel: data.flowLevel || null,
                notes: data.notes || null,
            },
        });
        res.json({
            ...cycle,
            startDate: cycle.startDate.toISOString(),
            endDate: cycle.endDate?.toISOString(),
            createdAt: cycle.createdAt ? new Date(cycle.createdAt).toISOString() : new Date().toISOString(),
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to create cycle' });
    }
});
router.put('/cycles/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const data = cycleSchema.partial().parse(req.body);
        const cycle = await prisma.cycle.findFirst({
            where: { id, userId: req.user.userId },
        });
        if (!cycle) {
            return res.status(404).json({ error: 'Cycle not found' });
        }
        const updated = await prisma.cycle.update({
            where: { id },
            data: {
                startDate: data.startDate ? new Date(data.startDate) : undefined,
                endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
                flowLevel: data.flowLevel !== undefined ? data.flowLevel : undefined,
                notes: data.notes !== undefined ? data.notes : undefined,
            },
        });
        res.json({
            ...updated,
            startDate: updated.startDate.toISOString(),
            endDate: updated.endDate?.toISOString(),
            createdAt: updated.createdAt ? new Date(updated.createdAt).toISOString() : new Date().toISOString(),
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to update cycle' });
    }
});
router.delete('/cycles/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const cycle = await prisma.cycle.findFirst({
            where: { id, userId: req.user.userId },
        });
        if (!cycle) {
            return res.status(404).json({ error: 'Cycle not found' });
        }
        await prisma.cycle.delete({ where: { id } });
        res.json({ success: true, id });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete cycle' });
    }
});
export default router;
