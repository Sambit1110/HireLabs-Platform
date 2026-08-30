'use client';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

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

  const ctaRef = useRef(null);

  const [ctaVisible, setCtaVisible] =
    useState(false);


  /* ==========================================================
     CTA SCROLL REVEAL
     ========================================================== */

  useEffect(() => {
    const section = ctaRef.current;

    if (!section) return;

    const observer =
      new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setCtaVisible(true);
            observer.disconnect();
          }
        },
        {
          threshold: 0.15,
          rootMargin:
            '0px 0px -8% 0px',
        }
      );

    observer.observe(section);

    return () =>
      observer.disconnect();
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


  const scrollToArchitecture = () => {
    const element =
      document.getElementById(
        'architecture'
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
          email,
          password,
        });

      if (error) {
        throw error;
      }

      if (data.session) {
        window.location.href = '/dashboard/resumes';
      } else {
        setAuthMessage(
          'Signed in, but no active session was returned. Please try again.'
        );
      }
    } catch (error) {
      setAuthMessage(
        error instanceof Error
          ? error.message
          : 'Unable to sign in. Please check your email and password.'
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
          email,
          {
            redirectTo:
              `${window.location.origin}/auth/callback?next=/auth/update-password`,
          }
        );

      if (error) {
        throw error;
      }

      setAuthMessage(
        'If an account exists for this email, a password reset link has been sent. Check your inbox.'
      );
    } catch (error) {
      setAuthMessage(
        error instanceof Error
          ? error.message
          : 'Unable to send the password reset email. Please try again.'
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
            email,
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

      if (
        data.user?.identities
          ?.length === 0
      ) {
        setAuthMessage(
          'An account already exists for this email. Switch to sign in instead.'
        );
      } else if (
        data.session
      ) {
        setAuthMessage(
          'Account created and signed in. Opening your resume library…'
        );

        window.setTimeout(
          () => {
            window.location.href =
              '/dashboard/resumes';
          },
          700
        );
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
      <style>{`

        /* ======================================================
           GLOBAL PAGE SURFACE
           ====================================================== */

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

          background:
            linear-gradient(
              180deg,
              #F7F2E8 0%,
              var(--cream) 42%,
              #F2ECE2 100%
            );

          color:
            var(--espresso);

          overflow-x: clip;

          position: relative;
        }


        .hl-page *,
        .hl-page *::before,
        .hl-page *::after {
          box-sizing: border-box;
        }


        /* ======================================================
           CONTINUITY BETWEEN SECTIONS
           ====================================================== */

        .hl-page > section {
          position: relative;
        }


        .hl-page > section:not(
          #heroSection
        )::after {
          content: '';

          position: absolute;

          left: 50%;

          bottom: 0;

          width:
            min(
              1080px,
              82%
            );

          height: 1px;

          transform:
            translateX(-50%);

          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(
                94,
                85,
                76,
                0.14
              ),
              transparent
            );

          pointer-events: none;
        }


        /* ======================================================
           REMOVE OLD CURSOR
           ====================================================== */

        .hl-page .custom-cursor,
        .hl-page .cursor-dot,
        .hl-page .cursor-ring {
          display: none !important;
        }


        /* ======================================================
           FINAL CTA
           ====================================================== */

        .hl-final-cta {
          position: relative;

          padding:
            205px 0
            180px;

          background:
            linear-gradient(
              180deg,
              #F2ECE2 0%,
              #EEE7DB 100%
            );

          overflow: hidden;

          isolation: isolate;
        }


        /*
         * Large editorial ring.
         */

        .hl-final-cta::before {
          content: '';

          position: absolute;

          width:
            min(
              900px,
              80vw
            );

          height:
            min(
              900px,
              80vw
            );

          left: 50%;

          top:
            48%;

          transform:
            translate(
              -50%,
              -50%
            );

          border:
            1px solid
            rgba(
              111,
              125,
              85,
              0.08
            );

          border-radius:
            50%;

          pointer-events: none;

          opacity:
            0;

          transition:
            opacity 1.4s ease,
            transform 1.6s
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }


        .hl-final-cta::after {
          content: '';

          position: absolute;

          width:
            min(
              620px,
              60vw
            );

          height:
            min(
              620px,
              60vw
            );

          left: 50%;

          top:
            48%;

          transform:
            translate(
              -50%,
              -50%
            )
            scale(
              0.92
            );

          border:
            1px dashed
            rgba(
              111,
              125,
              85,
              0.075
            );

          border-radius:
            50%;

          pointer-events: none;

          opacity:
            0;

          transition:
            opacity 1.6s ease 100ms,
            transform 1.8s
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ) 100ms;
        }


        .hl-final-cta.is-visible::before,
        .hl-final-cta.is-visible::after {
          opacity: 1;
        }


        .hl-final-cta.is-visible::after {
          transform:
            translate(
              -50%,
              -50%
            )
            scale(
              1
            );
        }


        .hl-final-shell {
          position: relative;

          z-index: 2;

          width:
            min(
              1120px,
              calc(100% - 48px)
            );

          margin: 0 auto;
        }


        /* ======================================================
           FINAL CARD
           ====================================================== */

        .hl-final-card {
          position: relative;

          min-height:
            570px;

          display:
            flex;

          align-items:
            center;

          padding:
            clamp(
              55px,
              8vw,
              95px
            );

          border-radius:
            32px;

          background:
            var(--espresso);

          color:
            var(--cream);

          overflow: hidden;

          box-shadow:
            0 40px 100px
            rgba(
              33,
              28,
              24,
              0.17
            );

          opacity:
            0;

          transform:
            translate3d(
              0,
              38px,
              0
            )
            scale(
              0.985
            );

          transition:
            opacity 1s
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),

            transform 1.15s
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }


        .hl-final-cta.is-visible
          .hl-final-card {
          opacity: 1;

          transform:
            translate3d(
              0,
              0,
              0
            )
            scale(
              1
            );
        }


        /* ======================================================
           CTA ORBIT DETAILS
           ====================================================== */

        .hl-final-card::before {
          content: '';

          position: absolute;

          width:
            530px;

          height:
            530px;

          right:
            -205px;

          top:
            -165px;

          border:
            1px solid
            rgba(
              245,
              241,
              232,
              0.085
            );

          border-radius:
            50%;

          animation:
            hlFinalOrbit
            18s
            linear
            infinite;
        }


        .hl-final-card::after {
          content: '';

          position: absolute;

          width:
            350px;

          height:
            350px;

          right:
            -90px;

          top:
            -75px;

          border:
            1px dashed
            rgba(
              173,
              190,
              139,
              0.12
            );

          border-radius:
            50%;

          animation:
            hlFinalOrbitReverse
            24s
            linear
            infinite;
        }


        @keyframes hlFinalOrbit {
          from {
            transform:
              rotate(0deg);
          }

          to {
            transform:
              rotate(360deg);
          }
        }


        @keyframes hlFinalOrbitReverse {
          from {
            transform:
              rotate(360deg);
          }

          to {
            transform:
              rotate(0deg);
          }
        }


        /* ======================================================
           CTA CONTENT
           ====================================================== */

        .hl-final-content {
          position: relative;

          z-index: 3;

          max-width:
            800px;
        }


        .hl-final-kicker {
          display:
            inline-flex;

          align-items:
            center;

          gap:
            9px;

          color:
            #AAB68A;

          font-size:
            9px;

          line-height:
            1;

          font-weight:
            900;

          letter-spacing:
            0.15em;

          text-transform:
            uppercase;

          opacity: 0;

          transform:
            translate3d(
              0,
              18px,
              0
            );

          transition:
            opacity 650ms ease 180ms,
            transform 750ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ) 180ms;
        }


        .hl-final-cta.is-visible
          .hl-final-kicker {
          opacity: 1;

          transform:
            translate3d(
              0,
              0,
              0
            );
        }


        .hl-final-kicker-dot {
          width:
            6px;

          height:
            6px;

          border-radius:
            50%;

          background:
            #AAB68A;

          box-shadow:
            0 0 12px
            rgba(
              170,
              182,
              138,
              0.3
            );
        }


        .hl-final-title {
          margin:
            23px 0 0;

          max-width:
            790px;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            clamp(
              52px,
              6.5vw,
              86px
            );

          line-height:
            0.92;

          letter-spacing:
            -0.058em;

          font-weight:
            500;

          opacity:
            0;

          transform:
            translate3d(
              0,
              24px,
              0
            );

          transition:
            opacity 900ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ) 270ms,

            transform 1000ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ) 270ms;
        }


        .hl-final-cta.is-visible
          .hl-final-title {
          opacity: 1;

          transform:
            translate3d(
              0,
              0,
              0
            );
        }


        .hl-final-title em {
          color:
            #AAB68A;

          font-style:
            italic;
        }


        .hl-final-description {
          max-width:
            650px;

          margin:
            26px 0 0;

          color:
            #AAA39A;

          font-size:
            14px;

          line-height:
            1.72;

          opacity:
            0;

          transform:
            translate3d(
              0,
              20px,
              0
            );

          transition:
            opacity 750ms ease 410ms,

            transform 850ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ) 410ms;
        }


        .hl-final-cta.is-visible
          .hl-final-description {
          opacity:
            1;

          transform:
            translate3d(
              0,
              0,
              0
            );
        }


        /* ======================================================
           CTA BUTTONS
           ====================================================== */

        .hl-final-actions {
          display:
            flex;

          align-items:
            center;

          flex-wrap:
            wrap;

          gap:
            11px;

          margin-top:
            34px;

          opacity:
            0;

          transform:
            translate3d(
              0,
              18px,
              0
            );

          transition:
            opacity 750ms ease 520ms,

            transform 800ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ) 520ms;
        }


        .hl-final-cta.is-visible
          .hl-final-actions {
          opacity:
            1;

          transform:
            translate3d(
              0,
              0,
              0
            );
        }


        .hl-final-secondary {
          min-height:
            52px;

          padding:
            0 20px;

          border:
            1px solid
            rgba(
              245,
              241,
              232,
              0.18
            );

          border-radius:
            14px;

          background:
            rgba(
              255,
              255,
              255,
              0.035
            );

          color:
            #D1CAC0;

          font-size:
            11px;

          font-weight:
            800;

          cursor:
            pointer;

          transition:
            background 220ms ease,
            border-color 220ms ease,
            color 220ms ease,
            transform 220ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }


        .hl-final-secondary:hover {
          background:
            rgba(
              255,
              255,
              255,
              0.075
            );

          border-color:
            rgba(
              245,
              241,
              232,
              0.3
            );

          color:
            var(--cream);

          transform:
            translateY(-2px);
        }


        /* ======================================================
           META ROW
           ====================================================== */

        .hl-final-meta {
          position:
            relative;

          z-index:
            3;

          display:
            flex;

          align-items:
            center;

          flex-wrap:
            wrap;

          gap:
            18px;

          margin-top:
            40px;

          padding-top:
            20px;

          border-top:
            1px solid
            rgba(
              245,
              241,
              232,
              0.1
            );

          color:
            #817970;

          font-size:
            8px;

          line-height:
            1.5;

          text-transform:
            uppercase;

          letter-spacing:
            0.09em;

          font-weight:
            800;

          opacity:
            0;

          transform:
            translate3d(
              0,
              13px,
              0
            );

          transition:
            opacity 700ms ease 650ms,

            transform 800ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ) 650ms;
        }


        .hl-final-cta.is-visible
          .hl-final-meta {
          opacity:
            1;

          transform:
            translate3d(
              0,
              0,
              0
            );
        }


        .hl-final-meta-item {
          display:
            inline-flex;

          align-items:
            center;

          gap:
            7px;
        }


        .hl-final-meta-dot {
          width:
            5px;

          height:
            5px;

          border-radius:
            50%;

          background:
            #AAB68A;

          box-shadow:
            0 0 8px
            rgba(
              170,
              182,
              138,
              0.18
            );
        }


        /* ======================================================
           AUTH MODAL
           ====================================================== */

        .hl-auth {
          color:
            var(--espresso);
        }


        .hl-auth-intro {
          text-align:
            center;

          padding:
            3px 0 27px;
        }


        .hl-auth-mark {
          width:
            58px;

          height:
            58px;

          display:
            grid;

          place-items:
            center;

          margin:
            0 auto 16px;

          border-radius:
            18px;

          background:
            var(--espresso);

          color:
            var(--cream);

          box-shadow:
            0 12px 28px
            rgba(
              33,
              28,
              24,
              0.12
            );
        }


        .hl-auth-title {
          margin:
            0;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            29px;

          line-height:
            1;

          letter-spacing:
            -0.04em;

          font-weight:
            500;
        }


        .hl-auth-subtitle {
          max-width:
            460px;

          margin:
            11px auto 0;

          color:
            #776E65;

          font-size:
            11px;

          line-height:
            1.65;
        }


        .hl-auth-form {
          display:
            flex;

          flex-direction:
            column;

          gap:
            15px;
        }


        .hl-auth-field {
          display:
            block;
        }


        .hl-auth-label {
          display:
            block;

          margin-bottom:
            7px;

          color:
            #746B62;

          font-size:
            9px;

          line-height:
            1;

          font-weight:
            900;

          letter-spacing:
            0.1em;

          text-transform:
            uppercase;
        }


        .hl-auth-input {
          width:
            100%;

          min-height:
            47px;

          padding:
            0 13px;

          border:
            1px solid
            #DED7CA;

          border-radius:
            13px;

          background:
            #FAF8F3;

          color:
            var(--espresso);

          font-family:
            'DM Sans',
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;

          font-size:
            12px;

          outline:
            none;

          transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
        }


        .hl-auth-input::placeholder {
          color:
            #A09990;
        }


        .hl-auth-input:focus {
          border-color:
            var(--olive);

          background:
            var(--white);

          box-shadow:
            0 0 0 4px
            rgba(
              111,
              125,
              85,
              0.08
            );
        }


        .hl-auth-message {
          margin:
            0;

          padding:
            11px 12px;

          border-radius:
            11px;

          background:
            #F0EEE6;

          color:
            #6E665D;

          font-size:
            10px;

          line-height:
            1.55;
        }


        .hl-auth-mode {
          width:
            100%;

          padding:
            2px 0;

          border:
            0;

          background:
            transparent;

          color:
            var(--olive-dark);

          font-size:
            10px;

          line-height:
            1.5;

          font-weight:
            800;

          cursor:
            pointer;
        }


        .hl-auth-mode:hover {
          text-decoration:
            underline;

          text-underline-offset:
            3px;
        }


        /* ======================================================
           TABLET
           ====================================================== */

        @media (max-width: 800px) {

          .hl-final-cta {
            padding:
              125px 0
              120px;
          }


          .hl-final-card {
            min-height:
              520px;

            padding:
              50px 35px;

            border-radius:
              25px;
          }

        }


        /* ======================================================
           MOBILE
           ====================================================== */

        @media (max-width: 600px) {

          .hl-final-shell {
            width:
              min(
                100% - 28px,
                1120px
              );
          }


          .hl-final-cta {
            padding:
              105px 0
              110px;
          }


          .hl-final-card {
            min-height:
              auto;

            padding:
              45px 26px;
          }


          .hl-final-title {
            font-size:
              48px;
          }


          .hl-final-description {
            font-size:
              13px;
          }


          .hl-final-actions {
            align-items:
              stretch;

            flex-direction:
              column;
          }


          .hl-final-actions > * {
            width:
              100%;
          }


          .hl-final-meta {
            align-items:
              flex-start;

            flex-direction:
              column;

            gap:
              10px;
          }


          .hl-final-cta::before {
            width:
              650px;

            height:
              650px;
          }


          .hl-final-cta::after {
            width:
              450px;

            height:
              450px;
          }

        }


        /* ======================================================
           REDUCED MOTION
           ====================================================== */

        @media (
          prefers-reduced-motion: reduce
        ) {

          .hl-final-cta::before,
          .hl-final-cta::after,
          .hl-final-card,
          .hl-final-kicker,
          .hl-final-title,
          .hl-final-description,
          .hl-final-actions,
          .hl-final-meta,
          .hl-final-secondary {
            animation:
              none !important;

            transition:
              none !important;

            transform:
              none !important;
          }

          .hl-final-cta::before,
          .hl-final-cta::after,
          .hl-final-card,
          .hl-final-kicker,
          .hl-final-title,
          .hl-final-description,
          .hl-final-actions,
          .hl-final-meta {
            opacity:
              1 !important;
          }

        }

      `}</style>


      <main className="hl-page">

        {/* ====================================================
            GLOBAL SCROLL MOTION
           ==================================================== */}

        <ScrollReveal />


        {/* ====================================================
            NAVBAR
           ==================================================== */}

        <Navbar
          onOpenAuthModal={
            openAuth
          }
        />


        {/* ====================================================
            HERO
           ==================================================== */}

        <HeroSection
          onExploreClick={
            scrollToDemo
          }

          onViewArchClick={
            scrollToArchitecture
          }
        />


        {/* ====================================================
            INTERACTIVE DEMO
           ==================================================== */}

        <InteractiveDemo
          onAuthRequired={
            openAuth
          }
        />


        {/* ====================================================
            FEATURES
           ==================================================== */}

        <FeaturesGrid />


        {/* ====================================================
            ARCHITECTURE
           ==================================================== */}

        <ArchitectureFlow />


        {/* ====================================================
            COMPARISON
           ==================================================== */}

        <ComparisonTable />


        {/* ====================================================
            SECURITY
           ==================================================== */}

        <SecuritySection />


        {/* ====================================================
            FINAL CTA
           ==================================================== */}

        <section
          ref={ctaRef}
          className={`hl-final-cta ${
            ctaVisible
              ? 'is-visible'
              : ''
          }`}
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
                  behind the{' '}
                  <em>
                    resume.
                  </em>
                </h2>


                <p className="hl-final-description">
                  Move beyond keyword filters. Give your team
                  a clearer way to discover, compare, and
                  understand candidates using semantic matching
                  and evidence-backed signals.
                </p>


                <div className="hl-final-actions">

                  <Button
                    variant="success"
                    size="lg"
                    onClick={
                      openAuth
                    }
                  >
                    <span>
                      Launch HireLabs
                    </span>

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
                    onClick={
                      scrollToArchitecture
                    }
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


        {/* ====================================================
            FOOTER
           ==================================================== */}

        <Footer />


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
                            ? 'At least 8 characters'
                            : 'Enter your password'
                        }
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