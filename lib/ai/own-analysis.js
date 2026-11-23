/**
 * hirelabs-explainer: "Explain score" and "Generate role brief" built only from the team's
 * own models and transparent rules, with no external LLM and no fine-tuned model.
 *
 * - Skills the job asks for come from its "Required/Preferred skills" lines, or from the
 *   skill list in skill-lexicon.js matched against the job text.
 * - Each skill is looked up in the resume. A use in experience or projects is
 *   "demonstrated" and quoted word for word; a mention only in a skills list is
 *   "unverified"; a related term is "partial"; no mention is "missing".
 * - The fit score combines skill coverage (55%), hirelabs-matcher similarity (30%) and
 *   hirelabs-llm fit (15%), re-weighted over whichever signals are available.
 *
 * The output has the same shape as the evaluator's (candidateSchema / roleSchema), so the
 * dashboard shows it unchanged, and every quote is a verbatim line of the resume.
 */

import { bandFor } from './candidate-prompt.js';
import { parseLlmFit } from './llm-match.js';
import { callModelServer } from './model-server.js';
import { embedTexts } from '../resume/embedding.js';
import { roleProfileFor } from './role-profiles.js';
import { SKILL_INDEX, termPattern } from './skill-lexicon.js';

export const EXPLAINER_MODEL = 'hirelabs-explainer';

/** Who answers Explain score and role briefs: 'hirelabs' (this file, default) or 'ollama' (EVALUATOR_PROVIDER=ollama). */
export function evaluatorProvider() {
  return process.env.EVALUATOR_PROVIDER === 'ollama' ? 'ollama' : 'hirelabs';
}

const WEIGHTS = { coverage: 0.55, semantic: 0.3, llm: 0.15 };
const CREDIT = { demonstrated: 1, partial: 0.5, unverified: 0.4, missing: 0 };
const MAX_QUOTE = 160;
const LABELLED_SKILLS =
  /^\s*(required|must[- ]have|requirements|preferred|nice[- ]to[- ]have|bonus|desired)(?:\s+(?:skills|qualifications|technologies))?\s*:\s*(.+)$/i;
const PREFERRED_WORDS = /\b(prefer(?:red|ably)?|nice[- ]to[- ]have|bonus|a plus|desirable|desired)\b/i;
const HEADING_WORDS =
  /^(requirements?|qualifications?|responsibilities|duties|what you('|’)ll do|what we('|’)re looking for|about( us| the role| you)?|skills|nice[- ]to[- ]haves?|preferred( qualifications)?|bonus( points)?|must[- ]haves?|benefits|experience|education|projects?|summary|certifications?)$/i;
/** A section heading: a known heading word, or a short line ending with a colon. */
const isHeading = (line) => HEADING_WORDS.test(line.replace(/:$/, '').trim()) || (/:$/.test(line) && line.length <= 50);
const SKILL_LIST_LINE = /^\s*(?:technical\s+|core\s+|key\s+)?(?:skills?|technologies|tools|tech stack|stack)\s*[:\-–]/i;
const ACTION = /\b(build|develop|design|integrate|implement|work|maintain|craft|create|manage|lead|own|collaborate|analy[sz]e|support|drive|deliver|scale|improve|write|test|deploy|partner|research|prepare|monitor|optimi[sz]e)\w*\b/i;

const lines = (text) => String(text || '').split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
const unique = (items) => items.filter((item, i) => item && items.indexOf(item) === i);
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const list = (items, max = 5) => (items.length > max ? `${items.slice(0, max).join(', ')} and ${items.length - max} more` : items.join(', '));
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
const shorten = (text, max) => (text.length <= max ? text : `${text.slice(0, text.lastIndexOf(' ', max) > 0 ? text.lastIndexOf(' ', max) : max)}…`);

function isSkillListLine(line) {
  return SKILL_LIST_LINE.test(line) || (line.split(',').length >= 6 && !/[.!?]$/.test(line));
}

