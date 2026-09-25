import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getSupabaseConfig } from '../lib/config.js';
import { getAiConfig } from '../lib/server/aiConfig.js';
import { AuthUnavailableError, ConfigurationError, authenticateRequest } from '../lib/server/auth.js';
import { consumeDailyQuota } from '../lib/server/quota.js';
import { MAX_OUTPUT_TOKENS, runAnalysis, sanitizeResult } from '../lib/ai/analyze.js';

const KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'GEMINI_API_KEY', 'GEMINI_MODEL', 'AI_FEATURES_ENABLED',
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
  it('reads key/model on the server with a stable default model', () => {
    setEnv({ GEMINI_API_KEY: 'k' });
    const config = getAiConfig();
    assert.equal(config.configured, true);
    assert.equal(config.model, 'gemini-3.7-flash');
    assert.equal(config.enabled, true);
    setEnv({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'gemini-3.8-flash' });
    assert.equal(getAiConfig().model, 'gemini-3.8-flash');
  });

  it('supports an emergency kill switch', () => {
    setEnv({ GEMINI_API_KEY: 'k', AI_FEATURES_ENABLED: 'false' });
    assert.equal(getAiConfig().enabled, false);
  });
});

describe('Gemini request limits', () => {
  it('sets max_output_tokens and disables server-side storage', async () => {
    let sent;
    await runAnalysis({
      mode: 'role', input: 'p', apiKey: 'k', model: 'm',
      fetchImpl: async (url, init) => { sent = JSON.parse(init.body); return new Response(JSON.stringify({ output_text: '{}' })); },
    });
    assert.equal(sent.generation_config.max_output_tokens, MAX_OUTPUT_TOKENS);
    assert.equal(sent.store, false);
    assert.equal(sent.response_format.mime_type, 'application/json');
  });

  it('rejects oversized provider output', async () => {
    await assert.rejects(runAnalysis({
      mode: 'role', input: 'p', apiKey: 'k',
      fetchImpl: async () => new Response(JSON.stringify({ output_text: `{"role_summary":"${'x'.repeat(70_000)}"}` })),
    }), /too large/);
  });

  it('sanitizes results to the schema with bounded sizes', () => {
    const result = sanitizeResult('candidate', {
      candidate_summary: 's'.repeat(5000), fit_verdict: 'amazing', confidence: 250,
      strengths: ['a', 42, '', ...Array(30).fill('x'.repeat(2000))], extra_field: 'dropped',
    });
    assert.equal(result.candidate_summary.length, 2000);
    assert.equal(result.fit_verdict, 'insufficient_evidence');
    assert.equal(result.confidence, 100);
    assert.equal(result.strengths.length, 10);
    assert.ok(result.strengths.every((item) => typeof item === 'string' && item.length <= 600));
    assert.equal('extra_field' in result, false);
    assert.deepEqual(result.gaps, []);
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
