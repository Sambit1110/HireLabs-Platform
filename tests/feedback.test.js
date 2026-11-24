import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { spearman, summarizeFeedback, validateFeedback, verdictFor } from '../lib/evaluator/feedback.js';
import { toLabel } from '../scripts/evaluator/export_feedback.mjs';

const RESUME = '11111111-1111-4111-8111-111111111111';
const BODY = { resumeId: RESUME, jobDescription: 'Data Analyst\nRequired skills: SQL', modelUsed: 'hirelabs-explainer', modelScore: 72, modelVerdict: 'moderate' };

describe('validateFeedback', () => {
  it('accepts a vote, a score or both, and derives the verdict band', () => {
    expect(validateFeedback({ ...BODY, agrees: true })).toMatchObject({ ok: true, value: { agrees: true, human_score: null, human_verdict: null } });
    expect(validateFeedback({ ...BODY, humanScore: 80 }).value).toMatchObject({ human_score: 80, human_verdict: 'strong', agrees: null });
    expect(validateFeedback({ ...BODY, agrees: false, humanScore: 40, note: '  Missed SQL  ' }).value).toMatchObject({ human_verdict: 'weak', note: 'Missed SQL' });
  });

  it('rejects empty or malformed feedback', () => {
    expect(validateFeedback(BODY).ok).toBe(false);
    expect(validateFeedback({ ...BODY, agrees: true, resumeId: 'nope' }).ok).toBe(false);
    expect(validateFeedback({ ...BODY, humanScore: 101 }).ok).toBe(false);
    expect(validateFeedback({ ...BODY, humanScore: 7.5 }).ok).toBe(false);
    expect(validateFeedback({ ...BODY, agrees: 'yes' }).ok).toBe(false);
    expect(validateFeedback({ ...BODY, agrees: true, note: 'x'.repeat(1001) }).ok).toBe(false);
  });

  it('uses the team dataset bands', () => {
    expect([90, 75, 74, 50, 49, 0].map(verdictFor)).toEqual(['strong', 'strong', 'moderate', 'moderate', 'weak', 'weak']);
  });
});

describe('agreement summary', () => {
  it('computes agree rate, verdict agreement, Spearman and mean error', () => {
    const rows = [
      { model_score: 90, model_verdict: 'strong', agrees: true, human_score: 85, human_verdict: 'strong' },
      { model_score: 60, model_verdict: 'moderate', agrees: true, human_score: 55, human_verdict: 'moderate' },
      { model_score: 30, model_verdict: 'weak', agrees: false, human_score: 70, human_verdict: 'moderate' },
      { model_score: null, model_verdict: 'insufficient_evidence', agrees: null, human_score: 20, human_verdict: 'weak' },
    ];
    expect(summarizeFeedback(rows)).toEqual({
      count: 4, votes: 3, agree_rate: 0.667, scored: 3, spearman: 0.5, mean_abs_error: 16.7, verdict_agreement: 0.667,
    });
    expect(summarizeFeedback([])).toMatchObject({ count: 0, agree_rate: null, spearman: null });
  });

  it('handles ties and too few pairs in Spearman', () => {
    expect(spearman([1, 2, 3], [1, 2, 3])).toBe(1);
    expect(spearman([1, 2, 3], [3, 2, 1])).toBe(-1);
    expect(spearman([1, 2], [1, 2])).toBeNull();
    expect(spearman([5, 5, 5], [1, 2, 3])).toBeNull();
  });

  it('exports rows as human labels with the resume text', () => {
    const label = toLabel({ id: 'f1', resume_id: RESUME, job_description: 'Job', model_used: 'hirelabs-explainer', model_score: 72, model_verdict: 'moderate', agrees: false, human_score: 40, human_verdict: 'weak', note: null, created_at: 't', resumes: { parsed_text: 'Resume text' } });
    expect(label).toMatchObject({ label_source: 'human', resume_text: 'Resume text', human_score: 40, model_score: 72 });
  });
});

describe('POST /api/feedback', () => {
  let upsert;
  let result;

  beforeEach(() => {
    vi.resetModules();
    result = { data: { id: 'f1', agrees: true }, error: null };
    upsert = vi.fn(() => ({ select: () => ({ single: async () => result }) }));
    vi.doMock('@/lib/supabase/server-auth', () => ({
      authenticateRequest: async () => ({ user: { id: 'u1' }, supabase: { from: () => ({ upsert }) } }),
    }));
  });

  const post = async (body) => {
    const { POST } = await import('../app/api/feedback/route.js');
    const response = await POST(new Request('http://localhost/api/feedback', { method: 'POST', body: JSON.stringify(body) }));
    return { status: response.status, json: await response.json() };
  };

  it('upserts one row per recruiter, resume and job (hashed)', async () => {
    const { status } = await post({ ...BODY, agrees: true });
    expect(status).toBe(200);
    const [row, options] = upsert.mock.calls[0];
    expect(options).toEqual({ onConflict: 'user_id,resume_id,job_hash' });
    expect(row).toMatchObject({ user_id: 'u1', resume_id: RESUME, agrees: true });
    expect(row.job_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('explains how to set up the table when it is missing', async () => {
    result = { data: null, error: { code: 'PGRST205' } };
    const { status, json } = await post({ ...BODY, agrees: true });
    expect(status).toBe(503);
    expect(json.error.message).toContain('007_evaluation_feedback.sql');
  });

  it('rejects invalid feedback', async () => {
    expect((await post({ ...BODY })).status).toBe(400);
  });
});

describe('feedback bar', () => {
  it('renders the question, both choices and the optional fields', async () => {
    const { default: FeedbackBar } = await import('../components/dashboard/FeedbackBar');
    const html = renderToStaticMarkup(createElement(FeedbackBar, { resumeId: RESUME, jobDescription: 'Job', modelUsed: 'hirelabs-explainer', modelScore: 72, modelVerdict: 'moderate' }));
    expect(html).toContain('Was this score right?');
    expect(html).toContain('Agree');
    expect(html).toContain('Disagree');
    expect(html).toContain('Model said 72');
    expect(html).toContain('Save feedback');
  });
});
