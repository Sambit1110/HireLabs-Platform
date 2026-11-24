/**
 * Turns noisy "skill" lists (from the spaCy parser, or a skills section that a two-column PDF
 * merged with the contact line) into real skills.
 *
 * - Words a PDF glued together are split at a known skill name ("JavaScriptWeb" -> JavaScript,
 *   Web), without breaking names like JavaScript, PostgreSQL or GitHub.
 * - Contact details (links, emails, phones, places) and dates are dropped.
 * - Section labels ("Web:", "Tools &"), sentence fragments ("and practical AI") and lowercase
 *   phrases ("learning new technologies") are dropped.
 * - Phrases naming several known skills are split into them ("Node.js and Python backends").
 */

import { SKILL_INDEX } from '../ai/skill-lexicon.js';

export const SEPARATORS = /[,;|•·∙▪●◦]/;
const SKILL_LIST_LINE =
  /^\s*(?:technical\s+|core\s+|key\s+|programming\s+)?(?:skills?|technologies|tools(?:\s*(?:&|and)\s*platforms)?|tech stack|stack|languages|frameworks(?:\s*(?:&|and)\s*libraries)?|libraries|databases|platforms|web|cloud|devops)\s*[:\-–]\s*(.+)$/i;
const CONTACT = /@|https?:\/\/|www\.|\b[\w-]+\.(com|in|io|dev|org|net|me|co)\b|linkedin|github\.com|\+?\d[\d ()-]{8,}\d/i;
const DATE = /\b(19|20)\d{2}\b|\b(present|current|till date|ongoing)\b/i;
const LEADING_WORD = /^(and|or|with|in|of|for|to|the|a|an|using|including|etc)\b/i;
const CATEGORY_LABELS = new Set([
  'web', 'tools', 'tool', 'languages', 'language', 'frameworks', 'framework', 'libraries', 'library',
  'databases', 'database', 'platforms', 'platform', 'others', 'other', 'misc', 'skills', 'skill',
  'technical skills', 'soft skills', 'technologies', 'cloud', 'devops', 'programming', 'concepts',
  'coursework', 'interests', 'tools & platforms', 'frameworks & libraries', 'core', 'expertise',
]);
// Places that turn up on resume contact lines. A resume's own contact line is used too.
const LOCATIONS = new Set([
  'india', 'usa', 'us', 'united states', 'uk', 'united kingdom', 'canada', 'australia', 'germany',
  'singapore', 'uae', 'dubai', 'remote', 'kolkata', 'calcutta', 'mumbai', 'bombay', 'delhi',
  'new delhi', 'bengaluru', 'bangalore', 'pune', 'hyderabad', 'chennai', 'noida', 'gurgaon',
  'gurugram', 'ahmedabad', 'jaipur', 'lucknow', 'bhubaneswar', 'kochi', 'indore', 'chandigarh',
  'nagpur', 'surat', 'patna', 'guwahati', 'west bengal', 'maharashtra', 'karnataka', 'tamil nadu',
  'london', 'new york', 'san francisco', 'seattle', 'boston', 'toronto', 'berlin', 'sydney',
]);

const TERMS = [...new Set(SKILL_INDEX.flatMap((skill) => skill.terms))].sort((a, b) => b.length - a.length);

/** "JavaScriptWeb" -> "JavaScript Web": split where a whole known skill is followed by a capitalised word. */
export function splitJoined(token) {
  const lower = token.toLowerCase();
  const prefix = TERMS.find((term) => lower.startsWith(term));
  if (!prefix || prefix.length === token.length) return token;
  const rest = token.slice(prefix.length);
  return /^[A-Z][a-z]/.test(rest) ? `${token.slice(0, prefix.length)} ${splitJoined(rest)}` : token;
}

/** The text with glued words split (for finding skills; never for quoting the resume). */
export function normalizeJoins(text) {
  return String(text || '').split(/(\s+)/).map((part) => (/\s/.test(part) ? part : splitJoined(part))).join('');
}

const lines = (text) => String(text || '').split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);

/** Every known skill named in a phrase, in lexicon order. */
export function skillsIn(phrase) {
  return SKILL_INDEX.filter((skill) => skill.aliases.some((pattern) => pattern.test(phrase))).map((skill) => skill.name);
}

/** Pieces of the resume's contact lines (city, country...), lower-cased, to keep out of skills. */
function contactPieces(text) {
  const pieces = new Set();
  for (const line of lines(text)) {
    if (!CONTACT.test(line) || SKILL_LIST_LINE.test(line)) continue;
    for (const piece of line.split(SEPARATORS)) {
      const clean = piece.trim().toLowerCase();
      if (clean && clean.length <= 40 && !skillsIn(clean).length) pieces.add(clean);
    }
  }
  return pieces;
}

/** Items of the resume's "Skills:" lines, split on any list separator. */
export function listedItems(text) {
  return lines(normalizeJoins(text))
    .map((line) => line.match(SKILL_LIST_LINE)?.[1])
    .filter(Boolean)
    .flatMap((items) => items.split(SEPARATORS));
}

/** A cleaned item, or null when it is not a skill (contact detail, date, label, fragment). */
function tidy(raw, contact) {
  let item = String(raw).replace(/\(.*?\)/g, '').replace(/^[\s•*\-–:]+|[\s&:.\-–]+$/g, '').trim();
  if (item.includes(':')) item = item.slice(item.lastIndexOf(':') + 1).trim();
  item = item.replace(/\s+(&|and)$/i, '').trim();
  const lower = item.toLowerCase();
  if (item.length < 1 || item.length > 40 || !/[A-Za-z]/.test(item)) return null;
  if (CONTACT.test(item) || DATE.test(item) || LEADING_WORD.test(item)) return null;
  if (CATEGORY_LABELS.has(lower) || LOCATIONS.has(lower) || contact.has(lower)) return null;
  if (item.split(' ').length > 4) return null;
  return item;
}

/**
 * Real skills from a noisy list. With `requireKnown`, an unknown item survives only if the
 * resume lists it in a skills section (used for the parser's output, which is noisier).
 * @param {string[]} items
 * @param {string} text the resume text
 */
export function cleanSkills(items, text, { requireKnown = false } = {}) {
  const contact = contactPieces(text);
  const listed = new Set(listedItems(text).map((item) => tidy(item, contact)?.toLowerCase()).filter(Boolean));
  const out = [];
  const add = (skill) => {
    if (skill && !out.some((existing) => existing.toLowerCase() === skill.toLowerCase())) out.push(skill);
  };
  for (const raw of Array.isArray(items) ? items : []) {
    for (const piece of normalizeJoins(String(raw)).split(SEPARATORS)) {
      const item = tidy(piece, contact);
      if (!item) continue;
      const known = skillsIn(item);
      if (known.length) {
        known.forEach(add);
        continue;
      }
      const lower = item.toLowerCase();
      const plausible = listed.has(lower) || (!requireKnown && (/[A-Z0-9+#.]/.test(item) || item.split(' ').length === 1));
      // Multi-word all-lowercase phrases ("learning new technologies") are prose, not skills.
      const prose = item.split(' ').length > 1 && item === lower && !listed.has(lower);
      if (plausible && !prose && (!requireKnown || listed.has(lower))) add(item);
    }
  }
  return out.slice(0, 30);
}
