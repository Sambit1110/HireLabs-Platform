import React from 'react';

/**
 * HireLabs Footer Component
 */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col-brand">
            <a href="#" className="nav-brand">
              <div className="brand-logo-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
              <span>
                Hire<span className="text-gradient">Labs</span>
              </span>
            </a>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Next-generation AI resume parsing and semantic applicant tracking system built on Next.js App Router, Supabase RLS, and Gemini vector embeddings.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <span className="badge badge-cyan">Gemini 1536-dim</span>
              <span className="badge badge-emerald">pgvector HNSW</span>
              <span className="badge badge-purple">Supabase Auth</span>
            </div>
          </div>

          <div>
            <div className="footer-col-title">Product</div>
            <ul className="footer-links">
              <li><a href="#demo">AI Resume Parser</a></li>
              <li><a href="#demo">Semantic Match Engine</a></li>
              <li><a href="#architecture">Architecture Pipeline</a></li>
              <li><a href="#comparison">Legacy ATS vs HireLabs</a></li>
              <li><a href="#pricing">Pricing & Plans</a></li>
            </ul>
          </div>

          <div>
            <div className="footer-col-title">Technology & Security</div>
            <ul className="footer-links">
              <li><a href="#security">PostgreSQL RLS Policies</a></li>
              <li><a href="#security">Private Storage Isolation</a></li>
              <li><a href="#security">Gemini Embedding-002</a></li>
              <li><a href="#security">Explainable Anti-Bias AI</a></li>
              <li><a href="#architecture">Next.js 15 App Router</a></li>
            </ul>
          </div>

          <div>
            <div className="footer-col-title">Developers</div>
            <ul className="footer-links">
              <li><a href="https://github.com" target="_blank" rel="noreferrer">GitHub Repository</a></li>
              <li><a href="#faq">Supabase Migrations</a></li>
              <li><a href="#faq">API Documentation</a></li>
              <li><a href="#faq">Vercel Deployment Guide</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div>© 2026 HireLabs Platform Inc. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms of Service</a>
            <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Security Whitepaper</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
