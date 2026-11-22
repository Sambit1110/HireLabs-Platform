// Build the reviewed training file from generated targets.
//
//   node scripts/evaluator/build_training.mjs /path/to/HireLabs-Data [--reviews path/to/review-queue.csv]
//
// For every training pair with a target: put the team's score and verdict in
// place of Gemini's, validate, quarantine sharp disagreements and flagged
// targets until a person reviews them, and apply completed reviews.
// Writes evaluator/training.jsonl (one {id, messages} per accepted pair),
// provenance.jsonl, quarantine.jsonl, counts.json and, the first time only,
// review-queue.csv for Hrittima (it is never overwritten).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { CANDIDATE_PROMPT_VERSION, candidateSchema, validateOutput } from '../../lib/ai/candidate-prompt.js';
import {
  applyGold,
  conflictReason,
  parseReviewDecisions,
  reviewQueue,
  targetFlags,
  trainingRecord,
} from '../../lib/evaluator/dataset.js';
import { countBy, outputDir, readJsonl, writeJson, writeJsonl } from './io.mjs';

const ACCEPTED = new Set(['accepted', 'accepted_reviewed', 'accepted_corrected']);

export function runBuild(root, { minimumQueue = 100, reviewsPath } = {}) {
  const dir = outputDir(root);
  const summaryFile = path.join(dir, 'summary.json');
  const dataVersion = fs.existsSync(summaryFile) ? JSON.parse(fs.readFileSync(summaryFile, 'utf8')).data_version : null;
  const records = readJsonl(path.join(dir, 'train.joined.jsonl'));
  const latest = new Map();
  for (const row of readJsonl(path.join(dir, 'targets.raw.jsonl'))) if (row.target) latest.set(row.pair_id, row);

  const queueFile = path.join(dir, 'review-queue.csv');
  const decisionsFile = reviewsPath || queueFile;
  const decisions = fs.existsSync(decisionsFile) ? parseReviewDecisions(fs.readFileSync(decisionsFile, 'utf8')) : new Map();

  const training = [];
  const provenance = [];
  const quarantine = [];
  const items = [];
  const reviewTotals = { completed: 0, accepted: 0, corrected: 0, rejected: 0 };

  for (const record of records) {
    const generated = latest.get(record.pair_id);
    if (!generated) continue;
    const raw = generated.target;
    const shaped = validateOutput(raw, candidateSchema);
    const conflict = shaped ? conflictReason(raw, record.label) : null;
    let final = applyGold(raw, record.label);
    let { errors, warnings } = targetFlags(final);
    const review = decisions.get(record.pair_id);
    if (review) {
      reviewTotals.completed++;
      reviewTotals[{ accept: 'accepted', correct: 'corrected', reject: 'rejected' }[review.decision]]++;
    }

    let status;
    if (review?.decision === 'reject') status = 'rejected';
    else if (review?.decision === 'correct') {
      final = applyGold(review.corrected || {}, record.label);
      ({ errors, warnings } = targetFlags(final));
      status = errors.length ? 'invalid_correction' : 'accepted_corrected';
    } else if (errors.length) status = 'invalid';
    else if (review?.decision === 'accept') status = 'accepted_reviewed';
    else if (conflict) status = 'quarantined';
    else if (warnings.length) status = 'needs_review';
    else status = 'accepted';

    if (shaped) items.push({ record, target: raw, flags: [...errors, ...warnings], conflict });
    if (ACCEPTED.has(status)) training.push(trainingRecord(record, final));
    else if (status !== 'rejected') quarantine.push({ id: record.pair_id, status, conflict, errors, warnings });
    provenance.push({
      id: record.pair_id,
      split: record.split,
      resume_id: record.resume_id,
      jd_id: record.jd_id,
      label_source: record.label.label_source,
      gold_score: record.label.fit_score,
      gold_verdict: record.label.fit_verdict,
      generated_score: shaped ? raw.fit_score : null,
      generated_verdict: shaped ? raw.fit_verdict : null,
      status,
      flags: [conflict, ...errors, ...warnings].filter(Boolean),
      reviewer: review?.reviewer || null,
      model: generated.model,
      prompt_version: generated.prompt_version || CANDIDATE_PROMPT_VERSION,
      data_version: dataVersion,
    });
  }

  writeJsonl(path.join(dir, 'training.jsonl'), training);
  writeJsonl(path.join(dir, 'provenance.jsonl'), provenance);
  writeJsonl(path.join(dir, 'quarantine.jsonl'), quarantine);
  if (!fs.existsSync(queueFile)) fs.writeFileSync(queueFile, reviewQueue(items, minimumQueue), { mode: 0o600 });

  const accepted = provenance.filter((row) => ACCEPTED.has(row.status));
  const counts = {
    data_version: dataVersion,
    prompt_version: CANDIDATE_PROMPT_VERSION,
    train_pairs: records.length,
    generated: latest.size,
    missing_targets: records.filter((record) => !latest.has(record.pair_id)).length,
    accepted: training.length,
    quarantined: quarantine.length,
    rejected: provenance.filter((row) => row.status === 'rejected').length,
    by_status: countBy(provenance, (row) => row.status),
    by_verdict: countBy(accepted, (row) => row.gold_verdict),
    by_label_source: countBy(accepted, (row) => row.label_source),
    human_review: reviewTotals,
    review_queue_rows: Math.max(0, fs.readFileSync(queueFile, 'utf8').trim().split('\n').length - 1),
    shortfall_vs_1000: Math.max(0, 1000 - training.length),
  };
  writeJson(path.join(dir, 'counts.json'), counts);
  return counts;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [root, flag, value] = process.argv.slice(2);
  if (!root) throw Error('Usage: node scripts/evaluator/build_training.mjs /path/to/HireLabs-Data [--reviews FILE.csv]');
  const counts = runBuild(path.resolve(root), { reviewsPath: flag === '--reviews' ? path.resolve(value) : undefined });
  console.log(JSON.stringify(counts, null, 2));
}
