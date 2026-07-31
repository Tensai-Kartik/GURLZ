import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const orderSchema = z.object({
  productName: z.string(),
  brand: z.string(),
  quantity: z.number().positive(),
  address: z.string(),
});

router.post('/orders', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const data = orderSchema.parse(req.body);
    res.json({
      orderId: `ORD-${Date.now()}`,
      status: 'Confirmed',
      deliveryEstimate: '2-3 Business Days',
      details: data,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to place order' });
  }
});

export default router;
