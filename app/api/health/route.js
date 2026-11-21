import { createClient } from '@supabase/supabase-js';

import { getSupabaseConfig } from '@/lib/config';
import { getAiConfig } from '@/lib/server/aiConfig';
import { jsonError } from '@/lib/server/guard';
import { checkRateLimits, createRateLimiter } from '@/lib/server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REQUIRED_SCHEMA_VERSION = 4;
const DB_TIMEOUT_MS = 5000;
const ipLimiter = createRateLimiter({ name: 'health-ip', limit: 30, windowMs: 60_000 });

/**
 * Public, read-only deployment health.
 * Reports configuration *presence* and schema state only: never keys, tokens,
 * URLs or raw provider/database errors. It never calls Gemini (cost).
 */
async function checkDatabase({ url, key }) {
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  try {
    const { data, error } = await supabase
      .rpc('hirelabs_schema_status')
      .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));

    if (error) {
      // PGRST202 = function not found: the database answered, migration 004 is missing.
      if (error.code === 'PGRST202') {
        return { database: 'connected', schema: 'outdated', missing: ['migration_004'] };
      }
      console.error('Health DB check failed:', error.code ?? 'unknown');
      return { database: 'error', schema: 'unknown' };
    }

    const missing = Object.entries(data ?? {})
      .filter(([name, value]) => name !== 'version' && value !== true)
      .map(([name]) => name);
    const current = Number(data?.version) >= REQUIRED_SCHEMA_VERSION && missing.length === 0;

    return { database: 'connected', schema: current ? 'verified' : 'incomplete', schemaVersion: data?.version ?? null, missing };
  } catch (error) {
    console.error('Health DB check failed:', error?.name ?? 'unknown');
    return { database: 'error', schema: 'unknown' };
  }
}

export async function GET(request) {
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const limited = await checkRateLimits([ipLimiter], ip);
  if (limited) {
    return jsonError(429, 'Too many requests.', { 'Retry-After': String(limited.retryAfterSeconds) });
  }

  const supabaseConfig = getSupabaseConfig();
  const ai = getAiConfig();

  const db = supabaseConfig.configured
    ? await checkDatabase(supabaseConfig)
    : { database: 'not_configured', schema: 'unknown' };

  const healthy = supabaseConfig.configured && db.database === 'connected' && db.schema === 'verified';

  const body = {
    application: 'ok',
    status: healthy ? 'ok' : 'degraded',
    supabase_configured: supabaseConfig.configured,
    supabase_key_variable: supabaseConfig.keySource,
    database: db.database,
    schema_version: db.schema,
    ...(db.missing?.length ? { schema_missing: db.missing } : {}),
    gemini_configured: ai.configured,
    gemini_model: ai.model,
    ai_enabled: ai.enabled,
    checked_at: new Date().toISOString(),
  };

  return Response.json(body, {
    status: healthy ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
