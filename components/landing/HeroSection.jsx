import React from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export function HeroSection({ onExploreClick, onViewArchClick }) {
  return (
    <section className="hero-section" id="heroSection">
      <div className="hero-glow-bg" />
      <div className="container hero-grid">
        <div className="hero-content">
          <Badge variant="pulse">
            Gemini 1536-dim Vector Embeddings + pgvector
          </Badge>

          <h1 className="hero-title">
            Turn Resumes into <br />
            <span className="text-gradient">Vector Intelligence</span>
          </h1>

          <p className="hero-subtitle">
            HireLabs is a production-grade AI resume parser and semantic applicant tracking system. 
            Stop missing top talent with naive keywords—match candidates via high-dimensional vector embeddings, 
            instant cosine similarity ranking, and bulletproof Supabase Row Level Security.
          </p>

          <div className="hero-cta-group">
            <Button variant="primary" size="lg" onClick={onExploreClick}>
              <span>Explore Live Sandbox</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Button>
            <Button variant="secondary" size="lg" onClick={onViewArchClick}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
              <span>View Architecture</span>
            </Button>
          </div>

          <div className="hero-trust-metrics">
            <div className="trust-item">
              <span className="trust-number">1536</span>
              <span className="trust-label">Vector Dimensions</span>
            </div>
            <div className="trust-item">
              <span className="trust-number">&lt; 85ms</span>
              <span className="trust-label">pgvector Match Speed</span>
            </div>
            <div className="trust-item">
              <span className="trust-number">100%</span>
              <span className="trust-label">RLS Scoped Security</span>
            </div>
          </div>
        </div>

        {/* Hero Visual Showcase */}
        <div className="hero-visual-card">
          <div className="card-window-bar">
            <div className="window-dots">
              <span className="dot-red" />
              <span className="dot-yellow" />
              <span className="dot-green" />
            </div>
            <div className="window-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
              <span>pgvector Match Engine (Cosine RPC)</span>
            </div>
            <Badge variant="emerald">Active RLS</Badge>
          </div>

          <div className="hero-demo-preview">
            <div className="mini-candidate-card">
              <div className="candidate-avatar-wrap">
                <div className="avatar-badge">AM</div>
                <div>
                  <div className="cand-name">Alex Mercer</div>
                  <div className="cand-role">Lead Full-Stack AI Engineer</div>
                </div>
              </div>
              <div className="match-ring-score">
                <span className="match-pct">97.4%</span>
                <span className="match-subtext">Semantic Match</span>
              </div>
            </div>

            <div className="vector-visual-stream">
              <div className="vector-line">
                <span>Embedding Vector (Gemini-002):</span>
                <span className="vector-val">[-0.0234, 0.0841, -0.0519, 0.0911, ...]</span>
              </div>
              <div className="vector-line">
                <span>Cosine Distance (<code style={{ color: 'var(--accent-cyan)' }}>&lt;=&gt;</code>):</span>
                <span style={{ color: 'var(--accent-emerald-light)', fontWeight: 700 }}>0.026 (97.4% affinity)</span>
              </div>
              <div className="vector-line">
                <span>Private Storage Path:</span>
                <span className="vector-val">supabase://resumes/usr_98a2/alex_cv.pdf</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-cyan">Next.js 15 App Router</span>
              <span className="badge badge-emerald">pgvector HNSW</span>
              <span className="badge badge-purple">Supabase Auth</span>
              <span className="badge badge-amber">Explainable AI</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
