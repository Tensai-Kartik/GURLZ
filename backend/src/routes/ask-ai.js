import { Router } from 'express';
import prisma from '../config/database.js';
import geminiManager from '../utils/gemini-adapter.js';
import { authenticateToken } from '../middleware/auth.js';
import { z } from 'zod';
const router = Router();
const askAISchema = z.object({
    query: z.string().min(1),
    includeContext: z.array(z.string()).optional(),
});
router.post('/ask-ai', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { query } = askAISchema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const cycles = await prisma.cycle.findMany({ where: { userId }, orderBy: { startDate: 'desc' }, take: 3 });
        const symptoms = await prisma.symptom.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 5 });
        const hydrations = await prisma.hydration.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 5 });
        const sleep = await prisma.sleep.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 3 });
        const meals = await prisma.meal.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 3 });
        const moodLogs = await prisma.moodLog.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 5 });
        const diaryEntries = await prisma.diary.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 3 });
        const contextPayload = {
            userName: user?.name,
            recentCycles: cycles.map((c) => ({ start: c.startDate, end: c.endDate, flow: c.flowLevel })),
            recentSymptoms: symptoms.map((s) => ({ date: s.date, mood: s.mood, pain: s.painLevel, symptoms: s.symptoms })),
            recentHydration: hydrations.map((h) => ({ date: h.date, amount: h.amountMl, goal: h.goalMl })),
            recentSleep: sleep.map((sl) => ({ hours: sl.hours, quality: sl.quality })),
            recentMeals: meals.map((m) => ({ type: m.mealType, desc: m.description })),
            recentMoods: moodLogs.map((ml) => ({ mood: ml.mood, intensity: ml.intensity, date: ml.date })),
            diaryTitles: diaryEntries.map((d) => d.title),
        };
        const responseText = await geminiManager.generateAskAIResponse(contextPayload, query);
        res.json({
            query,
            answer: responseText,
            disclaimer: 'GURLZ AI provides personalized wellness guidance based on your activity and is not a substitute for professional medical advice.',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid query input' });
        }
        res.status(500).json({ error: 'Failed to process Ask AI request' });
    }
});
export default router;
