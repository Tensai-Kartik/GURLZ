import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const funfacts = [
  "✨ Myth: Exercise worsens period cramps. Fact: Light exercise releases endorphins that reduce pain!",
  "🌸 Dark chocolate with 70%+ cocoa is high in magnesium, which naturally relaxes uterine muscles.",
  "💧 Warm water with lemon during menstruation reduces bloating and helps soothe digestive discomfort.",
  "🌙 Quality sleep during your luteal phase helps regulate progesterone and reduces PMS mood swings.",
];

const getRandomFact = (_req: AuthenticatedRequest, res: any) => {
  const fact = funfacts[Math.floor(Math.random() * funfacts.length)];
  res.json({ fact });
};

router.get('/funfacts', authenticateToken, getRandomFact);
router.get('/funfacts/random', authenticateToken, getRandomFact);

export default router;
