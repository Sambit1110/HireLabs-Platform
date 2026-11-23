import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

import { isProtectedPath } from '@/lib/auth/redirect';

/**
 * Refresh the Supabase session cookie and send signed-out visitors away
 * from protected pages.
 *
 * This is an optimistic check that avoids rendering protected pages for
 * visitors without a valid session. Data access is still protected by the
 * API routes (bearer-token verification) and database row-level security.
 *
 * @param {import('next/server').NextRequest} request
 */
export async function updateSession(request) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without configuration there is no session to check; the pages show
  // their own "Supabase is not configured" errors.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
        Object.entries(headers || {}).forEach(([header, value]) =>
          response.headers.set(header, value)
        );
      },
    },
  });

  // getClaims() verifies the access token's signature (refreshing it if
  // needed). Do not run other code between creating the client and this call.
  let signedIn = false;

  try {
    const { data, error } = await supabase.auth.getClaims();
    signedIn = !error && Boolean(data?.claims?.sub);
  } catch {
    signedIn = false;
  }

  const { pathname, search } = request.nextUrl;

  if (!signedIn && isProtectedPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    redirectUrl.search = '';
    redirectUrl.searchParams.set('auth', 'signin');
    redirectUrl.searchParams.set('next', `${pathname}${search}`);

    const redirect = NextResponse.redirect(redirectUrl);
    // Keep any refreshed/cleared auth cookies on the redirect.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set('Cache-Control', 'private, no-store');
    return redirect;
  }

  return response;
}
