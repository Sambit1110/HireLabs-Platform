import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

import { candidateSchema } from '../lib/ai/candidate-prompt.js';
import { modelInput } from '../lib/evaluator/dataset.js';
import { runPrepare } from '../scripts/evaluator/prepare.mjs';
import { runGenerate } from '../scripts/evaluator/generate_targets.mjs';
import { runBuild } from '../scripts/evaluator/build_training.mjs';

const samples = path.resolve(import.meta.dirname, '..', 'data', 'samples', 'raw');
let root;
const out = (file) => path.join(root, 'evaluator', file);
const readJsonl = (file) => fs.readFileSync(out(file), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
const writeJsonl = (file, rows) => fs.writeFileSync(path.join(root, file), rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
const pair = (pair_id, resume_id, jd_id, fit_score, fit_verdict, label_source = 'human') => ({ pair_id, resume_id, jd_id, fit_score, fit_verdict, label_source });

function fakeTarget(score, verdict) {
  const value = Object.fromEntries(candidateSchema.required.map((key) => [key, []]));
  return {
    ...value,
    candidate_summary: 'Documented engineering background.', relevant_experience_summary: 'Relevant backend work.',
    confidence: 70, fit_score: score, fit_verdict: verdict, gaps: [],
    recommendation: 'Proceed to a human-led interview to verify the documented skills.',
    skill_gap_analysis: { demonstrated_skills: ['Go'], partially_demonstrated_skills: [], missing_required_skills: [], missing_preferred_skills: [], unverified_skills: [], skill_gap_summary: 'Core skills demonstrated.' },
    recruiter_insights: { strongest_alignment: ['Go'], areas_for_verification: [], suggested_interview_focus: ['System design'], overall_assessment: 'Documented alignment with the role.' },
  };
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'hirelabs-evaluator-'));
  fs.mkdirSync(path.join(root, 'raw', 'resumes'), { recursive: true });
  fs.mkdirSync(path.join(root, 'raw', 'jds'), { recursive: true });
  fs.mkdirSync(path.join(root, 'pairs'));
  for (const id of ['r_0001', 'r_0002', 'r_0003', 'r_0004', 'r_0005']) fs.copyFileSync(path.join(samples, 'resumes', `${id}.txt`), path.join(root, 'raw', 'resumes', `${id}.txt`));
  fs.writeFileSync(path.join(root, 'raw', 'resumes', 'r_0006.txt'), 'Locked test resume.');
  for (const id of ['j_0001', 'j_0002', 'j_0003']) fs.copyFileSync(path.join(samples, 'jds', `${id}.txt`), path.join(root, 'raw', 'jds', `${id}.txt`));
  fs.writeFileSync(path.join(root, 'splits.json'), JSON.stringify({ r_0001: 'train', r_0002: 'train', r_0003: 'train', r_0004: 'dev', r_0005: 'dev', r_0006: 'test' }));
  writeJsonl('pairs/train.jsonl', [
    pair('p_t1', 'r_0001', 'j_0001', 92, 'strong'),
    pair('p_t2', 'r_0002', 'j_0002', 88, 'strong'),
    pair('p_t3', 'r_0003', 'j_0003', 60, 'moderate', 'gemini_checked'),
    pair('p_t4', 'r_0001', 'j_0002', 30, 'weak'),
    pair('p_t5', 'r_0002', 'j_0003', 20, 'weak', 'category'),
  ]);
  writeJsonl('pairs/dev.jsonl', [
    pair('p_d1', 'r_0004', 'j_0001', 35, 'weak'),
    pair('p_d2', 'r_0005', 'j_0002', 42, 'weak'),
    pair('p_d3', 'r_0004', 'j_0003', 80, 'strong'),
    pair('p_d4', 'r_0003', 'j_0001', 70, 'moderate'),
    pair('p_d5', 'r_0006', 'j_0001', 10, 'insufficient_evidence'),
  ]);
});

