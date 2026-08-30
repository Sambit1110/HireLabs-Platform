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

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data } =
        await supabase.auth.getSession();

      if (!data.session) {
        setMessage(
          'This password reset link is invalid or has expired. Please request a new one.'
        );
      }

      setIsCheckingSession(false);
    };

    checkSession();
  }, []);

  const updatePassword = async (
    event
  ) => {
    event.preventDefault();

    setMessage('');

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
              }}
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              minHeight: '48px',
              border: 0,
              borderRadius: '13px',
              cursor: isLoading
                ? 'not-allowed'
                : 'pointer',
              fontWeight: 800,
            }}
          >
            {isLoading
              ? 'Updating…'
              : 'Update password'}
          </button>

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
