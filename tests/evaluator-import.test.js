import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { blindReviewSheet, importReviews } from '../lib/evaluator/dataset.js';
import { runImport } from '../scripts/evaluator/import_reviews.mjs';

const header = 'pair_id,resume_id,jd_id,proposed_score,proposed_verdict,reason,reviewer_score,reviewer_verdict,reviewer_name';
const csv = [
  header,
  'p_train_j_0001_r_0492,r_0492,j_0001,0.83,Strong Fit,"matched 5/5",0.83,Strong Fit,Pushpita',
  'p_train_j_0001_r_0100,r_0100,j_0001,,,,0.62,Partial Fit,Pushpita',
  'p_dev_j_0002_r_0750,r_0750,j_0002,0.08,No Fit,"no match",0.08,No Fit,Pushpita',
  'p_dev_j_0001_r_0847,r_0847,j_0001,0.70,Strong Fit,"close",0.70,Strong Fit,Pushpita',
  'p_dev_j_0003_r_0701,r_0701,j_0003,,,,,,',
  'p_dev_j_0004_r_0702,r_0702,j_0004,,,,0.40,Maybe,Pushpita',
  'p_test_j_0001_r_0901,r_0901,j_0001,,,,0.90,Strong Fit,Pushpita',
  'p_train_j_0005_r_0200,r_0200,j_0005,,,,88,strong,Arpan',
].join('\n');

describe('importReviews', () => {
  it("converts Pushpita's decimal scores and Fit wording into the team's pair format", () => {
    const { train, dev } = importReviews(csv);
    expect(train).toEqual([
      { pair_id: 'p_train_j_0001_r_0492', resume_id: 'r_0492', jd_id: 'j_0001', fit_score: 83, fit_verdict: 'strong', label_source: 'gemini_checked' },
      { pair_id: 'p_train_j_0001_r_0100', resume_id: 'r_0100', jd_id: 'j_0001', fit_score: 62, fit_verdict: 'moderate', label_source: 'human' },
      { pair_id: 'p_train_j_0005_r_0200', resume_id: 'r_0200', jd_id: 'j_0005', fit_score: 88, fit_verdict: 'strong', label_source: 'human' },
    ]);
    expect(dev).toEqual([
      { pair_id: 'p_dev_j_0002_r_0750', resume_id: 'r_0750', jd_id: 'j_0002', fit_score: 8, fit_verdict: 'weak', label_source: 'gemini_checked' },
    ]);
  });

  it('holds back unreviewed, unknown, out-of-band and test rows instead of guessing', () => {
    const { held } = importReviews(csv);
    expect(held).toEqual([
      { pair_id: 'p_dev_j_0001_r_0847', reason: 'verdict_outside_band', detail: '70 is moderate, marked Strong Fit' },
      { pair_id: 'p_dev_j_0003_r_0701', reason: 'not_reviewed', detail: '' },
      { pair_id: 'p_dev_j_0004_r_0702', reason: 'unknown_verdict', detail: 'Maybe' },
      { pair_id: 'p_test_j_0001_r_0901', reason: 'locked_test_split', detail: '' },
    ]);
  });
});

describe('import_reviews script', () => {
  it('writes pairs/train.jsonl, pairs/dev.jsonl and the held list, and never overwrites without --force', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hirelabs-import-'));
    const file = path.join(root, 'reviews.csv');
    fs.writeFileSync(file, csv);
    const counts = runImport(file, root);
    expect(counts).toEqual({ train: 3, dev: 1, held: 4 });
    const devRows = fs.readFileSync(path.join(root, 'pairs', 'dev.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    expect(devRows[0].fit_score).toBe(8);
    expect(JSON.parse(fs.readFileSync(path.join(root, 'evaluator', 'import-held.json'), 'utf8'))).toHaveLength(4);
    expect(() => runImport(file, root)).toThrow(/already exists/);
    expect(runImport(file, root, { force: true })).toEqual(counts);
  });
});

describe('blindReviewSheet', () => {
  const header = 'pair_id,resume_id,jd_id,proposed_score,proposed_verdict,reason,reviewer_score,reviewer_verdict,reviewer_name';
  const csv = [
    header,
    'p_train_j_0001_r_0001,r_0001,j_0001,88,strong,"Strong Python match, 5 years",85,strong,Pushpita',
    'p_dev_j_0002_r_0400,r_0400,j_0002,40,weak,Few skills,,,',
    'p_test_j_0003_r_0900,r_0900,j_0003,70,moderate,Locked,,,',
  ].join('\n');

  it('removes the proposal and any earlier review, and drops locked test rows', () => {
    const { csv: blind, rows } = blindReviewSheet(csv);
    expect(rows).toBe(2);
    expect(blind.split('\n')[0]).toBe(header);
    expect(blind).not.toMatch(/88|Strong Python|Few skills|Pushpita|p_test_/);
    expect(blind).toContain('p_train_j_0001_r_0001,r_0001,j_0001,,,,,,');
  });

  it('imports a completed blind review as a human label', () => {
    const filled = blindReviewSheet(csv).csv.replace('p_train_j_0001_r_0001,r_0001,j_0001,,,,,,', 'p_train_j_0001_r_0001,r_0001,j_0001,,,,80,strong,Mayukh');
    const { train } = importReviews(filled);
    expect(train).toEqual([{ pair_id: 'p_train_j_0001_r_0001', resume_id: 'r_0001', jd_id: 'j_0001', fit_score: 80, fit_verdict: 'strong', label_source: 'human' }]);
  });
});
