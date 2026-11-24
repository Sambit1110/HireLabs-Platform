import { describe, expect, it } from 'vitest';

import { blindAliases } from '../lib/resume/blind-review.js';
import { buildRankingRows, csvCell, exportFileName, rankingToCsv } from '../lib/resume/ranking-export.js';

const resumes = [
  {
    id: 'r1', created_at: '2026-11-01T00:00:00Z', file_name: 'priya_raman.pdf', candidate_name: 'Priya Raman',
    candidate_title: 'Backend Engineer', years_experience: 7, extracted_skills: ['Go', 'PostgreSQL', 'Kafka'],
  },
  {
    id: 'r2', created_at: '2026-11-02T00:00:00Z', file_name: 'daniel-okafor.docx', candidate_name: null,
    candidate_title: null, years_experience: null, extracted_skills: null,
  },
];
const byId = new Map(resumes.map((resume) => [resume.id, resume]));
const aliases = blindAliases(resumes);

const matches = [
  {
    id: 'r1', file_name: 'priya_raman.pdf', similarity: 0.8312, years_experience: 7,
    fit: { score: 82, verdict: 'strong' }, llm_fit: { score: 74, verdict: 'strong', missing_skills: ['Rust'] },
  },
  { id: 'r2', file_name: 'daniel-okafor.docx', similarity: 0.42, fit: null, llm_fit: null },
];

describe('buildRankingRows', () => {
  it('builds one row per match, in the order given, with the real identity when blind review is off', () => {
    const rows = buildRankingRows(matches, byId, { blind: false, aliases });
    expect(rows).toEqual([
      {
        id: 'r1', rank: 1, candidate: 'Priya Raman', title: 'Backend Engineer', yearsExperience: 7,
        fitScore: 82, verdict: 'strong fit', similarityPercent: 83, llmScore: 74,
        skills: ['Go', 'PostgreSQL', 'Kafka'], missingSkills: ['Rust'], fileName: 'priya_raman.pdf',
      },
      {
        id: 'r2', rank: 2, candidate: 'daniel-okafor', title: null, yearsExperience: null,
        fitScore: null, verdict: null, similarityPercent: 42, llmScore: null,
        skills: [], missingSkills: [], fileName: 'daniel-okafor.docx',
      },
    ]);
  });

  it('hides names and file names in blind review', () => {
    const rows = buildRankingRows(matches, byId, { blind: true, aliases });
    expect(rows.map((row) => row.candidate)).toEqual(['Candidate 1', 'Candidate 2']);
    expect(rows.every((row) => row.fileName === null)).toBe(true);
    expect(JSON.stringify(rows)).not.toMatch(/priya|raman|daniel|okafor/i);
  });

  it('redacts a title that repeats the name in blind review, and drops a title equal to the name', () => {
    const odd = new Map([['r1', { ...resumes[0], candidate_title: 'Priya Raman - Go developer' }]]);
    expect(buildRankingRows([matches[0]], odd, { blind: true, aliases })[0].title).toBe('Candidate 1 - Go developer');
    const same = new Map([['r1', { ...resumes[0], candidate_title: 'priya raman' }]]);
    expect(buildRankingRows([matches[0]], same, { blind: false, aliases })[0].title).toBe(null);
  });

  it('in blind review, hides a title that is really a name and skills that carry links', () => {
    const real = new Map([['r1', {
      ...resumes[0], candidate_name: null, file_name: 'Sample_Resume_Sagnik_Dam.docx', candidate_title: 'SAGNIK DAM',
      extracted_skills: ['Python', '• github.com/SagnikAB • linkedin.com/in/sagnik-dam-b33bb3322'],
    }]]);
    const [row] = buildRankingRows([matches[0]], real, { blind: true, aliases });
    expect(row).toMatchObject({ candidate: 'Candidate 1', title: null, skills: ['Python'], fileName: null });
    expect(rankingToCsv([row], { blind: true })).not.toMatch(/sagnik|github|linkedin/i);
    const [open] = buildRankingRows([matches[0]], real, { blind: false, aliases });
    expect(open.skills).toHaveLength(2);
  });

  it('falls back to the match row when the resume is not in the library (e.g. the sample ranking)', () => {
    const sample = [{ id: 's1', file_name: 'sample_mei.pdf', candidate_name: 'Mei (sample)', candidate_title: 'Data Analyst', similarity: 0.5 }];
    expect(buildRankingRows(sample, new Map(), { blind: false, aliases })[0]).toMatchObject({ candidate: 'Mei (sample)', title: 'Data Analyst', fileName: 'sample_mei.pdf' });
    const blindRow = buildRankingRows(sample, new Map(), { blind: true, aliases })[0];
    expect(blindRow.candidate).toBe('Unlisted candidate (rank 1)');
    expect(JSON.stringify(blindRow)).not.toMatch(/mei/i);
  });

  it('clamps out-of-range numbers and tolerates junk', () => {
    const rows = buildRankingRows([{ id: 'x', similarity: 1.7, fit: { score: null, verdict: 'insufficient_evidence' } }], new Map(), { blind: false, aliases });
    expect(rows[0]).toMatchObject({ similarityPercent: 100, fitScore: null, verdict: 'not enough evidence', candidate: 'Unnamed resume' });
    expect(buildRankingRows(null, byId, { blind: false, aliases })).toEqual([]);
  });
});

