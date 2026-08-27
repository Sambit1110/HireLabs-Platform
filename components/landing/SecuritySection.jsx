import React from 'react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

export function SecuritySection() {
  return (
    <section className="security-section" id="security">
      <div className="container">
        <div className="security-grid">
          <div>
            <Badge variant="emerald" className="section-tag">
              Enterprise Security First
            </Badge>
            <h2 className="section-title">
              Zero Cross-Tenant Leakage with <span className="text-gradient-emerald">Postgres RLS</span>
            </h2>
            <p className="section-desc" style={{ marginBottom: '1.5rem' }}>
              Security is not an afterthought. Every database query, vector index lookup, and file download is governed by cryptographic authentication policies.
            </p>

            <div className="security-card-list">
              <div className="security-item">
                <div className="sec-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>Row Level Security (RLS) Everywhere</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Application tables enforce RLS at the database engine level. Vectors never appear across unauthorized team boundaries.
                  </div>
                </div>
              </div>

              <div className="security-item">
                <div className="sec-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>Scoped Supabase Storage Buckets</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Resume PDF/DOCX files are saved to <code style={{ color: 'var(--accent-cyan)' }}>&lt;auth-user-id&gt;/*</code> paths accessible solely to the owning HR recruiter.
                  </div>
                </div>
              </div>

              <div className="security-item">
                <div className="sec-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 14 14" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>Ethical Human-in-the-Loop AI</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Scoring serves as decision support, maintaining complete audit trails and protecting against algorithmic bias.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Card style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.825rem', color: 'var(--accent-emerald-light)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
              <span>supabase/migrations/20260728_prepgenius.sql</span>
            </div>

            <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '0.775rem', color: '#e2e8f0', lineHeight: 1.6, background: '#060913', padding: '1.25rem', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
{`<span style="color:#f472b6;">CREATE POLICY</span> "Users can only view their own candidate vectors"
<span style="color:#f472b6;">ON</span> public.candidate_embeddings
<span style="color:#f472b6;">FOR SELECT</span>
<span style="color:#f472b6;">USING</span> (auth.uid() = user_id);

<span style="color:#f472b6;">CREATE FUNCTION</span> match_candidates(
  query_embedding vector(1536),
  match_threshold float
)
<span style="color:#f472b6;">RETURNS TABLE</span> (...)
<span style="color:#f472b6;">LANGUAGE</span> plpgsql <span style="color:#f472b6;">SECURITY DEFINER</span>
<span style="color:#f472b6;">AS</span> $$
<span style="color:#f472b6;">BEGIN</span>
  <span style="color:#f472b6;">RETURN QUERY</span>
  <span style="color:#f472b6;">SELECT</span> id, full_name, 1 - (embedding <=> query_embedding) <span style="color:#f472b6;">AS</span> score
  <span style="color:#f472b6;">FROM</span> candidates
  <span style="color:#f472b6;">WHERE</span> user_id = auth.uid();
<span style="color:#f472b6;">END</span>;
$$;`}
            </pre>
          </Card>
        </div>
      </div>
    </section>
  );
}
