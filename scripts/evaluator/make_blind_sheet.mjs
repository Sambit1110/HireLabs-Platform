// Make a blind review sheet: the same pairs, with no AI-proposed score, verdict
// or reason and no earlier review, so people label each pair themselves.
// Completed sheets import as label_source "human" with import_reviews.mjs.
//
//   node scripts/evaluator/make_blind_sheet.mjs reviews/train/train-dry-run.csv /path/to/HireLabs-Data
//
// Writes HireLabs-Data/reviews/blind/<name>-blind.csv (private, mode 600) and never overwrites.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { blindReviewSheet } from '../../lib/evaluator/dataset.js';

export function makeBlindSheet(csvFile, root) {
  const { csv, rows } = blindReviewSheet(fs.readFileSync(csvFile, 'utf8'));
  const dir = path.join(root, 'reviews', 'blind');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const out = path.join(dir, `${path.basename(csvFile, '.csv').replace(/-dry-run$/, '')}-blind.csv`);
  fs.writeFileSync(out, csv, { flag: 'wx', mode: 0o600 });
  return { file: path.relative(root, out), rows };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [csvFile, root] = process.argv.slice(2);
  if (!csvFile || !root) throw Error('Usage: node scripts/evaluator/make_blind_sheet.mjs reviews.csv /path/to/HireLabs-Data');
  console.log(JSON.stringify(makeBlindSheet(path.resolve(csvFile), path.resolve(root)), null, 2));
}
