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
  return {
    updates,
    filters,
    from: () => ({
      select: query.select,
      update: (fields) => {
        const row = { fields };
        updates.push(row);
        const chain = { eq: (column, value) => { row[column] = value; return chain; }, then: (resolve) => resolve({ error: null }) };
        return chain;
      },
    }),
  };
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
});
