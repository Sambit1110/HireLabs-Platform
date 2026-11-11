import { apiError, apiSuccess } from '@/lib/api/response';
import { authenticateRequest } from '@/lib/supabase/server-auth';
import { parseAIJson } from '@/lib/ai/parse-json';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

const clip = (value, max) => String(value || '').slice(0, max);

const candidateSchema = {
  type: 'object',
  properties: {
    candidate_summary: { type: 'string' },
    fit_verdict: { type: 'string', enum: ['strong', 'moderate', 'weak', 'insufficient_evidence'] },
    confidence: { type: 'integer' },
    strengths: { type: 'array', items: { type: 'string' } },
    gaps: { type: 'array', items: { type: 'string' } },
    evidence_signals: { type: 'array', items: { type: 'string' } },
    risk_flags: { type: 'array', items: { type: 'string' } },
    interview_questions: { type: 'array', items: { type: 'string' } },
    recommendation: { type: 'string' },
  },
  required: [
    'candidate_summary',
    'fit_verdict',
    'confidence',
    'strengths',
    'gaps',
    'evidence_signals',
    'risk_flags',
    'interview_questions',
    'recommendation',
  ],
};

const roleSchema = {
  type: 'object',
  properties: {
    role_summary: { type: 'string' },
    seniority: { type: 'string' },
    must_have_skills: { type: 'array', items: { type: 'string' } },
    nice_to_have_skills: { type: 'array', items: { type: 'string' } },
    responsibilities: { type: 'array', items: { type: 'string' } },
    screening_signals: { type: 'array', items: { type: 'string' } },
    interview_focus: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'role_summary',
    'seniority',
    'must_have_skills',
    'nice_to_have_skills',
    'responsibilities',
    'screening_signals',
    'interview_focus',
  ],
};

export async function POST(request) {
  const auth = await authenticateRequest(request);
  if (auth.response) return auth.response;
  if (!process.env.GEMINI_API_KEY) {
    return apiError('AI_UNAVAILABLE', 'AI features are not configured.', 503);
  }

  try {
    const body = await request.json();
    const mode = body?.mode;

    if (mode !== 'candidate' && mode !== 'role') {
      return apiError('INVALID_MODE', 'Invalid AI analysis mode.', 400);
    }

    const schema = mode === 'candidate' ? candidateSchema : roleSchema;
    let input;

    if (mode === 'candidate') {
      input = `You are HireLabs, an evidence-first recruiting copilot. Analyze a candidate against a specific target role. Never invent credentials, employers, dates, metrics, or skills. Distinguish between explicit evidence and reasonable inference. Be concise and recruiter-friendly.

TARGET ROLE:
${clip(body.role, 300)}

JOB DESCRIPTION:
${clip(body.jobDescription, 10000)}

CANDIDATE NAME:
${clip(body.candidate?.name, 200)}

CANDIDATE TITLE:
${clip(body.candidate?.title, 200)}

KNOWN SKILLS:
${clip(body.candidate?.skills, 3000)}

YEARS OF EXPERIENCE:
${body.candidate?.yearsExperience ?? 'Unknown'}

RESUME TEXT:
${clip(body.candidate?.parsedText, 30000)}

Return JSON matching the provided schema. Keep lists focused (3-8 items). Interview questions must be tailored to claims or gaps in the candidate's profile.`;
    } else {
      input = `You are HireLabs, a recruiting copilot. Analyze the role description below and turn it into an actionable screening brief. Do not invent company-specific information that is not present. Separate must-have requirements from nice-to-have requirements based on wording and priority.

ROLE:
${clip(body.role, 300)}

JOB DESCRIPTION:
${clip(body.jobDescription, 12000)}

Return JSON matching the provided schema. Keep lists focused (3-8 items).`;
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: input,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error('Gemini returned no usable output.');
    }

    const result = parseAIJson(outputText);

    return apiSuccess({ result, model: MODEL });
  } catch (error) {
    console.error('AI analysis error:', error);
    return apiError('ANALYSIS_FAILED', 'Unable to generate AI analysis.', 500);
  }
}

