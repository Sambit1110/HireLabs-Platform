// Export recruiter feedback ("Was this score right?") as human labels.
//
// Writes one JSON line per judgement (resume text, job description, the recruiter's score and
// verdict, Agree/Disagree, and what the model said), plus a summary of how well the model
// agrees. The output contains resume text: keep it private (team Drive), never in git.
//
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/evaluator/export_feedback.mjs /path/private/feedback.jsonl
//
// The service-role key reads every recruiter's feedback; it never goes in NEXT_PUBLIC_ vars.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

import { summarizeFeedback } from '../../lib/evaluator/feedback.js';

/** One exported label from a feedback row and its resume. */
export function toLabel(row) {
  return {
    feedback_id: row.id,
    resume_id: row.resume_id,
    resume_text: row.resumes?.parsed_text ?? null,
    job_description: row.job_description,
    human_score: row.human_score,
    human_verdict: row.human_verdict,
    agrees: row.agrees,
    note: row.note,
    model_used: row.model_used,
    model_score: row.model_score,
    model_verdict: row.model_verdict,
    label_source: 'human',
    created_at: row.created_at,
  };
}

async function main() {
  const out = process.argv[2];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!out || !url || !key) {
    console.error('Usage: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/evaluator/export_feedback.mjs <out.jsonl>');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('evaluation_feedback')
      .select('id, resume_id, job_description, model_used, model_score, model_verdict, agrees, human_score, human_verdict, note, created_at, resumes(parsed_text)')
      .order('created_at', { ascending: true })
      .range(from, from + 999);
    if (error) {
      console.error('Reading feedback failed:', error.code, error.message);
      process.exit(1);
    }
    rows.push(...data);
    if (data.length < 1000) break;
  }
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, rows.map((row) => JSON.stringify(toLabel(row))).join('\n') + (rows.length ? '\n' : ''));
  const summary = { exported: rows.length, ...summarizeFeedback(rows) };
  fs.writeFileSync(out.replace(/\.jsonl$/, '') + '.summary.json', JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main();
}
