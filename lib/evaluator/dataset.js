/**
 * Evaluator training and dev data: pure functions used by
 * scripts/evaluator/*.mjs and their tests. Resume text and generated targets
 * never live in the repository; these functions only shape them.
 */
import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';

import {
  bandFor,
  buildCandidateMessages,
  candidateSchema,
  validateOutput,
} from '../ai/candidate-prompt.js';

const VERDICTS = ['strong', 'moderate', 'weak', 'insufficient_evidence'];
const RANK = { weak: 0, moderate: 1, strong: 2 };
const hash = (value) => createHash('sha256').update(value).digest('hex');
const words = (text) => (text.match(/\S+/g) || []).length;

export function isValidLabel(score, verdict) {
  return Number.isInteger(score) && score >= 0 && score <= 100 &&
    (verdict === bandFor(score) || verdict === 'insufficient_evidence');
}

/** The target role is the job description's first non-empty line. */
export function roleFromJd(text) {
  return text.split('\n').map((line) => line.trim()).find(Boolean) || 'Not provided';
}

/** The app request body for a source pair. Names and parsed fields are left out on purpose. */
export function sourceBody(jdText, resumeText) {
  return {
    mode: 'candidate',
    role: roleFromJd(jdText),
    jobDescription: jdText,
    candidate: { parsedText: resumeText, name: null, title: null, skills: null, yearsExperience: null },
  };
}

/** The model-visible messages (system + user) for a source pair. */
export function modelInput(jdText, resumeText) {
  return buildCandidateMessages(sourceBody(jdText, resumeText));
}

/**
 * Join pair labels to their texts. Anything doubtful is held back with an
 * issue for Pushpita: repeated pair IDs, the same pair with different labels
 * (conflicting labels), repeated identical pairs, missing texts, invalid
 * labels, resumes from another split and locked test resumes.
 */
export function joinPairs(rows, split, { readResume, readJd, splitOf }) {
  const idCount = new Map();
  const labelsByPair = new Map();
  const pairKey = (row) => `${row.resume_id}|${row.jd_id}`;
  for (const row of rows) {
    idCount.set(row.pair_id, (idCount.get(row.pair_id) || 0) + 1);
    const labels = labelsByPair.get(pairKey(row)) || new Set();
    labels.add(`${row.fit_score}|${row.fit_verdict}`);
    labelsByPair.set(pairKey(row), labels);
  }

  const records = [];
  const issues = [];
  const seenPairs = new Set();
  const flag = (row, type, detail = '') => issues.push({ type, pair_id: row.pair_id, split, detail });

  for (const row of rows) {
    const key = pairKey(row);
    if (idCount.get(row.pair_id) > 1) { flag(row, 'duplicate_pair_id'); continue; }
    if (labelsByPair.get(key).size > 1) { flag(row, 'conflicting_labels', key); continue; }
    if (seenPairs.has(key)) { flag(row, 'duplicate_pair', key); continue; }
    seenPairs.add(key);
    // Locked test resumes are refused before their text is ever read.
    const resumeSplit = splitOf(row.resume_id);
    if (resumeSplit === 'test') { flag(row, 'locked_test_resume', row.resume_id); continue; }
    const resumeText = readResume(row.resume_id);
    if (!resumeText) { flag(row, 'missing_resume', row.resume_id); continue; }
    const jdText = readJd(row.jd_id);
    if (!jdText) { flag(row, 'missing_jd', row.jd_id); continue; }
    if (!isValidLabel(row.fit_score, row.fit_verdict)) { flag(row, 'invalid_label', `${row.fit_score}/${row.fit_verdict}`); continue; }
    if (resumeSplit !== split) { flag(row, 'resume_wrong_split', `${row.resume_id} is ${resumeSplit}`); continue; }
    records.push({
      pair_id: row.pair_id,
      split,
      resume_id: row.resume_id,
      jd_id: row.jd_id,
      label: { fit_score: row.fit_score, fit_verdict: row.fit_verdict, label_source: row.label_source },
      jd_text: jdText,
      resume_text: resumeText,
    });
  }
  return { records, issues };
}

