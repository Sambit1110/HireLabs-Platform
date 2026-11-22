// Generate full candidate-analysis targets for TRAINING pairs only, with the
// app's own prompt and schema, using the team's approved Gemini access.
//
//   GEMINI_API_KEY=… node scripts/evaluator/generate_targets.mjs /path/to/HireLabs-Data [--limit 50]
//
// Reads HireLabs-Data/evaluator/train.joined.jsonl (from prepare.mjs) and
// appends one line per pair to evaluator/targets.raw.jsonl as soon as it is
// answered. Re-running skips pairs that already have a target, so an
// interrupted run resumes by pair ID; failed pairs are retried.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

import { CANDIDATE_PROMPT_VERSION, buildCandidatePrompt, candidateSchema } from '../../lib/ai/candidate-prompt.js';
import { parseAIJson } from '../../lib/ai/parse-json.js';
import { sourceBody } from '../../lib/evaluator/dataset.js';
import { outputDir, readJsonl } from './io.mjs';

export async function runGenerate(root, { call, model, limit = Infinity }) {
  const dir = outputDir(root);
  const records = readJsonl(path.join(dir, 'train.joined.jsonl'));
  const rawFile = path.join(dir, 'targets.raw.jsonl');
  const done = new Set(readJsonl(rawFile).filter((row) => row.target).map((row) => row.pair_id));
  const totals = { attempted: 0, generated: 0, failed: 0, skipped: 0 };

  for (const record of records) {
    if (record.split !== 'train') throw Error(`Refusing to generate a target for non-training pair ${record.pair_id}.`);
    if (done.has(record.pair_id)) { totals.skipped++; continue; }
    if (totals.attempted >= limit) break;
    totals.attempted++;
    const line = { pair_id: record.pair_id, model, prompt_version: CANDIDATE_PROMPT_VERSION, generated_at: new Date().toISOString() };
    try {
      line.target = parseAIJson(await call(buildCandidatePrompt(sourceBody(record.jd_text, record.resume_text))));
      totals.generated++;
    } catch (error) {
      // Keep only a short message: provider errors can echo prompt text.
      line.error = String(error?.message || error).slice(0, 200);
      totals.failed++;
    }
    fs.appendFileSync(rawFile, `${JSON.stringify(line)}\n`, { mode: 0o600 });
  }
  return totals;
}

export function geminiCall(apiKey, model) {
  return async (prompt) => {
    const { GoogleGenAI } = await import('@google/genai');
    const client = new GoogleGenAI({ apiKey });
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: 'application/json', responseJsonSchema: candidateSchema, temperature: 0 },
        });
        if (!response.text?.trim()) throw Error('Empty response.');
        return response.text;
      } catch (error) {
        const status = Number(error?.status || error?.code);
        if (attempt < 4 && (!status || status === 429 || status >= 500)) {
          await sleep(2000 * 2 ** attempt);
          continue;
        }
        throw error;
      }
    }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [root, flag, value] = process.argv.slice(2);
  if (!root) throw Error('Usage: node scripts/evaluator/generate_targets.mjs /path/to/HireLabs-Data [--limit N]');
  if (!process.env.GEMINI_API_KEY) throw Error('Set GEMINI_API_KEY (the team\'s approved Gemini access).');
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const limit = flag === '--limit' ? Number(value) : Infinity;
  const totals = await runGenerate(path.resolve(root), { call: geminiCall(process.env.GEMINI_API_KEY, model), model, limit });
  console.log(JSON.stringify({ model, ...totals }, null, 2));
}
