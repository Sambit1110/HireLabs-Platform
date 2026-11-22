// Join labelled pairs to their texts, flag problems, and write the dev
// package (inputs without labels, gold manifest, fixed 20 IDs).
//
//   node scripts/evaluator/prepare.mjs /path/to/HireLabs-Data
//
// Reads pairs/train.jsonl, pairs/dev.jsonl, raw/resumes, raw/jds and
// splits.json. Never reads test/. Writes HireLabs-Data/evaluator/.
// Without labelled pairs it checks the candidate review CSVs instead.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { parse } from 'csv-parse/sync';

import { CANDIDATE_PROMPT_VERSION } from '../../lib/ai/candidate-prompt.js';
import { crossSplitIssues, devPackages, joinPairs, selectFixedDevIds } from '../../lib/evaluator/dataset.js';
import { countBy, outputDir, readJsonl, writeJson, writeJsonl } from './io.mjs';

function sourceIo(root, splits) {
  const read = (folder, id) => {
    if (!/^[rj]_\d+$/.test(id || '')) return null;
    const file = path.join(root, 'raw', folder, `${id}.txt`);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  };
  return { readResume: (id) => read('resumes', id), readJd: (id) => read('jds', id), splitOf: (id) => splits[id] };
}

function checkCandidates(root, split, io) {
  const folder = path.join(root, 'reviews', split);
  if (!fs.existsSync(folder)) return null;
  const rows = fs.readdirSync(folder).filter((name) => name.endsWith('.csv')).sort()
    .flatMap((name) => parse(fs.readFileSync(path.join(folder, name), 'utf8'), { columns: true, bom: true, skip_empty_lines: true }));
  const result = { rows: rows.length, proposed: 0, reviewed: 0, missing_resume: 0, missing_jd: 0, wrong_split: 0, locked_test: 0, duplicates: 0 };
  const seen = new Set();
  for (const row of rows) {
    if (row.proposed_score?.trim()) result.proposed++;
    if (row.reviewer_score?.trim() && row.reviewer_name?.trim()) result.reviewed++;
    const key = `${row.resume_id}|${row.jd_id}`;
    if (seen.has(row.pair_id) || seen.has(key)) result.duplicates++;
    seen.add(row.pair_id);
    seen.add(key);
    const resumeSplit = io.splitOf(row.resume_id);
    if (resumeSplit === 'test') result.locked_test++;
    else if (!io.readResume(row.resume_id)) result.missing_resume++;
    else if (!io.readJd(row.jd_id)) result.missing_jd++;
    else if (resumeSplit !== split) result.wrong_split++;
  }
  return { result, resumes: new Set(rows.map((row) => row.resume_id)) };
}

function dataVersion(root) {
  const hash = createHash('sha256');
  for (const file of ['pairs/train.jsonl', 'pairs/dev.jsonl', 'splits.json']) {
    const full = path.join(root, file);
    hash.update(file).update(fs.existsSync(full) ? fs.readFileSync(full) : '');
  }
  return hash.digest('hex').slice(0, 12);
}

export function runPrepare(root, { n = 20 } = {}) {
  const splits = JSON.parse(fs.readFileSync(path.join(root, 'splits.json'), 'utf8'));
  const io = sourceIo(root, splits);
  const dir = outputDir(root);
  const pairFile = (split) => path.join(root, 'pairs', `${split}.jsonl`);

  if (!['train', 'dev'].every((split) => fs.existsSync(pairFile(split)))) {
    const checked = Object.fromEntries(['train', 'dev'].map((split) => [split, checkCandidates(root, split, io)]));
    const overlap = checked.train && checked.dev ? [...checked.train.resumes].filter((id) => checked.dev.resumes.has(id)) : [];
    const summary = {
      labelled: false,
      note: 'No labelled pairs/train.jsonl and pairs/dev.jsonl yet: nothing can be released. Checked the candidate review CSVs instead.',
      candidates: Object.fromEntries(Object.entries(checked).map(([split, value]) => [split, value?.result ?? null])),
      candidate_resume_overlap: overlap.length,
    };
    writeJson(path.join(dir, 'summary.json'), summary);
    return summary;
  }

  const trainRows = readJsonl(pairFile('train'));
  const devRows = readJsonl(pairFile('dev'));
  const train = joinPairs(trainRows, 'train', io);
  const dev = joinPairs(devRows, 'dev', io);
  const overlap = crossSplitIssues(train.records, dev.records);
  const held = new Set(overlap.map((issue) => issue.pair_id));
  const trainRecords = train.records.filter((record) => !held.has(record.pair_id));
  const devRecords = dev.records.filter((record) => !held.has(record.pair_id));

  const fixed = selectFixedDevIds(devRecords, n);
  const { inputs, gold } = devPackages(devRecords, fixed.ids);
  const issues = [...train.issues, ...dev.issues, ...overlap];

  writeJsonl(path.join(dir, 'train.joined.jsonl'), trainRecords);
  writeJsonl(path.join(dir, 'dev.inputs.jsonl'), inputs);
  writeJsonl(path.join(dir, 'dev.gold.jsonl'), gold);
  writeJson(path.join(dir, 'dev.fixed20.json'), { ...fixed, requested: n, shortfall: Math.max(0, n - fixed.ids.length) });
  writeJson(path.join(dir, 'issues.json'), issues);

  const summary = {
    labelled: true,
    data_version: dataVersion(root),
    prompt_version: CANDIDATE_PROMPT_VERSION,
    counts: {
      train: { rows: trainRows.length, released: trainRecords.length, held: trainRows.length - trainRecords.length },
      dev: { rows: devRows.length, released: devRecords.length, held: devRows.length - devRecords.length },
    },
    issues_by_type: countBy(issues, (issue) => issue.type),
    train_by_verdict: countBy(trainRecords, (record) => record.label.fit_verdict),
    train_by_label_source: countBy(trainRecords, (record) => record.label.label_source),
    dev_by_verdict: countBy(devRecords, (record) => record.label.fit_verdict),
    dev_by_label_source: countBy(devRecords, (record) => record.label.label_source),
  };
  writeJson(path.join(dir, 'summary.json'), summary);
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2];
  if (!root) throw Error('Usage: node scripts/evaluator/prepare.mjs /path/to/HireLabs-Data');
  console.log(JSON.stringify(runPrepare(path.resolve(root)), null, 2));
}
