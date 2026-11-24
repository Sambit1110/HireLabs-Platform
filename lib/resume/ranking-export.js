import { blindSkills, blindTitle, candidateDisplayName } from './blind-review.js';

/** The verdict words Rank candidates shows. */
export const VERDICT_TEXT = {
  strong: 'strong fit',
  moderate: 'moderate fit',
  weak: 'weak fit',
  insufficient_evidence: 'not enough evidence',
};

const score = (value) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.min(100, Math.max(0, value))) : null;

const strings = (value) =>
  Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()) : [];

/**
 * One display row per ranked candidate, in the order given: what the ranking list shows and
 * what the CSV export writes, so the two can never disagree. In blind review the name becomes
 * the candidate's alias, the file name is dropped, and the title is redacted.
 *
 * @param {object[]} matches /api/match rows (already sorted)
 * @param {Map<string, object>} resumesById the recruiter's resume rows
 * @param {{ blind: boolean, aliases: Map<string, string> }} options
 */
export function buildRankingRows(matches, resumesById, { blind, aliases }) {
  if (!Array.isArray(matches)) return [];

  return matches.map((match, index) => {
    const rank = index + 1;
    const resume = resumesById?.get(match.id) || null;
    const realName = resume?.candidate_name?.trim() || match.candidate_name?.trim() || null;
    const identity = {
      id: match.id,
      candidate_name: realName,
      file_name: resume?.file_name || match.file_name || '',
    };
    const visibleName = candidateDisplayName(identity, { blind: false, aliases });

    let candidate;
    if (!blind) candidate = visibleName;
    else if (aliases?.has(match.id)) candidate = aliases.get(match.id);
    else candidate = `Unlisted candidate (rank ${rank})`;

    const rawTitle = (resume?.candidate_title || match.candidate_title || '').trim();
    const person = { candidate_name: realName, candidate_title: rawTitle };
    const title = blind
      ? blindTitle(person, candidate)
      : rawTitle && rawTitle.toLowerCase() !== visibleName.toLowerCase() ? rawTitle : null;
    const allSkills = strings(resume?.extracted_skills ?? match.extracted_skills);

    const years = resume?.years_experience ?? match.years_experience;
    const fitScore = score(match.fit?.score);
    const verdict = typeof match.fit?.verdict === 'string' ? VERDICT_TEXT[match.fit.verdict] ?? match.fit.verdict : null;

    return {
      id: match.id,
      rank,
      candidate,
      title,
      yearsExperience: typeof years === 'number' && Number.isFinite(years) ? years : null,
      fitScore,
      verdict,
      similarityPercent: score(Number(match.similarity) * 100) ?? 0,
      llmScore: score(match.llm_fit?.score),
      skills: blind ? blindSkills(allSkills, person) : allSkills,
      missingSkills: strings(match.llm_fit?.missing_skills),
      fileName: blind ? null : identity.file_name || null,
    };
  });
}

/** One CSV cell: quoted when needed, and text that a spreadsheet would run as a formula is defused. */
export function csvCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text) || /^\s|\s$/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

const COLUMNS = [
  ['Rank', (row) => row.rank],
  ['Candidate', (row) => row.candidate],
  ['Title', (row) => row.title],
  ['Years of experience', (row) => row.yearsExperience],
  ['Fit score (0-100)', (row) => row.fitScore],
  ['Verdict', (row) => row.verdict],
  ['Text similarity (%)', (row) => row.similarityPercent],
  ['hirelabs-llm score (0-100)', (row) => row.llmScore],
  ['Skills', (row) => row.skills.join('; ')],
  ['Missing skills', (row) => row.missingSkills.join('; ')],
];

/** The ranking as CSV text for Excel, Numbers or Google Sheets (UTF-8 with BOM, CRLF lines). */
export function rankingToCsv(rows, { blind }) {
  const columns = blind ? COLUMNS : [...COLUMNS, ['File name', (row) => row.fileName]];
  const lines = [
    columns.map(([header]) => csvCell(header)).join(','),
    ...(rows || []).map((row) => columns.map(([, pick]) => csvCell(pick(row))).join(',')),
  ];
  return `\uFEFF${lines.join('\r\n')}`;
}

/** hirelabs-ranking-<role>-<YYYY-MM-DD>[-blind][-sample].csv, using the local date. */
export function exportFileName({ role, date = new Date(), blind = false, sample = false }) {
  const slug = String(role || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '');
  const day = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  return ['hirelabs-ranking', slug, day, blind && 'blind', sample && 'sample'].filter(Boolean).join('-') + '.csv';
}