/** Resumes used in both train and dev leak between them: flag every affected pair. */
export function crossSplitIssues(train, dev) {
  const trainResumes = new Set(train.map((record) => record.resume_id));
  const devResumes = new Set(dev.map((record) => record.resume_id));
  const flag = (record, split) => ({ type: 'train_dev_resume_overlap', pair_id: record.pair_id, split, detail: record.resume_id });
  return [
    ...train.filter((record) => devResumes.has(record.resume_id)).map((record) => flag(record, 'train')),
    ...dev.filter((record) => trainResumes.has(record.resume_id)).map((record) => flag(record, 'dev')),
  ];
}

/**
 * A fixed, deterministic dev subset: about a fifth thin-evidence cases
 * (insufficient_evidence or the shortest resumes), then a round-robin across
 * verdicts. Order depends only on pair IDs, never on input order.
 */
export function selectFixedDevIds(records, n = 20) {
  const ordered = [...records].sort((a, b) => hash(`hirelabs-dev20/${a.pair_id}`).localeCompare(hash(`hirelabs-dev20/${b.pair_id}`)));
  const counts = ordered.map((record) => words(record.resume_text)).sort((a, b) => a - b);
  const quarter = counts[Math.floor(counts.length / 4)] ?? 0;
  const isThin = (record) => record.label.fit_verdict === 'insufficient_evidence' || words(record.resume_text) <= Math.max(8, quarter);

  const picked = [];
  const take = (record) => { if (record && !picked.includes(record)) picked.push(record); };
  const thinQuota = Math.ceil(n / 5);
  for (const record of ordered.filter(isThin)) {
    if (picked.length >= thinQuota) break;
    take(record);
  }
  const buckets = VERDICTS.map((verdict) => ordered.filter((record) => record.label.fit_verdict === verdict && !picked.includes(record)));
  while (picked.length < Math.min(n, ordered.length) && buckets.some((bucket) => bucket.length)) {
    for (const bucket of buckets) if (picked.length < n && bucket.length) take(bucket.shift());
  }
  const ids = picked.map((record) => record.pair_id);
  const by_verdict = Object.fromEntries(VERDICTS.map((verdict) => [verdict, picked.filter((record) => record.label.fit_verdict === verdict).length]));
  return { ids, by_verdict, thin_evidence: picked.filter(isThin).map((record) => record.pair_id) };
}

/** Model inputs carry no labels; labels live only in the gold manifest. */
export function devPackages(records, fixedIds) {
  const fixed = new Set(fixedIds);
  return {
    inputs: records.map((record) => ({ pair_id: record.pair_id, messages: modelInput(record.jd_text, record.resume_text) })),
    gold: records.map((record) => ({ pair_id: record.pair_id, ...record.label, fixed_20: fixed.has(record.pair_id) })),
  };
}

/** The generated analysis, with the team's score and verdict in place of Gemini's. */
export function applyGold(target, label) {
  return { ...target, fit_score: label.fit_score, fit_verdict: label.fit_verdict };
}

/** Why a generated target disagrees too much with its label to train on unreviewed, or null. */
export function conflictReason(target, label) {
  const generatedInsufficient = target.fit_verdict === 'insufficient_evidence';
  const labelInsufficient = label.fit_verdict === 'insufficient_evidence';
  if (generatedInsufficient !== labelInsufficient) return 'insufficient_evidence_mismatch';
  if (!generatedInsufficient && Math.abs(RANK[target.fit_verdict] - RANK[label.fit_verdict]) >= 2) return 'verdict_two_bands_apart';
  if (Math.abs(target.fit_score - label.fit_score) >= 30) return 'score_gap_30_or_more';
  return null;
}

const REVIEW_LANGUAGE = /review|interview|verif|assess|discuss|follow[- ]?up|recruiter|screen/i;
const AUTOMATIC_DECISION = /\breject|disqualif|do not hire|don't hire|automatic/i;

