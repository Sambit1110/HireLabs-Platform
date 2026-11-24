import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getClaims, getUser } = vi.hoisted(() => ({ getClaims: vi.fn(), getUser: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getClaims, getUser } }) }));

const withToken = (token) => new Request('http://localhost/api', { headers: { Authorization: `Bearer ${token}` } });

describe('authenticateRequest', () => {
  beforeEach(() => {
    vi.resetModules(); getClaims.mockReset(); getUser.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable-test';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });
  it('rejects missing bearer tokens', async () => {
    const { authenticateRequest } = await import('../lib/supabase/server-auth.js');
    const result = await authenticateRequest(new Request('http://localhost/api'));
    expect(result.response.status).toBe(401);
    expect(getClaims).not.toHaveBeenCalled();
  });
  it('verifies the token signature locally (no Supabase Auth round trip) and returns the user id', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'user-1', role: 'authenticated' } }, error: null });
    const { authenticateRequest } = await import('../lib/supabase/server-auth.js');
    const result = await authenticateRequest(withToken('token-1'));
    expect(result.user.id).toBe('user-1');
    expect(getClaims).toHaveBeenCalledWith('token-1');
    expect(getUser).not.toHaveBeenCalled();
  });
  it('rejects invalid or expired tokens', async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error('bad signature') });
    const { authenticateRequest } = await import('../lib/supabase/server-auth.js');
    const result = await authenticateRequest(withToken('invalid'));
    expect(result.response.status).toBe(401);
  });
  it('rejects tokens that are not a signed-in user (for example the anon key)', async () => {
    getClaims.mockResolvedValue({ data: { claims: { role: 'anon' } }, error: null });
    const { authenticateRequest } = await import('../lib/supabase/server-auth.js');
    const result = await authenticateRequest(withToken('anon-key'));
    expect(result.response.status).toBe(401);
  });
});
