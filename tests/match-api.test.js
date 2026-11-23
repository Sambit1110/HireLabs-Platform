import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import assert from 'node:assert/strict';

import { createDeterministicEmbedding, embedText, embedTexts } from '../lib/resume/embedding.js';

const PRIYA_TEXT = 'Priya Raman\nBackend Engineer\nSkills: Node.js, PostgreSQL\nBuilt payment APIs in Node.js on PostgreSQL for 4 years, cutting p95 latency from 900 ms to 220 ms.';
const mockRpc = vi.fn();
const mockInsert = vi.fn().mockReturnValue(Promise.resolve({ error: null }));
const mockFrom = vi.fn().mockImplementation((table) => {
  if (table === 'job_descriptions') {
    return { insert: mockInsert };
  }
  if (table === 'resumes') {
    return {
      select: () => ({
        in: () => ({
          eq: () => Promise.resolve({
            data: [
              {
                id: '11111111-1111-1111-1111-111111111111',
                candidate_name: 'Priya Raman',
                candidate_title: 'Senior Backend Engineer',
                years_experience: 7,
                extracted_skills: ['Node.js', 'PostgreSQL'],
                profile_completeness: 100,
                parsed_text: PRIYA_TEXT,
              },
            ],
            error: null,
          }),
        }),
      }),
    };
  }
  return { insert: mockInsert };
});

const mockSupabase = {
  rpc: mockRpc,
  from: mockFrom,
};

let mockAuthUser = { id: 'test-user-id' };
let mockAuthResponse = null;

vi.mock('@/lib/supabase/server-auth', () => ({
  authenticateRequest: vi.fn(async () => {
    if (mockAuthResponse) return { response: mockAuthResponse };
    return { supabase: mockSupabase, user: mockAuthUser };
  }),
}));

describe('createDeterministicEmbedding', () => {
  it('generates a 384-dimensional vector', () => {
    const vec = createDeterministicEmbedding('Senior Software Engineer with Node.js and Postgres');
    assert.equal(vec.length, 384);
    assert.ok(vec.every((v) => typeof v === 'number' && !Number.isNaN(v)));
  });

  it('produces unit L2 norm (normalized for cosine similarity)', () => {
    const vec = createDeterministicEmbedding('Frontend React Developer');
    const normSq = vec.reduce((sum, v) => sum + v * v, 0);
    assert.ok(Math.abs(Math.sqrt(normSq) - 1.0) < 0.01, 'Vector should be L2-normalized');
  });

  it('is deterministic: same input produces identical vector', () => {
    const vec1 = createDeterministicEmbedding('Machine Learning Engineer');
    const vec2 = createDeterministicEmbedding('Machine Learning Engineer');
    assert.deepEqual(vec1, vec2);
  });

  it('produces different vectors for different inputs', () => {
    const vec1 = createDeterministicEmbedding('Frontend React Developer');
    const vec2 = createDeterministicEmbedding('Senior Backend Engineer');
    assert.notDeepEqual(vec1, vec2);
  });
});

describe('embedTexts & embedText', () => {
  it('returns empty array when input list is empty', async () => {
    const res = await embedTexts([]);
    assert.deepEqual(res.vectors, []);
    assert.equal(res.dim, 384);
  });

  it('generates 384-d vector for a single text', async () => {
    process.env.EMBED_MOCK = 'true';
    try {
      const res = await embedText('Software Engineer');
      assert.equal(res.vector.length, 384);
      assert.equal(res.dim, 384);
      assert.ok(res.model_used.includes('hirelabs-matcher'));
    } finally {
      delete process.env.EMBED_MOCK;
    }
  });
});