/**
 * A skill named in the job, under the job's own wording. When the lexicon knows that exact
 * term, its aliases count as the same skill; when it only overlaps (e.g. "Asana" and the
 * project-tool family), the lexicon's terms count as related evidence instead.
 */
function skillFor(term) {
  const clean = term.replace(/^[\s•*-]+|[\s.]+$/g, '').slice(0, 60);
  if (clean.length < 2) return null;
  const lower = clean.toLowerCase();
  const exact = SKILL_INDEX.find((skill) => skill.terms.includes(lower));
  if (exact) return { ...exact, name: clean };
  const overlapping = SKILL_INDEX.filter((skill) => skill.aliases.some((pattern) => pattern.test(clean)));
  return {
    name: clean,
    aliases: [termPattern(lower)],
    related: overlapping.flatMap((skill) => [...skill.aliases, ...skill.related]),
  };
}

/** Skills the job asks for, each marked required or preferred. */
export function jobSkills(jobDescription) {
  const jobLines = lines(jobDescription);
  const found = new Map();
  const add = (skill, kind) => {
    if (!skill) return;
    const existing = found.get(skill.name);
    // A skill that is required anywhere counts as required.
    if (!existing || (existing.kind === 'preferred' && kind === 'required')) found.set(skill.name, { ...skill, kind });
  };

  const labelled = jobLines.map((line) => line.match(LABELLED_SKILLS)).filter(Boolean);
  if (labelled.length) {
    for (const [, label, items] of labelled) {
      const kind = PREFERRED_WORDS.test(label) ? 'preferred' : 'required';
      for (const item of items.split(/[,;]|\band\b/)) add(skillFor(item), kind);
    }
    return [...found.values()];
  }

  let section = 'required';
  for (const line of jobLines) {
    if (isHeading(line)) section = PREFERRED_WORDS.test(line) ? 'preferred' : 'required';
    const kind = PREFERRED_WORDS.test(line) ? 'preferred' : section;
    for (const skill of SKILL_INDEX) if (skill.aliases.some((pattern) => pattern.test(line))) add(skill, kind);
  }
  return [...found.values()];
}

// PDF bullets ("•", or "(cid:127)" when the font has no mapping) at the start of a line.
const LEADING_BULLET = /^(?:\(cid:\d+\)|[•●▪·*–-])\s*/;

/**
 * What to compare against: the skills the job names, topped up from a typical-role profile
 * (role-profiles.js) when it names fewer than three. Assumed skills are marked as such.
 */
export function jobRequirements(jobDescription, role = '') {
  const skills = jobSkills(jobDescription);
  if (skills.length >= 3) return { skills, assumedRole: null };
  const profile = roleProfileFor(`${role}\n${jobDescription}`);
  if (!profile) return { skills, assumedRole: null };
  const named = new Set(skills.map((skill) => skill.name.toLowerCase()));
  const assumed = [
    ...profile.required.map((name) => ({ name, kind: 'required' })),
    ...profile.preferred.map((name) => ({ name, kind: 'preferred' })),
  ]
    .filter(({ name }) => !named.has(name.toLowerCase()))
    .map(({ name, kind }) => ({ ...SKILL_INDEX.find((skill) => skill.name === name), kind, assumed: true }))
    .filter((skill) => skill.aliases);
  return { skills: [...skills, ...assumed], assumedRole: assumed.length ? profile.role : null };
}

/** A verbatim piece of the line around the match, at most MAX_QUOTE characters, without a leading bullet. */
function quoteAround(fullLine, fullIndex) {
  const bullet = fullLine.match(LEADING_BULLET)?.[0].length ?? 0;
  const line = fullLine.slice(bullet);
  const index = Math.max(0, fullIndex - bullet);
  if (line.length <= MAX_QUOTE) return line;
  let start = Math.max(0, index - 60);
  let end = Math.min(line.length, start + MAX_QUOTE);
  if (start > 0) start = line.indexOf(' ', start) + 1 || start;
  if (end < line.length) end = line.lastIndexOf(' ', end) > start ? line.lastIndexOf(' ', end) : end;
  return line.slice(start, end).trim();
}

