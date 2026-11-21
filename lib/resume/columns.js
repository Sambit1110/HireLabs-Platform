/** Resume row columns the UI needs; shared by client queries and API responses. */
export const RESUME_COLUMNS = [
  'id',
  'file_name',
  'file_path',
  'file_type',
  'file_size',
  'processing_status',
  'processing_started_at',
  'processing_attempts',
  'created_at',
  'parsed_text',
  'extracted_skills',
  'candidate_name',
  'candidate_title',
  'years_experience',
  'profile_completeness',
  'parser_error',
].join(', ');

/** 'uploaded' is the pre-migration name for 'queued'. */
export const QUEUED_STATUSES = new Set(['queued', 'uploaded']);

/** A 'processing' row older than this is considered stalled and may be retried by the user. */
export const STALE_PROCESSING_MS = 5 * 60 * 1000;

export function isStalled(resume, now = Date.now()) {
  if (resume?.processing_status !== 'processing') return false;
  if (!resume.processing_started_at) return true;
  return now - new Date(resume.processing_started_at).getTime() > STALE_PROCESSING_MS;
}
