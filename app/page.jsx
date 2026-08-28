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
import { CustomCursor } from '../components/ui/CustomCursor';
import { ScrollReveal } from '../components/ui/ScrollReveal';

export default function LandingPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('signin');
  const [authMessage, setAuthMessage] = useState('');
  const [isSendingLink, setIsSendingLink] = useState(false);

  const sendMagicLink = async (event) => {
    event.preventDefault();
    setIsSendingLink(true);
    setAuthMessage('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setAuthMessage('Check your inbox for the secure sign-in link.');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Unable to send the sign-in link.');
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
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      if (data.user?.identities?.length === 0) {
        setAuthMessage('An account already exists for this email. Switch to sign in instead.');
      } else if (data.session) {
        setAuthMessage('Account created and signed in. Opening your resume library…');
        window.setTimeout(() => { window.location.href = '/dashboard/resumes'; }, 700);
      } else {
        setAuthMessage('Account created. A confirmation email was requested; if it does not arrive, configure Supabase email delivery before trying again.');
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Unable to create the account.');
    } finally {
      setIsSendingLink(false);
    }
  };

  const scrollToDemo = () => {
    const el = document.getElementById('demo');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToArch = () => {
    const el = document.getElementById('architecture');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main>
      <CustomCursor />
      <ScrollReveal />
      <Navbar onOpenAuthModal={() => setIsAuthModalOpen(true)} />
      
      <HeroSection
        onExploreClick={scrollToDemo}
        onViewArchClick={scrollToArch}
      />

      <InteractiveDemo onAuthRequired={() => setIsAuthModalOpen(true)} />
      <FeaturesGrid />
      <ArchitectureFlow />
      <ComparisonTable />
      <SecuritySection />
      {/* CTA Section */}
      <section className="cta-banner-section">
        <div className="container">
          <div className="cta-card">
            <h2 className="cta-title">
              Upgrade Your Recruitment Pipeline to <br />
              <span className="text-gradient">Semantic AI Intelligence</span>
            </h2>
            <p className="cta-desc">
              Join modern hiring teams parsing thousands of resumes with sub-second accuracy, zero keyword bias, and bulletproof Postgres security.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant="primary" size="lg" onClick={() => setIsAuthModalOpen(true)}>
                <span>Launch Interactive ATS</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Button>
              <Button variant="secondary" size="lg" onClick={scrollToArch}>
                <span>Read Documentation</span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Auth / Demo Modal */}
      <Modal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="HireLabs ATS Dashboard Sign In"
      >
        <div style={{ textAlign: 'center', padding: '1rem 0 2rem' }}>
          <div className="avatar-badge" style={{ margin: '0 auto 1rem', width: '64px', height: '64px', fontSize: '1.5rem' }}>
            HL
          </div>
          <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '0.5rem' }}>
            Welcome to HireLabs Platform
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '480px', margin: '0 auto' }}>
            Sign in with your work email to access candidate talent pools, trigger batch PDF parsers, and execute real-time cosine distance ranking.
          </p>
        </div>

        <form
          onSubmit={authMode === 'signin' ? sendMagicLink : createAccount}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Work Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="recruiter@company.com"
              style={{
                width: '100%',
                background: '#060913',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                color: '#fff',
                fontSize: '0.95rem'
              }}
            />
          </div>
          {authMode === 'signup' && <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Password</label>
            <input type="password" required minLength="8" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" style={{ width: '100%', background: '#060913', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem' }} />
          </div>}
          <Button variant="primary" type="submit" isLoading={isSendingLink} style={{ width: '100%', marginTop: '0.5rem' }}>
            <span>{isSendingLink ? 'Please wait…' : authMode === 'signin' ? 'Send Magic Link / Sign In' : 'Create Account'}</span>
          </Button>
          {authMessage && <p role="status" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>{authMessage}</p>}
          <button type="button" className="auth-mode-toggle" onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthMessage(''); }}>
            {authMode === 'signin' ? 'New to HireLabs? Create an account' : 'Already have an account? Sign in'}
          </button>
        </form>
      </Modal>
    </main>
  );
}
