// Server-side only: holds the Gemini request. Imported by app/api/ai-analyze.

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const REQUEST_TIMEOUT_MS = 50_000;
// Enough for the structured analyses (a few hundred words); caps cost and response size.
export const MAX_OUTPUT_TOKENS = 4096;
// Hard cap on provider text we are willing to parse (defence in depth).
const MAX_OUTPUT_CHARS = 60_000;
const MAX_LIST_ITEMS = 10;
const MAX_ITEM_CHARS = 600;
const MAX_SUMMARY_CHARS = 2_000;

export const DEFAULT_MODEL = 'gemini-3.7-flash';

/** Failure talking to the AI provider; `message` is safe to show to users. */
export class AiProviderError extends Error {
  constructor(message, { cause } = {}) {
    super(message, { cause });
    this.name = 'AiProviderError';
  }
}

const clip = (value, max) => String(value ?? '').slice(0, max);
const stringList = { type: 'array', items: { type: 'string' } };

export const candidateSchema = {
  type: 'object',
  properties: {
    candidate_summary: { type: 'string' },
    fit_verdict: { type: 'string', enum: ['strong', 'moderate', 'weak', 'insufficient_evidence'] },
    confidence: { type: 'integer' },
    strengths: stringList,
    gaps: stringList,
    evidence_signals: stringList,
    risk_flags: stringList,
    interview_questions: stringList,
    recommendation: { type: 'string' },
  },
  required: [
    'candidate_summary', 'fit_verdict', 'confidence', 'strengths', 'gaps',
    'evidence_signals', 'risk_flags', 'interview_questions', 'recommendation',
  ],
};

export const roleSchema = {
  type: 'object',
  properties: {
    role_summary: { type: 'string' },
    seniority: { type: 'string' },
    must_have_skills: stringList,
    nice_to_have_skills: stringList,
    responsibilities: stringList,
    screening_signals: stringList,
    interview_focus: stringList,
  },
  required: [
    'role_summary', 'seniority', 'must_have_skills', 'nice_to_have_skills',
    'responsibilities', 'screening_signals', 'interview_focus',
  ],
};

export function buildCandidatePrompt({ role, jobDescription, candidate }) {
  const skills = Array.isArray(candidate.skills) ? candidate.skills.join(', ') : candidate.skills;

  return `You are HireLabs, an evidence-first recruiting copilot. Analyze a candidate against a specific target role. Never invent credentials, employers, dates, metrics, or skills. Distinguish between explicit evidence and reasonable inference. Do not consider or infer protected characteristics. Be concise and recruiter-friendly.

TARGET ROLE:
${clip(role, 300)}

JOB DESCRIPTION:
${clip(jobDescription, 10000)}

CANDIDATE NAME:
${clip(candidate.name, 200)}

CANDIDATE TITLE:
${clip(candidate.title, 200)}

KNOWN SKILLS:
${clip(skills, 3000)}

YEARS OF EXPERIENCE:
${Number.isFinite(candidate.yearsExperience) ? candidate.yearsExperience : 'Unknown'}

RESUME TEXT:
${clip(candidate.parsedText, 30000)}

Return JSON matching the provided schema. Keep lists focused (3-8 items). Interview questions must be tailored to claims or gaps in the candidate's profile.`;
}

export function buildRolePrompt({ role, jobDescription }) {
  return `You are HireLabs, a recruiting copilot. Analyze the role description below and turn it into an actionable screening brief. Do not invent company-specific information that is not present. Separate must-have requirements from nice-to-have requirements based on wording and priority.

ROLE:
${clip(role, 300)}

JOB DESCRIPTION:
${clip(jobDescription, 12000)}

Return JSON matching the provided schema. Keep lists focused (3-8 items).`;
}

export function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;

  const parts = [];
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    if (typeof item?.text === 'string') parts.push(item.text);
    for (const part of Array.isArray(item?.content?.parts) ? item.content.parts : []) {
      if (typeof part?.text === 'string') parts.push(part.text);
    }
  }
  return parts.join('\n').trim();
}

export function parseJsonOutput(text) {
  const cleaned = String(text ?? '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1));
      } catch {
        // fall through
      }
    }
    throw new AiProviderError('The AI returned an unreadable response. Please try again.');
  }
}

/**
 * Runs one structured Gemini request.
 * @param {{ mode: 'candidate' | 'role', input: string, apiKey: string, model?: string, fetchImpl?: typeof fetch }} options
 */
export async function runAnalysis({ mode, input, apiKey, model = DEFAULT_MODEL, fetchImpl = fetch }) {
  let response;
  try {
    response = await fetchImpl(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model,
        input,
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: mode === 'candidate' ? candidateSchema : roleSchema,
        },
        generation_config: { max_output_tokens: MAX_OUTPUT_TOKENS },
        // Resume text is personal data: do not keep the interaction on Google's side.
        store: false,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new AiProviderError('The AI provider did not respond in time. Please try again.', { cause: error });
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AiProviderError(
      response.status === 429
        ? 'The AI provider is busy right now. Please try again shortly.'
        : 'The AI provider could not complete this request.',
      { cause: new Error(`Gemini ${response.status}: ${payload?.error?.message ?? 'unknown error'}`) }
    );
  }

  const text = extractOutputText(payload);
  if (!text) throw new AiProviderError('The AI returned an empty response. Please try again.');
  if (text.length > MAX_OUTPUT_CHARS) throw new AiProviderError('The AI response was too large. Please try again.');

  return sanitizeResult(mode, parseJsonOutput(text));
}

const cleanString = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const cleanList = (value) => (Array.isArray(value) ? value : [])
  .filter((item) => typeof item === 'string' && item.trim())
  .slice(0, MAX_LIST_ITEMS)
  .map((item) => item.trim().slice(0, MAX_ITEM_CHARS));

/** Keeps only schema fields, with bounded sizes, so the browser never receives unexpected data. */
export function sanitizeResult(mode, raw) {
  const value = raw && typeof raw === 'object' ? raw : {};

  if (mode === 'candidate') {
    const verdicts = candidateSchema.properties.fit_verdict.enum;
    return {
      candidate_summary: cleanString(value.candidate_summary, MAX_SUMMARY_CHARS),
      fit_verdict: verdicts.includes(value.fit_verdict) ? value.fit_verdict : 'insufficient_evidence',
      confidence: Math.max(0, Math.min(100, Math.round(Number(value.confidence) || 0))),
      strengths: cleanList(value.strengths),
      gaps: cleanList(value.gaps),
      evidence_signals: cleanList(value.evidence_signals),
      risk_flags: cleanList(value.risk_flags),
      interview_questions: cleanList(value.interview_questions),
      recommendation: cleanString(value.recommendation, MAX_SUMMARY_CHARS),
    };
  }

  return {
    role_summary: cleanString(value.role_summary, MAX_SUMMARY_CHARS),
    seniority: cleanString(value.seniority, 200),
    must_have_skills: cleanList(value.must_have_skills),
    nice_to_have_skills: cleanList(value.nice_to_have_skills),
    responsibilities: cleanList(value.responsibilities),
    screening_signals: cleanList(value.screening_signals),
    interview_focus: cleanList(value.interview_focus),
  };
}
