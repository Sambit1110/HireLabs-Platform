import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';

import { getSupabaseConfig } from '../lib/config.js';
import { getAiConfig } from '../lib/server/aiConfig.js';
import { AuthUnavailableError, ConfigurationError, authenticateRequest } from '../lib/server/auth.js';
import { consumeDailyQuota } from '../lib/server/quota.js';

const KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'USE_LOCAL_MODELS', 'OLLAMA_MODEL', 'AI_FEATURES_ENABLED', 'EVALUATOR_PROVIDER',
];
const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
const setEnv = (values) => {
  for (const key of KEYS) delete process.env[key];
  Object.assign(process.env, values);
};
afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe('Supabase configuration', () => {
  it('prefers the publishable key and reports only the variable name', () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://p.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'pub', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon' });
    const config = getSupabaseConfig();
    assert.equal(config.key, 'pub');
    assert.equal(config.keySource, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    assert.equal(config.configured, true);
  });

  it('falls back to the legacy anon key', () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://p.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon' });
    assert.equal(getSupabaseConfig().key, 'anon');
    assert.equal(getSupabaseConfig().keySource, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });

  it('is not configured without a key or with an invalid URL', () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://p.supabase.co' });
    assert.equal(getSupabaseConfig().configured, false);
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: 'not a url', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon' });
    assert.equal(getSupabaseConfig().configured, false);
  });

  it('server auth raises ConfigurationError (not 401) when unconfigured', async () => {
    setEnv({});
    const request = new Request('http://x', { headers: { Authorization: 'Bearer t' } });
    await assert.rejects(authenticateRequest(request), ConfigurationError);
  });
});

describe('server auth outcomes', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = realFetch; });
  const withAuthResponse = (status, body) => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://p.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'pub' });
    globalThis.fetch = async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    return authenticateRequest(new Request('http://x', { headers: { Authorization: 'Bearer some.jwt.value' } }));
  };

  it('returns null (401) when Supabase rejects the token', async () => {
    assert.equal(await withAuthResponse(401, { msg: 'invalid JWT' }), null);
  });

  it('raises AuthUnavailableError (503) when Supabase Auth fails', async () => {
    await assert.rejects(withAuthResponse(503, { msg: 'down' }), AuthUnavailableError);
  });
});

describe('AI configuration', () => {
  it('reports the team evaluator, with local models off by default', () => {
    setEnv({});
    const config = getAiConfig();
    assert.equal(config.localModels, false);
    assert.equal(config.evaluatorModel, 'hirelabs-explainer');
    assert.equal(config.enabled, true);
    setEnv({ USE_LOCAL_MODELS: 'true', OLLAMA_MODEL: 'hirelabs-evaluator-v2' });
    assert.equal(getAiConfig().localModels, true);
    assert.equal(getAiConfig().evaluatorModel, 'hirelabs-explainer');
    setEnv({ EVALUATOR_PROVIDER: 'ollama', OLLAMA_MODEL: 'hirelabs-evaluator-v2' });
    assert.equal(getAiConfig().evaluatorModel, 'hirelabs-evaluator-v2');
  });

  it('supports an emergency kill switch', () => {
    setEnv({ AI_FEATURES_ENABLED: 'false' });
    assert.equal(getAiConfig().enabled, false);
  });

  it('has no Gemini settings', () => {
    assert.equal(Object.keys(getAiConfig()).some((key) => /gemini|apiKey/i.test(key)), false);
  });
});

describe('shared daily quota', () => {
  const rpcReturning = (data, error = null) => ({ rpc: async () => ({ data, error }) });

  it('allows requests within the quota', async () => {
    assert.deepEqual(await consumeDailyQuota(rpcReturning([{ allowed: true }]), 'ai'), { allowed: true });
  });

  it('returns 429 with Retry-After when the quota is exhausted', async () => {
    const result = await consumeDailyQuota(rpcReturning([{ allowed: false, retry_after_seconds: 120 }]), 'ai');
    assert.equal(result.status, 429);
    assert.equal(result.retryAfterSeconds, 120);
  });

  it('fails closed (503) when the quota store is unavailable or not migrated', async () => {
    const result = await consumeDailyQuota(rpcReturning(null, { code: 'PGRST202', message: 'function not found' }), 'ai');
    assert.equal(result.allowed, false);
    assert.equal(result.status, 503);
  });
});
