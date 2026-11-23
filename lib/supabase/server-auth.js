
import { createClient } from '@supabase/supabase-js';
import { apiError } from '@/lib/api/response';

/**
 * HireLabs server-side authentication.
 *
 * Verifies the Supabase access token and creates
 * a user-scoped Supabase client for protected APIs.
 *
 * The returned client uses the user's JWT so
 * database and storage RLS policies can apply.
 *
 * @param {Request} request
 * @returns {Promise<
 *   | { response: Response }
 *   | { supabase: import('@supabase/supabase-js').SupabaseClient,
 *       user: import('@supabase/supabase-js').User }
 * >}
 */

const MAX_TOKEN_LENGTH = 8192;

function getAccessToken(request) {
  const authorization =
    request.headers.get('authorization');

  if (!authorization) {
    return null;
  }

  // Accept exactly one Bearer token.
  const match = authorization
    .trim()
    .match(/^Bearer[ \t]+([^\s]+)$/i);

  if (!match) {
    return null;
  }

  const token = match[1];

  if (
    !token ||
    token.length > MAX_TOKEN_LENGTH
  ) {
    return null;
  }

  return token;
}

function getSupabaseConfig() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);

    if (
      parsedUrl.protocol !== 'https:' &&
      !(
        parsedUrl.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(
          parsedUrl.hostname
        )
      )
    ) {
      return null;
    }

    return {
      url,
      key,
    };
  } catch {
    return null;
  }
}

function createAuthenticatedClient(config, token) {
  return createClient(
    config.url,
    config.key,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },

      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

/**
 * Authenticate an incoming HireLabs API request.
 *
 * Usage:
 *
 * const auth = await authenticateRequest(request);
 *
 * if (auth.response) {
 *   return auth.response;
 * }
 *
 * const { supabase, user } = auth;
 */
export async function authenticateRequest(request) {
  const token = getAccessToken(request);

  if (!token) {
    return {
      response: apiError(
        'UNAUTHORIZED',
        'A valid sign-in session is required.',
        401
      ),
    };
  }

  const config = getSupabaseConfig();

  if (!config) {
    console.error(
      'HireLabs authentication configuration is missing or invalid.'
    );

    return {
      response: apiError(
        'SERVICE_UNAVAILABLE',
        'Authentication service is not configured.',
        503
      ),
    };
  }

  try {
    const supabase =
      createAuthenticatedClient(config, token);

    // Verify the access token against Supabase Auth.
    // Do not rely on decoding the JWT alone.
    const { data, error } =
      await supabase.auth.getUser(token);

    if (error || !data?.user?.id) {
      return {
        response: apiError(
          'UNAUTHORIZED',
          'Your session is invalid or expired. Please sign in again.',
          401
        ),
      };
    }

    const user = data.user;

    return {
      supabase,
      user,
    };
  } catch (error) {
    // Never log access tokens or personal user data.
    console.error(
      'HireLabs authentication verification failed:',
      {
        name:
          error instanceof Error
            ? error.name
            : 'UnknownError',
      }
    );

    return {
      response: apiError(
        'AUTH_UNAVAILABLE',
        'Authentication could not be verified. Please retry.',
        503
      ),
    };
  }
}
