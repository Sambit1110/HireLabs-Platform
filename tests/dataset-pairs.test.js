import { afterEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { run, selectPairs, propose } from '../scripts/dataset/propose_pairs.mjs';
import { columns, validateFit, convertReview } from '../scripts/dataset/review_to_jsonl.mjs';

const folders = [];
function prepare() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(),'hirelabs-pairs-'));
  folders.push(out);
  const root = path.join(out,'data');
  const fixture = 'tests/fixtures/dataset';
  execFileSync(process.execPath,['scripts/dataset/prepare.mjs',fixture+'/resumes',fixture+'/jobs',root]);
  return root;
}
afterEach(() => { for (const out of folders.splice(0)) fs.rmSync(out,{recursive:true,force:true}); });

describe('pair review', () => {
  it('chooses high and low overlap with stable IDs across order and splits', () => {
    const docs = Array.from({length:9}, (_,i) => ({id:'r_'+i,text:'python '.repeat(i) + 'x '.repeat(9-i)}));
    docs[8].text = 'python';
    const jobs = [{id:'j_1',text:'python'}];
    const pairs = selectPairs(jobs,docs,'train');
    expect(pairs).toEqual(selectPairs(jobs,[...docs].reverse(),'train'));
    expect(pairs.map(p => p.resume_id)).toEqual(expect.arrayContaining(['r_8','r_0']));
    const all = [...pairs,...selectPairs(jobs,docs,'dev')];
    expect(new Set(all.map(p => p.pair_id)).size).toBe(10);
  });
  it('validates inclusive band boundaries and insufficient evidence', () => {
    for (const [n,v] of [[0,'weak'],[49,'weak'],[50,'moderate'],[74,'moderate'],[75,'strong'],[100,'strong'],[20,'insufficient_evidence']]) validateFit(n,v);
    for (const [n,v] of [[50,'weak'],[101,'strong'],[-1,'weak'],[3.5,'weak']]) expect(() => validateFit(n,v)).toThrow();
  });
  it('requires signoff on every test row and preserves human provenance', () => {
    const row = 'p_test_j_1_r_1,r_1,j_1,75,strong,"SQL, Python",49,weak,A';
    const csv = [columns.join(','),row].join('\r\n');
    expect(JSON.parse(convertReview(csv,'test'))).toEqual({pair_id:'p_test_j_1_r_1',resume_id:'r_1',jd_id:'j_1',fit_score:49,fit_verdict:'weak',label_source:'gemini_checked'});
    expect(JSON.parse(convertReview(csv.replace('75,strong,"SQL, Python"',',,'),'test')).label_source).toBe('human');
    expect(() => convertReview(csv+'\n'+row.replaceAll('r_1','r_2').replace('49,weak,A',',weak,A'),'test')).toThrow(/reviewer/);
  });
  it('runs prepare and dry-run CLIs without a key and validates reviewed rows with pairs.py', () => {
    const root = prepare();
    const out = path.join(root,'review');
    execFileSync(process.execPath,['scripts/dataset/propose_pairs.mjs',root,'train',out,'--dry-run'],{env:{...process.env,GEMINI_API_KEY:''}});
    const rows = parse(fs.readFileSync(path.join(out,'train-dry-run.csv')),{columns:true});
    expect(rows).toHaveLength(10);
    expect(rows.every(r => !r.reason && !r.proposed_score && !r.reviewer_score)).toBe(true);
    const csv = [columns.join(','),...rows.map(r => [r.pair_id,r.resume_id,r.jd_id,'','','',0,'weak','Fictional reviewer'].join(','))].join('\n');
    const reviewed = path.join(out,'reviewed.jsonl');
    fs.writeFileSync(reviewed,convertReview(csv,'train'));
    execFileSync('python',['scripts/dataset/pairs.py',root,'train',reviewed]);
    const records = file => fs.readFileSync(file,'utf8').trim().split('\n').map(line => JSON.parse(line));
    expect(records(path.join(root,'pairs/train.jsonl'))).toEqual(records(reviewed));
  });
  it('retries a rate limit and reuses cached proposals on rerun', async () => {
    const root = prepare();
    const generateContent = vi.fn().mockResolvedValue({text:'{"fit_score":75,"fit_verdict":"strong","reason":"Matched SQL"}'});
    const client = {models:{generateContent}};
    generateContent.mockRejectedValueOnce(Object.assign(Error('rate limit'),{status:429}));
    const wait = vi.fn();
    await propose(client,'fake','{}',wait);
    expect(wait).toHaveBeenCalledWith(1000);
    const out = path.join(root,'review');
    await run(root,'train',out,{client,model:'fake'});
    expect(generateContent).toHaveBeenCalledTimes(12);
    await run(root,'train',out,{client,model:'fake'});
    expect(generateContent).toHaveBeenCalledTimes(12);
  });
});
