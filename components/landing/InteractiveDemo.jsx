import React, { useState } from 'react';
import { Tabs } from '../ui/Tabs';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState('parser');
  const [selectedResume, setSelectedResume] = useState('alex');
  const [selectedJob, setSelectedJob] = useState('ai_engineer');
  const [isParsing, setIsParsing] = useState(false);

  const tabs = [
    {
      id: 'parser',
      label: '1. AI Resume Parser',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )
    },
    {
      id: 'matcher',
      label: '2. Semantic Match Ranker',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )
    }
  ];

  return (
    <section className="sandbox-section" id="demo">
      <div className="container">
        <div className="section-header">
          <Badge variant="cyan" className="section-tag">
            Interactive Playground
          </Badge>
          <h2 className="section-title">
            Experience the <span className="text-gradient">HireLabs AI Engine</span>
          </h2>
          <p className="section-desc">
            Test real-time resume extraction, Gemini 1536-dimensional normalization, and pgvector cosine similarity ranking directly in your browser.
          </p>
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="sandbox-container">
          {activeTab === 'parser' && (
            <div className="sandbox-grid">
              <div className="sandbox-panel">
                <div className="panel-header">
                  <span className="panel-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Select or Upload Resume
                  </span>
                  <Badge variant="emerald" hasDot>Ready</Badge>
                </div>

                <div className="sample-selector">
                  <button
                    className={`sample-chip ${selectedResume === 'alex' ? 'active' : ''}`}
                    onClick={() => setSelectedResume('alex')}
                  >
                    Alex Mercer (Full-Stack AI)
                  </button>
                  <button
                    className={`sample-chip ${selectedResume === 'sarah' ? 'active' : ''}`}
                    onClick={() => setSelectedResume('sarah')}
                  >
                    Dr. Sarah Lin (Vector/ML)
                  </button>
                  <button
                    className={`sample-chip ${selectedResume === 'elena' ? 'active' : ''}`}
                    onClick={() => setSelectedResume('elena')}
                  >
                    Elena Rostova (Cloud Architect)
                  </button>
                </div>

                <div className="resume-dropzone">
                  <div className="drop-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                      <path d="M12 12v9" />
                      <path d="m8 16 4-4 4 4" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                      Drag & drop PDF / DOCX or click to simulate
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Stored securely in private Supabase Storage bucket with RLS
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    Pipeline State Machine:
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <Badge variant="purple">1. Upload to Supabase</Badge>
                    <Badge variant="cyan">2. Text Extraction</Badge>
                    <Badge variant="amber">3. Gemini Normalization</Badge>
                    <Badge variant="emerald">4. 1536-dim Embedding</Badge>
                  </div>
                </div>
              </div>

              {/* Code Box */}
              <div className="sandbox-panel">
                <div className="code-display-box">
                  <div className="code-box-header">
                    <div className="code-box-tabs">
                      <span className="code-tab-btn active">normalized_profile.json</span>
                    </div>
                    <Badge variant="cyan">1536 Dimensions (Gemini-002)</Badge>
                  </div>
                  <pre className="code-content">
{`{
  "candidate_profile": {
    "full_name": "${selectedResume === 'alex' ? 'Alex Mercer' : selectedResume === 'sarah' ? 'Dr. Sarah Lin' : 'Elena Rostova'}",
    "title": "${selectedResume === 'alex' ? 'Lead Full-Stack AI Engineer' : selectedResume === 'sarah' ? 'Staff ML & Vector Systems Engineer' : 'Principal Cloud Architect'}",
    "years_experience": ${selectedResume === 'alex' ? 8 : selectedResume === 'sarah' ? 10 : 12}
  },
  "skills_normalized": {
    "frontend": ["Next.js 15 (App Router)", "React", "TypeScript"],
    "backend_database": ["Supabase", "PostgreSQL", "pgvector", "Redis"],
    "ai_ml": ["Gemini Embeddings (1536-dim)", "RAG Pipelines"]
  },
  "vector_embedding": {
    "model": "models/gemini-embedding-002",
    "dimensions": 1536,
    "sample_vector": [-0.02341, 0.08412, -0.05193, 0.01248, "... [1530 more dimensions]"]
  }
}`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'matcher' && (
            <div className="sandbox-grid">
              <div className="sandbox-panel">
                <div className="panel-header">
                  <span className="panel-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    </svg>
                    Job Description & Semantic Target
                  </span>
                  <Badge variant="purple">Cosine Similarity RPC</Badge>
                </div>

                <div className="sample-selector">
                  <button
                    className={`sample-chip ${selectedJob === 'ai_engineer' ? 'active' : ''}`}
                    onClick={() => setSelectedJob('ai_engineer')}
                  >
                    Role: Full Stack AI Engineer
                  </button>
                  <button
                    className={`sample-chip ${selectedJob === 'vector_researcher' ? 'active' : ''}`}
                    onClick={() => setSelectedJob('vector_researcher')}
                  >
                    Role: Vector Systems Specialist
                  </button>
                </div>

                <textarea
                  rows={5}
                  value={
                    selectedJob === 'ai_engineer'
                      ? "Looking for an engineer experienced in Next.js App Router, Supabase Auth/Storage, pgvector semantic search, and Gemini embeddings (1536-dim)."
                      : "Seeking deep vector search and high-dimensional nearest neighbors expert with HNSW indexing and Gemini embedding benchmarking."
                  }
                  readOnly
                  style={{
                    width: '100%',
                    background: '#060913',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    color: '#fff',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    resize: 'none'
                  }}
                />

                <Button variant="primary" style={{ width: '100%' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span>Execute pgvector Semantic Match</span>
                </Button>
              </div>

              {/* Match Results */}
              <div className="sandbox-panel">
                <div className="panel-header">
                  <span className="panel-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    Ranked Candidates with Explainability
                  </span>
                  <Badge variant="emerald">Scoped to auth.uid()</Badge>
                </div>

                <div className="candidate-rank-list">
                  <div className="rank-item-card top-match">
                    <div className="rank-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="rank-num">#1</div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>Alex Mercer</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Lead Full-Stack AI Engineer</div>
                        </div>
                      </div>
                      <span className="badge-score score-high">97.4% Match</span>
                    </div>
                    <div className="reasoning-box">
                      <div style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                        <strong>AI Match Analysis:</strong> Exceptional semantic match. Deep direct experience with Next.js App Router, Supabase RLS, and 1536-dim Gemini embeddings vector indexing.
                      </div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Evidence: </span>
                        <span className="evidence-tag">✓ Next.js App Router</span>
                        <span className="evidence-tag">✓ pgvector 1536-dim</span>
                        <span className="evidence-tag">✓ Supabase Auth RLS</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