/**
 * Errors make a target unusable (schema, score outside its band). Warnings
 * send it to human review: a missing required skill the explanation never
 * names, or a recommendation that does not hand the decision to a person.
 */
export function targetFlags(target) {
  if (!validateOutput(target, candidateSchema)) return { errors: ['schema'], warnings: [] };
  const errors = [];
  if (target.fit_verdict !== 'insufficient_evidence' && bandFor(target.fit_score) !== target.fit_verdict) {
    errors.push('score_outside_verdict_band');
  }
  const warnings = [];
  const gap = target.skill_gap_analysis;
  const explanation = [
    ...target.gaps,
    gap.skill_gap_summary,
    ...target.recruiter_insights.areas_for_verification,
    target.recruiter_insights.overall_assessment,
  ].join(' ').toLowerCase();
  if (gap.missing_required_skills.some((skill) => !explanation.includes(skill.toLowerCase()))) {
    warnings.push('missing_evidence_not_explained');
  }
  if (!REVIEW_LANGUAGE.test(target.recommendation) || AUTOMATIC_DECISION.test(target.recommendation)) {
    warnings.push('recommendation_not_for_human_review');
  }
  return { errors, warnings };
}

/** One training example: the ID plus system → user → assistant messages. Provenance stays outside. */
export function trainingRecord(record, target) {
  return {
    id: record.pair_id,
    messages: [
      ...modelInput(record.jd_text, record.resume_text),
      { role: 'assistant', content: JSON.stringify(target) },
    ],
  };
}

export const REVIEW_COLUMNS = [
  'pair_id', 'gold_score', 'gold_verdict', 'label_source', 'generated_score', 'generated_verdict', 'flags',
  'job_title', 'resume_excerpt', 'missing_required_skills', 'recommendation', 'overall_assessment',
  'target_json', 'reviewer_name', 'decision', 'corrected_target_json', 'notes',
];

