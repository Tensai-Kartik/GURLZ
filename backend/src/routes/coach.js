import { Router } from 'express';
import geminiManager from '../utils/gemini-adapter.js';
import { authenticateToken } from '../middleware/auth.js';
const router = Router();
router.get('/coach/cravings', authenticateToken, async (req, res) => {
    try {
        const { cravings = 'chocolate,chips', phase = 'Menstrual' } = req.query;
        const cravingList = String(cravings).split(',').map(s => s.trim());
        const result = await geminiManager.generateCravingAlternatives(cravingList, String(phase));
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate craving alternatives' });
    }
});
export default router;
