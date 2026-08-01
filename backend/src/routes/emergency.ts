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

const getContacts = async (req: AuthenticatedRequest, res: any) => {
  try {
    const contacts = await prisma.emergencyContact.findMany({
      where: { userId: req.user!.userId },
    });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch emergency contacts' });
  }
};

const createContact = async (req: AuthenticatedRequest, res: any) => {
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
};

const deleteContact = async (req: AuthenticatedRequest, res: any) => {
  try {
    const { id } = req.params;
    await prisma.emergencyContact.deleteMany({
      where: { id, userId: req.user!.userId },
    });
    res.json({ message: 'Emergency contact deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete emergency contact' });
  }
};

// Support both /emergency and /emergency/contacts routes
router.get('/emergency', authenticateToken, getContacts);
router.get('/emergency/contacts', authenticateToken, getContacts);

router.post('/emergency', authenticateToken, createContact);
router.post('/emergency/contacts', authenticateToken, createContact);

router.delete('/emergency/:id', authenticateToken, deleteContact);
router.delete('/emergency/contacts/:id', authenticateToken, deleteContact);

export default router;
