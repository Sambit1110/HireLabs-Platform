import { SKILL_CATALOG } from './skills.js';

/**
 * Transparent, deterministic ATS matching.
 *
 * 1. Requirements are the catalog skills found in the role + job description.
 *    If the description names no catalog skills, meaningful keywords
 *    (4+ letters, not stop words) are used instead so non-technical roles
 *    still get a signal.
 * 2. A candidate's evidence is the union of their extracted skills and the
 *    catalog skills found in their resume text.
 * 3. score = round(100 * matched / total requirements). No base score and no
 *    floor: zero overlap is 0%.
 *
 * All comparisons are whole-token after normalization, never substrings, so
 * "java" does not match "javascript" and "go" does not match "good".
 */

const KEYWORD_STOP_WORDS = new Set([
  'about', 'above', 'across', 'after', 'also', 'able', 'ability', 'candidate', 'candidates',
  'company', 'deliver', 'desired', 'develop', 'developing', 'each', 'engineer', 'engineers',
  'engineering', 'ensure', 'environment', 'experience', 'experienced', 'from', 'good', 'great',
  'have', 'help', 'ideal', 'including', 'into', 'join', 'knowledge', 'looking', 'more', 'must',
  'need', 'needed', 'other', 'plus', 'preferred', 'required', 'requirements', 'responsible',
  'role', 'should', 'skills', 'strong', 'team', 'teams', 'that', 'their', 'them', 'they',
  'this', 'through', 'understanding', 'using', 'very', 'what', 'when', 'where', 'which',
  'while', 'will', 'with', 'within', 'work', 'working', 'years', 'your', 'you', 'senior',
  'junior', 'lead', 'level', 'hands', 'solid', 'excellent', 'building', 'build', 'across',
]);

const MAX_KEYWORD_REQUIREMENTS = 15;

