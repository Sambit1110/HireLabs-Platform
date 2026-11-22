import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { cleanResumeText } from '../../lib/resume/text.js';

const [resumes, jobs, root] = process.argv.slice(2);
if (!root) throw Error('Usage: node prepare.mjs RESUMES_DIR JOBS_DIR NEW_OUTPUT_DIR');
function documents(dir) {
  const unique = new Set();
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.txt')).sort()) {
    const text = cleanResumeText(fs.readFileSync(path.join(dir, file), 'utf8'));
    if (text) unique.add(text);
  }
  const hash = text => createHash('sha256').update(text).digest('hex');
  return [...unique].map(text => ({text, hash: hash(text)})).sort((a,b) => a.hash.localeCompare(b.hash));
}
const rs = documents(resumes).slice(0, 1000);
const js = documents(jobs).slice(0, 300);
if (rs.length < 7 || !js.length) throw Error('Need at least seven distinct resumes and one job.');
fs.mkdirSync(root);
function write(file, data) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), {recursive:true});
  fs.writeFileSync(target, data);
}
const tasks = {train:[], dev:[], test:[]};
const manifest = {};
for (const [i, {text}] of rs.entries()) {
  const id = 'r_' + String(i+1).padStart(4,'0');
  const split = i < Math.round(rs.length*.70) ? 'train' : i < Math.round(rs.length*.85) ? 'dev' : 'test';
  manifest[id] = split;
  write((split === 'test' ? 'test/' : '') + 'raw/resumes/' + id + '.txt', text);
  tasks[split].push({data:{id,text}});
}
for (const [i,{text}] of js.entries()) write('raw/jds/j_' + String(i+1).padStart(4,'0') + '.txt', text);
for (const [split, rows] of Object.entries(tasks)) {
  const prefix = split === 'test' ? 'test/' : '';
  write(prefix + 'tasks-' + split + '.json', JSON.stringify(rows.slice(0,Math.round(300*rows.length/rs.length))));
}
write('splits.json', JSON.stringify(manifest,null,2));
