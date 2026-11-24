/**
 * Rule-based resume profile: name, title, years of experience and skills read straight from
 * the text, with no model. Used to fill whatever the HireLabs parser (and Ollama, when it is
 * configured) leave empty, and to clean the parser's skill list.
 */

import { SKILL_INDEX } from '../ai/skill-lexicon.js';
import { SEPARATORS, cleanSkills, isLocation, listedItems, normalizeJoins } from './skill-hygiene.js';

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
const SKILL_LIST_LINE =
  /^\s*(?:technical\s+|core\s+|key\s+|programming\s+)?(?:skills?|technologies|tools(?:\s*(?:&|and)\s*platforms)?|tech stack|stack|languages|frameworks(?:\s*(?:&|and)\s*libraries)?|libraries|databases|platforms|web|cloud|devops)\s*[:\-–]\s*(.+)$/i;

const lines = (text) => String(text || '').split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);

/** True for a line that reads like a person's name: 2-4 capitalised words, no digits or role. */
export function looksLikeName(line) {
  if (typeof line !== 'string') return false;
  const clean = line.replace(/\s+/g, ' ').trim();
  if (clean.length > 40 || /[\d@|/:]/.test(clean) || ROLE_WORDS.test(clean) || isLocation(clean)) return false;
  const words = clean.split(' ');
  return words.length >= 2 && words.length <= 4 && words.every((word) => /^[A-Z][A-Za-z'.-]*$/.test(word));
}

/** The name on the resume's first lines; the top line may share it with contact details ("NAME | City | email"). */
function nameLine(head) {
  const whole = head.find(looksLikeName);
  if (whole) return whole;
  const first = head[0]?.split(SEPARATORS)[0].trim();
  return looksLikeName(first) ? first : null;
}

/** The canonical lexicon skill for a phrase, if one of its aliases is in it. */
export function canonicalSkill(phrase) {
  return SKILL_INDEX.find((skill) => skill.aliases.some((pattern) => pattern.test(phrase)))?.name ?? null;
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
  const name = nameLine(head);
  const titleLine = head.find(
    (line) => line !== name && ROLE_WORDS.test(line) && line.length <= 80 && !/[@|]/.test(line) && !SKILL_LIST_LINE.test(line)
  );

  const explicit = String(text || '').match(EXPLICIT_YEARS);
  const years = explicit ? Math.min(80, Math.floor(Number(explicit[1]))) : yearsFromDates(text, now);

  // Skills listed in a skills section, then every known skill named anywhere (glued words split).
  const normalizedLines = lines(normalizeJoins(text));
  const found = SKILL_INDEX
    .filter((skill) => normalizedLines.some((line) => skill.aliases.some((pattern) => pattern.test(line))))
    .map((skill) => skill.name);
  const skills = cleanSkills([...listedItems(text), ...found], text);

  return {
    candidateName: name,
    candidateTitle: titleLine ? titleLine.replace(/\s*[,–-]\s*$/, '') : null,
    extractedSkills: skills.slice(0, 30),
    yearsExperience: Number.isInteger(years) ? years : null,
  };
}

/**
 * The parser's skills without its usual noise (places, links, dates, schools, labels, half
 * phrases, glued words): keeps known skills, and other items only if the resume lists them in
 * a skills section.
 */
export function cleanParserSkills(skills, text) {
  return cleanSkills(
    (Array.isArray(skills) ? skills : []).filter((item) => !EDUCATION.test(String(item))),
    text,
    { requireKnown: true }
  );
}
