/**
 * GURLZ AI — Multi-Provider Adapter
 *
 * Provider Chain (in order):
 *   1. Gemini  — gemini-2.0-flash-lite → gemini-2.5-flash (5 keys, round-robin)
 *   2. Groq    — llama-3.3-70b-versatile → llama-3.1-8b-instant  (ultra-fast free tier)
 *   3. OpenRouter — deepseek/deepseek-r1:free → qwen/qwen-2.5-7b:free (unified free models)
 *   4. Smart Fallback — contextual built-in wellness AI (always available)
 *
 * Features:
 *   - Per-provider rate-limit blacklisting with exponential back-off
 *   - Request throttle (4 s between calls per provider)
 *   - In-memory response cache (2 min TTL)
 *   - Context trimming: last 5 messages only
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeminiResponse {
  text: string;
  keyUsed: string;
  cached: boolean;
  provider: string;
}

interface KeyStatus {
  key: string;
  blacklistedUntil: number | null;
  failureCount: number;
  lastUsed: number;
}

// ─── System Instruction ───────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `You are GURLZ AI, a warm and intelligent wellness companion for women.
Be concise (2-3 sentences), empathetic, and actionable. Use 1-2 emojis max.
Never repeat the user's question. Never provide medical diagnoses.
If asked about a product brand (pads, tampons), give real brand names available in India.
Respond in plain text — no markdown headers or bullet lists unless the user requests detail.`;

// ─── Model Configs ────────────────────────────────────────────────────────────

const GEMINI_MODELS = ['gemini-2.0-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'];

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',   // Best quality on Groq free tier
  'llama-3.1-8b-instant',       // Fastest fallback
  'qwen-qwq-32b',              // Good reasoning
];

const OPENROUTER_MODELS = [
  'deepseek/deepseek-r1:free',           // DeepSeek R1 — excellent free model
  'qwen/qwen3-8b:free',                  // Qwen 3 8B — fast & capable
  'mistralai/mistral-7b-instruct:free',  // Mistral 7B — reliable
  'meta-llama/llama-3.1-8b-instruct:free',
];

// ─── Main Class ───────────────────────────────────────────────────────────────

class MultiProviderAI {
  // Gemini keys
  private geminiKeys: KeyStatus[] = [];
  private geminiIndex = 0;

  // Groq keys
  private groqKeys: KeyStatus[] = [];
  private groqIndex = 0;

  // OpenRouter keys
  private openRouterKeys: KeyStatus[] = [];

  // Cache & throttle
  private cache = new Map<string, { response: string; ts: number }>();
  private readonly CACHE_TTL = 120_000;           // 2 min
  private readonly BLACKLIST_BASE = 120_000;       // 2 min base blacklist
  private lastRequestTime = 0;
  private readonly MIN_INTERVAL = 3_000;           // 3 s between provider calls

  private stateFile = path.join(__dirname, '../../data/ai-state.json');

  constructor() {
    this.loadKeys();
    this.loadState();
  }

  // ── Key Loading ─────────────────────────────────────────────────────────────

  private loadKeys() {
    // Gemini
    const geminiRaw = (process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEYS || process.env.GEMINI_KEYS || '')
      .split(',').map(k => k.trim()).filter(Boolean);
    this.geminiKeys = geminiRaw.map(key => ({ key, blacklistedUntil: null, failureCount: 0, lastUsed: 0 }));

    // Groq
    const groqRaw = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '')
      .split(',').map(k => k.trim()).filter(Boolean);
    this.groqKeys = groqRaw.map(key => ({ key, blacklistedUntil: null, failureCount: 0, lastUsed: 0 }));

    // OpenRouter
    const orRaw = (process.env.OPENROUTER_API_KEYS || process.env.OPENROUTER_API_KEY || '')
      .split(',').map(k => k.trim()).filter(Boolean);
    this.openRouterKeys = orRaw.map(key => ({ key, blacklistedUntil: null, failureCount: 0, lastUsed: 0 }));

    console.log(`🤖 AI Providers loaded:`);
    console.log(`   Gemini: ${this.geminiKeys.length} key(s) | ${GEMINI_MODELS[0]}`);
    console.log(`   Groq:   ${this.groqKeys.length} key(s)  | ${GROQ_MODELS[0]}`);
    console.log(`   OpenRouter: ${this.openRouterKeys.length} key(s) | ${OPENROUTER_MODELS[0]}`);
    if (this.geminiKeys.length + this.groqKeys.length + this.openRouterKeys.length === 0) {
      console.warn('⚠️  No API keys found — using built-in smart fallback AI.');
    }
  }

  // ── State Persistence ───────────────────────────────────────────────────────

  private async loadState() {
    try {
      const raw = await fs.readFile(this.stateFile, 'utf-8');
      const state = JSON.parse(raw);
      const now = Date.now();
      const restore = (keys: KeyStatus[], saved: any[]) => {
        keys.forEach((k, i) => {
          if (saved?.[i]) {
            if (saved[i].blacklistedUntil > now) k.blacklistedUntil = saved[i].blacklistedUntil;
            k.failureCount = saved[i].failureCount || 0;
          }
        });
      };
      restore(this.geminiKeys, state.gemini);
      restore(this.groqKeys, state.groq);
      restore(this.openRouterKeys, state.openrouter);
    } catch { /* fresh start */ }
  }

  private saveState() {
    const slim = (keys: KeyStatus[]) => keys.map(k => ({
      blacklistedUntil: k.blacklistedUntil, failureCount: k.failureCount,
    }));
    fs.mkdir(path.dirname(this.stateFile), { recursive: true })
      .then(() => fs.writeFile(this.stateFile, JSON.stringify({
        gemini: slim(this.geminiKeys),
        groq: slim(this.groqKeys),
        openrouter: slim(this.openRouterKeys),
      }, null, 2)))
      .catch(() => {});
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private getAvailable(keys: KeyStatus[]): KeyStatus[] {
    const now = Date.now();
    return keys.filter(k => !k.blacklistedUntil || k.blacklistedUntil <= now);
  }

  private blacklist(k: KeyStatus, duration?: number) {
    const ms = duration ?? Math.min(this.BLACKLIST_BASE * Math.pow(2, Math.min(k.failureCount, 4)), 600_000);
    k.blacklistedUntil = Date.now() + ms;
    k.failureCount++;
    console.warn(`🚫 Key ${k.key.substring(0, 14)}... blacklisted for ${Math.round(ms / 1000)}s`);
    this.saveState();
  }

  private async throttle() {
    const wait = this.MIN_INTERVAL - (Date.now() - this.lastRequestTime);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    this.lastRequestTime = Date.now();
  }

  private rotate<T extends { lastUsed: number }>(keys: T[]): T[] {
    // Sort by least-recently-used to spread load
    return [...keys].sort((a, b) => a.lastUsed - b.lastUsed);
  }

  // ── Provider 1: Gemini ──────────────────────────────────────────────────────

  private async tryGemini(prompt: string): Promise<string | null> {
    const available = this.getAvailable(this.geminiKeys);
    if (!available.length) return null;

    for (const key of this.rotate(available)) {
      for (const modelName of GEMINI_MODELS) {
        try {
          await this.throttle();
          const genAI = new GoogleGenerativeAI(key.key);
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: SYSTEM_INSTRUCTION,
          } as any);
          const result = await model.generateContent(prompt);
          const text = result.response.text().trim();
          if (!text) continue;
          key.lastUsed = Date.now();
          key.failureCount = Math.max(0, key.failureCount - 1);
          console.log(`✅ Gemini (${modelName})`);
          return text;
        } catch (e: any) {
          const s = e?.status;
          if (s === 429) { this.blacklist(key); break; }
          if (s === 401 || s === 403) { this.blacklist(key, 3_600_000); break; }
          // 404 = model unavailable, try next model
        }
      }
    }
    return null;
  }

  // ── Provider 2: Groq ────────────────────────────────────────────────────────

  private async tryGroq(prompt: string): Promise<string | null> {
    const available = this.getAvailable(this.groqKeys);
    if (!available.length) return null;

    for (const key of this.rotate(available)) {
      for (const modelId of GROQ_MODELS) {
        try {
          await this.throttle();
          const groq = new Groq({ apiKey: key.key });
          const completion = await groq.chat.completions.create({
            model: modelId,
            messages: [
              { role: 'system', content: SYSTEM_INSTRUCTION },
              { role: 'user', content: prompt },
            ],
            max_tokens: 300,
            temperature: 0.7,
          });
          const text = completion.choices[0]?.message?.content?.trim();
          if (!text) continue;
          key.lastUsed = Date.now();
          key.failureCount = Math.max(0, key.failureCount - 1);
          console.log(`✅ Groq (${modelId})`);
          return text;
        } catch (e: any) {
          const status = e?.status || e?.error?.status;
          if (status === 429) { this.blacklist(key); break; }
          if (status === 401) { this.blacklist(key, 3_600_000); break; }
        }
      }
    }
    return null;
  }

  // ── Provider 2 Stream: Groq ─────────────────────────────────────────────────

  private async *tryGroqStream(prompt: string): AsyncGenerator<string> {
    const available = this.getAvailable(this.groqKeys);
    if (!available.length) return;

    for (const key of this.rotate(available)) {
      for (const modelId of GROQ_MODELS) {
        try {
          await this.throttle();
          const groq = new Groq({ apiKey: key.key });
          const stream = await groq.chat.completions.create({
            model: modelId,
            messages: [
              { role: 'system', content: SYSTEM_INSTRUCTION },
              { role: 'user', content: prompt },
            ],
            max_tokens: 300,
            temperature: 0.7,
            stream: true,
          });
          let fullText = '';
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || '';
            if (delta) { fullText += delta; yield delta; }
          }
          if (fullText) {
            key.lastUsed = Date.now();
            console.log(`✅ Groq stream (${modelId})`);
            return;
          }
        } catch (e: any) {
          const status = e?.status || e?.error?.status;
          if (status === 429) { this.blacklist(key); break; }
          if (status === 401) { this.blacklist(key, 3_600_000); break; }
        }
      }
    }
  }

  // ── Provider 3: OpenRouter ──────────────────────────────────────────────────

  private async tryOpenRouter(prompt: string): Promise<string | null> {
    const available = this.getAvailable(this.openRouterKeys);
    if (!available.length) return null;

    for (const key of this.rotate(available)) {
      for (const modelId of OPENROUTER_MODELS) {
        try {
          await this.throttle();
          const client = new OpenAI({
            apiKey: key.key,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
              'HTTP-Referer': 'https://gurlz.ai',
              'X-Title': 'GURLZ Wellness AI',
            },
          });
          const completion = await client.chat.completions.create({
            model: modelId,
            messages: [
              { role: 'system', content: SYSTEM_INSTRUCTION },
              { role: 'user', content: prompt },
            ],
            max_tokens: 300,
          });
          const text = completion.choices[0]?.message?.content?.trim();
          if (!text) continue;
          key.lastUsed = Date.now();
          key.failureCount = Math.max(0, key.failureCount - 1);
          console.log(`✅ OpenRouter (${modelId})`);
          return text;
        } catch (e: any) {
          const status = e?.status;
          if (status === 429) { this.blacklist(key); break; }
          if (status === 401 || status === 402) { this.blacklist(key, 3_600_000); break; }
        }
      }
    }
    return null;
  }

  private async *tryOpenRouterStream(prompt: string): AsyncGenerator<string> {
    const available = this.getAvailable(this.openRouterKeys);
    if (!available.length) return;

    for (const key of this.rotate(available)) {
      for (const modelId of OPENROUTER_MODELS) {
        try {
          await this.throttle();
          const client = new OpenAI({
            apiKey: key.key,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
              'HTTP-Referer': 'https://gurlz.ai',
              'X-Title': 'GURLZ Wellness AI',
            },
          });
          const stream = await client.chat.completions.create({
            model: modelId,
            messages: [
              { role: 'system', content: SYSTEM_INSTRUCTION },
              { role: 'user', content: prompt },
            ],
            max_tokens: 300,
            stream: true,
          });
          let fullText = '';
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || '';
            if (delta) { fullText += delta; yield delta; }
          }
          if (fullText) {
            key.lastUsed = Date.now();
            console.log(`✅ OpenRouter stream (${modelId})`);
            return;
          }
        } catch (e: any) {
          const status = (e as any)?.status;
          if (status === 429) { this.blacklist(key); break; }
          if (status === 401) { this.blacklist(key, 3_600_000); break; }
        }
      }
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Generate a text response through the provider chain:
   * Gemini → Groq → OpenRouter → Smart Fallback
   */
  async generate(
    prompt: string,
    context = '',
    _userId?: string
  ): Promise<GeminiResponse> {
    const cacheKey = `${prompt.trim()}|${context}`;
    const hit = this.cache.get(cacheKey);
    if (hit && Date.now() - hit.ts < this.CACHE_TTL) {
      return { text: hit.response, keyUsed: 'cache', cached: true, provider: 'cache' };
    }

    const fullPrompt = context ? `[User context: ${context}]\n\nUser: ${prompt}` : prompt;

    // 1. Gemini
    let text = await this.tryGemini(fullPrompt);
    if (text) {
      this.cache.set(cacheKey, { response: text, ts: Date.now() });
      return { text, keyUsed: 'gemini', cached: false, provider: 'gemini' };
    }

    // 2. Groq
    text = await this.tryGroq(fullPrompt);
    if (text) {
      this.cache.set(cacheKey, { response: text, ts: Date.now() });
      return { text, keyUsed: 'groq', cached: false, provider: 'groq' };
    }

    // 3. OpenRouter
    text = await this.tryOpenRouter(fullPrompt);
    if (text) {
      this.cache.set(cacheKey, { response: text, ts: Date.now() });
      return { text, keyUsed: 'openrouter', cached: false, provider: 'openrouter' };
    }

    // 4. Smart Fallback
    const fallback = this.getFallbackResponse(prompt, context);
    return { text: fallback, keyUsed: 'fallback', cached: false, provider: 'fallback' };
  }

  /**
   * Streaming version: Gemini stream → Groq stream → OpenRouter stream → word-by-word fallback
   */
  async *generateStream(
    prompt: string,
    context = '',
    _userId?: string
  ): AsyncGenerator<string, void, unknown> {
    const fullPrompt = context ? `[User context: ${context}]\n\nUser: ${prompt}` : prompt;

    // 1. Gemini stream
    if (this.getAvailable(this.geminiKeys).length > 0) {
      let geminiSuccess = false;
      for (const key of this.rotate(this.getAvailable(this.geminiKeys))) {
        for (const modelName of GEMINI_MODELS) {
          try {
            await this.throttle();
            const genAI = new GoogleGenerativeAI(key.key);
            const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: SYSTEM_INSTRUCTION } as any);
            const result = await model.generateContentStream(fullPrompt);
            let fullText = '';
            for await (const chunk of result.stream) {
              const t = chunk.text();
              if (t) { fullText += t; yield t; }
            }
            if (fullText) {
              key.lastUsed = Date.now();
              console.log(`✅ Gemini stream (${modelName})`);
              geminiSuccess = true;
              return;
            }
          } catch (e: any) {
            const s = e?.status;
            if (s === 429) { this.blacklist(key); break; }
            if (s === 401 || s === 403) { this.blacklist(key, 3_600_000); break; }
          }
        }
        if (geminiSuccess) return;
      }
    }

    // 2. Groq stream
    let groqYielded = false;
    for await (const token of this.tryGroqStream(fullPrompt)) {
      groqYielded = true;
      yield token;
    }
    if (groqYielded) return;

    // 3. OpenRouter stream
    let orYielded = false;
    for await (const token of this.tryOpenRouterStream(fullPrompt)) {
      orYielded = true;
      yield token;
    }
    if (orYielded) return;

    // 4. Fallback word-by-word
    const fallback = this.getFallbackResponse(prompt, context);
    for (const word of fallback.split(' ')) {
      yield word + ' ';
      await new Promise(r => setTimeout(r, 25));
    }
  }

  // ── Feature Helpers ─────────────────────────────────────────────────────────

  async generateDashboardSummary(ctx: any): Promise<string> {
    const phasePrompts: Record<string, string> = {
      'Menstrual Phase': `User is day ${ctx.dayOfCycle} of menstrual phase. Wellness score ${ctx.wellnessScore}/100. Give a warm 1-sentence encouragement with a self-care tip.`,
      'Follicular Phase': `User is in follicular phase, energy rising. Wellness ${ctx.wellnessScore}/100. Motivate them to build momentum today.`,
      'Ovulatory Phase': `User is in ovulatory phase with peak energy. Wellness ${ctx.wellnessScore}/100. Celebrate their vitality briefly.`,
      'Luteal Phase': `User is in luteal phase. Wellness ${ctx.wellnessScore}/100. Suggest magnesium-rich foods and gentle self-care in 1-2 sentences.`,
    };
    const prompt = phasePrompts[ctx.cyclePhase] || phasePrompts['Follicular Phase'];
    const r = await this.generate(prompt, '');
    return r.text;
  }

  async generateAskAIResponse(userContext: any, query: string): Promise<string> {
    const r = await this.generate(query, JSON.stringify(userContext));
    return r.text;
  }

  async generateMealSuggestions(userContext: any, meal: any): Promise<string> {
    const r = await this.generate(
      `User logged "${meal.description}" (${meal.mealType}). Give one cycle-phase nutritional tip.`,
      JSON.stringify(userContext)
    );
    return r.text;
  }

  async generateSleepSuggestions(userContext: any, sleep: any): Promise<string> {
    const r = await this.generate(
      `User slept ${sleep.hours}h, quality "${sleep.quality}". Give one practical sleep tip.`,
      JSON.stringify(userContext)
    );
    return r.text;
  }

  async generateCravingAlternatives(
    cravings: string[],
    phase: string
  ): Promise<{ alternatives: string[]; advice: string }> {
    const r = await this.generate(
      `Cravings: [${cravings.join(', ')}] during ${phase}. Give 3 healthy alternatives and one tip. JSON only: {"alternatives":["a","b","c"],"advice":"tip"}`,
      ''
    );
    try {
      const m = r.text.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
    } catch { /* fallback below */ }
    return {
      alternatives: ['Dark Chocolate (70%+)', 'Mixed Nuts & Berries', 'Warm Honey Chamomile Tea'],
      advice: 'Cravings signal your body needs magnesium or iron — nourish yourself with love! 💕',
    };
  }

  // ── Smart Built-in Fallback ─────────────────────────────────────────────────

  getFallbackResponse(prompt: string, _context = ''): string {
    const p = prompt.toLowerCase();

    if (p.includes('period') || p.includes('menstrual') || p.includes('bleed') || p.includes('cramp')) {
      const opts = [
        'During your period, warmth is everything 🌸 Try a heat pad, iron-rich spinach, lentils, and warm ginger tea to ease cramps and replenish energy.',
        'Menstrual cramps ease with magnesium-rich foods like dark chocolate and almonds, light yoga, and staying warm. Your body is working hard — honour it! 💕',
        'Rest, nourish, and hydrate during your period. Iron-rich foods like eggs, leafy greens, and lean meat help replenish what your body loses. 🌷',
      ];
      return opts[Math.floor(Date.now() / 15_000) % opts.length];
    }

    if (p.includes('myth') || p.includes('fact')) {
      const myths = [
        '✨ Myth: Exercise makes cramps worse. Fact: Light movement like yoga or walking releases endorphins that naturally reduce period pain!',
        '✨ Myth: PMS is in your head. Fact: Hormonal shifts genuinely affect serotonin, causing real mood and energy changes — it\'s completely physiological.',
        '✨ Myth: You can\'t get pregnant on your period. Fact: It\'s unlikely but possible — sperm can survive 5+ days inside the body.',
        '✨ Myth: Irregular periods are always a problem. Fact: Cycles from 21–35 days are normal. Stress, travel, and diet all affect timing.',
      ];
      return myths[Math.floor(Date.now() / 15_000) % myths.length];
    }

    if (p.includes('pad') || p.includes('tampon') || p.includes('brand') || p.includes('cup') || p.includes('product') || p.includes('best pad')) {
      return '🌸 Top pads in India: **Whisper Ultra Soft** for light days, **Stayfree Secure XL** for heavy flow, **Sofy Anti-Bacterial** for sensitive skin. For eco-friendly: **Sirona** or **Carmesi** reusable cloth pads, or **Lena Cup** for menstrual cups!';
    }

    if (p.includes('water') || p.includes('hydrat') || p.includes('drink')) {
      return 'Hydration is cycle care! 💧 During menstruation, drink 8–10 glasses daily — warm water with lemon reduces bloating, and coconut water replenishes electrolytes lost during your period.';
    }

    if (p.includes('sleep') || p.includes('tired') || p.includes('fatigue') || p.includes('insomnia')) {
      return 'Your sleep quality directly impacts your cycle! 🌙 Keep a consistent sleep schedule, avoid screens 30 mins before bed, try magnesium glycinate supplements, and a warm chamomile tea to wind down.';
    }

    if (p.includes('food') || p.includes('eat') || p.includes('diet') || p.includes('nutrition')) {
      return '🥗 Eat for your cycle phase: Menstrual → iron & omega-3s (salmon, spinach). Follicular → light proteins & fermented foods. Ovulatory → raw veggies & seeds. Luteal → magnesium & complex carbs (oats, sweet potato).';
    }

    if (p.includes('mood') || p.includes('anxious') || p.includes('sad') || p.includes('stress') || p.includes('emotion')) {
      return 'Your luteal-phase emotions are real and hormonal 💕 Progesterone drops lower serotonin naturally. Try: 20-min walks, journaling, limiting caffeine, or calling someone you love. You\'re not alone in this.';
    }

    if (p.includes('exercise') || p.includes('workout') || p.includes('yoga') || p.includes('gym')) {
      return '🧘‍♀️ Sync exercise to your cycle! Menstrual: gentle yoga & walking. Follicular: cardio & strength training (energy rises!). Ovulatory: HIIT & group classes. Luteal: pilates, swimming & light stretching.';
    }

    if (p.includes('track period') || p.includes('log period') || p.includes('start period')) {
      return '📅 Go to **Cycle Tracker** in the left menu to log your period start date, flow level, and symptoms. I\'ll use this to predict your next cycle and tailor your daily wellness insights!';
    }

    if (p.includes('log symptom') || p.includes('symptom')) {
      return '📝 Head to **Cycle Tracker → Symptoms** to log cramps, bloating, headaches, or mood changes. Over time I\'ll identify your personal patterns and help you prepare for each phase!';
    }

    if (p.includes('hello') || p.includes('hi') || p.includes('hey') || p.includes('how are')) {
      return 'Hello gorgeous! 💕 I\'m GURLZ AI, your personal wellness companion. I can help with cycle tracking, cramp relief, nutrition, sleep, mood, and period products. What\'s on your mind today?';
    }

    if (p.includes('help') || p.includes('what can you') || p.includes('features')) {
      return 'I can help with: 📅 Cycle tracking | 🍎 Nutrition by phase | 💊 Symptom tracking | 😴 Sleep tips | 💬 Myth-busting | 🛍️ Product recommendations | 💆‍♀️ Mood & stress support. Just ask anything! 💕';
    }

    if (p.includes('music') || p.includes('playlist')) {
      return '🎵 Head to the **Music** section for curated playlists — soothing lo-fi for cramp days, upbeat pop for your energetic follicular phase, and calming instrumentals for luteal self-care!';
    }

    if (p.includes('find food') || p.includes('suggest food') || p.includes('what to eat')) {
      return '🍎 Visit **Food & Cravings** to log meals and get AI suggestions! Quick tip: dark chocolate + almonds satisfy cravings while delivering magnesium for cramp relief. Ginger tea helps nausea too!';
    }

    const defaults = [
      'I\'m here to support your wellness journey! 💕 Ask me about your cycle, nutrition, sleep, period products, or just how you\'re feeling today.',
      'Your body is incredible and deserves care every day ✨ Whether it\'s cycle questions, food tips, or stress relief — I\'ve got you covered. What do you need?',
      'Wellness is a journey, not a destination! 🌸 I can help with cycle tracking, cramp relief, mood support, and more. What would you like to explore?',
    ];
    return defaults[Math.floor(Date.now() / 20_000) % defaults.length];
  }

  // ── Stats ───────────────────────────────────────────────────────────────────

  getStats() {
    const now = Date.now();
    const status = (keys: KeyStatus[], name: string) => ({
      provider: name,
      total: keys.length,
      available: keys.filter(k => !k.blacklistedUntil || k.blacklistedUntil <= now).length,
      keys: keys.map((k, i) => ({
        index: i + 1,
        available: !k.blacklistedUntil || k.blacklistedUntil <= now,
        resumesAt: k.blacklistedUntil && k.blacklistedUntil > now
          ? new Date(k.blacklistedUntil).toISOString() : null,
      })),
    });
    return {
      providers: [
        status(this.geminiKeys, 'gemini'),
        status(this.groqKeys, 'groq'),
        status(this.openRouterKeys, 'openrouter'),
      ],
      cacheSize: this.cache.size,
    };
  }
}

// Singleton
export const geminiManager = new MultiProviderAI();
export default geminiManager;
