/**
 * Skill search over the resume library.
 *
 * "SQL + Python, 3+ years" means: the resume shows SQL AND Python AND at least 3 years of
 * experience. Skill names understand aliases from the skill lexicon ("js" finds JavaScript,
 * "postgres" finds PostgreSQL), and are looked up in the extracted skills and in the resume
 * text itself (glued PDF words split). A term that is not a known skill also matches the
 * candidate's name, title or file name, so searching for a person still works.
 */

import { SKILL_INDEX, termPattern } from '../ai/skill-lexicon.js';
import { normalizeJoins } from './skill-hygiene.js';

const YEARS = /\b(\d{1,2})\s*\+?\s*(?:years?|yrs?)(?:\s+(?:of\s+)?experience)?\b/i;
// "+" means "and" only between words ("SQL + Python", "SQL+Python"), never inside "C++".
const AND = /,|;|&|\s+and\s+|\s+\+\s+|(?<=[A-Za-z0-9])\+(?=[A-Za-z])/i;

/**
 * @param {string} query
 * @returns {{ terms: { label: string, known: boolean, patterns: RegExp[], raw: string }[], minYears: number | null }}
 */
export function parseSkillQuery(query) {
  const terms = [];
  const text = String(query || '');
  const years = text.match(YEARS);
  const minYears = years ? Number(years[1]) : null;
  const parts = text
    .replace(YEARS, ' ')
    .split(AND)
    .map((part) => part.trim().replace(/^\+\s*/, '').trim())
    .filter(Boolean);
  for (const part of parts) {
    const lower = part.toLowerCase();
    const known = SKILL_INDEX.find((skill) => skill.terms.includes(lower));
    terms.push(known
      ? { label: known.name, known: true, patterns: known.aliases, raw: lower }
      : { label: part, known: false, patterns: [termPattern(lower)], raw: lower });
  }
  return { terms, minYears };
}

/** Whether the query has anything to search for. */
export function isEmptyQuery(parsed) {
  return parsed.terms.length === 0 && parsed.minYears === null;
}

/**
 * @param {{ candidate_name?: string|null, candidate_title?: string|null, file_name?: string, extracted_skills?: string[]|null, parsed_text?: string|null, years_experience?: number|null }} resume
 * @param {ReturnType<typeof parseSkillQuery>} parsed
 * @returns {{ match: boolean, matched: string[] }} matched = the skill labels the resume satisfies
 */
export function matchResume(resume, parsed) {
  if (isEmptyQuery(parsed)) return { match: true, matched: [] };
  const skills = (resume.extracted_skills || []).join('\n');
  const text = normalizeJoins(resume.parsed_text || '');
  const identity = [resume.candidate_name, resume.candidate_title, resume.file_name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const matched = [];
  for (const term of parsed.terms) {
    const inSkills = term.patterns.some((pattern) => pattern.test(skills));
    const inText = term.patterns.some((pattern) => pattern.test(text));
    const inIdentity = !term.known && identity.includes(term.raw);
    if (!inSkills && !inText && !inIdentity) return { match: false, matched: [] };
    if (inSkills || inText) matched.push(term.label);
  }
  if (parsed.minYears !== null && !(Number.isInteger(resume.years_experience) && resume.years_experience >= parsed.minYears)) {
    return { match: false, matched: [] };
  }
  return { match: true, matched };
}
