import { createClient } from '@supabase/supabase-js';
import { apiError } from '@/lib/api/response';

export async function authenticateRequest(request) {
  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return { response: apiError('UNAUTHORIZED', 'Sign in to continue.', 401) };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { response: apiError('SERVICE_UNAVAILABLE', 'Authentication service is not configured.', 503) };

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${match[1]}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  try {
    const { data, error } = await supabase.auth.getUser(match[1]);
    if (error || !data.user) return { response: apiError('UNAUTHORIZED', 'Your session is invalid or expired.', 401) };
    return { supabase, user: data.user };
  } catch {
    return { response: apiError('AUTH_UNAVAILABLE', 'Authentication could not be verified. Please retry.', 503) };
  }
}
