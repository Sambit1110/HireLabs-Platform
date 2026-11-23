/**
 * Rule-based resume profile: name, title, years of experience and skills read straight from
 * the text, with no model. Used to fill whatever the HireLabs parser (and Ollama, when it is
 * configured) leave empty, and to clean the parser's skill list.
 */

import { SKILL_INDEX } from '../ai/skill-lexicon.js';

const ROLE_WORDS =
  /\b(engineer|developer|programmer|analyst|manager|designer|scientist|student|intern|executive|specialist|coordinator|consultant|accountant|representative|marketer|associate|architect|administrator|officer|lead|director|technician|writer|researcher|strategist|recruiter|assistant|sales|support|owner|founder)\b/i;
const EDUCATION =
  /\b(university|college|institute|school|academy|b\.?\s?tech|b\.?\s?e\b|b\.?\s?sc|m\.?\s?sc|bba|mba|bachelor|master|ph\.?d|degree|cgpa|gpa|diploma|class of)\b/i;
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const MONTH = '(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const YEAR = '((?:19|20)\\d{2})';
const RANGE = new RegExp(
  `(?:${MONTH}\\s+|(\\d{1,2})/)?${YEAR}\\s*(?:-|–|—|to)\\s*(?:(?:${MONTH}\\s+|(\\d{1,2})/)?${YEAR}|(present|current|now|today|date))`,
  'gi'
);
const EXPLICIT_YEARS =
  /\b(\d{1,2}(?:\.\d+)?)\s*\+?\s*years?\s+(?:of\s+)?(?:professional\s+|industry\s+|work\s+)?experience\b/i;
const SKILL_LIST_LINE = /^\s*(?:technical\s+|core\s+|key\s+)?(?:skills?|technologies|tools|tech stack|stack)\s*[:\-–]\s*(.+)$/i;

const lines = (text) => String(text || '').split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);

function looksLikeName(line) {
  if (line.length > 40 || /[\d@|/:]/.test(line) || ROLE_WORDS.test(line)) return false;
  const words = line.split(' ');
  return words.length >= 2 && words.length <= 4 && words.every((word) => /^[A-Z][A-Za-z'.-]*$/.test(word));
}

/** The canonical lexicon skill for a phrase, if one of its aliases is in it. */
export function canonicalSkill(phrase) {
  return SKILL_INDEX.find((skill) => skill.aliases.some((pattern) => pattern.test(phrase)))?.name ?? null;
}

/** Items from the resume's "Skills:" lines. */
function listedSkills(resumeLines) {
  return resumeLines
    .map((line) => line.match(SKILL_LIST_LINE)?.[1])
    .filter(Boolean)
    .flatMap((items) => items.split(/[,;•|]/))
    .map((item) => item.replace(/\(.*?\)/g, '').trim())
    .filter((item) => item.length >= 2 && item.length <= 40);
}

const monthIndex = (year, month) => Number(year) * 12 + (Number(month) || 1) - 1;

/** Whole years covered by employment date ranges (overlaps counted once, education excluded). */
export function yearsFromDates(text, now = new Date()) {
  const current = now.getFullYear() * 12 + now.getMonth();
  const spans = [];
  for (const line of lines(text)) {
    if (EDUCATION.test(line)) continue;
    for (const m of line.matchAll(RANGE)) {
      const [, startMon, startNum, startYear, endMon, endNum, endYear, open] = m;
      const start = monthIndex(startYear, MONTHS[startMon?.slice(0, 3).toLowerCase()] || startNum);
      const end = open ? current : monthIndex(endYear, MONTHS[endMon?.slice(0, 3).toLowerCase()] || endNum);
      if (end >= start && end - start <= 600 && end <= current + 12) spans.push([start, end]);
    }
  }
  if (!spans.length) return null;
  spans.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [from, to] = spans[0];
  for (const [start, end] of spans.slice(1)) {
    if (start <= to) to = Math.max(to, end);
    else { total += to - from; [from, to] = [start, end]; }
  }
  total += to - from;
  return Math.floor(total / 12);
}

/** Name, title, years and skills from the text alone. Fields it can't read are null / []. */
export function ruleProfile(text, now = new Date()) {
  const resumeLines = lines(text);
  const head = resumeLines.slice(0, 5);
  const nameIndex = head.findIndex(looksLikeName);
  const titleLine = head.find(
    (line, i) => i !== nameIndex && ROLE_WORDS.test(line) && line.length <= 80 && !/[@|]/.test(line) && !SKILL_LIST_LINE.test(line)
  );

  const explicit = String(text || '').match(EXPLICIT_YEARS);
  const years = explicit ? Math.min(80, Math.floor(Number(explicit[1]))) : yearsFromDates(text, now);

  const skills = [];
  const add = (skill) => {
    if (skill && !skills.some((existing) => existing.toLowerCase() === skill.toLowerCase())) skills.push(skill);
  };
  for (const item of listedSkills(resumeLines)) add(canonicalSkill(item) || item);
  for (const skill of SKILL_INDEX) {
    if (resumeLines.some((line) => skill.aliases.some((pattern) => pattern.test(line)))) add(skill.name);
  }

  return {
    candidateName: nameIndex === -1 ? null : head[nameIndex],
    candidateTitle: titleLine ? titleLine.replace(/\s*[,–-]\s*$/, '') : null,
    extractedSkills: skills.slice(0, 30),
    yearsExperience: Number.isInteger(years) ? years : null,
  };
}

/**
 * The parser's skills without its usual noise (locations, dates, schools, half phrases):
 * keeps an item only if it names a known skill or appears in the resume's skills list.
 */
export function cleanParserSkills(skills, text) {
  const listed = listedSkills(lines(text)).map((item) => item.toLowerCase());
  const kept = [];
  for (const raw of Array.isArray(skills) ? skills : []) {
    const item = String(raw).replace(/\s+/g, ' ').trim();
    if (!item || /[|@]/.test(item) || /\b(19|20)\d{2}\b/.test(item) || EDUCATION.test(item)) continue;
    const name = canonicalSkill(item) || (listed.includes(item.toLowerCase()) ? item : null);
    if (name && !kept.some((existing) => existing.toLowerCase() === name.toLowerCase())) kept.push(name);
  }
  return kept;
}