describe('prepare', () => {
  it('joins pairs, flags problems and writes dev inputs, gold labels and the fixed IDs', () => {
    const summary = runPrepare(root);
    expect(summary.labelled).toBe(true);
    expect(summary.counts.train.released).toBe(5);
    expect(summary.counts.dev.released).toBe(3);
    const issues = JSON.parse(fs.readFileSync(out('issues.json'), 'utf8'));
    expect(issues.map((issue) => [issue.pair_id, issue.type])).toEqual(expect.arrayContaining([
      ['p_d4', 'resume_wrong_split'],
      ['p_d5', 'locked_test_resume'],
    ]));
    const inputs = readJsonl('dev.inputs.jsonl');
    expect(inputs.map((row) => row.pair_id)).toEqual(['p_d1', 'p_d2', 'p_d3']);
    expect(JSON.stringify(inputs)).not.toMatch(/label_source|"fit_score":|"fit_verdict":/);
    const gold = readJsonl('dev.gold.jsonl');
    expect(gold[2]).toMatchObject({ pair_id: 'p_d3', fit_score: 80, fit_verdict: 'strong', label_source: 'human' });
    const fixed = JSON.parse(fs.readFileSync(out('dev.fixed20.json'), 'utf8'));
    expect(fixed.ids.sort()).toEqual(['p_d1', 'p_d2', 'p_d3']);
    expect(fixed.shortfall).toBe(17);
    expect(summary.data_version).toMatch(/^[0-9a-f]{12}$/);
  });

  it('checks the unlabelled candidate pairs when no labelled pairs exist yet', () => {
    fs.rmSync(path.join(root, 'pairs'), { recursive: true });
    fs.mkdirSync(path.join(root, 'reviews', 'train'), { recursive: true });
    fs.writeFileSync(path.join(root, 'reviews', 'train', 'train-dry-run.csv'),
      'pair_id,resume_id,jd_id,proposed_score,proposed_verdict,reason,reviewer_score,reviewer_verdict,reviewer_name\n' +
      'p_train_j_0001_r_0001,r_0001,j_0001,,,,,,\np_train_j_0001_r_0404,r_0404,j_0001,,,,,,\n');
    const summary = runPrepare(root);
    expect(summary.labelled).toBe(false);
    expect(summary.candidates.train).toEqual({ rows: 2, proposed: 0, reviewed: 0, missing_resume: 1, missing_jd: 0, wrong_split: 0, locked_test: 0, duplicates: 0 });
  });
});

describe('generate and build', () => {
  it('generates targets for training pairs only, resumes by pair ID, and builds the reviewed training file', async () => {
    runPrepare(root);
    const calls = [];
    let failOnce = true;
    const call = async (prompt) => {
      calls.push(prompt);
      if (prompt.includes('Locked test resume')) throw Error('must never be sent');
      if (failOnce && calls.length === 2) { failOnce = false; throw Error('rate limited'); }
      const strongJob = prompt.includes('92') ? 90 : 70;
      return JSON.stringify(calls.length === 4 ? fakeTarget(85, 'strong') : fakeTarget(strongJob, strongJob >= 75 ? 'strong' : 'moderate'));
    };
    const first = await runGenerate(root, { call, model: 'fake-model' });
    expect(first).toEqual({ attempted: 5, generated: 4, failed: 1, skipped: 0 });
    const second = await runGenerate(root, { call, model: 'fake-model' });
    expect(second).toEqual({ attempted: 1, generated: 1, failed: 0, skipped: 4 });
    expect(calls.every((prompt) => !prompt.includes('p_d'))).toBe(true);

    const counts = runBuild(root, { minimumQueue: 3 });
    expect(counts.generated).toBe(5);
    expect(counts.quarantined).toBeGreaterThanOrEqual(1);
    const training = readJsonl('training.jsonl');
    const provenance = readJsonl('provenance.jsonl');
    for (const row of training) {
      expect(Object.keys(row)).toEqual(['id', 'messages']);
      expect(row.messages.map((message) => message.role)).toEqual(['system', 'user', 'assistant']);
      const source = provenance.find((entry) => entry.id === row.id);
      const assistant = JSON.parse(row.messages[2].content);
      expect([assistant.fit_score, assistant.fit_verdict]).toEqual([source.gold_score, source.gold_verdict]);
      const jd = fs.readFileSync(path.join(root, 'raw', 'jds', `${source.jd_id}.txt`), 'utf8');
      const resume = fs.readFileSync(path.join(root, 'raw', 'resumes', `${source.resume_id}.txt`), 'utf8');
      expect(row.messages.slice(0, 2)).toEqual(modelInput(jd, resume));
    }
    const queue = fs.readFileSync(out('review-queue.csv'), 'utf8').trim().split('\n');
    expect(queue.length).toBeGreaterThanOrEqual(4);
    expect(counts.human_review).toEqual({ completed: 0, accepted: 0, corrected: 0, rejected: 0 });

    const quarantined = readJsonl('quarantine.jsonl')[0].id;
    const reviewed = queue.map((line, index) => (index > 0 && line.startsWith(`${quarantined},`) ? line.replace(/,,,,$/, ',Hrittima,accept,,') : line));
    fs.writeFileSync(out('review-queue.csv'), reviewed.join('\n') + '\n');
    const after = runBuild(root, { minimumQueue: 3 });
    expect(after.human_review).toEqual({ completed: 1, accepted: 1, corrected: 0, rejected: 0 });
    expect(readJsonl('training.jsonl').map((row) => row.id)).toContain(quarantined);
    expect(after.accepted).toBe(counts.accepted + 1);
    expect(after.by_verdict).toBeTypeOf('object');
    expect(after.by_label_source).toBeTypeOf('object');
    expect(after.shortfall_vs_1000).toBe(1000 - after.accepted);
  });
});
