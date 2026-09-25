import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { MemoryRateLimitStore, checkRateLimits, createRateLimiter } from '../lib/server/rateLimit.js';
import { guardRequest, readJsonBody } from '../lib/server/guard.js';
import { AiProviderError, buildCandidatePrompt, buildRolePrompt, parseJsonOutput, runAnalysis } from '../lib/ai/analyze.js';

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-key';

const request = (headers = {}) => new Request('http://localhost/api/test', { method: 'POST', headers });

describe('rate limiter', () => {
  it('allows up to the limit, then rejects with a retry hint', async () => {
    const limiter = createRateLimiter({ name: 't', limit: 2, windowMs: 60_000 });
    const now = 1_000_000;

    assert.equal((await limiter.check('user', now)).allowed, true);
    assert.equal((await limiter.check('user', now)).allowed, true);
    const third = await limiter.check('user', now + 1000);
    assert.equal(third.allowed, false);
    assert.equal(third.retryAfterSeconds, 59);
  });

  it('tracks identities separately and resets after the window', async () => {
    const limiter = createRateLimiter({ name: 't', limit: 1, windowMs: 1000 });
    assert.equal((await limiter.check('a', 0)).allowed, true);
    assert.equal((await limiter.check('b', 0)).allowed, true);
    assert.equal((await limiter.check('a', 500)).allowed, false);
    assert.equal((await limiter.check('a', 1000)).allowed, true);
  });

  it('reports the first limiter that rejects', async () => {
    const minute = createRateLimiter({ name: 'minute', limit: 5, windowMs: 60_000 });
    const burst = createRateLimiter({ name: 'burst', limit: 1, windowMs: 1000 });
    assert.equal(await checkRateLimits([minute, burst], 'u', 0), null);
    assert.equal((await checkRateLimits([minute, burst], 'u', 1)).limiter, 'burst');
  });

  it('bounds memory by pruning expired windows', async () => {
    const store = new MemoryRateLimitStore({ maxKeys: 3 });
    for (let index = 0; index < 10; index += 1) await store.increment(`k${index}`, 10, index * 100);
    assert.ok(store.windows.size <= 3);
  });
});

describe('guardRequest', () => {
  it('returns 401 when no bearer token is sent', async () => {
    const { response } = await guardRequest(request(), {});
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'Unauthorized' });
  });

  it('returns 401 for a malformed Authorization header without calling Supabase', async () => {
    const { response } = await guardRequest(request({ Authorization: 'Basic abc' }), {});
    assert.equal(response.status, 401);
  });

  it('returns 429 with Retry-After once the per-IP limit is exceeded', async () => {
    const ipLimiters = [createRateLimiter({ name: 'ip-test', limit: 1, windowMs: 60_000 })];
    const headers = { 'x-forwarded-for': '203.0.113.9' };

    const first = await guardRequest(request(headers), { ipLimiters });
    assert.equal(first.response.status, 401);

    const second = await guardRequest(request(headers), { ipLimiters });
    assert.equal(second.response.status, 429);
    assert.ok(Number(second.response.headers.get('Retry-After')) > 0);
  });
});

describe('AI analysis (mocked Gemini)', () => {
  const okFetch = (body) => async () => new Response(JSON.stringify(body), { status: 200 });

  it('returns parsed JSON from the provider output', async () => {
    const result = await runAnalysis({
      mode: 'role',
      input: 'prompt',
      apiKey: 'k',
      fetchImpl: okFetch({ output_text: '```json\n{"role_summary":"x"}\n```' }),
    });
    // Output is sanitized to the full schema shape.
    assert.equal(result.role_summary, 'x');
    assert.deepEqual(result.must_have_skills, []);
    assert.equal(result.seniority, '');
  });

  it('reads text parts when output_text is absent', async () => {
    const result = await runAnalysis({
      mode: 'candidate',
      input: 'p',
      apiKey: 'k',
      fetchImpl: okFetch({ output: [{ content: { parts: [{ text: '{"fit_verdict":"strong"}' }] } }] }),
    });
    assert.equal(result.fit_verdict, 'strong');
  });

  it('does not leak provider error details to the caller', async () => {
    const fetchImpl = async () => new Response(JSON.stringify({ error: { message: 'API key abc123 invalid for project 42' } }), { status: 400 });
    await assert.rejects(
      runAnalysis({ mode: 'role', input: 'p', apiKey: 'k', fetchImpl }),
      (error) => error instanceof AiProviderError && !/abc123|project 42/.test(error.message)
    );
  });

  it('maps network failures and unreadable output to friendly errors', async () => {
    await assert.rejects(
      runAnalysis({ mode: 'role', input: 'p', apiKey: 'k', fetchImpl: async () => { throw new Error('ECONNRESET'); } }),
      /did not respond/
    );
    assert.throws(() => parseJsonOutput('not json at all'), AiProviderError);
  });

  it('sends the API key only in a header, never in the URL', async () => {
    let captured;
    await runAnalysis({
      mode: 'role',
      input: 'p',
      apiKey: 'secret-key',
      fetchImpl: async (url, init) => {
        captured = { url, init };
        return new Response(JSON.stringify({ output_text: '{}' }));
      },
    });
    assert.ok(!captured.url.includes('secret-key'));
    assert.equal(captured.init.headers['x-goog-api-key'], 'secret-key');
  });
});

describe('AI abuse limits', () => {
  it('rejects bodies whose Content-Length exceeds the cap with 413', async () => {
    const big = JSON.stringify({ mode: 'role', role: 'x', jobDescription: 'a'.repeat(100_000) });
    const result = await readJsonBody(new Request('http://x', { method: 'POST', body: big }), 64 * 1024);
    assert.equal(result.response.status, 413);
  });

  it('rejects oversized chunked bodies with no Content-Length while streaming', async () => {
    let pulled = 0;
    const stream = new ReadableStream({
      pull(controller) {
        pulled += 1;
        if (pulled > 1000) return controller.close();
        controller.enqueue(new Uint8Array(16 * 1024));
      },
    });
    const request = new Request('http://x', { method: 'POST', body: stream, duplex: 'half' });
    assert.equal(request.headers.get('content-length'), null);
    const result = await readJsonBody(request, 64 * 1024);
    assert.equal(result.response.status, 413);
    assert.ok(pulled < 10, `stopped reading early (read ${pulled} chunks)`);
  });

  it('accepts normal bodies and tolerates invalid JSON', async () => {
    const ok = await readJsonBody(new Request('http://x', { method: 'POST', body: '{"mode":"role"}' }), 1024);
    assert.deepEqual(ok.data, { mode: 'role' });
    const bad = await readJsonBody(new Request('http://x', { method: 'POST', body: '{nope' }), 1024);
    assert.equal(bad.data, null);
  });

  it('bounds the prompt sent to Gemini regardless of field sizes', () => {
    const huge = 'x'.repeat(1_000_000);
    const candidate = buildCandidatePrompt({
      role: huge,
      jobDescription: huge,
      candidate: { name: huge, title: huge, skills: [huge, huge], parsedText: huge, yearsExperience: 5 },
    });
    const role = buildRolePrompt({ role: huge, jobDescription: huge });
    // 300 + 10k + 200 + 200 + 3k + 30k of user data plus fixed instructions.
    assert.ok(candidate.length < 45_000, `candidate prompt ${candidate.length}`);
    assert.ok(role.length < 13_500, `role prompt ${role.length}`);
  });
});
