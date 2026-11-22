import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parse } from 'csv-parse/sync';

export const columns = ['pair_id', 'resume_id', 'jd_id', 'proposed_score', 'proposed_verdict',
  'reason', 'reviewer_score', 'reviewer_verdict', 'reviewer_name'];

export function validateFit(score, verdict) {
  const band = score >= 75 ? 'strong' : score >= 50 ? 'moderate' : 'weak';
  if (!Number.isInteger(score) || score < 0 || score > 100 ||
      (verdict !== band && verdict !== 'insufficient_evidence')) {
    throw Error('Expected an integer score in 0–100 and a matching verdict.');
  }
}

export function checkSplit(split) {
  if (!['train', 'dev', 'test'].includes(split)) throw Error('Choose train, dev or test.');
}

export function convertReview(csv, split) {
  checkSplit(split);
  const [header, ...rows] = parse(csv, {bom: true, skip_empty_lines: true, record_delimiter: ['\r\n', '\n', '\r']});
  if (header?.join('|') !== columns.join('|') || !rows.length) throw Error('Missing review header or rows.');
  const seen = new Set();
  return rows.map((cells, index) => {
    const [pair_id, resume_id, jd_id, proposal, verdict, reason, score, review, name] = cells.map(c => c.trim());
    if (!/^r_\d+$/.test(resume_id) || !/^j_\d+$/.test(jd_id) ||
        pair_id !== ['p', split, jd_id, resume_id].join('_') || seen.has(pair_id)) {
      throw Error('Invalid or duplicate ID on row ' + (index + 2));
    }
    seen.add(pair_id);
    if (!name || !/^\d+$/.test(score)) throw Error('Missing reviewer or reviewer score for ' + pair_id);
    validateFit(Number(score), review);
    const proposed = Boolean(proposal || verdict || reason);
    if (proposed) {
      if (!/^\d+$/.test(proposal) || !reason) throw Error('Incomplete proposal for ' + pair_id);
      validateFit(Number(proposal), verdict);
    }
    return JSON.stringify({pair_id, resume_id, jd_id, fit_score: Number(score),
      fit_verdict: review, label_source: proposed ? 'gemini_checked' : 'human'});
  }).join('\n') + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [split, input, output] = process.argv.slice(2);
  if (!output) throw Error('Usage: review_to_jsonl.mjs SPLIT REVIEW.csv NEW_OUTPUT.jsonl');
  fs.writeFileSync(output, convertReview(fs.readFileSync(input, 'utf8'), split), {flag:'wx', mode:0o600});
}
