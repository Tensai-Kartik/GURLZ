import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface KeyStatus {
  key: string;
  blacklistedUntil: number | null;
  failureCount: number;
  lastUsed: number;
}

interface GeminiResponse {
  text: string;
  keyUsed: string;
  cached: boolean;
}

class GeminiKeyManager {
  private keys: KeyStatus[] = [];
  private currentIndex: number = 0;
  private cache: Map<string, { response: string; timestamp: number }> = new Map();
  private cacheTTL: number = 120000; // 120 seconds
  private blacklistDuration: number = 300000; // 5 minutes
  private stateFile: string;

  constructor() {
    this.stateFile = path.join(__dirname, '../../data/gemini-state.json');
    this.loadKeys();
    this.loadState();
  }

  private loadKeys() {
    const keysEnv = process.env.GEMINI_KEYS || '';
    const keys = keysEnv.split(',').map(k => k.trim()).filter(k => k.length > 0);
    
    if (keys.length === 0 && process.env.DEMO_MODE === 'true') {
      console.warn('⚠️  No Gemini keys provided. Running in DEMO_MODE with mocked responses.');
      return;
    }

    this.keys = keys.map(key => ({
      key,
      blacklistedUntil: null,
      failureCount: 0,
      lastUsed: 0,
    }));

    if (this.keys.length === 0) {
      throw new Error('No Gemini API keys provided. Set GEMINI_KEYS environment variable.');
    }
  }

  private async loadState() {
    try {
      const data = await fs.readFile(this.stateFile, 'utf-8');
      const state = JSON.parse(data);
      this.currentIndex = state.currentIndex || 0;
      
      // Restore blacklist status
      const now = Date.now();
      this.keys.forEach((keyStatus, index) => {
        if (state.keys && state.keys[index]) {
          const saved = state.keys[index];
          if (saved.blacklistedUntil && saved.blacklistedUntil > now) {
            keyStatus.blacklistedUntil = saved.blacklistedUntil;
          }
          keyStatus.failureCount = saved.failureCount || 0;
        }
      });
    } catch (error) {
      // State file doesn't exist yet, start fresh
      console.log('No existing Gemini state found, starting fresh.');
    }
  }

  private async saveState() {
    try {
      await fs.mkdir(path.dirname(this.stateFile), { recursive: true });
      const state = {
        currentIndex: this.currentIndex,
        keys: this.keys.map(k => ({
          blacklistedUntil: k.blacklistedUntil,
          failureCount: k.failureCount,
        })),
      };
      await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error('Failed to save Gemini state:', error);
    }
  }

  private getNextAvailableKey(): KeyStatus | null {
    const now = Date.now();
    const availableKeys = this.keys.filter(
      k => !k.blacklistedUntil || k.blacklistedUntil <= now
    );

    if (availableKeys.length === 0) {
      // All keys blacklisted, reset blacklist
      console.warn('⚠️  All keys blacklisted, resetting...');
      this.keys.forEach(k => {
        k.blacklistedUntil = null;
        k.failureCount = 0;
      });
      return this.keys[this.currentIndex % this.keys.length];
    }

    // Round-robin selection
    const startIndex = this.currentIndex % availableKeys.length;
    for (let i = 0; i < availableKeys.length; i++) {
      const index = (startIndex + i) % availableKeys.length;
      const keyStatus = availableKeys[index];
      const originalIndex = this.keys.indexOf(keyStatus);
      this.currentIndex = originalIndex;
      return keyStatus;
    }

    return null;
  }

  private blacklistKey(keyStatus: KeyStatus, duration: number = this.blacklistDuration) {
    keyStatus.blacklistedUntil = Date.now() + duration;
    keyStatus.failureCount += 1;
    console.warn(`🚫 Blacklisted Gemini key for ${duration / 1000}s (failures: ${keyStatus.failureCount})`);
    this.saveState();
  }

  private getCacheKey(prompt: string, context: string = ''): string {
    return `${prompt}:${context}`;
  }

  async generate(
    prompt: string,
    context: string = '',
    userId?: string
  ): Promise<GeminiResponse> {
    // Check cache
    const cacheKey = this.getCacheKey(prompt, context);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log('✅ Using cached Gemini response');
      return {
        text: cached.response,
        keyUsed: 'cache',
        cached: true,
      };
    }

    // Demo mode fallback
    if (process.env.DEMO_MODE === 'true' && this.keys.length === 0) {
      const mockResponse = this.getMockResponse(prompt);
      return {
        text: mockResponse,
        keyUsed: 'demo',
        cached: false,
      };
    }

    const keyStatus = this.getNextAvailableKey();
    if (!keyStatus) {
      throw new Error('No available Gemini API keys');
    }

    let lastError: Error | null = null;
    const maxRetries = this.keys.length;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const genAI = new GoogleGenerativeAI(keyStatus.key);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        const fullPrompt = context
          ? `Context: ${context}\n\nUser: ${prompt}\n\nAssistant:`
          : prompt;

        const result = await model.generateContent(fullPrompt);
        const response = result.response;
        const text = response.text();

