import { createHash } from 'node:crypto';

import { apiError, apiSuccess } from '@/lib/api/response';
import { authenticateRequest } from '@/lib/supabase/server-auth';
import { cleanResumeText } from '@/lib/resume/text';
import { summarizeFeedback, validateFeedback } from '@/lib/evaluator/feedback';

export const runtime = 'nodejs';

const MISSING_TABLE = new Set(['42P01', 'PGRST205']);
const NOT_SET_UP = 'Feedback storage is not set up yet. Run supabase/migrations/007_evaluation_feedback.sql in the Supabase SQL editor, then try again.';

const jobHash = (text) => createHash('sha256').update(cleanResumeText(text, 12000)).digest('hex');

/**
 * POST /api/feedback: save a recruiter's judgement of one evaluation (Agree/Disagree, their own
 * 0-100 score, a note). One row per recruiter, resume and job: sending again updates it.
 */
export async function POST(request) {
  const auth = await authenticateRequest(request);
  if (auth.response) return auth.response;

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 20000) return apiError('REQUEST_TOO_LARGE', 'The feedback is too large.', 413);
    body = JSON.parse(raw);
  } catch {
    return apiError('INVALID_JSON', 'The request must contain valid JSON.', 400);
  }

  const checked = validateFeedback(body);
  if (!checked.ok) return apiError('INVALID_INPUT', checked.error, 400);

  const row = {
    ...checked.value,
    user_id: auth.user.id,
    job_hash: jobHash(checked.value.job_description),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await auth.supabase
    .from('evaluation_feedback')
    .upsert(row, { onConflict: 'user_id,resume_id,job_hash' })
    .select('id, agrees, human_score, human_verdict, note, updated_at')
    .single();

  if (error) {
    if (MISSING_TABLE.has(error.code)) return apiError('FEEDBACK_NOT_SET_UP', NOT_SET_UP, 503);
    // Codes only: messages could echo the job or the note.
    console.error('Saving feedback failed:', { dbCode: error.code ?? null });
    return apiError('FEEDBACK_FAILED', 'Your feedback could not be saved. Please retry.', 500);
  }
  return apiSuccess({ feedback: data });
}

/** GET /api/feedback: how well the model agrees with this recruiter's feedback so far. */
export async function GET(request) {
  const auth = await authenticateRequest(request);
  if (auth.response) return auth.response;

  const { data, error } = await auth.supabase
    .from('evaluation_feedback')
    .select('model_used, model_score, model_verdict, agrees, human_score, human_verdict')
    .eq('user_id', auth.user.id)
    .limit(5000);

  if (error) {
    if (MISSING_TABLE.has(error.code)) return apiError('FEEDBACK_NOT_SET_UP', NOT_SET_UP, 503);
    console.error('Reading feedback failed:', { dbCode: error.code ?? null });
    return apiError('FEEDBACK_FAILED', 'Feedback could not be loaded.', 500);
  }
  return apiSuccess({ summary: summarizeFeedback(data || []) });
}
