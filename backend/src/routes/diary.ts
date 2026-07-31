import { Router } from 'express';
import prisma from '../config/database.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const diarySchema = z.object({
  title: z.string(),
  content: z.string(),
  entryDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

router.get('/diary', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const entries = await prisma.diary.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(entries.map((entry: any) => ({
      id: entry.id,
      title: entry.title,
      content: entry.contentEncrypted ? decrypt(entry.contentEncrypted) : '',
      tags: entry.tags ? JSON.parse(entry.tags) : [],
      createdAt: entry.createdAt.toISOString(),
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch diary entries' });
  }
});

router.post('/diary', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const data = diarySchema.parse(req.body);
    const encryptedContent = encrypt(data.content);
    const customDate = data.entryDate ? new Date(data.entryDate) : new Date();

    const entry = await prisma.diary.create({
      data: {
        userId: req.user!.userId,
        title: data.title,
        contentEncrypted: encryptedContent,
        createdAt: customDate,
        tags: data.tags ? JSON.stringify(data.tags) : null,
      },
    });

    res.json({
      id: entry.id,
      title: entry.title,
      content: data.content,
      tags: data.tags || [],
      createdAt: entry.createdAt.toISOString(),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create diary entry' });
  }
});

router.put('/diary/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const data = diarySchema.partial().parse(req.body);

    const entry = await prisma.diary.findFirst({
      where: { id, userId: req.user!.userId },
    });

    if (!entry) {
      return res.status(404).json({ error: 'Diary entry not found' });
    }

    const updateData: any = {};
    if (data.title) updateData.title = data.title;
    if (data.content) updateData.contentEncrypted = encrypt(data.content);
    if (data.entryDate) updateData.createdAt = new Date(data.entryDate);
    if (data.tags) updateData.tags = JSON.stringify(data.tags);

    const updated = await prisma.diary.update({
      where: { id },
      data: updateData,
    });

    res.json({
      id: updated.id,
      title: updated.title,
      content: updated.contentEncrypted ? decrypt(updated.contentEncrypted) : '',
      tags: updated.tags ? JSON.parse(updated.tags) : [],
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update diary entry' });
  }
});

router.delete('/diary/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const entry = await prisma.diary.findFirst({
      where: { id, userId: req.user!.userId },
    });

    if (!entry) {
      return res.status(404).json({ error: 'Diary entry not found' });
    }

    await prisma.diary.delete({ where: { id } });
    res.json({ success: true, message: 'Diary entry deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete diary entry' });
  }
});

export default router;
