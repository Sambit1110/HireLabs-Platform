import { extractSkills } from './matching.js';

/** Rule-based profile extraction from resume text. Pure; no I/O. */

const MAX_TEXT_LENGTH = 50000;
export const MIN_TEXT_LENGTH = 40;
export const DEFAULT_TITLE = 'Uploaded candidate';

const TITLES = [
  'software engineer', 'software developer', 'full stack engineer', 'full-stack engineer',
  'frontend engineer', 'backend engineer', 'data scientist', 'data engineer',
  'machine learning engineer', 'ml engineer', 'ai engineer', 'devops engineer',
  'cloud engineer', 'cloud architect', 'solutions architect', 'product manager',
  'project manager', 'security engineer', 'cybersecurity engineer', 'web developer',
  'android developer', 'ios developer', 'qa engineer', 'test engineer', 'research scientist',
];

const NON_NAME_LINE = /resume|curriculum|vitae|experience|education|skills|profile|summary|contact|email|phone|github|linkedin/i;

export function cleanText(value) {
  return String(value ?? '')
    .replace(/\u0000/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

export function extractName(text, fileName) {
  const likely = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => {
      if (NON_NAME_LINE.test(line)) return false;
      if (line.length < 3 || line.length > 60) return false;
      if (/[@\d]/.test(line)) return false;
      const words = line.split(/\s+/);
      return words.length >= 2 && words.length <= 5 && words.every((word) => /^[A-Za-z.'-]+$/.test(word));
    });

  if (likely) return likely;

  return String(fileName ?? '')
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Uploaded Candidate';
}

export function extractTitle(text) {
  const lower = text.toLowerCase();
  return TITLES.find((title) => lower.includes(title)) || DEFAULT_TITLE;
}

export function extractYears(text) {
  const matches = [...text.matchAll(/\b(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b/gi)]
    .map((match) => Number(match[1]))
    .filter((years) => years > 0 && years <= 50);
  return matches.length ? Math.max(...matches) : null;
}

/** Builds the structured profile stored on the resume row. */
export function buildProfile(rawText, fileName) {
  const parsedText = cleanText(rawText);
  const skills = extractSkills(parsedText);
  const candidateName = extractName(parsedText, fileName);
  const candidateTitle = extractTitle(parsedText);
  const yearsExperience = extractYears(parsedText);

  return {
    parsedText,
    candidateName,
    candidateTitle,
    yearsExperience,
    extractedSkills: skills,
    profileCompleteness: Math.min(100, Math.round(
      35 +
      Math.min(35, skills.length * 3.5) +
      (candidateName ? 10 : 0) +
      (candidateTitle !== DEFAULT_TITLE ? 10 : 0) +
      (yearsExperience !== null ? 10 : 0)
    )),
  };
}