/** Lowercases and splits text into tokens, keeping `+ # .` inside tokens (c++, c#, node.js). */
export function normalizeTokens(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[‘’']/g, '')
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .split(' ')
    .map((token) => token.replace(/^\.+|\.+$/g, ''))
    .filter(Boolean);
}

function phraseOf(value) {
  return normalizeTokens(value).join(' ');
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const COMPILED_CATALOG = SKILL_CATALOG.map((skill) => {
  const phrases = new Set(skill.aliases.map(phraseOf));
  if (skill.matchLowercase !== false) phrases.add(phraseOf(skill.name));
  phrases.delete('');

  const caseSensitive = (skill.caseSensitive || []).map(
    (spelling) => new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(spelling)}(?![A-Za-z0-9+#-])`)
  );

  return { name: skill.name, phrases: [...phrases], caseSensitive };
});

const CATALOG_BY_PHRASE = new Map();
for (const skill of COMPILED_CATALOG) {
  for (const phrase of skill.phrases) CATALOG_BY_PHRASE.set(phrase, skill.name);
  CATALOG_BY_PHRASE.set(phraseOf(skill.name), skill.name);
}

/** Maps a free-form skill string ("node", "ReactJS") to its canonical catalog name, or null. */
export function canonicalSkill(value) {
  return CATALOG_BY_PHRASE.get(phraseOf(value)) ?? null;
}

/** Returns canonical catalog skills found in `text`, in catalog order. */
export function extractSkills(text) {
  const raw = String(text ?? '');
  if (!raw.trim()) return [];

  const haystack = ` ${normalizeTokens(raw).join(' ')} `;

  return COMPILED_CATALOG
    .filter((skill) =>
      skill.phrases.some((phrase) => haystack.includes(` ${phrase} `)) ||
      skill.caseSensitive.some((pattern) => pattern.test(raw))
    )
    .map((skill) => skill.name);
}

function extractKeywords(text) {
  const seen = new Set();
  for (const token of normalizeTokens(text)) {
    if (token.length < 4 || !/^[a-z]+$/.test(token) || KEYWORD_STOP_WORDS.has(token)) continue;
    seen.add(token);
    if (seen.size >= MAX_KEYWORD_REQUIREMENTS) break;
  }
  return [...seen];
}

/**
 * Requirements considered for a role.
 * @returns {{ type: 'skills' | 'keywords' | 'none', items: string[] }}
 */
export function extractRequirements(role, jobDescription) {
  const text = `${role ?? ''}\n${jobDescription ?? ''}`;
  const skills = extractSkills(text);
  if (skills.length) return { type: 'skills', items: skills };

  const keywords = extractKeywords(text);
  if (keywords.length) return { type: 'keywords', items: keywords };

  return { type: 'none', items: [] };
}

/** Canonical skill evidence for a candidate: explicit skills plus skills found in resume text. */
export function candidateEvidence({ skills = [], text = '' } = {}) {
  const list = Array.isArray(skills) ? skills : String(skills).split(/[,;\n]/);
  const evidence = new Set();

  for (const skill of list) {
    const canonical = canonicalSkill(skill);
    if (canonical) evidence.add(canonical);
  }
  for (const skill of extractSkills(text)) evidence.add(skill);

  return evidence;
}

/**
 * Scores one candidate against pre-extracted requirements.
 * @returns {{ score: number, matched: string[], missing: string[], total: number, requirementType: string }}
 */
export function scoreCandidate(candidate, requirements) {
  const items = requirements?.items ?? [];
  const type = requirements?.type ?? 'none';
  const total = items.length;

  if (!total) {
    return { score: 0, matched: [], missing: [], total: 0, requirementType: 'none' };
  }

  let matched;
  if (type === 'keywords') {
    const tokens = new Set(normalizeTokens(`${candidate?.title ?? ''} ${[].concat(candidate?.skills ?? []).join(' ')} ${candidate?.text ?? ''}`));
    matched = items.filter((keyword) => tokens.has(keyword));
  } else {
    const evidence = candidateEvidence(candidate);
    matched = items.filter((skill) => evidence.has(skill));
  }

  const missing = items.filter((item) => !matched.includes(item));

  return {
    score: Math.round((matched.length / total) * 100),
    matched,
    missing,
    total,
    requirementType: type,
  };
}

export function describeMatch({ matched, missing, total, requirementType }) {
  if (!total) {
    return 'No recognizable skills or keywords were found in the role or job description. Add the skills you need to see a score.';
  }

  const noun = requirementType === 'keywords' ? 'keyword' : 'required skill';
  const base = `${matched.length} of ${total} ${noun}${total === 1 ? '' : 's'} found in this profile.`;

  if (!matched.length) {
    return `${base} No overlap with the role — review the resume manually before shortlisting.`;
  }
  if (!missing.length) {
    return `${base} Every requirement has supporting evidence.`;
  }
  return `${base} Evidence for ${matched.slice(0, 4).join(', ')}; ${missing.length} still need${missing.length === 1 ? 's' : ''} evidence.`;
}

/**
 * Ranks candidates for a role. Pure and synchronous — no network access.
 * Candidates whose profile is not ready (`profileReady === false`) are
 * returned last with `score: null` so the UI can show their parse state.
 */
export function rankCandidates(candidates, { role, jobDescription, mode = 'best', selectedId } = {}) {
  const requirements = extractRequirements(role, jobDescription);
  const pool = mode === 'specific'
    ? candidates.filter((candidate) => candidate.id === selectedId)
    : candidates;

  const results = pool.map((candidate, index) => {
    if (candidate.profileReady === false) {
      return {
        ...candidate,
        order: index,
        score: null,
        matched: [],
        missing: requirements.items,
        total: requirements.items.length,
        requirementType: requirements.type,
        profilePending: true,
        analysisText: candidate.processingStatus === 'failed'
          ? `This resume could not be parsed.${candidate.parserError ? ` ${candidate.parserError}` : ''} Use Retry to process it again.`
          : 'This resume is still being processed. Its score will appear as soon as parsing finishes.',
      };
    }

    const match = scoreCandidate(
      { skills: candidate.skills, text: candidate.parsedText, title: candidate.title },
      requirements
    );

    return {
      ...candidate,
      ...match,
      order: index,
      profilePending: false,
      analysisText: describeMatch(match),
    };
  });

  results.sort((a, b) => {
    if (a.score === null && b.score === null) return a.order - b.order;
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    return b.score - a.score || a.order - b.order;
  });

  return { requirements, results };
}
