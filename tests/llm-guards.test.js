import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SAMPLE_EVALUATION } from '../lib/fixtures/sample-evaluation.js';
import { checkEvidence } from '../lib/ai/evidence.js';
import { evaluateLocally, estimateTokens, evaluatorContextSize } from '../lib/ai/local-llm.js';
import { geminiFallbackAllowed } from '../lib/ai/model-server.js';

const generateContent = vi.fn();

vi.mock('@/lib/supabase/server-auth', () => ({
  authenticateRequest: vi.fn(async () => ({ supabase: {}, user: { id: 'user-1' } })),
}));
vi.mock('@/lib/api/ai-rate-limit', () => ({ checkAIRateLimit: () => null }));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor() {
      this.models = { generateContent };
    }
  },
}));

const ENV_KEYS = [
  'GEMINI_API_KEY', 'DISABLE_GEMINI_FALLBACK', 'USE_LOCAL_MODELS', 'OLLAMA_NUM_CTX',
  'EVALUATOR_PLACEHOLDER', 'ENABLE_BIAS_CHECK',
];
const savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
const realFetch = globalThis.fetch;

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
  generateContent.mockReset();
});
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  globalThis.fetch = realFetch;
});

const RESUME = `Priya Raman — Backend Engineer
Rewrote the payments API in Node.js, cutting p95 latency
from 900 ms to 220 ms.
Designed and maintained PostgreSQL schemas for 30+ tables.`;

const candidateRequest = () => new Request('http://localhost/api/ai-analyze', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    mode: 'candidate',
    role: 'Backend Engineer',
    jobDescription: 'Build Node.js services on PostgreSQL.',
    candidate: { name: 'Priya Raman', parsedText: RESUME },
  }),
});

const ollamaReply = (result) => vi.fn(async () => new Response(
  JSON.stringify({ message: { content: JSON.stringify(result) } }),
  { status: 200, headers: { 'content-type': 'application/json' } },
));

describe('Gemini fallback switch', () => {
  it('is allowed only with a key and without DISABLE_GEMINI_FALLBACK=true', () => {
    expect(geminiFallbackAllowed()).toBe(false);
    process.env.GEMINI_API_KEY = 'test-key';
    expect(geminiFallbackAllowed()).toBe(true);
    process.env.DISABLE_GEMINI_FALLBACK = 'true';
    expect(geminiFallbackAllowed()).toBe(false);
  });

  it('candidate analysis returns 503 and never calls Gemini when the switch is on', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.DISABLE_GEMINI_FALLBACK = 'true';
    const { POST } = await import('../app/api/ai-analyze/route.js');

    const response = await POST(candidateRequest());

    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe('AI_UNAVAILABLE');
    expect(generateContent).not.toHaveBeenCalled();
  });
});

describe('evidence quotes', () => {
  it('keeps quotes found in the resume, even across line breaks and dash styles', () => {
    const { kept, removed } = checkEvidence([
      '"Rewrote the payments API in Node.js, cutting p95 latency from 900 ms to 220 ms."',
      '“Priya Raman - Backend Engineer”',
    ], RESUME);
    expect(kept).toHaveLength(2);
    expect(removed).toEqual([]);
  });

  it('removes an item whose quote is not in the resume', () => {
    const invented = '"Set up GitHub Actions CI for 6 services."';
    const { kept, removed } = checkEvidence([invented, 'Strong database design background.'], RESUME);
    expect(removed).toEqual([invented]);
    expect(kept).toEqual(['Strong database design background.']);
  });

  it('checks each part of a quote shortened with an ellipsis', () => {
    expect(checkEvidence(['"Rewrote the payments API … from 900 ms to 220 ms."'], RESUME).removed).toEqual([]);
    expect(checkEvidence(['"Rewrote the payments API … in Rust."'], RESUME).kept).toEqual([]);
  });

  it('drops invented quotes from the local evaluator before they reach the dashboard', async () => {
    process.env.USE_LOCAL_MODELS = 'true';
    globalThis.fetch = ollamaReply(SAMPLE_EVALUATION);
    const { POST } = await import('../app/api/ai-analyze/route.js');

    const response = await POST(candidateRequest());
    const { data } = await response.json();

    expect(response.status).toBe(200);
    expect(data.result.evidence_signals).toEqual(SAMPLE_EVALUATION.evidence_signals.slice(0, 2));
    expect(data.result.evidence_removed).toBe(1);
  });
});

describe('local evaluator context', () => {
  it('sends num_ctx, 16384 by default or OLLAMA_NUM_CTX when set', async () => {
    globalThis.fetch = ollamaReply({ ok: true });
    await evaluateLocally('short prompt', {});
    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body).options.num_ctx).toBe(16384);

    process.env.OLLAMA_NUM_CTX = '8192';
    expect(evaluatorContextSize()).toBe(8192);
    await evaluateLocally('short prompt', {});
    expect(JSON.parse(globalThis.fetch.mock.calls[1][1].body).options.num_ctx).toBe(8192);
  });

  it('refuses a prompt that would not fit instead of letting Ollama cut it', async () => {
    process.env.OLLAMA_NUM_CTX = '4096';
    globalThis.fetch = ollamaReply({ ok: true });
    const long = 'x'.repeat(20_000);

    expect(estimateTokens([{ role: 'user', content: long }])).toBeGreaterThan(4096);
    await expect(evaluateLocally(long, {})).rejects.toThrow(/context/);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('fits the largest request the route accepts in the default context', async () => {
    const { buildCandidateMessages, CANDIDATE_LIMITS } = await import('../lib/ai/candidate-prompt.js');
    const messages = buildCandidateMessages({
      role: 'r'.repeat(CANDIDATE_LIMITS.role),
      jobDescription: 'j'.repeat(CANDIDATE_LIMITS.jobDescription),
      candidate: {
        name: 'n'.repeat(CANDIDATE_LIMITS.name),
        title: 't'.repeat(CANDIDATE_LIMITS.title),
        skills: 's'.repeat(CANDIDATE_LIMITS.skills),
        parsedText: 'p'.repeat(CANDIDATE_LIMITS.resume),
      },
    });
    globalThis.fetch = ollamaReply({ ok: true });
    await expect(evaluateLocally(messages, {})).resolves.toEqual({ ok: true });
  });
});
