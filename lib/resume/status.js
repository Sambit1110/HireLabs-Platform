/**
 * Resume processing statuses, shared by the dashboard.
 *
 * The database allows uploaded/queued/processing/parsed/completed/failed
 * (migrations 003 and 006). 'queued' is 003's name for 'uploaded', and
 * 'completed' is the job pipeline's name for 'parsed', so the UI treats
 * each pair the same.
 */

export const PARSED_STATUSES = ['parsed', 'completed'];
export const PENDING_STATUSES = ['uploaded', 'queued', 'processing'];

/** @param {string | null | undefined} status */
export function isParsedStatus(status) {
  return PARSED_STATUSES.includes(status || '');
}

/** @param {string | null | undefined} status */
export function isPendingStatus(status) {
  return PENDING_STATUSES.includes(status || '');
}

/** @param {string | null | undefined} status */
export function statusLabel(status) {
  if (isParsedStatus(status)) return 'Parsed';
  if (status === 'processing') return 'Processing';
  if (status === 'uploaded' || status === 'queued') return 'Pending';
  if (status === 'failed') return 'Failed';
  return status || 'Unknown';
}
