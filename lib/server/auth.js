import { createClient } from '@supabase/supabase-js';

import { getSupabaseConfig } from '../config.js';

/** Required server configuration is missing. */
export class ConfigurationError extends Error {}

/** Supabase Auth could not be reached or failed (not an invalid token). */
export class AuthUnavailableError extends Error {}

/**
 * Resolves the Supabase user for an API request from its bearer token.
 *
 * The browser sends `Authorization: Bearer <access token>`; Supabase Auth
 * verifies the token (`auth.getUser`). The returned client carries the same
 * token, so every query and storage call it makes runs under the user's
 * row-level-security policies — the server never trusts a client-supplied
 * user id.
 *
 * @returns {Promise<{ user: import('@supabase/supabase-js').User, supabase: import('@supabase/supabase-js').SupabaseClient } | null>}
 */
export async function authenticateRequest(request) {
  const header = request.headers.get('authorization') || '';
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!match) return null;

  const { url, key, configured } = getSupabaseConfig();
  if (!configured) {
    throw new ConfigurationError('Supabase environment variables are not configured on the server.');
  }

  const token = match[1];
  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    // 4xx = the token was rejected; anything else = Auth itself is unavailable.
    const status = Number(error.status);
    if (Number.isFinite(status) && status >= 400 && status < 500) return null;
    throw new AuthUnavailableError('Supabase Auth is unavailable.', { cause: error });
  }
  if (!data?.user) return null;

  return { user: data.user, supabase };
}