        // Success - update state
        keyStatus.lastUsed = Date.now();
        keyStatus.failureCount = Math.max(0, keyStatus.failureCount - 1);
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        this.saveState();

        // Cache the response
        this.cache.set(cacheKey, {
          response: text,
          timestamp: Date.now(),
        });

        // Log usage
        if (userId) {
          await this.logUsage(userId, keyStatus.key, true);
        }

        return {
          text,
          keyUsed: keyStatus.key.substring(0, 10) + '...',
          cached: false,
        };
      } catch (error: any) {
        lastError = error;
        const statusCode = error?.status || error?.response?.status || 500;

        // Handle rate limits and auth errors
        if (statusCode === 429 || statusCode === 401 || statusCode === 403) {
          const backoffDuration = this.blacklistDuration * (attempt + 1);
          this.blacklistKey(keyStatus, backoffDuration);
          
          // Try next key
          const nextKey = this.getNextAvailableKey();
          if (nextKey && nextKey !== keyStatus) {
            keyStatus.key = nextKey.key;
            continue;
          }
        }

        // For other errors, try next key
        if (attempt < maxRetries - 1) {
          const nextKey = this.getNextAvailableKey();
          if (nextKey) {
            keyStatus.key = nextKey.key;
            continue;
          }
        }
      }
    }

    // All retries failed
    if (userId) {
      await this.logUsage(userId, keyStatus.key, false);
    }

    throw lastError || new Error('Failed to generate response from Gemini');
  }

  async *generateStream(
    prompt: string,
    context: string = '',
    userId?: string
  ): AsyncGenerator<string, void, unknown> {
    // Demo mode fallback
    if (process.env.DEMO_MODE === 'true' && this.keys.length === 0) {
      const mockResponse = this.getMockResponse(prompt);
      for (const word of mockResponse.split(' ')) {
        yield word + ' ';
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return;
    }

    const keyStatus = this.getNextAvailableKey();
    if (!keyStatus) {
      throw new Error('No available Gemini API keys');
    }

    try {
      const genAI = new GoogleGenerativeAI(keyStatus.key);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const fullPrompt = context
        ? `Context: ${context}\n\nUser: ${prompt}\n\nAssistant:`
        : prompt;

      const result = await model.generateContentStream(fullPrompt);
      
      let fullText = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        yield chunkText;
      }

      // Cache the full response
      const cacheKey = this.getCacheKey(prompt, context);
      this.cache.set(cacheKey, {
        response: fullText,
        timestamp: Date.now(),
      });

      keyStatus.lastUsed = Date.now();
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
      this.saveState();

      if (userId) {
        await this.logUsage(userId, keyStatus.key, true);
      }
    } catch (error: any) {
      const statusCode = error?.status || error?.response?.status || 500;
      if (statusCode === 429 || statusCode === 401 || statusCode === 403) {
        this.blacklistKey(keyStatus);
      }
      throw error;
    }
  }

  private getMockResponse(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi')) {
      return "Hello! I'm Kyra, your AI wellness companion. How can I help you today? I'm here to support you through your cycle, track symptoms, and provide comfort. 💕";
    }
    
    if (lowerPrompt.includes('period') || lowerPrompt.includes('cycle')) {
      return "I can help you track your menstrual cycle! Would you like to log your period start date, track symptoms, or get insights about your cycle patterns?";
    }
    
    if (lowerPrompt.includes('pain') || lowerPrompt.includes('cramp')) {
      return "I'm sorry you're experiencing discomfort. Here are some gentle suggestions: try a warm compress, light stretching, or breathing exercises. Would you like me to set a reminder for pain medication?";
    }
    
    if (lowerPrompt.includes('mood') || lowerPrompt.includes('feeling')) {
      return "Your feelings are valid. Periods can affect mood due to hormonal changes. Would you like to log your mood in your diary, or would you prefer some calming music or affirmations?";
    }
    
    return "I'm here to help! I can assist with cycle tracking, symptom logging, finding comfort foods, setting reminders, or just being a supportive companion. What would you like to do?";
  }

  private async logUsage(userId: string, key: string, success: boolean) {
    try {
      const prisma = await import('../config/database.js');
      await prisma.default.log.create({
        data: {
          userId,
          type: 'gemini_usage',
          payload: JSON.stringify({
            key: key.substring(0, 10) + '...',
            success,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    } catch (error) {
      console.error('Failed to log Gemini usage:', error);
    }
  }

  getStats() {
    const now = Date.now();
    return {
      totalKeys: this.keys.length,
      availableKeys: this.keys.filter(k => !k.blacklistedUntil || k.blacklistedUntil <= now).length,
      currentIndex: this.currentIndex,
      keys: this.keys.map(k => ({
        key: k.key.substring(0, 10) + '...',
        blacklisted: k.blacklistedUntil ? k.blacklistedUntil > now : false,
        failureCount: k.failureCount,
      })),
    };
  }
}

export const geminiManager = new GeminiKeyManager();
export default geminiManager;

