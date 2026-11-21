import { describe, expect, it } from 'vitest';

import { describeModel } from '../lib/ai/model-info.js';
import { normalizeEvaluation } from '../lib/ai/evaluation.js';

describe('describeModel', () => {
  it('marks HireLabs models as our own', () => {
    expect(describeModel({ model_used: 'hirelabs-evaluator' })).toEqual({
      id: 'hirelabs-evaluator',
      kind: 'ours',
      label: 'Our model',
    });
  });

  it('prefers model_used over the legacy model field', () => {
    expect(
      describeModel({ model_used: 'hirelabs-parser', model: 'gemini-3.5-flash' }).kind
    ).toBe('ours');
  });

  it('treats Gemini as the fallback', () => {
    expect(describeModel({ model: 'gemini-3.5-flash' }).kind).toBe('fallback');
    expect(describeModel({ model_used: 'gemini-fallback' }).kind).toBe('fallback');
  });

  it('handles missing or malformed data', () => {
    expect(describeModel(null).kind).toBe('unknown');
    expect(describeModel({ model_used: 42 }).label).toBe('Model not reported');
  });
});

describe('normalizeEvaluation', () => {
  it('keeps a valid fit score and verdict', () => {
    const result = normalizeEvaluation({
      fit_verdict: 'strong',
      fit_score: 82.4,
      confidence: 70,
      skill_gap_analysis: {
        demonstrated_skills: ['React', 'react', ' TypeScript '],
        missing_required_skills: ['Kubernetes'],
      },
    });

    expect(result.verdictLabel).toBe('Strong fit');
    expect(result.fitScore).toBe(82);
    expect(result.confidence).toBe(70);
    expect(result.matchedSkills).toEqual(['React', 'TypeScript']);
    expect(result.missingRequired).toEqual(['Kubernetes']);
  });

  it('never shows a score when evidence is insufficient', () => {
    const result = normalizeEvaluation({
      fit_verdict: 'insufficient_evidence',
      fit_score: 55,
    });

    expect(result.fitScore).toBeNull();
    expect(result.verdictLabel).toBe('Insufficient evidence');
  });

  it('does not invent a score that was not returned', () => {
    expect(normalizeEvaluation({ fit_verdict: 'moderate' }).fitScore).toBeNull();
    expect(normalizeEvaluation({ fit_score: 140 }).fitScore).toBeNull();
    expect(normalizeEvaluation({ fit_score: '80' }).fitScore).toBeNull();
  });

  it('returns empty lists for missing sections', () => {
    const result = normalizeEvaluation('not an object');

    expect(result.verdict).toBeNull();
    expect(result.evidence).toEqual([]);
    expect(result.interviewQuestions).toEqual([]);
  });
});
