import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { CANDIDATE_PROMPT_VERSION, candidateSchema, validateAnalysis } from '../lib/ai/candidate-prompt.js';
import { modelInput, targetFlags, trainingRecord } from '../lib/evaluator/dataset.js';

const example = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '..', 'data', 'samples', 'evaluator', 'synthetic-example.json'), 'utf8'));

describe('synthetic example shared with both GPT sessions', () => {
  it('matches the current prompt exactly, so the spec never drifts from the code', () => {
    expect(example.prompt_version).toBe(CANDIDATE_PROMPT_VERSION);
    expect(example.model_input).toEqual(modelInput(example.source.jd_text, example.source.resume_text));
    expect(example.dev_input_record.messages).toEqual(example.model_input);
  });

  it('has a complete, valid expected target carrying the gold label', () => {
    expect(validateAnalysis(example.expected_target, candidateSchema, 'candidate')).toBe(true);
    expect(targetFlags(example.expected_target)).toEqual({ errors: [], warnings: [] });
    expect([example.expected_target.fit_score, example.expected_target.fit_verdict]).toEqual([example.source.label.fit_score, example.source.label.fit_verdict]);
  });

  it('shows the training record the trainer loads', () => {
    const { source } = example;
    expect(example.training_record).toEqual(trainingRecord({ ...source }, example.expected_target));
  });
});
