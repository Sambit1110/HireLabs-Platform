import { describe, expect, it, vi } from 'vitest';

import { refreshStaleEmbeddings } from '../lib/resume/reembed.js';

function fakeSupabase(rows) {
  const updates = [];
  const filters = {};
  const query = {
    select: () => query,
    eq: (column, value) => { filters[column] = value; return query; },
    not: () => query,
    or: (expression) => { filters.or = expression; return query; },
    limit: async () => ({ data: rows, error: null }),
  };
  const client = {
    updates,
    filters,
    queries: 0,
    from: () => ({
      select: (...args) => { client.queries += 1; return query.select(...args); },
      update: (fields) => {
        const row = { fields };
        updates.push(row);
        const chain = { eq: (column, value) => { row[column] = value; return chain; }, then: (resolve) => resolve({ error: null }) };
        return chain;
      },
    }),
  };
  return client;
}

const unit = (i) => Array.from({ length: 384 }, (_, j) => (j === i ? 1 : 0));

describe('refreshStaleEmbeddings', () => {
  it('does nothing without a release time (the current matcher)', async () => {
    const embed = vi.fn();
    expect(await refreshStaleEmbeddings(fakeSupabase([]), 'u1', null, { embed })).toEqual({ refreshed: 0 });
    expect(embed).not.toHaveBeenCalled();
  });

  it('re-embeds resumes stored before the release, in batches, for this recruiter only', async () => {
    const rows = [1, 2, 3].map((n) => ({ id: `r${n}`, parsed_text: `Resume ${n}` }));
    const supabase = fakeSupabase(rows);
    const embed = vi.fn(async (texts) => ({ vectors: texts.map((_, i) => unit(i)) }));
    const result = await refreshStaleEmbeddings(supabase, 'u1', '2026-11-24T12:00:00Z', { embed, batch: 2 });
    expect(result).toEqual({ refreshed: 3 });
    expect(embed).toHaveBeenCalledTimes(2);
    expect(supabase.filters.user_id).toBe('u1');
    expect(supabase.filters.or).toBe('embedded_at.is.null,embedded_at.lt.2026-11-24T12:00:00.000Z');
    expect(supabase.updates.every((row) => row.user_id === 'u1' && row.fields.embedding.startsWith('['))).toBe(true);
  });

  it('never throws when the model server fails', async () => {
    const embed = vi.fn(async () => { throw new Error('Embedding service returned HTTP 503'); });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await refreshStaleEmbeddings(fakeSupabase([{ id: 'r1', parsed_text: 'x' }]), 'u1', '2026-11-24T12:00:00Z', { embed });
    expect(result).toEqual({ refreshed: 0 });
    warn.mockRestore();
  });

  it('skips the database check once a recruiter is known to be up to date (saves a round trip per ranking)', async () => {
    const embed = vi.fn(async (texts) => ({ vectors: texts.map((_, i) => unit(i)) }));
    const release = '2026-11-24T12:00:00Z';
    const first = fakeSupabase([{ id: 'r1', parsed_text: 'Resume 1' }]);
    await refreshStaleEmbeddings(first, 'cached-user', release, { embed });
    const second = fakeSupabase([]);
    expect(await refreshStaleEmbeddings(second, 'cached-user', release, { embed })).toEqual({ refreshed: 0 });
    expect(second.queries).toBe(0);
    // Another recruiter, or a newer matcher release, is checked again.
    const other = fakeSupabase([]);
    await refreshStaleEmbeddings(other, 'other-user', release, { embed });
    expect(other.queries).toBe(1);
    const newer = fakeSupabase([]);
    await refreshStaleEmbeddings(newer, 'cached-user', '2026-12-01T00:00:00Z', { embed });
    expect(newer.queries).toBe(1);
  });

  it('checks again after a failed refresh', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failing = vi.fn(async () => { throw new Error('down'); });
    const release = '2026-11-24T12:00:00Z';
    await refreshStaleEmbeddings(fakeSupabase([{ id: 'r1', parsed_text: 'x' }]), 'retry-user', release, { embed: failing });
    const again = fakeSupabase([]);
    await refreshStaleEmbeddings(again, 'retry-user', release, { embed: failing });
    expect(again.queries).toBe(1);
    warn.mockRestore();
  });

  it('checks again when more stale resumes remain than one call refreshes', async () => {
    const embed = vi.fn(async (texts) => ({ vectors: texts.map((_, i) => unit(i)) }));
    const release = '2026-11-24T12:00:00Z';
    const rows = [1, 2].map((n) => ({ id: `r${n}`, parsed_text: `Resume ${n}` }));
    await refreshStaleEmbeddings(fakeSupabase(rows), 'busy-user', release, { embed, limit: 2 });
    const again = fakeSupabase([]);
    await refreshStaleEmbeddings(again, 'busy-user', release, { embed });
    expect(again.queries).toBe(1);
  });
});
