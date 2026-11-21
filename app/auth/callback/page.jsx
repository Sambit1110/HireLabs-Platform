'use client';

import {
  Suspense,
  useEffect,
  useState,
} from 'react';

import {
  useRouter,
  useSearchParams,
} from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/auth/redirect';
import { friendlyAuthError } from '@/lib/auth/messages';

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [message, setMessage] = useState(
    'Completing your secure authentication…'
  );

  useEffect(() => {
    let isMounted = true;

    const completeAuth = async () => {
      try {
        const supabase = createClient();

        /*
         * ---------------------------------------------------------
         * 1. Handle PKCE authentication links
         * ---------------------------------------------------------
         *
         * Normal email verification / OAuth flows may provide:
         *
         * ?code=...
         */
        /*
         * ---------------------------------------------------------
         * 0. Supabase reports link problems in the URL
         * ---------------------------------------------------------
         *
         * e.g. ?error=access_denied&error_code=otp_expired
         * (in the query for PKCE links, in the hash for older links)
         */
        const hashErrorParams =
          typeof window !== 'undefined' && window.location.hash
            ? new URLSearchParams(window.location.hash.substring(1))
            : null;

        const linkErrorCode =
          searchParams.get('error_code') ||
          hashErrorParams?.get('error_code');

        if (linkErrorCode || searchParams.get('error')) {
          throw { code: linkErrorCode || 'otp_expired' };
        }

        const code = searchParams.get('code');

        if (code) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            throw error;
          }
        }

        /*
         * ---------------------------------------------------------
         * 2. Handle password-recovery links
         * ---------------------------------------------------------
         *
         * Supabase recovery links can contain:
         *
         * #access_token=...
         * #refresh_token=...
         * #type=recovery
         *
         * URL fragments are NOT included in the server request,
         * so we must read them in the browser.
         */
        if (typeof window !== 'undefined') {
          const hash = window.location.hash;

          if (hash) {
            const hashParams = new URLSearchParams(
              hash.substring(1)
            );

            const accessToken =
              hashParams.get('access_token');

            const refreshToken =
              hashParams.get('refresh_token');

            const type =
              hashParams.get('type');

            if (
              accessToken &&
              refreshToken &&
              type === 'recovery'
            ) {
              const { error } =
                await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });

              if (error) {
                throw error;
              }
            }
          }
        }

        /*
         * ---------------------------------------------------------
         * 3. Verify that a session actually exists
         * ---------------------------------------------------------
         */
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error(
            'Authentication session could not be established. Please request a new link.'
          );
        }

        /*
         * ---------------------------------------------------------
         * 4. Determine where the user should go
         * ---------------------------------------------------------
         */
        const requestedNext =
          searchParams.get('next');

        const destination =
          safeRedirectPath(requestedNext);

        if (isMounted) {
          router.replace(destination);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage(
          friendlyAuthError(error, 'callback')
        );
      }
    };

    completeAuth();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  return (
    <main className="auth-callback">
      {message}
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-callback">
          Completing your secure authentication…
        </main>
      }
    >
      <AuthCallback />
    </Suspense>
  );
}