const csvCell = (value) => {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * Hrittima's review queue: every conflict and flagged target first, then a
 * deterministic sample, to at least `minimum` rows. Decision columns start
 * blank (decision: accept | correct | reject).
 */
export function reviewQueue(items, minimum = 100) {
  const priority = (item) => (item.conflict ? 0 : item.flags.length ? 1 : 2);
  const ordered = [...items].sort((a, b) => priority(a) - priority(b) ||
    hash(`hirelabs-review/${a.record.pair_id}`).localeCompare(hash(`hirelabs-review/${b.record.pair_id}`)));
  const mustReview = ordered.filter((item) => priority(item) < 2).length;
  const chosen = ordered.slice(0, Math.max(minimum, mustReview));
  const rows = chosen.map(({ record, target, flags, conflict }) => {
    const trained = applyGold(target, record.label);
    return [
      record.pair_id, record.label.fit_score, record.label.fit_verdict, record.label.label_source,
      target.fit_score, target.fit_verdict, [conflict, ...flags].filter(Boolean).join('; '),
      roleFromJd(record.jd_text), record.resume_text.slice(0, 500).replace(/\s*\n\s*/g, ' / '),
      (target.skill_gap_analysis?.missing_required_skills || []).join('; '),
      target.recommendation, target.recruiter_insights?.overall_assessment,
      JSON.stringify(trained), '', '', '', '',
    ].map(csvCell).join(',');
  });
  return `${[REVIEW_COLUMNS.join(','), ...rows].join('\n')}\n`;
}

/** Completed reviews only: a reviewer name and a decision of accept, correct or reject. */
export function parseReviewDecisions(csvText) {
  const rows = parse(csvText, { columns: true, bom: true, skip_empty_lines: true });
  const decisions = new Map();
  for (const row of rows) {
    const decision = (row.decision || '').trim().toLowerCase();
    const reviewer = (row.reviewer_name || '').trim();
    if (!reviewer || !['accept', 'correct', 'reject'].includes(decision)) continue;
    const correctedText = (row.corrected_target_json || '').trim();
    decisions.set(row.pair_id.trim(), { decision, reviewer, corrected: correctedText ? JSON.parse(correctedText) : null });
  }
  return decisions;
}

const VERDICT_WORDS = {
  strong: 'strong', 'strong fit': 'strong',
  moderate: 'moderate', 'moderate fit': 'moderate', 'partial fit': 'moderate',
  weak: 'weak', 'weak fit': 'weak', 'poor fit': 'weak', 'no fit': 'weak',
  insufficient_evidence: 'insufficient_evidence', 'insufficient evidence': 'insufficient_evidence',
};

/** A reviewer score as a 0–100 integer: whole numbers as they are, 0–1 decimals (0.83) times 100. */
function reviewScore(text) {
  const value = text.trim();
  if (/^\d+$/.test(value)) return Number(value);
  if (/^[01](\.\d+)?$/.test(value) && Number(value) <= 1) return Math.round(Number(value) * 100);
  return null;
}

/**
 * Convert a pair-review CSV (team columns, scores 0–100 or 0–1, verdicts in
 * the team's words or "Strong / Partial / No Fit") into format-2 pair rows,
 * split by the pair ID's train/dev prefix. Anything unclear is held back
 * with a reason for the labeller instead of being guessed.
 */
export function importReviews(csvText) {
  const rows = parse(csvText, { columns: true, bom: true, skip_empty_lines: true });
  const result = { train: [], dev: [], held: [] };
  const hold = (row, reason, detail = '') => result.held.push({ pair_id: row.pair_id.trim(), reason, detail });
  for (const row of rows) {
    const split = /^p_(train|dev|test)_/.exec(row.pair_id.trim())?.[1];
    if (!split) { hold(row, 'unknown_split'); continue; }
    if (split === 'test') { hold(row, 'locked_test_split'); continue; }
    if (!row.reviewer_name?.trim() || !row.reviewer_score?.trim()) { hold(row, 'not_reviewed'); continue; }
    const score = reviewScore(row.reviewer_score);
    if (score === null || score > 100) { hold(row, 'invalid_score', row.reviewer_score.trim()); continue; }
    const verdict = VERDICT_WORDS[row.reviewer_verdict.trim().toLowerCase()];
    if (!verdict) { hold(row, 'unknown_verdict', row.reviewer_verdict.trim()); continue; }
    if (verdict !== 'insufficient_evidence' && bandFor(score) !== verdict) {
      hold(row, 'verdict_outside_band', `${score} is ${bandFor(score)}, marked ${row.reviewer_verdict.trim()}`);
      continue;
    }
    const proposed = Boolean(row.proposed_score?.trim() || row.proposed_verdict?.trim() || row.reason?.trim());
    result[split].push({
      pair_id: row.pair_id.trim(),
      resume_id: row.resume_id.trim(),
      jd_id: row.jd_id.trim(),
      fit_score: score,
      fit_verdict: verdict,
      // Same rule as scripts/dataset/review_to_jsonl.mjs: a proposal checked by a person.
      label_source: proposed ? 'gemini_checked' : 'human',
    });
  }
  return result;
}

const BLIND_COLUMNS = ['pair_id', 'resume_id', 'jd_id', 'proposed_score', 'proposed_verdict', 'reason', 'reviewer_score', 'reviewer_verdict', 'reviewer_name'];

/**
 * A review sheet with no AI proposal and no earlier review, so people score each
 * pair blind. Locked test rows are dropped. A completed row imports as
 * label_source "human" (importReviews), since it carries no proposal.
 * @returns {{ csv: string, rows: number }}
 */
export function blindReviewSheet(csvText) {
  const rows = parse(csvText, { columns: true, bom: true, skip_empty_lines: true })
    .filter((row) => /^p_(train|dev)_/.test(row.pair_id.trim()));
  const lines = rows.map((row) => [row.pair_id.trim(), row.resume_id.trim(), row.jd_id.trim(), '', '', '', '', '', ''].map(csvCell).join(','));
  return { csv: [BLIND_COLUMNS.join(','), ...lines].join('\n') + '\n', rows: rows.length };
}