describe('csvCell', () => {
  it('quotes cells with commas, quotes, line breaks or edge spaces', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a, b')).toBe('"a, b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line\nbreak')).toBe('"line\nbreak"');
    expect(csvCell(' padded')).toBe('" padded"');
  });

  it('neutralises spreadsheet formulas in text cells', () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(csvCell('+1 555')).toBe("'+1 555");
    expect(csvCell('-cmd')).toBe("'-cmd");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('\tTab')).toBe("'\tTab");
  });

  it('writes numbers as numbers and empty values as empty cells', () => {
    expect(csvCell(82)).toBe('82');
    expect(csvCell(0)).toBe('0');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(Number.NaN)).toBe('');
  });
});

describe('rankingToCsv', () => {
  const parse = (csv) => csv.replace(/^\uFEFF/, '').split('\r\n');

  it('writes a header and one line per candidate, with a BOM and CRLF line endings for Excel', () => {
    const csv = rankingToCsv(buildRankingRows(matches, byId, { blind: false, aliases }), { blind: false });
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const lines = parse(csv);
    expect(lines).toEqual([
      'Rank,Candidate,Title,Years of experience,Fit score (0-100),Verdict,Text similarity (%),hirelabs-llm score (0-100),Skills,Missing skills,File name',
      '1,Priya Raman,Backend Engineer,7,82,strong fit,83,74,Go; PostgreSQL; Kafka,Rust,priya_raman.pdf',
      '2,daniel-okafor,,,,,42,,,,daniel-okafor.docx',
    ]);
  });

  it('drops the file name column and every name in blind review', () => {
    const csv = rankingToCsv(buildRankingRows(matches, byId, { blind: true, aliases }), { blind: true });
    const lines = parse(csv);
    expect(lines[0].endsWith('Missing skills')).toBe(true);
    expect(lines[0]).not.toContain('File name');
    expect(lines[1]).toBe('1,Candidate 1,Backend Engineer,7,82,strong fit,83,74,Go; PostgreSQL; Kafka,Rust');
    expect(csv).not.toMatch(/priya|raman|daniel|okafor/i);
  });

  it('keeps every row the same width', () => {
    for (const blind of [true, false]) {
      const lines = parse(rankingToCsv(buildRankingRows(matches, byId, { blind, aliases }), { blind }));
      const widths = new Set(lines.map((line) => line.split(',').length));
      expect(widths.size).toBe(1);
    }
  });

  it('writes only the header for an empty ranking', () => {
    expect(parse(rankingToCsv([], { blind: false }))).toHaveLength(1);
  });
});

describe('exportFileName', () => {
  const date = new Date(2026, 10, 5, 23, 30);

  it('names the file after the role and the local date', () => {
    expect(exportFileName({ role: 'Senior Backend Engineer (Go/K8s)', date })).toBe('hirelabs-ranking-senior-backend-engineer-go-k8s-2026-11-05.csv');
  });

  it('marks blind and sample exports and works without a role', () => {
    expect(exportFileName({ role: '', date, blind: true })).toBe('hirelabs-ranking-2026-11-05-blind.csv');
    expect(exportFileName({ role: '   ', date, sample: true })).toBe('hirelabs-ranking-2026-11-05-sample.csv');
  });

  it('keeps long or non-Latin roles short and safe', () => {
    const name = exportFileName({ role: 'x'.repeat(200), date });
    expect(name.length).toBeLessThan(90);
    expect(exportFileName({ role: 'Ingeniero de Datos Señor', date })).toBe('hirelabs-ranking-ingeniero-de-datos-senor-2026-11-05.csv');
    expect(exportFileName({ role: '数据工程师', date })).toBe('hirelabs-ranking-2026-11-05.csv');
  });
});
