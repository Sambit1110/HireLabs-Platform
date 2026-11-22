import { describe, expect, it } from 'vitest';

import { barWidth, bestSystems, formatMetric, normalizeResults } from '../lib/eval/results.js';
import { SAMPLE_MODEL_RESULTS } from '../lib/fixtures/sample-model-results.js';

const minimal = {
  tasks: [
    {
      id: 'matching',
      title: 'Matching',
      metrics: [
        { key: 'recall_at_5', label: 'Recall@5', higher_is_better: true, unit: 'ratio' },
        { key: 'seconds', label: 'Time', higher_is_better: false, unit: 'seconds' },
      ],
      systems: [
        { name: 'Keyword', kind: 'baseline', values: { recall_at_5: 0.4, seconds: 0.1 } },
        { name: 'hirelabs-matcher', kind: 'ours', values: { recall_at_5: 0.8, seconds: 0.3 } },
        { name: 'Gemini', kind: 'gemini', values: { recall_at_5: 0.8 } },
      ],
    },
  ],
};

describe('normalizeResults', () => {
  it('accepts a valid results file', () => {
    const parsed = normalizeResults(minimal);

    expect(parsed.ok).toBe(true);
    expect(parsed.results.tasks[0].systems).toHaveLength(3);
    expect(parsed.results.tasks[0].systems[2].values.seconds).toBeNull();
    expect(parsed.results.bias).toBeNull();
  });

  it('keeps conventional Recall@5 separate from Success@5 and unavailable systems null', () => {
    const parsed = normalizeResults({
      tasks: [{
        id: 'matching',
        title: 'Matching',
        metrics: [
          { key: 'recall_at_5', label: 'Recall@5', unit: 'ratio' },
          { key: 'success_at_5', label: 'Success@5', unit: 'ratio' },
        ],
        systems: [
          { name: 'Keyword baseline', kind: 'baseline', values: { recall_at_5: 0.4, success_at_5: 0.7 } },
          { name: 'Gemini', kind: 'gemini', values: { recall_at_5: null, success_at_5: null } },
          { name: 'hirelabs-matcher', kind: 'ours', values: {} },
        ],
      }],
    });

    expect(parsed.ok).toBe(true);
    const task = parsed.results.tasks[0];
    expect(task.metrics.map((metric) => metric.key)).toEqual(['recall_at_5', 'success_at_5']);
    expect(task.systems[0].values.recall_at_5).toBe(0.4);
    expect(task.systems[0].values.success_at_5).toBe(0.7);
    expect(task.systems[1].values.recall_at_5).toBeNull();
    expect(task.systems[2].values.success_at_5).toBeNull();
  });

  it('rejects files without usable tasks', () => {
    expect(normalizeResults(null).ok).toBe(false);
    expect(normalizeResults({ tasks: [] }).ok).toBe(false);
    expect(normalizeResults({ tasks: [{ title: 'x', metrics: [], systems: [] }] }).ok).toBe(false);
  });

  it('accepts the bundled sample and marks it as sample data', () => {
    const parsed = normalizeResults(SAMPLE_MODEL_RESULTS);

    expect(parsed.ok).toBe(true);
    expect(parsed.results.sample).toBe(true);
    expect(parsed.results.bias.systems.length).toBeGreaterThan(0);
  });
});

describe('bestSystems', () => {
  const task = normalizeResults(minimal).results.tasks[0];

  it('includes ties for higher-is-better metrics', () => {
    expect([...bestSystems(task, task.metrics[0])].sort()).toEqual(['Gemini', 'hirelabs-matcher']);
  });

  it('picks the lowest value when lower is better, ignoring missing values', () => {
    expect([...bestSystems(task, task.metrics[1])]).toEqual(['Keyword']);
  });
});

describe('formatting', () => {
  it('formats each unit', () => {
    expect(formatMetric(0.8412, 'ratio')).toBe('0.84');
    expect(formatMetric(96.25, 'percent')).toBe('96.3%');
    expect(formatMetric(1.234, 'seconds')).toBe('1.2 s');
    expect(formatMetric(null, 'ratio')).toBe('—');
  });

  it('scales bars', () => {
    expect(barWidth(0.5, 'ratio')).toBe(50);
    expect(barWidth(80, 'percent')).toBe(80);
    expect(barWidth(2, 'points', 4)).toBe(50);
    expect(barWidth(null, 'ratio')).toBe(0);
  });
});
