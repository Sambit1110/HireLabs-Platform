import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { SAMPLE_EVALUATION } from '../lib/fixtures/sample-evaluation.js';
import { checkEvidence } from '../lib/ai/evidence.js';
import { evaluateLocally, estimateTokens, evaluatorContextSize } from '../lib/ai/local-llm.js';

vi.mock('@/lib/supabase/server-auth', () => ({
  authenticateRequest: vi.fn(async () => ({ supabase: {}, user: { id: 'user-1' } })),
}));
vi.mock('@/lib/api/ai-rate-limit', () => ({ checkAIRateLimit: () => null }));

const ENV_KEYS = ['USE_LOCAL_MODELS', 'OLLAMA_NUM_CTX', 'OLLAMA_MODEL', 'OLLAMA_URL', 'OLLAMA_KEY', 'EVALUATOR_PLACEHOLDER', 'ENABLE_BIAS_CHECK', 'EVALUATOR_PROVIDER', 'MODEL_SERVER_URL'];
const savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
const realFetch = globalThis.fetch;

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
  // These tests cover the Ollama evaluator; the explainer default has its own tests below.
  process.env.EVALUATOR_PROVIDER = 'ollama';
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

const analyzeRequest = (body) => new Request('http://localhost/api/ai-analyze', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    role: 'Backend Engineer',
    jobDescription: 'Build Node.js services on PostgreSQL.',
    ...body,
  }),
});
const candidateRequest = () => analyzeRequest({
  mode: 'candidate',
  candidate: { name: 'Priya Raman', parsedText: RESUME },
});

const ollamaReply = (result) => vi.fn(async () => new Response(
  JSON.stringify({ message: { content: JSON.stringify(result) } }),
  { status: 200, headers: { 'content-type': 'application/json' } },
));

const ROLE_BRIEF = {
  role_summary: 'Backend role.', seniority: 'Not specified', must_have_skills: ['Node.js'],
  nice_to_have_skills: [], responsibilities: ['Build services'], screening_signals: [], interview_focus: [],
};

describe('own models only', () => {
  it('runs role analysis on the HireLabs evaluator', async () => {
    process.env.USE_LOCAL_MODELS = 'true';
    globalThis.fetch = ollamaReply(ROLE_BRIEF);
    const { POST } = await import('../app/api/ai-analyze/route.js');

    const response = await POST(analyzeRequest({ mode: 'role' }));
    const { data } = await response.json();

    expect(response.status).toBe(200);
    expect(data.model_used).toBe('hirelabs-evaluator');
    expect(data.result.must_have_skills).toEqual(['Node.js']);
    expect(String(globalThis.fetch.mock.calls[0][0])).toContain('/api/chat');
  });

  it('sends extracted resume text separately and refuses resume text pasted into the job description', async () => {
    process.env.USE_LOCAL_MODELS = 'true';
    globalThis.fetch = ollamaReply(SAMPLE_EVALUATION);
    const { POST } = await import('../app/api/ai-analyze/route.js');

    const response = await POST(candidateRequest());
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    const userPrompt = body.messages.find((message) => message.role === 'user').content;

    expect(response.status).toBe(200);
    expect(userPrompt).toContain('JOB DESCRIPTION:\nBuild Node.js services on PostgreSQL.');
    expect(userPrompt).toContain(`RESUME TEXT:\n${RESUME}`);

    const contaminated = await POST(analyzeRequest({
      mode: 'candidate',
      jobDescription: 'Build Node.js services.\nRESUME: Java developer',
      candidate: { parsedText: RESUME },
    }));

    expect(contaminated.status).toBe(400);
    expect((await contaminated.json()).error.message).toMatch(/contains a RESUME section/);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns 503, with no other model tried, when the evaluator is down', async () => {
    process.env.USE_LOCAL_MODELS = 'true';
    globalThis.fetch = vi.fn(async () => { throw new TypeError('fetch failed'); });
    const { POST } = await import('../app/api/ai-analyze/route.js');

    const response = await POST(candidateRequest());

    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe('LOCAL_EVALUATOR_UNAVAILABLE');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns 503 when local models are turned off', async () => {
    globalThis.fetch = vi.fn();
    const { POST } = await import('../app/api/ai-analyze/route.js');

    const response = await POST(candidateRequest());

    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe('AI_UNAVAILABLE');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('has no Gemini code in the website', () => {
    const files = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(js|mjs|jsx|ts|tsx)$/.test(name)) files.push(path);
      }
    };
    ['app', 'lib', 'components', 'hooks'].forEach(walk);
    const offenders = files.filter((file) => /@google\/genai|generativelanguage\.googleapis|GEMINI_API_KEY/.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
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

  it('drops invented quotes from the evaluator before they reach the dashboard', async () => {
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

  it('answers 413 when the request is too long for the evaluator', async () => {
    process.env.USE_LOCAL_MODELS = 'true';
    process.env.OLLAMA_NUM_CTX = '2500';
    globalThis.fetch = vi.fn();
    const { POST } = await import('../app/api/ai-analyze/route.js');

    const response = await POST(candidateRequest());

    expect(response.status).toBe(413);
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

describe('hirelabs-explainer (default provider)', () => {
  const modelServer = () => vi.fn(async (url) => (String(url).endsWith('/embed')
    ? Response.json({ vectors: [Array(384).fill(0.05), Array(384).fill(0.05)], dim: 384, model_used: 'hirelabs-matcher' })
    : Response.json({ score: 80, verdict: 'strong', missingSkills: [] })));

  beforeEach(() => {
    delete process.env.EVALUATOR_PROVIDER;
    process.env.MODEL_SERVER_URL = 'https://models.example.test';
  });

  it('explains a candidate from our own models without calling Ollama', async () => {
    globalThis.fetch = modelServer();
    const { POST } = await import('../app/api/ai-analyze/route.js');
    const response = await POST(candidateRequest());
    const { data } = await response.json();

    expect(response.status).toBe(200);
    expect(data.model_used).toBe('hirelabs-explainer');
    expect(data.result.skill_gap_analysis.demonstrated_skills).toEqual(expect.arrayContaining(['Node.js', 'PostgreSQL']));
    expect(data.result.evidence_removed).toBe(0);
    const urls = globalThis.fetch.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.includes('/api/chat'))).toBe(false);
    expect(urls).toEqual(expect.arrayContaining(['https://models.example.test/embed', 'https://models.example.test/match']));
  });

  it('builds a role brief without any model call', async () => {
    globalThis.fetch = vi.fn();
    const { POST } = await import('../app/api/ai-analyze/route.js');
    const response = await POST(analyzeRequest({ mode: 'role' }));
    const { data } = await response.json();

    expect(response.status).toBe(200);
    expect(data.model_used).toBe('hirelabs-explainer');
    // Two named skills, topped up with typical Backend Engineer skills (and said so).
    expect(data.result.must_have_skills.slice(0, 2)).toEqual(['Node.js', 'PostgreSQL']);
    expect(data.result.must_have_skills).toEqual(expect.arrayContaining(['REST APIs', 'SQL']));
    expect(data.result.role_summary).toContain('typical for a backend engineer');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('still explains from skills alone when the model server is down', async () => {
    globalThis.fetch = vi.fn(async () => new Response('down', { status: 503 }));
    const { POST } = await import('../app/api/ai-analyze/route.js');
    const response = await POST(candidateRequest());
    const { data } = await response.json();

    expect(response.status).toBe(200);
    expect(data.result.fit_verdict).not.toBe('insufficient_evidence');
    expect(data.result.recruiter_insights.overall_assessment).toContain('skill coverage');
  });
});
