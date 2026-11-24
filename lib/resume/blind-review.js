/**
 * Blind review: show candidates without the details that reveal who they are, so a recruiter
 * judges the evidence rather than the person. Display only: the models never see names
 * differently, and every score stays exactly the same.
 *
 * Hidden: the candidate's name (replaced by a stable alias such as "Candidate 3"), the file
 * name, the raw resume text, and any email address, link or phone number in analysis text.
 */

const HIDDEN = 'Hidden candidate';
const HONORIFICS = new Set(['mr', 'mrs', 'ms', 'miss', 'mx', 'dr', 'prof', 'sir', 'jr', 'sr']);

/** "Candidate N" for every resume, numbered by upload order (oldest is 1), ties broken by id. */
export function blindAliases(resumes) {
  const time = (value) => {
    const parsed = Date.parse(value ?? '');
    return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
  };
  const rows = (Array.isArray(resumes) ? resumes : []).filter((row) => row && typeof row.id === 'string' && row.id);
  const ordered = [...rows].sort((a, b) => {
    const at = time(a.created_at);
    const bt = time(b.created_at);
    if (at !== bt) return at < bt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return new Map(ordered.map((row, index) => [row.id, `Candidate ${index + 1}`]));
}

/** The real name (or the file name without its extension), or only the alias in blind review. */
export function candidateDisplayName(resume, { blind, aliases }) {
  if (blind) return (resume && aliases?.get(resume.id)) || HIDDEN;
  return (
    resume?.candidate_name?.trim() ||
    resume?.file_name?.trim().replace(/\.[^.]+$/, '') ||
    'Unnamed resume'
  );
}

/** The words of a name worth hiding on their own: no honorifics or initials. */
export function nameTokens(name) {
  if (typeof name !== 'string') return [];
  const tokens = [];
  for (const raw of name.split(/\s+/)) {
    const word = raw.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
    if (word.length < 2 || HONORIFICS.has(word.toLowerCase())) continue;
    tokens.push(word);
    if (word.includes('-')) {
      for (const part of word.split('-')) if (part.length >= 2) tokens.push(part);
    }
  }
  return [...new Set(tokens)];
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordPattern = (text) => new RegExp(`(?<![\\p{L}\\p{N}])${text}(?![\\p{L}\\p{N}])`, 'giu');

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}/gu;
const URL = /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi;
const PROFILE = /\b(?:[a-z0-9-]+\.)*(?:linkedin|github|gitlab|bitbucket|behance|dribbble|medium|twitter|x|instagram|facebook|kaggle|stackoverflow)\.com\/[^\s<>"')\]]*/gi;
const PHONE = /(?<![\p{L}\p{N}])\+?\(?\d[\d \t().-]{7,}\d(?![\p{L}\p{N}])/gu;

function isPhone(match) {
  const digits = match.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return false;
  // Runs of years ("2016 2017 2018", "2018-2020 2021") are dates, not phone numbers.
  const groups = match.match(/\d+/g) || [];
  return !groups.every((group) => /^(?:19|20)\d\d$/.test(group));
}

/**
 * Removes identity from one piece of text: emails, links and phone numbers become [email],
 * [link] and [phone]; the candidate's name (whole, then each part) becomes the alias.
 */
export function redactIdentity(text, { names = [], alias = HIDDEN } = {}) {
  if (typeof text !== 'string' || !text) return text;
  let out = text
    .replace(EMAIL, '[email]')
    .replace(URL, '[link]')
    .replace(PROFILE, '[link]')
    .replace(PHONE, (match) => (isPhone(match) ? '[phone]' : match));

  const fullNames = names.filter((name) => typeof name === 'string' && name.trim());
  for (const name of fullNames) {
    const words = name.trim().split(/\s+/).map(escapeRegex);
    if (words.length > 1) out = out.replace(wordPattern(words.join('\\s+')), alias);
  }
  const tokens = [...new Set(fullNames.flatMap(nameTokens))].sort((a, b) => b.length - a.length);
  for (const token of tokens) out = out.replace(wordPattern(escapeRegex(token)), alias);
  // "The candidate, SAGNIK DAM, …" (no name extracted, the name stored as the title) reads
  // "Candidate 3, …" rather than "The candidate, Candidate 3, …".
  return out.replace(new RegExp(`\\bThe candidate,\\s+${escapeRegex(alias)}(?![\\p{L}\\p{N}])`, 'gu'), alias);
}

const JOB_WORDS = new Set(`
  engineer engineering developer development programmer coder analyst analytics scientist science
  manager management designer design architect consultant intern internship student graduate
  undergraduate lead head director officer executive specialist administrator admin associate
  assistant coordinator researcher research teacher tutor lecturer professor technician operator
  accountant representative sales marketing recruiter writer editor owner founder cofounder
  co-founder president vp cto ceo cfo coo devops sre qa tester support nurse doctor lawyer attorney
  advisor adviser strategist product data software full-stack fullstack frontend front-end backend
  back-end web mobile cloud security ml ai machine learning staff senior junior principal trainee
  apprentice freelancer contractor partner agent clerk supervisor planner producer artist
  photographer cybersecurity android ios embedded network systems database dba devsecops
`.split(/\s+/).filter(Boolean));

/** True when a title reads like a job ("Backend Engineer"), not like a person's name ("SAGNIK DAM"). */
export function looksLikeJobTitle(title) {
  if (typeof title !== 'string') return false;
  const words = title.toLowerCase().split(/[^\p{L}\p{N}+#-]+/u).filter(Boolean);
  return words.some((word) => JOB_WORDS.has(word) || word.split('-').some((part) => JOB_WORDS.has(part)));
}

/**
 * The strings that name this candidate: the extracted name, and the extracted title when it
 * is not a job title (the parser sometimes stores the name there).
 */
export function identityNames(resume) {
  const names = [];
  const name = resume?.candidate_name?.trim();
  if (name) names.push(name);
  const title = resume?.candidate_title?.trim();
  if (title && !looksLikeJobTitle(title) && !names.some((known) => known.toLowerCase() === title.toLowerCase())) {
    names.push(title);
  }
  return names;
}

/** The title to show in blind review: a job title with any name taken out, or null. */
export function blindTitle(resume, alias) {
  const title = resume?.candidate_title?.trim();
  if (!title || !looksLikeJobTitle(title)) return null;
  return redactIdentity(title, { names: identityNames(resume), alias });
}

/** Skills safe to show in blind review: no names, links, emails or phone numbers. */
export function blindSkills(skills, resume) {
  if (!Array.isArray(skills)) return [];
  const names = identityNames(resume);
  return skills
    .filter((skill) => typeof skill === 'string' && skill.trim())
    .filter((skill) => redactIdentity(skill, { names, alias: '\u0000' }) === skill);
}

/** A copy of `value` with every string inside it passed through redactIdentity. */
export function redactDeep(value, options) {
  if (typeof value === 'string') return redactIdentity(value, options);
  if (Array.isArray(value)) return value.map((item) => redactDeep(item, options));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactDeep(item, options)]));
  }
  return value;
}
