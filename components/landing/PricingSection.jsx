import React, { useState } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section className="pricing-section" id="pricing">
      <div className="container">
        <div className="section-header">
          <Badge variant="cyan" className="section-tag">
            Transparent Pricing
          </Badge>
          <h2 className="section-title">
            Scale from Startup to <span className="text-gradient">Enterprise</span>
          </h2>
          <p className="section-desc">
            Simple tiered plans with no per-seat penalties. Upgrade or downgrade anytime.
          </p>
        </div>

        <div className="billing-toggle">
          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Monthly Billing</span>
          <div
            className={`toggle-switch ${isAnnual ? 'active' : ''}`}
            onClick={() => setIsAnnual(!isAnnual)}
            role="button"
            tabIndex={0}
          >
            <div className="toggle-knob" />
          </div>
          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Annual Billing <Badge variant="emerald" style={{ marginLeft: '0.4rem' }}>Save 20%</Badge>
          </span>
        </div>

        <div className="pricing-grid">
          {/* Starter */}
          <div className="pricing-card">
            <div className="plan-name">Starter</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ideal for small hiring teams and early stage startups.</p>
            
            <div className="plan-price-wrap">
              <span className="plan-price">{isAnnual ? '$39' : '$49'}</span>
              <span className="plan-period">/ month</span>
            </div>

            <ul className="plan-features-list">
              <li className="plan-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                <span>Up to 500 Resumes Parsed / mo</span>
              </li>
              <li className="plan-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                <span>Gemini 1536-dim Embedding</span>
              </li>
              <li className="plan-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                <span>pgvector Semantic Matching</span>
              </li>
              <li className="plan-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                <span>Supabase Storage Integration</span>
              </li>
            </ul>

            <Button variant="secondary" style={{ width: '100%' }}>Get Started</Button>
          </div>

          {/* Growth */}
          <div className="pricing-card featured">
            <div className="plan-badge">Most Popular</div>
            <div className="plan-name">Growth</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>For scaling companies screening hundreds of candidates weekly.</p>
            
            <div className="plan-price-wrap">
              <span className="plan-price">{isAnnual ? '$119' : '$149'}</span>
              <span className="plan-period">/ month</span>
            </div>

            <ul className="plan-features-list">
              <li className="plan-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                <span>Up to 5,000 Resumes Parsed / mo</span>
              </li>
              <li className="plan-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                <span>Explainable AI Evidence & Gap Analysis</span>
              </li>
              <li className="plan-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                <span>Multi-User RLS Scopes</span>
              </li>
              <li className="plan-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                <span>Priority Email & Slack Support</span>
              </li>
            </ul>

            <Button variant="primary" style={{ width: '100%' }}>Start 14-Day Free Trial</Button>
          </div>

          {/* Enterprise */}
          <div className="pricing-card">
            <div className="plan-name">Enterprise</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Custom vector pipelines and dedicated infrastructure.</p>
            
            <div className="plan-price-wrap">
              <span className="plan-price">{isAnnual ? '$299' : '$379'}</span>
              <span className="plan-period">/ month</span>
            </div>

            <ul className="plan-features-list">
              <li className="plan-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                <span>Unlimited Resume Ingestion</span>
              </li>
              <li className="plan-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                <span>Dedicated Supabase Postgres Instance</span>
              </li>
              <li className="plan-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                <span>SOC2 & GDPR Compliance Package</span>
              </li>
              <li className="plan-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                <span>24/7 Phone & Technical SLA</span>
              </li>
            </ul>

            <Button variant="secondary" style={{ width: '100%' }}>Contact Sales</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
