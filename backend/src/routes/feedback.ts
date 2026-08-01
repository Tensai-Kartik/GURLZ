import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const ADMIN_EMAILS = [
  'kartikvarunsharma2005@gmail.com',
  'anonymouskiraiskilling@gmail.com',
];

const feedbackSchema = z.object({
  type: z.enum(['bug', 'suggestion', 'feedback']).default('feedback'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
});

const replySchema = z.object({
  status: z.enum(['Pending', 'In Review', 'Resolved']).default('Resolved'),
  adminReply: z.string().min(1, 'Reply message is required'),
});

// Submit Bug Report / Feedback / Suggestion
router.post('/feedback', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const data = feedbackSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        type: data.type,
        title: data.title,
        description: data.description,
        status: 'Pending',
      },
    });

    return res.status(201).json({
      message: 'Feedback submitted successfully! Admin has been notified.',
      feedback,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('[Feedback Submit Error]:', error);
    return res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Fetch Feedback Submissions (Admin gets all, regular user gets their own)
router.get('/feedback', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());

    const feedbacks = await prisma.feedback.findMany({
      where: isAdmin ? {} : { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      isAdmin,
      feedbacks,
    });
  } catch (error) {
    console.error('[Feedback Fetch Error]:', error);
    return res.status(500).json({ error: 'Failed to fetch feedbacks' });
  }
});

// Admin Reply / Update Status
router.put('/feedback/:id/reply', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const { id } = req.params;
    const { status, adminReply } = replySchema.parse(req.body);

    const updated = await prisma.feedback.update({
      where: { id },
      data: {
        status,
        adminReply,
      },
    });

    return res.json({
      message: 'Reply sent and status updated successfully!',
      feedback: updated,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('[Feedback Reply Error]:', error);
    return res.status(500).json({ error: 'Failed to reply to feedback' });
  }
});

export default router;
