import { NextResponse } from 'next/server';

import { guardRequest, jsonError, readJsonBody } from '@/lib/server/guard';
import { createRateLimiter } from '@/lib/server/rateLimit';
import { ResumeParseError, parseResumeBytes } from '@/lib/resume/parsing';
import { RESUME_COLUMNS } from '@/lib/resume/columns';

export const runtime = 'nodejs';
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const limits = {
  ipLimiters: [createRateLimiter({ name: 'parse-ip', limit: 60, windowMs: 60_000 })],
  userLimiters: [
    createRateLimiter({ name: 'parse-user-minute', limit: 30, windowMs: 60_000 }),
    createRateLimiter({ name: 'parse-user-hour', limit: 300, windowMs: 3_600_000 }),
  ],
};

/**
 * POST { resumeId: string, retry?: boolean }
 *
 * The browser uploads the file straight to Supabase Storage; this route only
 * receives the resume id, so no file bytes pass through the function body.
 */
export async function POST(request) {
  const guard = await guardRequest(request, limits);
  if (guard.response) return guard.response;
  const { user, supabase } = guard;

  const parsed = await readJsonBody(request, 4 * 1024);
  if (parsed.response) return parsed.response;
  const body = parsed.data;
  const resumeId = body?.resumeId;
  const retry = body?.retry === true;

  if (typeof resumeId !== 'string' || !UUID.test(resumeId)) {
    return jsonError(400, 'A valid resumeId is required.');
  }

  // 1. Atomically claim the resume (see supabase/migrations/003).
  const jobId = crypto.randomUUID();
  const { data: claimed, error: claimError } = await supabase.rpc('claim_resume_for_parsing', {
    p_resume_id: resumeId,
    p_job_id: jobId,
    p_allow_retry: retry,
  });

  if (claimError) {
    console.error('Resume claim failed:', claimError);
    return jsonError(500, 'Resume processing is temporarily unavailable.');
  }

  const resume = Array.isArray(claimed) ? claimed[0] : claimed;
  if (!resume) return explainUnclaimed(supabase, resumeId);

  // 2. Defence in depth: RLS already scopes rows and objects to the user.
  if (resume.user_id !== user.id || !String(resume.file_path).startsWith(`${user.id}/`)) {
    await finishJob(supabase, resumeId, jobId, { processing_status: 'failed', parser_error: 'Access denied.' });
    return jsonError(403, 'Access denied.');
  }

  try {
    // 3. Fetch the file server-side from private storage.
    const { data: blob, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(resume.file_path);

    if (downloadError || !blob) {
      console.error('Resume download failed:', downloadError);
      throw new ResumeParseError('The stored resume file could not be found. Please upload it again.');
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const profile = await parseResumeBytes(bytes, {
      fileName: resume.file_name,
      contentType: resume.file_type,
    });

    // 4. Persist only if this job still owns the row.
    const updated = await finishJob(supabase, resumeId, jobId, {
      processing_status: 'completed',
      parsed_text: profile.parsedText,
      extracted_skills: profile.extractedSkills,
      candidate_name: profile.candidateName,
      candidate_title: profile.candidateTitle,
      years_experience: profile.yearsExperience,
      profile_completeness: profile.profileCompleteness,
      parser_error: null,
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'This resume was re-queued by another request.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ resume: updated });
  } catch (error) {
    const known = error instanceof ResumeParseError;
    if (!known) console.error('Resume parsing failed:', error);

    const message = known ? error.message : 'The resume could not be processed. Please retry.';
    const failed = await finishJob(supabase, resumeId, jobId, {
      processing_status: 'failed',
      parser_error: message,
    });

    return NextResponse.json({ error: message, resume: failed }, { status: known ? 422 : 500 });
  }
}

async function finishJob(supabase, resumeId, jobId, values) {
  const { data, error } = await supabase
    .from('resumes')
    .update(values)
    .eq('id', resumeId)
    // Only the job that currently owns the row, and only while it is processing,
    // may write a result. A superseded (retried) job updates zero rows.
    .eq('processing_job_id', jobId)
    .eq('processing_status', 'processing')
    .select(RESUME_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error('Resume status update failed:', error);
    return null;
  }
  return data;
}

async function explainUnclaimed(supabase, resumeId) {
  const { data: current, error } = await supabase
    .from('resumes')
    .select(RESUME_COLUMNS)
    .eq('id', resumeId)
    .maybeSingle();

  if (error) {
    console.error('Resume lookup failed:', error);
    return jsonError(500, 'Resume processing is temporarily unavailable.');
  }
  if (!current) return jsonError(404, 'Resume not found.');

  if (current.processing_status === 'completed') {
    return NextResponse.json({ resume: current, alreadyProcessed: true });
  }

  const error409 = current.processing_status === 'failed'
    ? 'This resume failed to parse. Use Retry to process it again.'
    : 'This resume is already being processed.';

  return NextResponse.json({ error: error409, resume: current }, { status: 409 });
}
