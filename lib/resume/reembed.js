import { embedTexts, toPgVector } from './embedding.js';

/**
 * Re-embeds a recruiter's resumes whose stored vector predates the model server's current
 * matcher (`releasedAt`, reported by /embed for hirelabs-matcher v2 and later). Vectors from
 * two different matchers are not comparable, so without this a matcher switch would rank old
 * resumes wrongly until someone clicked "Re-process all". Runs inside /api/match with the
 * recruiter's own session, so row-level security limits it to their resumes.
 *
 * Never throws; returns how many resumes were refreshed.
 */
export async function refreshStaleEmbeddings(supabase, userId, releasedAt, { embed = embedTexts, limit = 200, batch = 32 } = {}) {
  const since = Date.parse(releasedAt ?? '');
  if (!Number.isFinite(since)) return { refreshed: 0 };
  const cutoff = new Date(since).toISOString();

  try {
    const { data, error } = await supabase
      .from('resumes')
      .select('id, parsed_text')
      .eq('user_id', userId)
      .not('parsed_text', 'is', null)
      .or(`embedded_at.is.null,embedded_at.lt.${cutoff}`)
      .limit(limit);
    if (error || !Array.isArray(data) || data.length === 0) return { refreshed: 0 };

    let refreshed = 0;
    for (let start = 0; start < data.length; start += batch) {
      const chunk = data.slice(start, start + batch).filter((row) => typeof row.parsed_text === 'string' && row.parsed_text.trim());
      if (!chunk.length) continue;
      const { vectors } = await embed(chunk.map((row) => row.parsed_text.slice(0, 50000)));
      const now = new Date().toISOString();
      const results = await Promise.all(chunk.map((row, index) => {
        const embedding = toPgVector(vectors[index]);
        if (!embedding) return false;
        return supabase
          .from('resumes')
          .update({ embedding, embedded_at: now })
          .eq('id', row.id)
          .eq('user_id', userId)
          .then(({ error: updateError }) => !updateError);
      }));
      refreshed += results.filter(Boolean).length;
    }
    return { refreshed };
  } catch (error) {
    console.warn('Refreshing old resume embeddings failed:', { name: error instanceof Error ? error.name : 'UnknownError' });
    return { refreshed: 0 };
  }
}
