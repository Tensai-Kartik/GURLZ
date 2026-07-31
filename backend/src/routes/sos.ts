import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.post('/sos/alert', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const contacts = await prisma.emergencyContact.findMany({
      where: { userId: req.user!.userId },
    });

    res.json({
      success: true,
      message: 'SOS alert triggered successfully',
      notifiedContactsCount: contacts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger SOS alert' });
  }
});

export default router;
