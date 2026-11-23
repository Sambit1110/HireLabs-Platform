import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_LLM_SCORED, parseLlmFit, scoreWithLlm } from '../lib/ai/llm-match.js';

const realFetch = globalThis.fetch;
const FIT = { score: 64, verdict: 'moderate', pmi: 0.01, missingSkills: ['SQL'], model_used: 'hirelabs-llm' };
const resumes = (n) => Array.from({ length: n }, (_, i) => ({ id: `r${i}`, text: `Resume ${i}` }));

beforeEach(() => {
  process.env.USE_LOCAL_MODELS = 'true';
  process.env.MODEL_SERVER_URL = 'https://models.example.test';
});
afterEach(() => {
  delete process.env.USE_LOCAL_MODELS;
  delete process.env.MODEL_SERVER_URL;
  globalThis.fetch = realFetch;
});

describe('parseLlmFit', () => {
  it('keeps a valid reply and renames missingSkills', () => {
    expect(parseLlmFit(FIT)).toEqual({ score: 64, verdict: 'moderate', missing_skills: ['SQL'] });
  });

  it('rejects malformed replies', () => {
    for (const bad of [null, {}, { ...FIT, score: 101 }, { ...FIT, score: 5.5 }, { ...FIT, verdict: 'great' }]) {
      expect(parseLlmFit(bad)).toBeNull();
    }
  });
});

describe('scoreWithLlm', () => {
  it('does nothing when local models are off', async () => {
    delete process.env.USE_LOCAL_MODELS;
    globalThis.fetch = vi.fn();
    const { results } = await scoreWithLlm('Job', resumes(2));
    expect(results.size).toBe(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('scores resumes with text, up to the limit', async () => {
    globalThis.fetch = vi.fn(async () => Response.json(FIT));
    const input = [{ id: 'empty', text: '  ' }, ...resumes(MAX_LLM_SCORED + 5)];
    const { results, placeholder } = await scoreWithLlm('Job', input);
    expect(results.size).toBe(MAX_LLM_SCORED);
    expect(results.has('empty')).toBe(false);
    expect(results.get('r0')).toEqual({ score: 64, verdict: 'moderate', missing_skills: ['SQL'] });
    expect(placeholder).toBe(false);
  });

  it('stops asking after the first failure', async () => {
    globalThis.fetch = vi.fn(async () => new Response('down', { status: 503 }));
    const { results } = await scoreWithLlm('Job', resumes(MAX_LLM_SCORED));
    expect(results.size).toBe(0);
    // Only the first batch of parallel requests goes out.
    expect(globalThis.fetch.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it('reports placeholder replies', async () => {
    globalThis.fetch = vi.fn(async () => Response.json(FIT, { headers: { 'X-HireLabs-Placeholder': 'true' } }));
    const { placeholder } = await scoreWithLlm('Job', resumes(1));
    expect(placeholder).toBe(true);
  });
});
