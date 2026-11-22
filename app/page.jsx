'use client';

import React, {
  useEffect,
  useState,
} from 'react';

import { createClient } from '@/lib/supabase/client';
import {
  DEFAULT_AFTER_LOGIN,
  safeRedirectPath,
} from '@/lib/auth/redirect';
import {
  RESET_SENT_MESSAGE,
  SIGNUP_CHECK_EMAIL_MESSAGE,
  friendlyAuthError,
} from '@/lib/auth/messages';
import {
  PASSWORD_HINT,
  validatePassword,
} from '@/lib/auth/password';

import { LandingNav } from '@/components/landing/LandingNav';
import { ScrollBackground } from '@/components/landing/ScrollBackground';
import { Marquee } from '@/components/landing/Marquee';
import { ThresholdHero } from '@/components/landing/ThresholdHero';
import { WordWheel } from '@/components/landing/WordWheel';
import { Statement } from '@/components/landing/Statement';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { SamplePreview } from '@/components/landing/SamplePreview';
import { Principles } from '@/components/landing/Principles';
import { KeywordsVsEvidence } from '@/components/landing/KeywordsVsEvidence';
import { TwoPaths } from '@/components/landing/TwoPaths';
import { ClosingCta } from '@/components/landing/ClosingCta';
import { LandingFooter } from '@/components/landing/LandingFooter';
import '@/styles/landing.css';


import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';


