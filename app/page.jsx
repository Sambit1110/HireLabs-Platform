'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';

import { HeroSection } from '../components/landing/HeroSection';
import { InteractiveDemo } from '../components/landing/InteractiveDemo';
import { FeaturesGrid } from '../components/landing/FeaturesGrid';
import { ArchitectureFlow } from '../components/landing/ArchitectureFlow';
import { ComparisonTable } from '../components/landing/ComparisonTable';
import { SecuritySection } from '../components/landing/SecuritySection';

import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { ScrollReveal } from '../components/ui/ScrollReveal';

export default function LandingPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [authMode, setAuthMode] = useState('signin');
  const [authMessage, setAuthMessage] = useState('');
  const [isSendingLink, setIsSendingLink] = useState(false);

  const scrollToDemo = () => {
    const element = document.getElementById('demo');

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  const scrollToArchitecture = () => {
    const element = document.getElementById('architecture');

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  const openAuth = () => {
    setAuthMessage('');
    setIsAuthModalOpen(true);
  };

  const closeAuth = () => {
    if (isSendingLink) return;

    setAuthMessage('');
    setIsAuthModalOpen(false);
  };

  const sendMagicLink = async (event) => {
    event.preventDefault();

    setIsSendingLink(true);
    setAuthMessage('');

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      setAuthMessage(
        'Check your inbox for the secure sign-in link.'
      );
    } catch (error) {
      setAuthMessage(
        error instanceof Error
          ? error.message
          : 'Unable to send the sign-in link.'
      );
    } finally {
      setIsSendingLink(false);
    }
  };

  const createAccount = async (event) => {
    event.preventDefault();

    setIsSendingLink(true);
    setAuthMessage('');

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      if (data.user?.identities?.length === 0) {
        setAuthMessage(
          'An account already exists for this email. Switch to sign in instead.'
        );
      } else if (data.session) {
        setAuthMessage(
          'Account created and signed in. Opening your resume library…'
        );

        window.setTimeout(() => {
          window.location.href = '/dashboard/resumes';
        }, 700);
      } else {
        setAuthMessage(
          'Account created. A confirmation email was requested; if it does not arrive, configure Supabase email delivery before trying again.'
        );
      }
    } catch (error) {
      setAuthMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create the account.'
      );
    } finally {
      setIsSendingLink(false);
    }
  };

  const handleAuthSubmit =
    authMode === 'signin'
      ? sendMagicLink
      : createAccount;

  const toggleAuthMode = () => {
    setAuthMode((current) =>
      current === 'signin' ? 'signup' : 'signin'
    );

    setAuthMessage('');
    setPassword('');
  };

  return (
    <>
      <style>{`
        .hl-page {
          --cream: #F5F1E8;
          --cream-soft: #ECE6DA;
          --white: #FFFFFF;
          --espresso: #211C18;
          --espresso-soft: #625950;
          --olive: #6F7D55;
          --olive-dark: #596544;
          --taupe: #C8C0AF;
          --border: #DED7CA;

          min-height: 100vh;
          background: var(--cream);
          color: var(--espresso);
          overflow-x: clip;
        }

        .hl-page *,
        .hl-page *::before,
        .hl-page *::after {
          box-sizing: border-box;
        }

        /*
         * Deliberately remove the old cursor treatment.
         * The new design relies on spacing, typography and
         * scroll motion rather than decorative effects.
         */
        .hl-page .custom-cursor,
        .hl-page .cursor-dot,
        .hl-page .cursor-ring {
          display: none !important;
        }

        /* ----------------------------------------
           Closing CTA
           ---------------------------------------- */

        .hl-final-cta {
          position: relative;
          padding: 145px 0 155px;
          background: var(--cream);
          overflow: hidden;
        }

        .hl-final-cta::before {
          content: '';
          position: absolute;
          width: 600px;
          height: 600px;
          top: -260px;
          right: -180px;
          border: 1px solid rgba(111,125,85,0.1);
          border-radius: 50%;
          pointer-events: none;
        }

        .hl-final-cta::after {
          content: '';
          position: absolute;
          width: 430px;
          height: 430px;
          top: -170px;
          right: -95px;
          border: 1px dashed rgba(111,125,85,0.09);
          border-radius: 50%;
          pointer-events: none;
        }

        .hl-final-shell {
          width: min(1120px, calc(100% - 48px));
          margin: 0 auto;
        }

        .hl-final-card {
          position: relative;
          padding: clamp(55px, 8vw, 90px);
          border-radius: 30px;
          background: var(--espresso);
          color: var(--cream);
          overflow: hidden;
          box-shadow:
            0 30px 80px rgba(33,28,24,0.16);
        }

        .hl-final-card::before {
          content: '';
          position: absolute;
          width: 420px;
          height: 420px;
          right: -150px;
          bottom: -190px;
          border: 1px solid rgba(245,241,232,0.08);
          border-radius: 50%;
        }

        .hl-final-card::after {
          content: '';
          position: absolute;
          width: 285px;
          height: 285px;
          right: -80px;
          bottom: -120px;
          border: 1px dashed rgba(173,190,139,0.1);
          border-radius: 50%;
        }

        .hl-final-content {
          position: relative;
          z-index: 2;
          max-width: 820px;
        }

        .hl-final-kicker {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: #AAB68A;
          font-size: 9px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .hl-final-kicker-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #AAB68A;
        }

        .hl-final-title {
          margin: 22px 0 0;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(50px, 6.3vw, 84px);
          line-height: 0.94;
          letter-spacing: -0.055em;
          font-weight: 500;
        }

        .hl-final-title em {
          color: #AAB68A;
          font-style: italic;
        }

        .hl-final-description {
          max-width: 630px;
          margin: 24px 0 0;
          color: #A9A199;
          font-size: 14px;
          line-height: 1.7;
        }

        .hl-final-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 11px;
          margin-top: 32px;
        }

        .hl-final-secondary {
          min-height: 52px;
          padding: 0 19px;
          border: 1px solid rgba(245,241,232,0.18);
          border-radius: 14px;
          background: rgba(255,255,255,0.035);
          color: #D1CAC0;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition:
            background 180ms ease,
            border-color 180ms ease,
            color 180ms ease,
            transform 180ms ease;
        }

        .hl-final-secondary:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(245,241,232,0.28);
          color: var(--cream);
          transform: translateY(-1px);
        }

        .hl-final-meta {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 20px;
          margin-top: 38px;
          padding-top: 20px;
          border-top: 1px solid rgba(245,241,232,0.1);
          color: #7E766D;
          font-size: 8px;
          line-height: 1.5;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          font-weight: 800;
        }

        .hl-final-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .hl-final-meta-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #AAB68A;
        }

        /* ----------------------------------------
           Auth modal
           ---------------------------------------- */

        .hl-auth {
          color: var(--espresso);
        }

        .hl-auth-intro {
          text-align: center;
          padding: 3px 0 27px;
        }

        .hl-auth-mark {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          margin: 0 auto 16px;
          border-radius: 18px;
          background: var(--espresso);
          color: var(--cream);
          box-shadow:
            0 12px 28px rgba(33,28,24,0.12);
        }

        .hl-auth-title {
          margin: 0;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 29px;
          line-height: 1;
          letter-spacing: -0.04em;
          font-weight: 500;
        }

        .hl-auth-subtitle {
          max-width: 460px;
          margin: 11px auto 0;
          color: #776E65;
          font-size: 11px;
          line-height: 1.65;
        }

        .hl-auth-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .hl-auth-field {
          display: block;
        }

        .hl-auth-label {
          display: block;
          margin-bottom: 7px;
          color: #746B62;
          font-size: 9px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .hl-auth-input {
          width: 100%;
          min-height: 47px;
          padding: 0 13px;
          border: 1px solid #DED7CA;
          border-radius: 13px;
          background: #FAF8F3;
          color: var(--espresso);
          font-family:
            'DM Sans',
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;
          font-size: 12px;
          outline: none;
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
        }

        .hl-auth-input::placeholder {
          color: #A09990;
        }

        .hl-auth-input:focus {
          border-color: var(--olive);
          background: var(--white);
          box-shadow:
            0 0 0 4px rgba(111,125,85,0.08);
        }

        .hl-auth-message {
          margin: 0;
          padding: 11px 12px;
          border-radius: 11px;
          background: #F0EEE6;
          color: #6E665D;
          font-size: 10px;
          line-height: 1.55;
        }

        .hl-auth-mode {
          width: 100%;
          padding: 2px 0;
          border: 0;
          background: transparent;
          color: var(--olive-dark);
          font-size: 10px;
          line-height: 1.5;
          font-weight: 800;
          cursor: pointer;
        }

        .hl-auth-mode:hover {
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        @media (max-width: 800px) {
          .hl-final-cta {
            padding: 110px 0 120px;
          }

          .hl-final-card {
            padding: 45px 30px;
            border-radius: 24px;
          }

          .hl-final-meta {
            align-items: flex-start;
            flex-direction: column;
            gap: 9px;
          }
        }

        @media (max-width: 600px) {
          .hl-final-shell {
            width: min(100% - 28px, 1120px);
          }

          .hl-final-title {
            font-size: 48px;
          }

          .hl-final-description {
            font-size: 13px;
          }

          .hl-final-actions {
            align-items: stretch;
            flex-direction: column;
          }

          .hl-final-actions > * {
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hl-final-secondary,
          .hl-auth-input {
            transition: none;
          }
        }
      `}</style>

      <main className="hl-page">
        <ScrollReveal />

        <Navbar
          onOpenAuthModal={openAuth}
        />

        <HeroSection
          onExploreClick={scrollToDemo}
          onViewArchClick={scrollToArchitecture}
        />

        <InteractiveDemo
          onAuthRequired={openAuth}
        />

        <FeaturesGrid />

        <ArchitectureFlow />

        <ComparisonTable />

        <SecuritySection />

        {/* ----------------------------------------
            Final CTA
            ---------------------------------------- */}

        <section
          className="hl-final-cta"
          id="cta"
        >
          <div className="hl-final-shell">
            <div className="hl-final-card">
              <div className="hl-final-content">
                <div className="hl-final-kicker">
                  <span className="hl-final-kicker-dot" />
                  The next step
                </div>

                <h2 className="hl-final-title">
                  Find the people
                  <br />
                  behind the <em>resume.</em>
                </h2>

                <p className="hl-final-description">
                  Move beyond keyword filters. Give your team a clearer way to
                  discover, compare, and understand candidates using semantic
                  matching and evidence-backed signals.
                </p>

                <div className="hl-final-actions">
                  <Button
                    variant="success"
                    size="lg"
                    onClick={openAuth}
                  >
                    <span>Launch HireLabs</span>

                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Button>

                  <button
                    type="button"
                    className="hl-final-secondary"
                    onClick={scrollToArchitecture}
                  >
                    Explore the architecture
                  </button>
                </div>

                <div className="hl-final-meta">
                  <span className="hl-final-meta-item">
                    <span className="hl-final-meta-dot" />
                    Semantic matching
                  </span>

                  <span className="hl-final-meta-item">
                    <span className="hl-final-meta-dot" />
                    PostgreSQL + pgvector
                  </span>

                  <span className="hl-final-meta-item">
                    <span className="hl-final-meta-dot" />
                    Private Supabase storage
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Footer />

        {/* ----------------------------------------
            Authentication modal
            ---------------------------------------- */}

        <Modal
          isOpen={isAuthModalOpen}
          onClose={closeAuth}
          title={
            authMode === 'signin'
              ? 'Sign in to HireLabs'
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
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>

              <h3 className="hl-auth-title">
                {authMode === 'signin'
                  ? 'Welcome back.'
                  : 'Build your hiring workspace.'}
              </h3>

              <p className="hl-auth-subtitle">
                {authMode === 'signin'
                  ? 'Sign in with your work email to access your private candidate library and semantic matching workspace.'
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

              {authMode === 'signup' && (
                <label className="hl-auth-field">
                  <span className="hl-auth-label">
                    Password
                  </span>

                  <input
                    className="hl-auth-input"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                  />
                </label>
              )}

              <Button
                variant="primary"
                type="submit"
                size="lg"
                isLoading={isSendingLink}
                style={{
                  width: '100%',
                  marginTop: '3px',
                }}
              >
                <span>
                  {isSendingLink
                    ? 'Please wait…'
                    : authMode === 'signin'
                      ? 'Send secure sign-in link'
                      : 'Create account'}
                </span>
              </Button>

              {authMessage && (
                <p
                  className="hl-auth-message"
                  role="status"
                >
                  {authMessage}
                </p>
              )}

              <button
                type="button"
                className="hl-auth-mode"
                onClick={toggleAuthMode}
              >
                {authMode === 'signin'
                  ? 'New to HireLabs? Create an account'
                  : 'Already have an account? Sign in'}
              </button>
            </form>
          </div>
        </Modal>
      </main>
    </>
  );
}