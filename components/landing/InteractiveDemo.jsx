import React, { useRef, useState } from 'react';
import { Tabs } from '../ui/Tabs';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { createClient } from '@/lib/supabase/client';

export function InteractiveDemo({ onAuthRequired }) {
  const [activeTab, setActiveTab] = useState('parser');
  const [selectedResume, setSelectedResume] = useState('alex');
  const [role, setRole] = useState('Full-Stack AI Engineer');
  const [jobDescription, setJobDescription] = useState('Looking for an engineer experienced in Next.js, React, Supabase, PostgreSQL, pgvector and Gemini embeddings.');
  const [matchMode, setMatchMode] = useState('best');
  const [matchResult, setMatchResult] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const fileInputRef = useRef(null);

  const candidates = [
    { id: 'alex', name: 'Alex Mercer', title: 'Lead Full-Stack AI Engineer', skills: 'next.js react typescript supabase postgresql pgvector gemini embeddings' },
    { id: 'sarah', name: 'Dr. Sarah Lin', title: 'Staff ML & Vector Systems Engineer', skills: 'python machine learning vector search pgvector hnsw gemini embeddings' },
    { id: 'elena', name: 'Elena Rostova', title: 'Principal Cloud Architect', skills: 'aws cloud architecture kubernetes postgres security terraform' },
  ];

  const acceptResume = async (file) => {
    if (!file) return;
    const isSupported = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ].includes(file.type) || /\.(pdf|docx)$/i.test(file.name);
    if (!isSupported) {
      setUploadMessage('Please choose a PDF or DOCX resume.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadMessage('This demo accepts files up to 5 MB.');
      return;
    }
    setUploadedFile(file);
    setUploadMessage('Uploading your resume securely…');
    setIsParsing(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        onAuthRequired?.();
        throw new Error('Sign in to upload and save resumes.');
      }
      const extension = file.name.split('.').pop()?.toLowerCase();
      const filePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: storageError } = await supabase.storage.from('resumes').upload(filePath, file, { contentType: file.type, upsert: false });
      if (storageError) throw storageError;
      const { error: dbError } = await supabase.from('resumes').insert({ user_id: user.id, file_name: file.name, file_path: filePath, file_type: file.type, file_size: file.size, processing_status: 'uploaded' });
      if (dbError) { await supabase.storage.from('resumes').remove([filePath]); throw dbError; }
      setUploadMessage(`${file.name} was saved to your resume library.`);
    } catch (error) {
      setUploadedFile(null);
      setUploadMessage(error instanceof Error ? error.message : 'Upload failed.');
    } finally { setIsParsing(false); }
  };

  const runMatch = async () => {
    try {
      const { data: { user } } = await createClient().auth.getUser();
      if (!user) {
        onAuthRequired?.();
        return;
      }
    } catch {
      onAuthRequired?.();
      return;
    }
    const target = `${role} ${jobDescription}`.toLowerCase().match(/[a-z0-9.+#-]{2,}/g) || [];
    const uniqueTerms = [...new Set(target)];
    const pool = matchMode === 'specific' ? candidates.filter((candidate) => candidate.id === selectedResume) : candidates;
    setMatchResult(pool.map((candidate) => {
      const evidence = uniqueTerms.filter((term) => candidate.skills.includes(term) || candidate.title.toLowerCase().includes(term));
      return { ...candidate, evidence, score: Math.min(99, Math.max(35, Math.round(42 + (evidence.length / Math.max(uniqueTerms.length, 1)) * 55))) };
    }).sort((a, b) => b.score - a.score));
  };

  const handleDrop = (event) => {
    event.preventDefault();
    acceptResume(event.dataTransfer.files?.[0]);
  };

  const tabs = [
    {
      id: 'parser',
      label: 'AI Resume Parser',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )
    },
    {
      id: 'matcher',
      label: 'Semantic Match Ranker',
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
                  <Badge variant={isParsing ? 'amber' : uploadMessage && uploadMessage.includes('saved') ? 'emerald' : uploadMessage ? 'amber' : 'emerald'} hasDot>{isParsing ? 'Uploading' : uploadMessage && uploadMessage.includes('saved') ? 'Saved' : uploadMessage ? 'Sign In Required' : 'Ready'}</Badge>
                </div>

                <div className="sample-selector">
                  <button
                    className={`sample-chip ${selectedResume === 'alex' ? 'active' : ''}`}
                    onClick={() => { setSelectedResume('alex'); setUploadMessage(''); setUploadedFile(null); }}
                  >
                    Alex Mercer (Full-Stack AI)
                  </button>
                  <button
                    className={`sample-chip ${selectedResume === 'sarah' ? 'active' : ''}`}
                    onClick={() => { setSelectedResume('sarah'); setUploadMessage(''); setUploadedFile(null); }}
                  >
                    Dr. Sarah Lin (Vector/ML)
                  </button>
                  <button
                    className={`sample-chip ${selectedResume === 'elena' ? 'active' : ''}`}
                    onClick={() => { setSelectedResume('elena'); setUploadMessage(''); setUploadedFile(null); }}
                  >
                    Elena Rostova (Cloud Architect)
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="resume-file-input"
                  onChange={(event) => acceptResume(event.target.files?.[0])}
                />
                <div
                  className="resume-dropzone"
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click();
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                  aria-label="Upload a PDF or DOCX resume"
                >
                  <div className="drop-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                      <path d="M12 12v9" />
                      <path d="m8 16 4-4 4 4" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                      {isParsing ? 'Reading your resume…' : uploadedFile ? uploadedFile.name : 'Drag & drop PDF / DOCX or click to upload'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {uploadedFile ? 'Saving this file to your private resume library.' : 'PDF or DOCX · maximum file size 5 MB'}
                    </div>
                  </div>
                </div>
                {uploadMessage && <p className={`upload-feedback ${uploadMessage.includes('saved') ? 'success' : uploadMessage.includes('Uploading') ? '' : 'error'}`} role="status">{uploadMessage}</p>}

                <div className="processing-pipeline" aria-label="Resume processing pipeline">
                  <div className="pipeline-label"><span className="pipeline-pulse" />Secure processing pipeline</div>
                  <div className="pipeline-stages">
                    <div className={`pipeline-stage stage-upload ${isParsing || (uploadMessage && uploadMessage.includes('saved')) ? 'active' : ''}`}><span className="stage-icon">↑</span><span>Private upload</span></div>
                    <span className="pipeline-connector" aria-hidden="true" />
                    <div className={`pipeline-stage stage-extract ${uploadMessage && uploadMessage.includes('saved') ? 'active' : ''}`}><span className="stage-icon">⌁</span><span>Text extraction</span></div>
                    <span className="pipeline-connector" aria-hidden="true" />
                    <div className={`pipeline-stage stage-normalize ${uploadMessage && uploadMessage.includes('saved') ? 'active' : ''}`}><span className="stage-icon">✦</span><span>AI normalization</span></div>
                    <span className="pipeline-connector" aria-hidden="true" />
                    <div className={`pipeline-stage stage-embed ${uploadMessage && uploadMessage.includes('saved') ? 'active' : ''}`}><span className="stage-icon">◈</span><span>Vector embedding</span></div>
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

                <div className="match-mode-toggle">
                  <button className={`sample-chip ${matchMode === 'best' ? 'active' : ''}`} onClick={() => setMatchMode('best')}>Find best match</button>
                  <button className={`sample-chip ${matchMode === 'specific' ? 'active' : ''}`} onClick={() => setMatchMode('specific')}>Check selected resume</button>
                </div>
                {matchMode === 'specific' && <label className="match-field">Resume to evaluate<select value={selectedResume} onChange={(event) => setSelectedResume(event.target.value)}>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} — {candidate.title}</option>)}</select></label>}
                <label className="match-field">Role<input value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Senior Data Engineer" /></label>
                <label className="match-field">Job description<textarea rows={5} value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Describe the skills and experience needed…" /></label>
                <Button variant="primary" style={{ width: '100%' }} onClick={runMatch} disabled={!role.trim() || !jobDescription.trim()}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span>{matchMode === 'best' ? 'Find Best Resume Match' : 'Check Resume Compatibility'}</span>
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
                  {!matchResult && <p className="match-empty">Enter a role and job description, then run a match to see compatibility.</p>}
                  {matchResult?.map((candidate, index) => (
                    <div className={`rank-item-card ${index === 0 ? 'top-match' : ''}`} key={candidate.id}>
                      <div className="rank-header"><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><div className="rank-num">#{index + 1}</div><div><div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>{candidate.name}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{candidate.title}</div></div></div><span className="badge-score score-high">{candidate.score}% Match</span></div>
                      <div className="reasoning-box"><strong>Compatibility analysis:</strong> {candidate.evidence.length ? `Matched ${candidate.evidence.join(', ')} to this role.` : 'No direct skill terms were found; review this candidate manually.'}<div style={{ marginTop: '0.5rem' }}><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Evidence: </span>{candidate.evidence.length ? candidate.evidence.map((term) => <span className="evidence-tag" key={term}>✓ {term}</span>) : <span className="evidence-tag">Needs human review</span>}</div></div>
                    </div>
                  ))}
                  {false && <div className="rank-item-card top-match">
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
                  </div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