const CONTACT = /@|https?:\/\/|\b[\w-]+\.(com|io|dev|in|org|net|me)\b/i;

/**
 * Resume lines tagged as claims (the name and title at the top, skills lists, including one
 * wrapped onto the next line) or contact lines (emails, links). Neither counts as evidence of
 * using a skill; a skill named only in a claim line is "listed only".
 */
export function tagLines(resumeLines) {
  const tagged = [];
  for (const [index, line] of resumeLines.entries()) {
    if (typeof line === 'object') { tagged.push(line); continue; }
    const previous = tagged[tagged.length - 1];
    const continuesList = previous?.list && line.split(',').length >= 3 && !/[.!?]$/.test(line);
    const header = index < 2 && line.split(' ').length <= 8 && !/[,.!?]/.test(line.replace(/\b[\w-]+\.js\b/gi, ''));
    tagged.push({ line, list: Boolean(header || isSkillListLine(line) || continuesList), contact: CONTACT.test(line) });
  }
  return tagged;
}

/** The first matching line: { quote } (verbatim; null when the line has double quotes) or null. */
function firstMatch(patterns, resumeLines, wantList) {
  for (const { line, list: isList, contact } of tagLines(resumeLines)) {
    if (contact || isList !== wantList) continue;
    for (const pattern of patterns) {
      const match = pattern.exec(line);
      if (match) return { quote: /["“”]/.test(line) ? null : quoteAround(line, match.index) };
    }
  }
  return null;
}

/** demonstrated (used in work or projects) > unverified (skills list only) > partial (related term) > missing. */
export function skillEvidence(skill, resumeLines) {
  const used = firstMatch(skill.aliases, resumeLines, false);
  if (used) return { status: 'demonstrated', quote: used.quote };
  if (firstMatch(skill.aliases, resumeLines, true)) return { status: 'unverified', quote: null };
  const related = firstMatch(skill.related, resumeLines, false);
  if (related) return { status: 'partial', quote: related.quote };
  return { status: 'missing', quote: null };
}

function coverageOf(assessed) {
  const score = (items) => (items.length ? items.reduce((sum, item) => sum + CREDIT[item.status], 0) / items.length : null);
  const required = score(assessed.filter((item) => item.kind === 'required'));
  const preferred = score(assessed.filter((item) => item.kind === 'preferred'));
  if (required === null) return preferred;
  if (preferred === null) return required;
  return 0.8 * required + 0.2 * preferred;
}

function relevantProjects(taggedLines, assessed) {
  const resumeLines = taggedLines.map((item) => (typeof item === 'string' ? item : item.line));
  const start = resumeLines.findIndex((line) => /^projects?\b/i.test(line));
  if (start === -1) return [];
  const section = [];
  for (const line of resumeLines.slice(start + 1)) {
    if (isHeading(line)) break;
    section.push(line.replace(LEADING_BULLET, ''));
  }
  const skills = assessed.filter((item) => item.status !== 'missing');
  return section.filter((line) => skills.some((item) => item.aliases.some((p) => p.test(line)))).slice(0, 4);
}

/**
 * The candidate analysis, in the evaluator's schema.
 * @param {{ role: string, jobDescription: string, candidate: { parsedText: string, name?: string|null, title?: string|null, yearsExperience?: number|null } }} body
 * @param {{ similarity?: number|null, llmScore?: number|null }} [signals]
 */
export function analyzeCandidate(body, signals = {}) {
  const resumeText = String(body.candidate?.parsedText || '');
  const resumeLines = tagLines(lines(resumeText));
  const { skills: required, assumedRole } = jobRequirements(body.jobDescription, body.role);
  const assessed = required.map((skill) => ({ ...skill, ...skillEvidence(skill, resumeLines) }));
  const by = (status, kind) => assessed.filter((item) => item.status === status && (!kind || item.kind === kind)).map((item) => item.name);

  const demonstrated = by('demonstrated');
  const partial = by('partial');
  const unverified = by('unverified');
  const missingRequired = by('missing', 'required');
  const missingPreferred = by('missing', 'preferred');

  const coverage = coverageOf(assessed);
  const similarity = Number.isFinite(signals.similarity) ? signals.similarity : null;
  const semantic = similarity === null ? null : clamp01((similarity - 0.2) / 0.5);
  const llm = Number.isFinite(signals.llmScore) ? signals.llmScore / 100 : null;
  const parts = [[coverage, WEIGHTS.coverage], [semantic, WEIGHTS.semantic], [llm, WEIGHTS.llm]].filter(([value]) => value !== null);
  const weight = parts.reduce((sum, [, w]) => sum + w, 0);
  // Too little to judge: a near-empty resume, a short one showing none of the skills, or no signal at all.
  const length = resumeText.trim().length;
  const insufficient = length < 80 || (length < 300 && demonstrated.length === 0) || (coverage === null && semantic === null);
  const fitScore = insufficient || !weight ? 0 : Math.round((100 * parts.reduce((sum, [v, w]) => sum + v * w, 0)) / weight);
  const verdict = insufficient ? 'insufficient_evidence' : bandFor(fitScore);

  const confidence = Math.max(10, Math.min(95, Math.round(
    40 + Math.min(30, 5 * assessed.length) + (semantic !== null ? 15 : 0) + (llm !== null ? 10 : 0)
      - (resumeText.length < 600 ? 20 : 0) - (assessed.length === 0 ? 20 : 0)
  )));

  const name = body.candidate?.name?.trim() || 'The candidate';
  const title = body.candidate?.title?.trim();
  const years = Number.isInteger(body.candidate?.yearsExperience) ? body.candidate.yearsExperience : null;
  const evidence = assessed.filter((item) => item.quote).slice(0, 8);
  const strongest = assessed.filter((item) => item.status === 'demonstrated' && item.quote).slice(0, 6);

  const riskFlags = [];
  if (assumedRole) {
    riskFlags.push(`The job description names few skills, so typical ${assumedRole} skills were assumed. Add the real requirements for a sharper result.`);
  }
  if (unverified.length) riskFlags.push(`Listed but not shown in work or projects: ${list(unverified)}.`);
  if (!/\b(19|20)\d{2}\b/.test(resumeText)) riskFlags.push('No dates found, so the length of experience cannot be checked.');
  if (years === null) riskFlags.push('Years of experience could not be read from the resume.');
  if (resumeText.length < 600) riskFlags.push('The resume is short, so this assessment rests on little evidence.');
  if (coverage !== null && llm !== null && Math.abs(coverage - llm) > 0.5) {
    riskFlags.push('The skill check and hirelabs-llm disagree strongly on this candidate. Review the resume yourself.');
  }

  const questions = [
    ...missingRequired.slice(0, 3).map((skill) => `This role needs ${skill}. Have you used it, or something close to it? Tell us what you did.`),
    ...unverified.slice(0, 2).map((skill) => `You list ${skill}. Describe one project where you used it and what you built.`),
    ...strongest.slice(0, 2).map((item) => `Walk us through this: "${shorten(item.quote, 90)}". What was your part, and what was the result?`),
  ];
  if (!questions.length) questions.push('Which recent project is closest to this role, and what did you personally build or decide?');

  const recommendation = {
    strong: 'Move to interview: the resume shows evidence for most of what the job asks for.',
    moderate: 'Worth a screening call to check the gaps and unverified skills below.',
    weak: 'Unlikely fit on this resume: several required skills have no evidence.',
    insufficient_evidence: 'Not enough information to judge. Ask the candidate for a fuller resume or more detail.',
  }[verdict];

  const signalText = [
    coverage !== null && `skill coverage ${Math.round(coverage * 100)}%`,
    similarity !== null && `hirelabs-matcher similarity ${Math.round(similarity * 100)}%`,
    llm !== null && `hirelabs-llm fit ${Math.round(llm * 100)}/100`,
  ].filter(Boolean).join(', ');
  const total = assessed.length;

  return {
    candidate_summary:
      `${name}${title ? `, ${title}` : ''}${years !== null ? `, with ${plural(years, 'year')} of experience` : ''}. ` +
      (total
        ? `The resume shows evidence for ${demonstrated.length} of the ${plural(total, 'skill')} this job asks for` +
          `${partial.length ? `, related experience for ${partial.length}` : ''}` +
          `${unverified.length ? `, lists ${unverified.length} more without showing them` : ''}` +
          `${missingRequired.length ? `, and nothing for ${plural(missingRequired.length, 'required skill')}` : ''}.`
        : 'The job description names no specific skills, so the score relies on overall text similarity.') +
      (assumedRole ? ` (Skills assumed from a typical ${assumedRole} role.)` : ''),
    relevant_experience_summary: demonstrated.length
      ? `Work and projects in the resume mention ${list(demonstrated, 6)}${years !== null ? ` across ${plural(years, 'year')} of experience` : ''}.`
      : 'No work or project lines in the resume mention the skills this job asks for.',
    technical_strengths: demonstrated.slice(0, 10),
    relevant_projects: relevantProjects(resumeLines, assessed),
    fit_verdict: verdict,
    fit_score: fitScore,
    confidence,
    strengths: strongest.map((item) => `${item.name}: "${item.quote}"`),
    gaps: [
      ...missingRequired.map((skill) => `No evidence of ${skill} (required).`),
      ...missingPreferred.map((skill) => `No evidence of ${skill} (preferred).`),
      ...unverified.map((skill) => `${skill} is listed but not shown in work or projects.`),
    ].slice(0, 12),
    evidence_signals: evidence.map((item) => `"${item.quote}" (${item.name}${item.status === 'partial' ? ', related' : ''})`),
    risk_flags: riskFlags,
    interview_questions: questions.slice(0, 7),
    recommendation: `${recommendation} Generated by HireLabs' own models and rules; check it before deciding.`,
    skill_gap_analysis: {
      demonstrated_skills: demonstrated,
      partially_demonstrated_skills: partial,
      missing_required_skills: missingRequired,
      missing_preferred_skills: missingPreferred,
      unverified_skills: unverified,
      skill_gap_summary: total
        ? `${demonstrated.length} demonstrated, ${partial.length} partial, ${unverified.length} listed only and ` +
          `${missingRequired.length + missingPreferred.length} missing, out of ${plural(total, 'skill')} the job asks for.`
        : 'The job description names no specific skills to compare.',
    },
    // Extra fields the dashboard uses to show how the score was built, skill by skill.
    score_breakdown: {
      skill_coverage: coverage === null ? null : Math.round(coverage * 100),
      matcher_similarity: similarity === null ? null : Math.round(Math.max(0, similarity) * 100),
      llm_fit: llm === null ? null : Math.round(llm * 100),
      weights: { skill_coverage: 55, matcher_similarity: 30, llm_fit: 15 },
    },
    skill_matrix: assessed.map((item) => ({
      skill: item.name,
      kind: item.kind,
      status: item.status,
      quote: item.quote,
      assumed: Boolean(item.assumed),
    })),
    assumed_role: assumedRole,
    recruiter_insights: {
      strongest_alignment: strongest.map((item) => `${item.name}, shown in the resume`),
      areas_for_verification: [...unverified, ...partial].map((skill) => `${skill}: ask for a concrete example`),
      suggested_interview_focus: unique([...missingRequired, ...unverified, ...partial]).slice(0, 6),
      overall_assessment: verdict === 'insufficient_evidence'
        ? `Too little evidence to score.${signalText ? ` Signals: ${signalText}.` : ''}`
        : `Fit ${fitScore}/100 (${verdict}) from ${signalText}.`,
    },
  };
}

function seniorityOf(text) {
  const levels = [
    [/\bintern(ship)?s?\b/i, 'Intern'],
    [/\b(junior|entry[- ]level|graduate|associate)\b/i, 'Junior'],
    [/\b(lead|principal|staff|head of|director)\b/i, 'Lead'],
    [/\b(senior|sr\.?)\s/i, 'Senior'],
    [/\bmid(?:[- ]level)?\b/i, 'Mid-level'],
  ];
  const level = levels.find(([pattern]) => pattern.test(text))?.[1];
  const years = text.match(/\b(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?years?\b/i);
  if (level && years) return `${level} (asks for ${years[1]}+ years)`;
  if (level) return level;
  return years ? `Asks for ${years[1]}+ years` : 'Not specified';
}

function responsibilitiesOf(jobDescription) {
  const sentences = lines(jobDescription)
    .filter((line) => !LABELLED_SKILLS.test(line))
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((sentence) => sentence.replace(LEADING_BULLET, '').trim())
    // "We are hiring…" and "About us" sentences describe the company, not the work.
    .filter((sentence) => sentence.length > 20 && ACTION.test(sentence) && !/^(we are|we're|we have|about|our (company|mission|team is))\b/i.test(sentence));
  return unique(sentences).slice(0, 8);
}

/** The job title: the target role, "seeking/hiring a X to…", or a short first line. */
function roleName(role, jobDescription) {
  if (String(role || '').trim()) return String(role).trim();
  const hiring = String(jobDescription).match(/\b(?:seeking|hiring|looking for)\s+(?:an?\s+)?(.{3,80}?)\s+(?:to|who|with|for|that|in)\b/i);
  if (hiring) return hiring[1].trim();
  const first = lines(jobDescription)[0] || '';
  return first.length <= 80 ? first : 'This role';
}

/** The recruiter screening brief for a job, in the role schema. */
export function buildRoleBrief(body) {
  const job = String(body.jobDescription || '');
  const { skills, assumedRole } = jobRequirements(job, body.role);
  const must = skills.filter((skill) => skill.kind === 'required').map((skill) => skill.name);
  const nice = skills.filter((skill) => skill.kind === 'preferred').map((skill) => skill.name);
  const seniority = seniorityOf(`${body.role || ''}\n${job}`);
  const responsibilities = responsibilitiesOf(job);
  const role = roleName(body.role, job);
  const seniorityHint = /^Intern|^Junior/.test(seniority)
    ? 'Projects, coursework or internships that show these skills in practice'
    : /^Senior|^Lead/.test(seniority)
      ? 'Ownership of larger systems, decisions or a team'
      : null;

  return {
    role_summary:
      `${role} (${seniority}). ` +
      (must.length || nice.length
        ? `It asks for ${list(must.length ? must : nice, 6)}${must.length && nice.length ? `, with ${list(nice, 3)} as a plus` : ''}.`
        : 'The description names no specific skills.') +
      (assumedRole ? ` The description names few skills, so these are typical for a ${assumedRole}; replace them with the real requirements.` : '') +
      (responsibilities[0] ? ` Main work: ${responsibilities[0]}` : ''),
    seniority,
    must_have_skills: must,
    nice_to_have_skills: nice,
    responsibilities,
    screening_signals: [
      ...must.slice(0, 6).map((skill) => `Hands-on ${skill} in work or projects, not only in a skills list`),
      ...(seniorityHint ? [seniorityHint] : []),
    ],
    interview_focus: must.slice(0, 5).map((skill) => `${skill}: ask for a concrete example and the candidate's own part in it`),
  };
}

/** hirelabs-matcher similarity and hirelabs-llm fit for this pair; either is null if unavailable. */
export async function modelSignals(jobDescription, resumeText) {
  const job = String(jobDescription).slice(0, 20000);
  const resume = String(resumeText).slice(0, 20000);
  const [similarity, llmScore] = await Promise.all([
    embedTexts([job, resume])
      .then(({ vectors, model_used: model }) => {
        if (!String(model).startsWith('hirelabs-matcher') || /-(fallback|fixture)$/.test(model)) return null;
        const [a, b] = vectors;
        return a.reduce((sum, value, i) => sum + value * b[i], 0);
      })
      .catch(() => null),
    callModelServer('/match', { job, resume })
      .then(({ value, placeholder }) => (placeholder ? null : parseLlmFit(value)?.score ?? null))
      .catch(() => null),
  ]);
  return { similarity, llmScore };
}
