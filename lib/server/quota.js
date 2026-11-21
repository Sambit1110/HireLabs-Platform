/**
 * Shared daily quota backed by Postgres (supabase/migrations/004).
 *
 * Unlike the in-memory limiter, counters live in the database, so the per-user
 * and global daily limits hold across every server instance. The RPC runs as
 * the calling user (their JWT), and limits are read from api_quota_limits.
 *
 * @returns {Promise<{ allowed: true } | { allowed: false, status: number, error: string, retryAfterSeconds?: number }>}
 */
export async function consumeDailyQuota(supabase, scope) {
  const { data, error } = await supabase.rpc('consume_api_quota', { p_scope: scope });

  if (error) {
    // Fail closed: without a working quota the feature could spend unbounded money.
    console.error('Quota check failed:', error.code ?? error.message);
    return {
      allowed: false,
      status: 503,
      error: 'AI usage limits are not available right now, so AI features are paused.',
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (row?.allowed) return { allowed: true };

  return {
    allowed: false,
    status: 429,
    error: 'The daily AI analysis limit has been reached. Please try again tomorrow.',
    retryAfterSeconds: row?.retry_after_seconds ?? 3600,
  };
}
