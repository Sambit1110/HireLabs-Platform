// Turn a reviewed pair CSV into HireLabs-Data/pairs/train.jsonl and dev.jsonl.
//
//   node scripts/evaluator/import_reviews.mjs reviews.csv /path/to/HireLabs-Data [--force]
//
// Accepts the team's review columns with scores 0–100 or 0–1 and verdicts in
// the team's words or "Strong / Partial / No Fit". Rows that are unreviewed,
// unclear, outside their verdict band or from the test split are held back
// in evaluator/import-held.json for the labeller. Existing pairs files are
// never overwritten without --force.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { importReviews } from '../../lib/evaluator/dataset.js';
import { outputDir, writeJson, writeJsonl } from './io.mjs';

export function runImport(csvFile, root, { force = false } = {}) {
  const { train, dev, held } = importReviews(fs.readFileSync(csvFile, 'utf8'));
  const pairsDir = path.join(root, 'pairs');
  fs.mkdirSync(pairsDir, { recursive: true, mode: 0o700 });
  for (const split of ['train', 'dev']) {
    const file = path.join(pairsDir, `${split}.jsonl`);
    if (fs.existsSync(file) && !force) throw Error(`${path.relative(root, file)} already exists; pass --force to replace it.`);
  }
  writeJsonl(path.join(pairsDir, 'train.jsonl'), train);
  writeJsonl(path.join(pairsDir, 'dev.jsonl'), dev);
  writeJson(path.join(outputDir(root), 'import-held.json'), held);
  return { train: train.length, dev: dev.length, held: held.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [csvFile, root, flag] = process.argv.slice(2);
  if (!csvFile || !root) throw Error('Usage: node scripts/evaluator/import_reviews.mjs reviews.csv /path/to/HireLabs-Data [--force]');
  console.log(JSON.stringify(runImport(path.resolve(csvFile), path.resolve(root), { force: flag === '--force' }), null, 2));
}
