// Server-only: reads GEMINI_API_KEY. Never import from client components.

import { DEFAULT_MODEL } from '../ai/analyze.js';

const positiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export function getAiConfig() {
  const apiKey = process.env.GEMINI_API_KEY || '';
  return {
    apiKey,
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    modelFromEnv: Boolean(process.env.GEMINI_MODEL),
    configured: Boolean(apiKey),
    // Emergency kill switch: AI_FEATURES_ENABLED=false turns every AI call off.
    enabled: (process.env.AI_FEATURES_ENABLED ?? 'true').toLowerCase() !== 'false',
    userDailyLimit: positiveInt(process.env.AI_USER_DAILY_LIMIT, 50),
    globalDailyLimit: positiveInt(process.env.AI_GLOBAL_DAILY_LIMIT, 1000),
  };
}
