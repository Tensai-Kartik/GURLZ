import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const contactSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().min(1),
  phone: z.string().min(5),
});

router.get('/emergency/contacts', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const contacts = await prisma.emergencyContact.findMany({
      where: { userId: req.user!.userId },
    });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch emergency contacts' });
  }
});

router.post('/emergency/contacts', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const data = contactSchema.parse(req.body);
    const contact = await prisma.emergencyContact.create({
      data: {
        userId: req.user!.userId,
        name: data.name,
        relationship: data.relationship,
        phone: data.phone,
      },
    });
    res.json(contact);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add emergency contact' });
  }
});

router.delete('/emergency/contacts/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.emergencyContact.deleteMany({
      where: { id, userId: req.user!.userId },
    });
    res.json({ message: 'Emergency contact deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete emergency contact' });
  }
});

export default router;
