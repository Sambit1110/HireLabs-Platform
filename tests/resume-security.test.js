import { describe, expect, it, vi } from 'vitest';

const { authenticateRequest } = vi.hoisted(() => ({ authenticateRequest: vi.fn() }));
vi.mock('@/lib/supabase/server-auth', () => ({ authenticateRequest }));

describe('resume deletion ownership', () => {
  it('scopes lookup to the authenticated user and does not touch storage for another owner’s row', async () => {
    const filters = [];
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((column, value) => { filters.push([column, value]); return query; }),
      maybeSingle,
    };
    const remove = vi.fn();
    authenticateRequest.mockResolvedValue({
      user: { id: 'signed-in-user' },
      supabase: { from: vi.fn(() => query), storage: { from: vi.fn(() => ({ remove })) } },
    });

    const { DELETE } = await import('../app/api/resumes/[resumeId]/route.js');
    const response = await DELETE(new Request('http://localhost/api/resumes/123'), { params: Promise.resolve({ resumeId: '123e4567-e89b-12d3-a456-426614174000' }) });

    expect(response.status).toBe(404);
    expect(filters).toContainEqual(['user_id', 'signed-in-user']);
    expect(remove).not.toHaveBeenCalled();
  });
});