export default function LandingPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] =
    useState(false);

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [authMode, setAuthMode] =
    useState('signin');

  const [authMessage, setAuthMessage] =
    useState('');

  const [isAuthLoading, setIsAuthLoading] =
    useState(false);

  // Where to go after signing in (set when the server redirected a
  // signed-out visitor away from a protected page).
  const [afterLogin, setAfterLogin] =
    useState(DEFAULT_AFTER_LOGIN);

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    if (params.get('auth') !== 'signin') return;

    setAfterLogin(
      safeRedirectPath(params.get('next'))
    );
    setAuthMode('signin');
    setAuthMessage(
      'Please sign in to continue.'
    );
    setIsAuthModalOpen(true);

    // Remove the auth parameters so a refresh doesn't reopen the dialog.
    params.delete('auth');
    params.delete('next');
    const query = params.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    );
  }, []);



  /* ==========================================================
     NAVIGATION
     ========================================================== */

  const scrollToDemo = () => {
    const element =
      document.getElementById(
        'demo'
      );

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };




  /* ==========================================================
     AUTH
     ========================================================== */

  const openAuth = () => {
    if (isAuthLoading) return;

    setAuthMode('signin');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setAuthMessage('');
    setIsAuthModalOpen(true);
  };

  const openSignUp = () => {
    openAuth();
    setAuthMode('signup');
  };


  const closeAuth = () => {
    if (isAuthLoading) return;

    setAuthMode('signin');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setAuthMessage('');
    setIsAuthModalOpen(false);
  };

  const signIn = async (event) => {
    event.preventDefault();

    setIsAuthLoading(true);
    setAuthMessage('');

    try {
      const supabase = createClient();

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) {
        throw error;
      }

      if (data.session) {
        window.location.href = afterLogin;
      } else {
        setAuthMessage(
          'Signed in, but no active session was returned. Please try again.'
        );
      }
    } catch (error) {
      setAuthMessage(
        friendlyAuthError(error, 'signin')
      );
    } finally {
      setIsAuthLoading(false);
    }
  };


  const resetPassword = async (
    event
  ) => {
    event.preventDefault();

    setIsAuthLoading(true);
    setAuthMessage('');

    try {
      const supabase = createClient();

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo:
              `${window.location.origin}/auth/callback?next=/auth/update-password`,
          }
        );

      if (error) {
        throw error;
      }

      setAuthMessage(RESET_SENT_MESSAGE);
    } catch (error) {
      setAuthMessage(
        friendlyAuthError(error, 'reset')
      );
    } finally {
      setIsAuthLoading(false);
    }
  };


  const createAccount = async (
    event
  ) => {
    event.preventDefault();

    setAuthMessage('');

    const passwordProblem =
      validatePassword(password, email);

    if (passwordProblem) {
      setAuthMessage(passwordProblem);
      return;
    }

    if (password !== confirmPassword) {
      setAuthMessage(
        'Passwords do not match.'
      );
      return;
    }

    setIsAuthLoading(true);

    try {
      const supabase =
        createClient();

      const {
        data,
        error,
      } =
        await supabase.auth.signUp(
          {
            email: email.trim(),
            password,
            options: {
              emailRedirectTo:
                `${window.location.origin}/auth/callback`,
            },
          }
        );

      if (error) {
        throw error;
      }

      // When email confirmation is on, Supabase returns the same response
      // whether or not the email is already registered. Show one message
      // for both, so the form can't be used to check who has an account.
      if (
        data.session &&
        data.user?.identities?.length
      ) {
        setAuthMessage(
          'Account created and signed in. Opening your dashboard…'
        );

        window.setTimeout(
          () => {
            window.location.href = afterLogin;
          },
          700
        );
      } else {
        setAuthMessage(
          SIGNUP_CHECK_EMAIL_MESSAGE
        );
      }
    } catch (error) {
      setAuthMessage(
        friendlyAuthError(error, 'signup')
      );
    } finally {
      setIsAuthLoading(false);
    }
  };


  const handleAuthSubmit =
    authMode === 'signin'
      ? signIn
      : authMode === 'forgot'
        ? resetPassword
        : createAccount;


  const toggleAuthMode = () => {
    setAuthMode(
      (current) =>
        current === 'signin'
          ? 'signup'
          : 'signin'
    );

    setAuthMessage('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };


  const openForgotPassword = () => {
    setAuthMode('forgot');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setAuthMessage('');
  };


  const backToSignIn = () => {
    setAuthMode('signin');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setAuthMessage('');
  };


  return (
    <>


      <main className="hl-page lp">

        <ScrollBackground />



        {/* ====================================================
            NAVBAR
           ==================================================== */}

        <LandingNav onSignIn={openAuth} />


        {/* ====================================================
            HERO
           ==================================================== */}

        <ThresholdHero onTrySample={scrollToDemo} onSignIn={openAuth} />

        <Marquee />

        <WordWheel
          words={['Skills', 'Experience', 'Projects', 'Education', 'Evidence', 'Gaps', 'Fit', 'Interview focus']}
        />

        <Statement lines={['Stop filtering for keywords.', 'Start reading for evidence.']} />


        {/* ====================================================
            INTERACTIVE DEMO
           ==================================================== */}

        <HowItWorks />

        <SamplePreview />


        <Principles />

        <KeywordsVsEvidence />

        <TwoPaths />

        <ClosingCta onGetStarted={openSignUp} />

        <LandingFooter />


        {/* ====================================================
            AUTHENTICATION MODAL
           ==================================================== */}

        <Modal
          isOpen={
            isAuthModalOpen
          }

          onClose={
            closeAuth
          }

          title={
            authMode === 'signin'
              ? 'Sign in to HireLabs'
              : authMode === 'forgot'
                ? 'Reset your HireLabs password'
                : 'Create your HireLabs account'
          }
        >

          <div className="hl-auth">

            <div className="hl-auth-intro">

              <div className="hl-auth-mark">

                <svg
                  width="25"
                  height="25"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon
                    points="12 2 2 7 12 12 22 7 12 2"
                  />

                  <polyline
                    points="2 17 12 22 22 17"
                  />

                  <polyline
                    points="2 12 12 17 22 12"
                  />
                </svg>

              </div>


              <h3 className="hl-auth-title">

                {authMode === 'signin'
                  ? 'Welcome back.'
                  : authMode === 'forgot'
                    ? 'Recover your account.'
                    : 'Build your hiring workspace.'}

              </h3>


              <p className="hl-auth-subtitle">

                {authMode === 'signin'
                  ? 'Sign in with your work email to access your private candidate library and semantic matching workspace.'
                  : authMode === 'forgot'
                    ? 'Enter your work email and we will send you a secure password reset link.'
                    : 'Create an account to store resumes securely and explore your private HireLabs workspace.'}

              </p>

            </div>


            <form
              onSubmit={handleAuthSubmit}
              className="hl-auth-form"
            >
              <label className="hl-auth-field">
                <span className="hl-auth-label">
                  Work email
                </span>

                <input
                  className="hl-auth-input"
                  type="email"
                  required
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="recruiter@company.com"
                  autoComplete="email"
                />
              </label>

              {authMode !== 'forgot' && (
                <>
                  <label className="hl-auth-field">
                    <span className="hl-auth-label">
                      Password
                    </span>

                    <div
                      style={{
                        position: 'relative',
                      }}
                    >
                      <input
                        className="hl-auth-input"
                        type={
                          showPassword
                            ? 'text'
                            : 'password'
                        }
                        required
                        minLength={
                          authMode === 'signup'
                            ? 8
                            : undefined
                        }
                        value={password}
                        onChange={(event) =>
                          setPassword(
                            event.target.value
                          )
                        }
                        placeholder={
                          authMode === 'signup'
                            ? PASSWORD_HINT
                            : 'Enter your password'
                        }
                        maxLength={72}
                        autoComplete={
                          authMode === 'signin'
                            ? 'current-password'
                            : 'new-password'
                        }
                        style={{
                          paddingRight: '60px',
                        }}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (current) => !current
                          )
                        }
                        aria-label={
                          showPassword
                            ? 'Hide password'
                            : 'Show password'
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
                          color: '#746B62',
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '5px',
                        }}
                      >
                        {showPassword
                          ? 'Hide'
                          : 'Show'}
                      </button>
                    </div>
                  </label>

                  {authMode === 'signup' && (
                    <label className="hl-auth-field">
                      <span className="hl-auth-label">
                        Confirm password
                      </span>

                      <input
                        className="hl-auth-input"
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
                      />
                    </label>
                  )}

                  {authMode === 'signin' && (
                    <button
                      type="button"
                      className="hl-auth-mode"
                      onClick={
                        openForgotPassword
                      }
                      style={{
                        textAlign: 'right',
                        marginTop: '-7px',
                      }}
                    >
                      Forgot password?
                    </button>
                  )}
                </>
              )}

              <Button
                variant="primary"
                type="submit"
                size="lg"
                isLoading={isAuthLoading}
                style={{
                  width: '100%',
                  marginTop: '3px',
                }}
              >
                <span>
                  {isAuthLoading
                    ? 'Please wait…'
                    : authMode === 'signin'
                      ? 'Sign in'
                      : authMode === 'forgot'
                        ? 'Send reset link'
                        : 'Create account'}
                </span>
              </Button>

              {authMessage && (
                <p
                  className="hl-auth-message"
                  role="status"
                  aria-live="polite"
                >
                  {authMessage}
                </p>
              )}

              {authMode === 'forgot' ? (
                <button
                  type="button"
                  className="hl-auth-mode"
                  onClick={backToSignIn}
                >
                  Back to sign in
                </button>
              ) : (
                <button
                  type="button"
                  className="hl-auth-mode"
                  onClick={toggleAuthMode}
                >
                  {authMode === 'signin'
                    ? 'New to HireLabs? Create an account'
                    : 'Already have an account? Sign in'}
                </button>
              )}
            </form>
          </div>

        </Modal>

      </main>
    </>
  );
}
