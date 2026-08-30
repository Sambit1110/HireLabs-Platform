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

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [message, setMessage] = useState(
    'Completing your secure authentication…'
  );

  useEffect(() => {
    const completeAuth = async () => {
      try {
        const code =
          searchParams.get('code');

        if (code) {
          const { error } =
            await createClient().auth.exchangeCodeForSession(
              code
            );

          if (error) {
            throw error;
          }
        }

        const requestedNext =
          searchParams.get('next');

        const destination =
          requestedNext &&
          requestedNext.startsWith('/') &&
          !requestedNext.startsWith('//')
            ? requestedNext
            : '/dashboard/resumes';

        router.replace(destination);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : 'The authentication link could not be verified.'
        );
      }
    };

    completeAuth();
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
