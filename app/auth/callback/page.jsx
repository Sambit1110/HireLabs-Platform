'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Completing your secure sign-in…');

  useEffect(() => {
    const completeSignIn = async () => {
      try {
        const code = searchParams.get('code');
        if (code) {
          const { error } = await createClient().auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        router.replace('/dashboard/resumes');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'The sign-in link could not be verified.');
      }
    };
    completeSignIn();
  }, [router, searchParams]);

  return <main className="auth-callback">{message}</main>;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main className="auth-callback">Completing your secure sign-in…</main>}>
      <AuthCallback />
    </Suspense>
  );
}
