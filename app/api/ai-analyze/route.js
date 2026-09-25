import { NextResponse } from 'next/server';

import { guardRequest, jsonError, readJsonBody } from '@/lib/server/guard';
import { createRateLimiter } from '@/lib/server/rateLimit';
import { getAiConfig } from '@/lib/server/aiConfig';
import { consumeDailyQuota } from '@/lib/server/quota';
import {
  AiProviderError,
  buildCandidatePrompt,
  buildRolePrompt,
  runAnalysis,
} from '@/lib/ai/analyze';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Prompts clip every field well below this; anything larger is not a legitimate request.
const MAX_BODY_BYTES = 64 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Burst control per server instance (in memory). The authoritative daily
// per-user and global quotas are enforced in Postgres (consumeDailyQuota).
const limits = {
  ipLimiters: [createRateLimiter({ name: 'ai-ip', limit: 30, windowMs: 60_000 })],
  userLimiters: [createRateLimiter({ name: 'ai-user-minute', limit: 10, windowMs: 60_000 })],
};

/**
 * Loads the candidate to analyze. Uploaded resumes are read from the user's
 * own row (RLS-scoped), never from client-supplied resume text.
 */
async function resolveCandidate(supabase, candidate) {
  if (candidate?.resumeId) {
    if (typeof candidate.resumeId !== 'string' || !UUID.test(candidate.resumeId)) {
      return { error: jsonError(400, 'Invalid resume id.') };
    }

    const { data, error } = await supabase
      .from('resumes')
      .select('candidate_name, candidate_title, extracted_skills, years_experience, parsed_text, processing_status')
      .eq('id', candidate.resumeId)
      .maybeSingle();

    if (error) {
      console.error('AI candidate lookup failed:', error);
      return { error: jsonError(500, 'Unable to load this resume.') };
    }
    if (!data) return { error: jsonError(404, 'Resume not found.') };
    if (data.processing_status !== 'completed') {
      return { error: jsonError(409, 'This resume must finish parsing before AI analysis can run.') };
    }

    return {
      candidate: {
        name: data.candidate_name,
        title: data.candidate_title,
        skills: data.extracted_skills ?? [],
        yearsExperience: data.years_experience,
        parsedText: data.parsed_text,
      },
    };
  }

  // Built-in sample profiles are sent by the client and contain no user data.
  return {
    candidate: {
      name: candidate?.name,
      title: candidate?.title,
      skills: candidate?.skills,
      yearsExperience: Number(candidate?.yearsExperience),
      parsedText: candidate?.parsedText,
    },
  };
}

export async function POST(request) {
  const guard = await guardRequest(request, limits);
  if (guard.response) return guard.response;

  const ai = getAiConfig();
  if (!ai.enabled) {
    return jsonError(503, 'AI features are temporarily disabled.');
  }
  if (!ai.configured) {
    return jsonError(503, 'AI features are not configured on this deployment.');
  }

  const parsed = await readJsonBody(request, MAX_BODY_BYTES);
  if (parsed.response) return parsed.response;
  const body = parsed.data;
  const mode = body?.mode;

  if (mode !== 'candidate' && mode !== 'role') {
    return jsonError(400, 'Invalid AI analysis mode.');
  }
  if (!String(body.role ?? '').trim() || !String(body.jobDescription ?? '').trim()) {
    return jsonError(400, 'A role and job description are required.');
  }

  let input;
  if (mode === 'candidate') {
    const resolved = await resolveCandidate(guard.supabase, body.candidate);
    if (resolved.error) return resolved.error;
    input = buildCandidatePrompt({ role: body.role, jobDescription: body.jobDescription, candidate: resolved.candidate });
  } else {
    input = buildRolePrompt({ role: body.role, jobDescription: body.jobDescription });
  }

  // Spend quota only for valid requests that are about to reach Gemini.
  const quota = await consumeDailyQuota(guard.supabase, 'ai');
  if (!quota.allowed) {
    return jsonError(
      quota.status,
      quota.error,
      quota.retryAfterSeconds ? { 'Retry-After': String(quota.retryAfterSeconds) } : undefined
    );
  }

  try {
    const result = await runAnalysis({ mode, input, apiKey: ai.apiKey, model: ai.model });
    return NextResponse.json({ result, model: ai.model });
  } catch (error) {
    console.error('AI analysis error:', error?.cause ?? error);
    const message = error instanceof AiProviderError ? error.message : 'Unable to generate AI analysis.';
    return jsonError(502, message);
  }
}
