'use client';

import React, { useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { HeroSection } from '../components/landing/HeroSection';
import { InteractiveDemo } from '../components/landing/InteractiveDemo';
import { FeaturesGrid } from '../components/landing/FeaturesGrid';
import { ArchitectureFlow } from '../components/landing/ArchitectureFlow';
import { ComparisonTable } from '../components/landing/ComparisonTable';
import { SecuritySection } from '../components/landing/SecuritySection';
import { PricingSection } from '../components/landing/PricingSection';
import { FAQSection } from '../components/landing/FAQSection';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';

export default function LandingPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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
      <Navbar onOpenAuthModal={() => setIsAuthModalOpen(true)} />
      
      <HeroSection
        onExploreClick={scrollToDemo}
        onViewArchClick={scrollToArch}
      />

      <InteractiveDemo />
      <FeaturesGrid />
      <ArchitectureFlow />
      <ComparisonTable />
      <SecuritySection />
      <PricingSection />
      <FAQSection />

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
          onSubmit={(e) => {
            e.preventDefault();
            alert('Demo authentication initialized via Supabase Magic Link!');
            setIsAuthModalOpen(false);
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Work Email
            </label>
            <input
              type="email"
              required
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
          <Button variant="primary" type="submit" style={{ width: '100%', marginTop: '0.5rem' }}>
            <span>Send Magic Link / Sign In</span>
          </Button>
        </form>
      </Modal>
    </main>
  );
}
