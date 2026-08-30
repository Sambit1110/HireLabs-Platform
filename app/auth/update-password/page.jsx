'use client';

import {
  useEffect,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [isLoading, setIsLoading] =
    useState(false);

  const [isCheckingSession, setIsCheckingSession] =
    useState(true);

  const [hasSession, setHasSession] =
    useState(false);

  useEffect(() => {
    const supabase = createClient();

    let isMounted = true;

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) {
          return;
        }

        if (session) {
          setHasSession(true);
          setMessage('');
        } else {
          setHasSession(false);
          setMessage(
            'This password reset link is invalid or has expired. Please request a new one.'
          );
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setHasSession(false);

        setMessage(
          error instanceof Error
            ? error.message
            : 'Unable to verify your password reset session.'
        );
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    };

    checkSession();

    /*
     * Keep the page synchronized if Supabase establishes
     * or refreshes the authentication session.
     */
    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) {
          return;
        }

        if (session) {
          setHasSession(true);

          /*
           * Don't overwrite an existing success/error message.
           */
          if (
            event === 'SIGNED_IN' ||
            event === 'TOKEN_REFRESHED'
          ) {
            setMessage('');
          }
        } else if (
          event === 'SIGNED_OUT'
        ) {
          setHasSession(false);

          setMessage(
            'Your authentication session has ended. Please request a new password reset link.'
          );
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const updatePassword = async (event) => {
    event.preventDefault();

    setMessage('');

    if (!hasSession) {
      setMessage(
        'Auth session missing. Please request a new password reset link.'
      );
      return;
    }

    if (password.length < 8) {
      setMessage(
        'Password must be at least 8 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage(
        'Passwords do not match.'
      );
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      /*
       * Verify the session one more time immediately
       * before changing the password.
       */
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setHasSession(false);

        throw new Error(
          'Auth session missing. Please request a new password reset link.'
        );
      }

      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        throw error;
      }

      setMessage(
        'Password updated successfully. Redirecting to your dashboard…'
      );

      window.setTimeout(() => {
        router.replace(
          '/dashboard/resumes'
        );
      }, 700);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update your password. Please request a new reset link.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          background: '#F5F1E8',
          color: '#211C18',
        }}
      >
        Checking your reset link…
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: '#F5F1E8',
        color: '#211C18',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '36px',
          borderRadius: '24px',
          background: '#FFFFFF',
          boxShadow:
            '0 24px 70px rgba(33, 28, 24, 0.12)',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily:
              'Georgia, "Times New Roman", serif',
            fontSize: '32px',
            fontWeight: 500,
          }}
        >
          Set a new password
        </h1>

        <p
          style={{
            margin: '12px 0 28px',
            color: '#746B62',
            lineHeight: 1.6,
          }}
        >
          Choose a new password for your
          HireLabs account.
        </p>

        <form
          onSubmit={updatePassword}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
          }}
        >
          {/* NEW PASSWORD */}

          <label>
            <span
              style={{
                display: 'block',
                marginBottom: '7px',
                fontSize: '10px',
                fontWeight: 800,
                textTransform: 'uppercase',
              }}
            >
              New password
            </span>

            <div
              style={{
                position: 'relative',
              }}
            >
              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                required
                minLength={8}
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="At least 8 characters"
                autoComplete="new-password"
                style={{
                  width: '100%',
                  minHeight: '47px',
                  padding: '0 60px 0 13px',
                  border:
                    '1px solid #DED7CA',
                  borderRadius: '13px',
                  background: '#FAF8F3',
                  color: '#211C18',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (current) => !current
                  )
                }
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform:
                    'translateY(-50%)',
                  border: 'none',
                  background:
                    'transparent',
                  cursor: 'pointer',
                  fontSize: '10px',
                  fontWeight: 800,
                }}
              >
                {showPassword
                  ? 'Hide'
                  : 'Show'}
              </button>
            </div>
          </label>

          {/* CONFIRM PASSWORD */}

          <label>
            <span
              style={{
                display: 'block',
                marginBottom: '7px',
                fontSize: '10px',
                fontWeight: 800,
                textTransform: 'uppercase',
              }}
            >
              Confirm password
            </span>

            <input
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              placeholder="Re-enter your password"
              autoComplete="new-password"
              style={{
                width: '100%',
                minHeight: '47px',
                padding: '0 13px',
                border:
                  '1px solid #DED7CA',
                borderRadius: '13px',
                background: '#FAF8F3',
                color: '#211C18',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </label>

          {/* UPDATE BUTTON */}

          <button
            type="submit"
            disabled={
              isLoading ||
              !hasSession
            }
            style={{
              minHeight: '48px',
              border: 0,
              borderRadius: '13px',
              cursor:
                isLoading ||
                !hasSession
                  ? 'not-allowed'
                  : 'pointer',
              fontWeight: 800,
              opacity:
                isLoading ||
                !hasSession
                  ? 0.6
                  : 1,
            }}
          >
            {isLoading
              ? 'Updating…'
              : 'Update password'}
          </button>

          {/* MESSAGE */}

          {message && (
            <p
              role="status"
              aria-live="polite"
              style={{
                margin: 0,
                padding: '11px 12px',
                borderRadius: '11px',
                background: '#F0EEE6',
                color: '#6E665D',
                fontSize: '12px',
                lineHeight: 1.55,
              }}
            >
              {message}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}