describe('POST /api/match contract', () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockInsert.mockReset();
    mockAuthUser = { id: 'test-user-id' };
    mockAuthResponse = null;
    process.env.EMBED_MOCK = 'true';
  });

  it('rejects unauthenticated requests with 401', async () => {
    const { apiError } = await import('@/lib/api/response');
    mockAuthResponse = apiError('UNAUTHORIZED', 'A valid sign-in session is required.', 401);

    const { POST: matchHandler } = await import('../app/api/match/route.js');
    const req = new Request('http://localhost:3000/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_description: 'Node.js developer' }),
    });

    const res = await matchHandler(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects empty job_description with 400', async () => {
    const { POST: matchHandler } = await import('../app/api/match/route.js');
    const req = new Request('http://localhost:3000/api/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ job_description: '   ' }),
    });

    const res = await matchHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INVALID_REQUEST');
  });

  it('rejects malformed JSON with 400', async () => {
    const { POST: matchHandler } = await import('../app/api/match/route.js');
    const req = new Request('http://localhost:3000/api/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: 'not a valid json {',
    });

    const res = await matchHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INVALID_JSON');
  });

  it('successfully ranks resumes and returns enriched match results', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          file_name: 'priya_backend.pdf',
          similarity: 0.8842,
        },
      ],
      error: null,
    });

    const { POST: matchHandler } = await import('../app/api/match/route.js');
    const req = new Request('http://localhost:3000/api/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        job_description: 'Seeking Senior Backend Engineer with Node.js and Postgres experience.',
        title: 'Senior Backend Engineer',
        match_count: 5,
      }),
    });

    const res = await matchHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.dim).toBe(384);
    expect(json.data.count).toBe(1);
    expect(json.data.model_used).toBe('hirelabs-matcher-fixture');

    const firstMatch = json.data.matches[0];
    expect(firstMatch.id).toBe('11111111-1111-1111-1111-111111111111');
    expect(firstMatch.file_name).toBe('priya_backend.pdf');
    expect(firstMatch.similarity).toBe(0.8842);
    expect(firstMatch.candidate_name).toBe('Priya Raman');
    expect(firstMatch.candidate_title).toBe('Senior Backend Engineer');
    expect(firstMatch.years_experience).toBe(7);
    // USE_LOCAL_MODELS is off here, so hirelabs-llm is not asked.
    expect(firstMatch.llm_fit).toBeNull();
    expect(json.data.llm_model).toBeNull();
    expect(firstMatch).not.toHaveProperty('parsed_text');
  });

  describe('with hirelabs-llm', () => {
    const realFetch = globalThis.fetch;
    const match = (fetchImpl) => {
      process.env.USE_LOCAL_MODELS = 'true';
      process.env.MODEL_SERVER_URL = 'https://models.example.test';
      globalThis.fetch = vi.fn(fetchImpl);
      mockRpc.mockResolvedValue({
        data: [{ id: '11111111-1111-1111-1111-111111111111', file_name: 'priya_backend.pdf', similarity: 0.8842 }],
        error: null,
      });
      return import('../app/api/match/route.js').then(({ POST }) =>
        POST(new Request('http://localhost:3000/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
          body: JSON.stringify({ job_description: 'Backend Engineer\nRequired skills: Node.js, Kafka' }),
        }))
      );
    };

    afterEach(() => {
      delete process.env.USE_LOCAL_MODELS;
      delete process.env.MODEL_SERVER_URL;
      globalThis.fetch = realFetch;
    });

    it('adds the LLM fit score to each scored match', async () => {
      const res = await match(async () => Response.json({
        score: 82, verdict: 'strong', pmi: 0.05, missingSkills: ['Kafka'], model_used: 'hirelabs-llm',
      }));
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.data.llm_model).toBe('hirelabs-llm');
      expect(json.data.matches[0].llm_fit).toEqual({ score: 82, verdict: 'strong', missing_skills: ['Kafka'] });
      const [url, init] = globalThis.fetch.mock.calls[0];
      expect(String(url)).toBe('https://models.example.test/match');
      expect(JSON.parse(init.body)).toEqual({
        job: 'Backend Engineer\nRequired skills: Node.js, Kafka',
        resume: PRIYA_TEXT,
      });
    });

    it('shows the same fit score as Explain score, and ranks by it', async () => {
      const job = 'Backend Engineer\nRequired skills: Node.js, PostgreSQL, Kafka';
      globalThis.fetch = vi.fn(async () => Response.json({ score: 70, verdict: 'moderate', missingSkills: ['Kafka'] }));
      process.env.USE_LOCAL_MODELS = 'true';
      process.env.MODEL_SERVER_URL = 'https://models.example.test';
      mockRpc.mockResolvedValue({
        data: [{ id: '11111111-1111-1111-1111-111111111111', file_name: 'priya_backend.pdf', similarity: 0.6123 }],
        error: null,
      });
      const { POST: rank } = await import('../app/api/match/route.js');
      const ranked = await (await rank(new Request('http://localhost:3000/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
        body: JSON.stringify({ job_description: job }),
      }))).json();
      const match = ranked.data.matches[0];
      expect(match.fit.score).toEqual(expect.any(Number));
      expect(match.signals).toEqual({ similarity: 0.6123, llmScore: 70 });

      vi.doMock('@/lib/api/ai-rate-limit', () => ({ checkAIRateLimit: () => null }));
      const { POST: explain } = await import('../app/api/ai-analyze/route.js');
      const explained = await (await explain(new Request('http://localhost:3000/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
        body: JSON.stringify({
          mode: 'candidate',
          role: '',
          jobDescription: job,
          candidate: { name: 'Priya Raman', parsedText: PRIYA_TEXT },
          signals: match.signals,
        }),
      }))).json();
      expect(explained.data.result.fit_score).toBe(match.fit.score);
      expect(explained.data.result.fit_verdict).toBe(match.fit.verdict);
      expect(explained.data.role).toBe('Backend Engineer');
    });

    it('still ranks when the LLM is unavailable', async () => {
      const res = await match(async () => new Response('down', { status: 503 }));
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.data.matches[0].similarity).toBe(0.8842);
      expect(json.data.matches[0].llm_fit).toBeNull();
      expect(json.data.llm_model).toBeNull();
    });
  });
});

