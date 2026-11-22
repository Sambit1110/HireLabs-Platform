import { describe, expect, it } from 'vitest';

import { describeModel } from '../lib/ai/model-info.js';
import { normalizeEvaluation } from '../lib/ai/evaluation.js';
import { isParsedStatus, isPendingStatus, statusLabel } from '../lib/resume/status.js';

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
      describeModel({ model_used: 'hirelabs-parser', model: 'older-model-name' }).kind
    ).toBe('ours');
  });

  it('never labels placeholder stand-ins as our model', () => {
    for (const id of ['hirelabs-matcher-fallback', 'hirelabs-matcher-fixture', 'hirelabs-evaluator-mock']) {
      const info = describeModel({ model_used: id });
      expect(info.kind).toBe('placeholder');
      expect(info.label).toMatch(/not a real model/);
    }
  });

  it('shows any model that is not ours by its own name, never as our model', () => {
    expect(describeModel({ model_used: 'some-other-model' })).toEqual({
      id: 'some-other-model', kind: 'unknown', label: 'some-other-model',
    });
  });

  it('handles missing or malformed data', () => {
    expect(describeModel(null).kind).toBe('unknown');
    expect(describeModel({ model_used: 42 }).label).toBe('Model not reported');
  });
});

describe('normalizeEvaluation', () => {
  it('reports how many quotes the server removed, and 0 when none were', () => {
    expect(normalizeEvaluation({ evidence_removed: 2 }).evidenceRemoved).toBe(2);
    expect(normalizeEvaluation({}).evidenceRemoved).toBe(0);
    expect(normalizeEvaluation({ evidence_removed: -1 }).evidenceRemoved).toBe(0);
  });

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

describe('resume statuses', () => {
  it('treats parsed and completed as parsed', () => {
    expect(isParsedStatus('parsed')).toBe(true);
    expect(isParsedStatus('completed')).toBe(true);
    expect(isParsedStatus('queued')).toBe(false);
  });

  it('treats uploaded, queued and processing as pending', () => {
    for (const status of ['uploaded', 'queued', 'processing']) {
      expect(isPendingStatus(status)).toBe(true);
    }
    expect(isPendingStatus('failed')).toBe(false);
    expect(isPendingStatus(null)).toBe(false);
  });

  it('labels statuses for display', () => {
    expect(statusLabel('completed')).toBe('Parsed');
    expect(statusLabel('queued')).toBe('Pending');
    expect(statusLabel('failed')).toBe('Failed');
    expect(statusLabel('')).toBe('Unknown');
  });
});
