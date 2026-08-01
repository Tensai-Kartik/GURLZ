import { Router } from 'express';
import prisma from '../config/database.js';
import geminiManager from '../utils/gemini-adapter.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const summaryCache = new Map<string, { summary: string; ts: number }>();
const SUMMARY_CACHE_TTL = 10 * 60 * 1000;

router.get('/dashboard/summary', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    const latestCycle = await prisma.cycle.findFirst({
      where: { userId },
      orderBy: { startDate: 'desc' },
    });

    let cyclePhase = 'Follicular Phase';
    let dayOfCycle = 1;
    let nextPeriodDate = new Date();
    nextPeriodDate.setDate(nextPeriodDate.getDate() + 14);

    const cycleLength = user?.cycleLength || 28;
    const periodLength = user?.periodLength || 5;

    if (latestCycle) {
      const start = new Date(latestCycle.startDate);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
      dayOfCycle = Math.max(1, diffDays);
      nextPeriodDate = new Date(start);
      nextPeriodDate.setDate(start.getDate() + cycleLength);

      if (dayOfCycle <= periodLength) cyclePhase = 'Menstrual Phase';
      else if (dayOfCycle <= 13) cyclePhase = 'Follicular Phase';
      else if (dayOfCycle <= 16) cyclePhase = 'Ovulatory Phase';
      else cyclePhase = 'Luteal Phase';
    }

    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

    const [hydrationLogs, meals, latestSleep, latestMood, reminders] = await Promise.all([
      prisma.hydration.findMany({ where: { userId, date: { gte: startOfDay, lte: endOfDay } } }),
      prisma.meal.findMany({ where: { userId, date: { gte: startOfDay, lte: endOfDay } }, orderBy: { date: 'desc' } }),
      prisma.sleep.findFirst({ where: { userId }, orderBy: { date: 'desc' } }),
      prisma.moodLog.findFirst({ where: { userId }, orderBy: { date: 'desc' } }),
      prisma.reminder.findMany({ where: { userId, enabled: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    const hydrationAmount = hydrationLogs.reduce((acc: number, log: any) => acc + log.amountMl, 0);
    const hydrationGoal = hydrationLogs[0]?.goalMl || 2000;

    let score = 70;
    if (hydrationAmount >= hydrationGoal) score += 10;
    else if (hydrationAmount >= hydrationGoal * 0.5) score += 5;
    if (meals.length >= 3) score += 10;
    else if (meals.length >= 1) score += 5;
    if (latestSleep && Number(latestSleep.hours) >= 7) score += 10;
    score = Math.min(100, Math.max(30, score));

    const cached = summaryCache.get(userId);
    let aiSummary: string;

    if (cached && Date.now() - cached.ts < SUMMARY_CACHE_TTL) {
      aiSummary = cached.summary;
    } else {
      aiSummary = await geminiManager.generateDashboardSummary({
        userName: user?.name || 'Beautiful',
        cyclePhase,
        dayOfCycle,
        wellnessScore: score,
        hydration: `${hydrationAmount} / ${hydrationGoal} ml`,
        latestSleep: latestSleep ? `${latestSleep.hours}h (${latestSleep.quality})` : 'Not logged',
        latestMood: latestMood ? `${latestMood.mood} (${latestMood.intensity}/10)` : 'Not logged',
        loggedMealsCount: meals.length,
      });
      summaryCache.set(userId, { summary: aiSummary, ts: Date.now() });
    }

    res.json({
      greeting: `Welcome back, ${user?.name || 'Beautiful'} ✨`,
      user: { name: user?.name, email: user?.email, cycleLength, periodLength },
      cycle: {
        phase: cyclePhase,
        dayOfCycle,
        nextPeriodDate: nextPeriodDate.toISOString(),
        lastPeriodDate: latestCycle?.startDate.toISOString() || null,
      },
      wellnessScore: score,
      hydration: {
        amountMl: hydrationAmount,
        goalMl: hydrationGoal,
        progress: Math.min(100, Math.round((hydrationAmount / hydrationGoal) * 100)),
      },
      meals: { count: meals.length, latest: meals[0] || null },
      sleep: latestSleep || { hours: 7.5, quality: 'Good' },
      mood: latestMood || { mood: 'Calm', intensity: 7 },
      weather: { temp: 26, condition: 'Sunny & Pleasant', humidity: '60%', location: 'Your Location' },
      reminders,
      aiSummary,
    });
  } catch (error: any) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to build dashboard summary' });
  }
});

export default router;
