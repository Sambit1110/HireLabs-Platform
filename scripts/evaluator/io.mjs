// Small file helpers for the evaluator scripts. Outputs are private (mode 600).
import fs from 'node:fs';
import path from 'node:path';

export function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter((line) => line.trim()).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch {
      throw Error(`Invalid JSON on line ${index + 1} of ${path.basename(file)}`);
    }
  });
}

export function writeJsonl(file, rows) {
  fs.writeFileSync(file, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''), { mode: 0o600 });
}

export function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

export function outputDir(root) {
  const dir = path.join(root, 'evaluator');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

export function countBy(rows, key) {
  const counts = {};
  for (const row of rows) counts[key(row)] = (counts[key(row)] || 0) + 1;
  return counts;
}
