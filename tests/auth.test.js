import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser } }) }));

describe('authenticateRequest', () => {
  beforeEach(() => {
    vi.resetModules(); getUser.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable-test';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });
  it('rejects missing bearer tokens', async () => {
    const { authenticateRequest } = await import('../lib/supabase/server-auth.js');
    const result = await authenticateRequest(new Request('http://localhost/api'));
    expect(result.response.status).toBe(401);
    expect(getUser).not.toHaveBeenCalled();
  });
  it('accepts a valid token and returns the verified user', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    const { authenticateRequest } = await import('../lib/supabase/server-auth.js');
    const result = await authenticateRequest(new Request('http://localhost/api', { headers: { Authorization: 'Bearer token-1' } }));
    expect(result.user.id).toBe('user-1');
    expect(getUser).toHaveBeenCalledWith('token-1');
  });
  it('rejects invalid tokens', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error('bad token') });
    const { authenticateRequest } = await import('../lib/supabase/server-auth.js');
    const result = await authenticateRequest(new Request('http://localhost/api', { headers: { Authorization: 'Bearer invalid' } }));
    expect(result.response.status).toBe(401);
  });
});
