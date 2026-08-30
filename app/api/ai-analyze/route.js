import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

const clip = (value, max) => String(value || '').slice(0, max);

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;

  const output = Array.isArray(payload?.output) ? payload.output : [];
  const parts = [];

  for (const item of output) {
    if (typeof item?.text === 'string') parts.push(item.text);
    const itemParts = Array.isArray(item?.content?.parts) ? item.content.parts : [];
    for (const part of itemParts) {
      if (typeof part?.text === 'string') parts.push(part.text);
    }
  }

  return parts.join('\n').trim();
}

function parseJson(text) {
  const cleaned = String(text || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first >= 0 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }
    throw new Error('The AI returned an unreadable response.');
  }
}

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
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      {
        error: 'AI features are not configured. Add GEMINI_API_KEY to your Vercel environment variables.',
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const mode = body?.mode;

    if (mode !== 'candidate' && mode !== 'role') {
      return NextResponse.json({ error: 'Invalid AI analysis mode.' }, { status: 400 });
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

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        model: MODEL,
        input,
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema,
        },
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      const message = payload?.error?.message || 'Gemini request failed.';
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const outputText = extractOutputText(payload);
    if (!outputText) {
      throw new Error('Gemini returned no usable output.');
    }

    const result = parseJson(outputText);

    return NextResponse.json({
      result,
      model: MODEL,
    });
  } catch (error) {
    console.error('AI analysis error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to generate AI analysis.',
      },
      { status: 500 }
    );
  }
}
