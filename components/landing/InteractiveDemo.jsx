import React, { useRef, useState } from 'react';
import { Tabs } from '../ui/Tabs';
import { Button } from '../ui/Button';
import { createClient } from '@/lib/supabase/client';

export function InteractiveDemo({ onAuthRequired }) {
  const [activeTab, setActiveTab] = useState('parser');
  const [selectedResume, setSelectedResume] = useState('alex');
  const [role, setRole] = useState('Full-Stack AI Engineer');
  const [jobDescription, setJobDescription] = useState(
    'Looking for an engineer experienced in Next.js, React, Supabase, PostgreSQL, pgvector and Gemini embeddings.'
  );
  const [matchMode, setMatchMode] = useState('best');
  const [matchResult, setMatchResult] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const fileInputRef = useRef(null);

  const candidates = [
    {
      id: 'alex',
      name: 'Alex Mercer',
      title: 'Lead Full-Stack AI Engineer',
      skills:
        'next.js react typescript supabase postgresql pgvector gemini embeddings',
    },
    {
      id: 'sarah',
      name: 'Dr. Sarah Lin',
      title: 'Staff ML & Vector Systems Engineer',
      skills:
        'python machine learning vector search pgvector hnsw gemini embeddings',
    },
    {
      id: 'elena',
      name: 'Elena Rostova',
      title: 'Principal Cloud Architect',
      skills:
        'aws cloud architecture kubernetes postgres security terraform',
    },
  ];

  const activeCandidate =
    candidates.find((candidate) => candidate.id === selectedResume) ||
    candidates[0];

  const acceptResume = async (file) => {
    if (!file) return;

    const isSupported =
      [
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        onAuthRequired?.();
        throw new Error('Sign in to upload and save resumes.');
      }

      const extension = file.name.split('.').pop()?.toLowerCase();
      const filePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: storageError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (storageError) throw storageError;

      const { error: dbError } = await supabase.from('resumes').insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        processing_status: 'uploaded',
      });

      if (dbError) {
        await supabase.storage.from('resumes').remove([filePath]);
        throw dbError;
      }

      setUploadMessage(`${file.name} was saved to your resume library.`);
    } catch (error) {
      setUploadedFile(null);
      setUploadMessage(
        error instanceof Error ? error.message : 'Upload failed.'
      );
    } finally {
      setIsParsing(false);
    }
  };

  const runMatch = async () => {
    try {
      const {
        data: { user },
      } = await createClient().auth.getUser();

      if (!user) {
        onAuthRequired?.();
        return;
      }
    } catch {
      onAuthRequired?.();
      return;
    }

    const target =
      `${role} ${jobDescription}`
        .toLowerCase()
        .match(/[a-z0-9.+#-]{2,}/g) || [];

    const uniqueTerms = [...new Set(target)];

    const pool =
      matchMode === 'specific'
        ? candidates.filter((candidate) => candidate.id === selectedResume)
        : candidates;

    setMatchResult(
      pool
        .map((candidate) => {
          const evidence = uniqueTerms.filter(
            (term) =>
              candidate.skills.includes(term) ||
              candidate.title.toLowerCase().includes(term)
          );

          return {
            ...candidate,
            evidence,
            score: Math.min(
              99,
              Math.max(
                35,
                Math.round(
                  42 +
                    (evidence.length / Math.max(uniqueTerms.length, 1)) * 55
                )
              )
            ),
          };
        })
        .sort((a, b) => b.score - a.score)
    );
  };

  const handleDrop = (event) => {
    event.preventDefault();
    acceptResume(event.dataTransfer.files?.[0]);
  };

  const resetUpload = () => {
    setUploadedFile(null);
    setUploadMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const tabs = [
    {
      id: 'parser',
      label: 'Resume intelligence',
      icon: (
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
    },
    {
      id: 'matcher',
      label: 'Candidate matching',
      icon: (
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
  ];

  return (
    <section className="hl-demo-section" id="demo">
      <style>{`
        .hl-demo-section {
          --cream: #F5F1E8;
          --cream-deep: #ECE6DA;
          --white: #FFFFFF;
          --espresso: #211C18;
          --espresso-soft: #5F574F;
          --olive: #6F7D55;
          --olive-dark: #596544;
          --taupe: #C8C0AF;
          --border: #DED7CA;

          position: relative;
          padding: 150px 0 170px;
          background: var(--cream);
          color: var(--espresso);
          overflow: hidden;
        }

        .hl-demo-section *,
        .hl-demo-section *::before,
        .hl-demo-section *::after {
          box-sizing: border-box;
        }

        .hl-demo-shell {
          width: min(1180px, calc(100% - 48px));
          margin: 0 auto;
        }

        .hl-demo-heading {
          max-width: 800px;
          margin-bottom: 62px;
        }

        .hl-demo-kicker {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 18px;
          color: var(--olive-dark);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .hl-demo-kicker-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: var(--olive);
          box-shadow: 0 0 0 4px rgba(111, 125, 85, 0.12);
        }

        .hl-demo-title {
          margin: 0;
          max-width: 790px;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(48px, 6vw, 80px);
          line-height: 0.96;
          letter-spacing: -0.055em;
          font-weight: 500;
        }

        .hl-demo-title em {
          color: var(--olive);
          font-style: italic;
        }

        .hl-demo-description {
          max-width: 660px;
          margin: 24px 0 0;
          color: var(--espresso-soft);
          font-size: 16px;
          line-height: 1.7;
        }

        .hl-demo-tabs {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px;
          margin-bottom: 22px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: rgba(255,255,255,0.5);
        }

        .hl-demo-tab {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 16px;
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: #776E65;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition:
            background 180ms ease,
            color 180ms ease,
            transform 180ms ease;
        }

        .hl-demo-tab:hover {
          color: var(--espresso);
          transform: translateY(-1px);
        }

        .hl-demo-tab.active {
          background: var(--espresso);
          color: var(--cream);
          box-shadow: 0 8px 20px rgba(33, 28, 24, 0.12);
        }

        .hl-demo-card {
          border: 1px solid var(--border);
          border-radius: 28px;
          background: rgba(255,255,255,0.42);
          padding: 1px;
          box-shadow: 0 25px 80px rgba(46, 40, 34, 0.08);
        }

        .hl-demo-inner {
          border-radius: 27px;
          background: rgba(255,255,255,0.72);
          overflow: hidden;
        }

        .hl-demo-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          min-height: 66px;
          padding: 0 24px;
          border-bottom: 1px solid var(--border);
        }

        .hl-demo-toolbar-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          font-weight: 800;
        }

        .hl-demo-toolbar-title span:first-child {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: var(--espresso);
          color: var(--cream);
        }

        .hl-demo-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #6A6259;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.07em;
          text-transform: uppercase;
        }

        .hl-demo-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: var(--olive);
        }

        .hl-demo-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
          min-height: 600px;
        }

        .hl-demo-panel {
          padding: 28px;
        }

        .hl-demo-panel + .hl-demo-panel {
          border-left: 1px solid var(--border);
        }

        .hl-panel-label {
          margin-bottom: 9px;
          color: #8A8177;
          font-size: 9px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .hl-panel-title {
          margin: 0;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 27px;
          font-weight: 500;
          letter-spacing: -0.035em;
        }

        .hl-panel-copy {
          margin: 10px 0 26px;
          max-width: 470px;
          color: var(--espresso-soft);
          font-size: 12px;
          line-height: 1.65;
        }

        .hl-sample-list {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 24px;
        }

        .hl-sample-button {
          padding: 9px 11px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: rgba(255,255,255,0.8);
          color: #655D54;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
          transition:
            border-color 180ms ease,
            background 180ms ease,
            color 180ms ease;
        }

        .hl-sample-button:hover {
          border-color: var(--taupe);
          color: var(--espresso);
        }

        .hl-sample-button.active {
          border-color: var(--espresso);
          background: var(--espresso);
          color: var(--cream);
        }

        .hl-dropzone {
          display: flex;
          align-items: center;
          gap: 16px;
          min-height: 145px;
          padding: 22px;
          border: 1px dashed #BFB6A7;
          border-radius: 20px;
          background: #FAF8F3;
          cursor: pointer;
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            background 180ms ease;
        }

        .hl-dropzone:hover {
          transform: translateY(-2px);
          border-color: var(--olive);
          background: #F7F4EC;
        }

        .hl-drop-icon {
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background: var(--espresso);
          color: var(--cream);
        }

        .hl-upload-title {
          color: var(--espresso);
          font-size: 13px;
          line-height: 1.4;
          font-weight: 800;
        }

        .hl-upload-subtitle {
          margin-top: 5px;
          color: #857C73;
          font-size: 10px;
          line-height: 1.55;
        }

        .hl-upload-status {
          margin: 11px 0 0;
          color: var(--olive-dark);
          font-size: 10px;
          line-height: 1.5;
          font-weight: 700;
        }

        .hl-upload-status.error {
          color: #9A5948;
        }

        .hl-upload-status.neutral {
          color: #7E756C;
        }

        .hl-pipeline {
          margin-top: 24px;
          padding-top: 22px;
          border-top: 1px solid var(--border);
        }

        .hl-pipeline-title {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 15px;
          color: #756C63;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .hl-pipeline-title span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--olive);
        }

        .hl-pipeline-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .hl-pipeline-stage {
          min-height: 72px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 15px;
          background: rgba(255,255,255,0.72);
        }

        .hl-pipeline-stage.active {
          border-color: rgba(111,125,85,0.38);
          background: #F2F3EB;
        }

        .hl-pipeline-icon {
          display: block;
          margin-bottom: 9px;
          color: var(--olive-dark);
          font-size: 13px;
          font-weight: 800;
        }

        .hl-pipeline-stage span:last-child {
          display: block;
          color: #6E655D;
          font-size: 9px;
          line-height: 1.4;
          font-weight: 700;
        }

        .hl-code-card {
          height: 100%;
          border-radius: 20px;
          overflow: hidden;
          background: var(--espresso);
          color: var(--cream);
        }

        .hl-code-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          min-height: 58px;
          padding: 0 18px;
          border-bottom: 1px solid rgba(245,241,232,0.12);
        }

        .hl-code-file {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #D9D2C7;
          font-size: 10px;
          font-family: 'SFMono-Regular', Consolas, monospace;
        }

        .hl-code-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #A9B686;
        }

        .hl-code-model {
          padding: 7px 9px;
          border: 1px solid rgba(245,241,232,0.12);
          border-radius: 999px;
          color: #BDB5AA;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .hl-code-content {
          padding: 22px;
          overflow: auto;
        }

        .hl-code-content pre {
          margin: 0;
          color: #DDD6CB;
          font-size: 10px;
          line-height: 1.75;
          font-family: 'SFMono-Regular', Consolas, monospace;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .hl-code-key {
          color: #BFCB9F;
        }

        .hl-code-string {
          color: #E8D6BD;
        }

        .hl-code-number {
          color: #C8B99E;
        }

        .hl-vector-box {
          margin-top: 22px;
          padding: 17px;
          border: 1px solid rgba(245,241,232,0.12);
          border-radius: 16px;
          background: rgba(255,255,255,0.04);
        }

        .hl-vector-label {
          margin-bottom: 8px;
          color: #8F897F;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .hl-vector-value {
          color: #CBC3B8;
          font-size: 9px;
          line-height: 1.6;
          font-family: 'SFMono-Regular', Consolas, monospace;
        }

        .hl-vector-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 13px;
        }

        .hl-mini-pill {
          padding: 7px 9px;
          border-radius: 999px;
          background: rgba(111,125,85,0.17);
          color: #B9C69C;
          font-size: 8px;
          font-weight: 800;
        }

        .hl-match-layout {
          display: grid;
          grid-template-columns: 0.82fr 1.18fr;
          min-height: 600px;
        }

        .hl-form-panel {
          padding: 30px;
        }

        .hl-result-panel {
          padding: 30px;
          border-left: 1px solid var(--border);
          background: rgba(250,248,243,0.45);
        }

        .hl-toggle {
          display: inline-flex;
          gap: 3px;
          padding: 4px;
          margin: 4px 0 24px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: #F7F3EA;
        }

        .hl-toggle button {
          border: 0;
          border-radius: 999px;
          padding: 9px 12px;
          background: transparent;
          color: #81786F;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        .hl-toggle button.active {
          background: var(--espresso);
          color: var(--cream);
        }

        .hl-field {
          display: block;
          margin-top: 17px;
        }

        .hl-field-label {
          display: block;
          margin-bottom: 8px;
          color: #746B62;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .hl-field input,
        .hl-field textarea,
        .hl-field select {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: rgba(255,255,255,0.88);
          color: var(--espresso);
          font: inherit;
          font-size: 12px;
          outline: none;
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .hl-field input,
        .hl-field select {
          min-height: 46px;
          padding: 0 13px;
        }

        .hl-field textarea {
          min-height: 135px;
          padding: 13px;
          resize: vertical;
          line-height: 1.6;
        }

        .hl-field input:focus,
        .hl-field textarea:focus,
        .hl-field select:focus {
          border-color: var(--olive);
          box-shadow: 0 0 0 4px rgba(111,125,85,0.09);
        }

        .hl-match-button {
          width: 100%;
          margin-top: 21px;
        }

        .hl-result-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 24px;
        }

        .hl-result-count {
          color: #82796F;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .hl-empty-state {
          min-height: 390px;
          display: grid;
          place-items: center;
          text-align: center;
          border: 1px dashed #CEC6B8;
          border-radius: 20px;
          background: rgba(255,255,255,0.44);
          padding: 34px;
        }

        .hl-empty-icon {
          width: 52px;
          height: 52px;
          margin: 0 auto 15px;
          display: grid;
          place-items: center;
          border-radius: 17px;
          background: #ECE8DE;
          color: var(--olive-dark);
        }

        .hl-empty-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 22px;
          letter-spacing: -0.03em;
        }

        .hl-empty-copy {
          max-width: 330px;
          margin: 8px auto 0;
          color: #847B72;
          font-size: 11px;
          line-height: 1.6;
        }

        .hl-results {
          display: grid;
          gap: 12px;
        }

        .hl-result-card {
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: rgba(255,255,255,0.86);
        }

        .hl-result-card.top {
          border-color: rgba(111,125,85,0.44);
          box-shadow: 0 14px 35px rgba(67,74,53,0.08);
        }

        .hl-result-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .hl-result-person {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .hl-result-rank {
          width: 29px;
          height: 29px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #F0ECE3;
          color: #71685F;
          font-size: 9px;
          font-weight: 800;
        }

        .hl-result-name {
          color: var(--espresso);
          font-size: 13px;
          line-height: 1.35;
          font-weight: 800;
        }

        .hl-result-role {
          margin-top: 3px;
          color: #857C73;
          font-size: 9px;
          line-height: 1.4;
        }

        .hl-result-score {
          flex-shrink: 0;
          padding: 8px 10px;
          border-radius: 999px;
          background: #EDF1E5;
          color: var(--olive-dark);
          font-size: 10px;
          font-weight: 900;
        }

        .hl-reasoning {
          margin-top: 15px;
          padding: 13px;
          border-radius: 13px;
          background: #F6F3EB;
          color: #6E665D;
          font-size: 10px;
          line-height: 1.6;
        }

        .hl-reasoning strong {
          color: var(--espresso);
        }

        .hl-evidence {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }

        .hl-evidence-tag {
          padding: 6px 8px;
          border-radius: 999px;
          background: #EDEFE5;
          color: var(--olive-dark);
          font-size: 8px;
          font-weight: 800;
        }

        .hl-trust-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          border-top: 1px solid var(--border);
          background: rgba(255,255,255,0.35);
        }

        .hl-trust-item {
          padding: 20px 24px;
          border-right: 1px solid var(--border);
        }

        .hl-trust-item:last-child {
          border-right: 0;
        }

        .hl-trust-number {
          display: block;
          font-size: 19px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.03em;
        }

        .hl-trust-label {
          display: block;
          margin-top: 6px;
          color: #837A70;
          font-size: 8px;
          line-height: 1.4;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        @media (max-width: 980px) {
          .hl-demo-grid,
          .hl-match-layout {
            grid-template-columns: 1fr;
          }

          .hl-demo-panel + .hl-demo-panel,
          .hl-result-panel {
            border-left: 0;
            border-top: 1px solid var(--border);
          }

          .hl-demo-grid {
            min-height: 0;
          }

          .hl-match-layout {
            min-height: 0;
          }
        }

        @media (max-width: 680px) {
          .hl-demo-section {
            padding: 100px 0 120px;
          }

          .hl-demo-shell {
            width: min(100% - 28px, 1180px);
          }

          .hl-demo-heading {
            margin-bottom: 42px;
          }

          .hl-demo-title {
            font-size: clamp(44px, 13vw, 66px);
          }

          .hl-demo-tabs {
            width: 100%;
            overflow-x: auto;
          }

          .hl-demo-tab {
            flex: 1;
            justify-content: center;
            white-space: nowrap;
          }

          .hl-demo-toolbar {
            padding: 0 17px;
          }

          .hl-demo-panel,
          .hl-form-panel,
          .hl-result-panel {
            padding: 20px;
          }

          .hl-pipeline-row {
            grid-template-columns: repeat(2, 1fr);
          }

          .hl-trust-strip {
            grid-template-columns: 1fr;
          }

          .hl-trust-item {
            border-right: 0;
            border-bottom: 1px solid var(--border);
          }

          .hl-trust-item:last-child {
            border-bottom: 0;
          }

          .hl-result-top {
            align-items: flex-start;
          }

          .hl-result-score {
            font-size: 9px;
          }
        }
      `}</style>

      <div className="hl-demo-shell">
        <div className="hl-demo-heading">
          <div className="hl-demo-kicker">
            <span className="hl-demo-kicker-dot" />
            Live product experience
          </div>

          <h2 className="hl-demo-title">
            See the hiring signal
            <br />
            <em>before you hire.</em>
          </h2>

          <p className="hl-demo-description">
            Upload a resume, inspect the structured profile HireLabs creates,
            then test how semantic matching ranks candidates against a real
            role.
          </p>
        </div>

        <div className="hl-demo-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`hl-demo-tab ${
                activeTab === tab.id ? 'active' : ''
              }`}
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={activeTab === tab.id}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="hl-demo-card">
          <div className="hl-demo-inner">
            <div className="hl-demo-toolbar">
              <div className="hl-demo-toolbar-title">
                <span>
                  {activeTab === 'parser' ? (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  ) : (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  )}
                </span>

                <span>
                  {activeTab === 'parser'
                    ? 'Resume intelligence'
                    : 'Semantic candidate matching'}
                </span>
              </div>

              <div className="hl-demo-status">
                <span className="hl-demo-status-dot" />
                Private workspace
              </div>
            </div>

            {activeTab === 'parser' && (
              <>
                <div className="hl-demo-grid">
                  <div className="hl-demo-panel">
                    <div className="hl-panel-label">01 · Source</div>

                    <h3 className="hl-panel-title">
                      Give HireLabs a resume.
                    </h3>

                    <p className="hl-panel-copy">
                      Start with a sample profile or upload your own PDF/DOCX.
                      The file is saved to your private resume library after
                      authentication.
                    </p>

                    <div className="hl-sample-list">
                      {candidates.map((candidate) => (
                        <button
                          key={candidate.id}
                          type="button"
                          className={`hl-sample-button ${
                            selectedResume === candidate.id ? 'active' : ''
                          }`}
                          onClick={() => {
                            setSelectedResume(candidate.id);
                            setUploadMessage('');
                            setUploadedFile(null);
                          }}
                        >
                          {candidate.name}
                        </button>
                      ))}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      style={{ display: 'none' }}
                      onChange={(event) =>
                        acceptResume(event.target.files?.[0])
                      }
                    />

                    <div
                      className="hl-dropzone"
                      role="button"
                      tabIndex={0}
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={handleDrop}
                      aria-label="Upload a PDF or DOCX resume"
                    >
                      <div className="hl-drop-icon">
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                        >
                          <path d="M12 16V4" />
                          <path d="m7 9 5-5 5 5" />
                          <path d="M5 19h14" />
                        </svg>
                      </div>

                      <div>
                        <div className="hl-upload-title">
                          {isParsing
                            ? 'Reading your resume…'
                            : uploadedFile
                              ? uploadedFile.name
                              : 'Drop a resume here'}
                        </div>

                        <div className="hl-upload-subtitle">
                          {uploadedFile
                            ? 'Saving this file to your private resume library.'
                            : 'PDF or DOCX · maximum file size 5 MB'}
                        </div>
                      </div>
                    </div>

                    {uploadMessage && (
                      <p
                        className={`hl-upload-status ${
                          uploadMessage.includes('failed') ||
                          uploadMessage.includes('Please') ||
                          uploadMessage.includes('Sign in')
                            ? 'error'
                            : uploadMessage.includes('Uploading')
                              ? 'neutral'
                              : ''
                        }`}
                        role="status"
                      >
                        {uploadMessage}
                      </p>
                    )}

                    {uploadedFile && !isParsing && (
                      <button
                        type="button"
                        onClick={resetUpload}
                        style={{
                          marginTop: '10px',
                          border: 0,
                          background: 'transparent',
                          color: '#7C736A',
                          padding: 0,
                          fontSize: '9px',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        Remove selected file
                      </button>
                    )}

                    <div className="hl-pipeline">
                      <div className="hl-pipeline-title">
                        <span />
                        Processing flow
                      </div>

                      <div className="hl-pipeline-row">
                        <div
                          className={`hl-pipeline-stage ${
                            isParsing ||
                            uploadMessage.includes('saved')
                              ? 'active'
                              : ''
                          }`}
                        >
                          <span className="hl-pipeline-icon">01</span>
                          <span>Private upload</span>
                        </div>

                        <div
                          className={`hl-pipeline-stage ${
                            uploadMessage.includes('saved') ? 'active' : ''
                          }`}
                        >
                          <span className="hl-pipeline-icon">02</span>
                          <span>Text extraction</span>
                        </div>

                        <div
                          className={`hl-pipeline-stage ${
                            uploadMessage.includes('saved') ? 'active' : ''
                          }`}
                        >
                          <span className="hl-pipeline-icon">03</span>
                          <span>AI normalization</span>
                        </div>

                        <div
                          className={`hl-pipeline-stage ${
                            uploadMessage.includes('saved') ? 'active' : ''
                          }`}
                        >
                          <span className="hl-pipeline-icon">04</span>
                          <span>Vector embedding</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="hl-demo-panel">
                    <div className="hl-code-card">
                      <div className="hl-code-top">
                        <div className="hl-code-file">
                          <span className="hl-code-dot" />
                          normalized_profile.json
                        </div>

                        <div className="hl-code-model">
                          Gemini embedding 002
                        </div>
                      </div>

                      <div className="hl-code-content">
                        <pre>
{`{
  `}
<span className="hl-code-key">"candidate_profile"</span>{`: {
    `}
<span className="hl-code-key">"full_name"</span>{`: `}
<span className="hl-code-string">"${activeCandidate.name}"</span>{`,
    `}
<span className="hl-code-key">"title"</span>{`: `}
<span className="hl-code-string">"${activeCandidate.title}"</span>{`,
    `}
<span className="hl-code-key">"years_experience"</span>{`: `}
<span className="hl-code-number">
  {selectedResume === 'alex' ? 8 : selectedResume === 'sarah' ? 10 : 12}
</span>{`
  },
  `}
<span className="hl-code-key">"skills_normalized"</span>{`: {
    `}
<span className="hl-code-key">"frontend"</span>{`: [
      `}
<span className="hl-code-string">"Next.js 15"</span>{`,
      `}
<span className="hl-code-string">"React"</span>{`,
      `}
<span className="hl-code-string">"TypeScript"</span>{`
    ],
    `}
<span className="hl-code-key">"backend_database"</span>{`: [
      `}
<span className="hl-code-string">"Supabase"</span>{`,
      `}
<span className="hl-code-string">"PostgreSQL"</span>{`,
      `}
<span className="hl-code-string">"pgvector"</span>{`
    ],
    `}
<span className="hl-code-key">"ai_ml"</span>{`: [
      `}
<span className="hl-code-string">"Gemini Embeddings"</span>{`,
      `}
<span className="hl-code-string">"RAG Pipelines"</span>{`
    ]
  },
  `}
<span className="hl-code-key">"vector_embedding"</span>{`: {
    `}
<span className="hl-code-key">"model"</span>{`: `}
<span className="hl-code-string">
      "models/gemini-embedding-002"
</span>{`,
    `}
<span className="hl-code-key">"dimensions"</span>{`: `}
<span className="hl-code-number">1536</span>{`,
    `}
<span className="hl-code-key">"sample_vector"</span>{`: [
      `}
<span className="hl-code-number">-0.02341</span>{`, `}
<span className="hl-code-number">0.08412</span>{`, `}
<span className="hl-code-number">-0.05193</span>{`,
      ...
    ]
  }
}`}
                        </pre>

                        <div className="hl-vector-box">
                          <div className="hl-vector-label">
                            Searchable representation
                          </div>

                          <div className="hl-vector-value">
                            [-0.02341, 0.08412, -0.05193, 0.01248, ...]
                          </div>

                          <div className="hl-vector-meta">
                            <span className="hl-mini-pill">
                              1536 dimensions
                            </span>

                            <span className="hl-mini-pill">
                              pgvector ready
                            </span>

                            <span className="hl-mini-pill">
                              Private record
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hl-trust-strip">
                  <div className="hl-trust-item">
                    <span className="hl-trust-number">PDF + DOCX</span>
                    <span className="hl-trust-label">
                      Resume input formats
                    </span>
                  </div>

                  <div className="hl-trust-item">
                    <span className="hl-trust-number">1536</span>
                    <span className="hl-trust-label">
                      Embedding dimensions
                    </span>
                  </div>

                  <div className="hl-trust-item">
                    <span className="hl-trust-number">RLS</span>
                    <span className="hl-trust-label">
                      Private data boundary
                    </span>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'matcher' && (
              <>
                <div className="hl-match-layout">
                  <div className="hl-form-panel">
                    <div className="hl-panel-label">01 · Target</div>

                    <h3 className="hl-panel-title">
                      Describe who you need.
                    </h3>

                    <p className="hl-panel-copy">
                      Give HireLabs the role context, then let semantic
                      similarity rank the candidates against it.
                    </p>

                    <div className="hl-toggle">
                      <button
                        type="button"
                        className={matchMode === 'best' ? 'active' : ''}
                        onClick={() => setMatchMode('best')}
                      >
                        Find best match
                      </button>

                      <button
                        type="button"
                        className={matchMode === 'specific' ? 'active' : ''}
                        onClick={() => setMatchMode('specific')}
                      >
                        Check one resume
                      </button>
                    </div>

                    {matchMode === 'specific' && (
                      <label className="hl-field">
                        <span className="hl-field-label">
                          Resume to evaluate
                        </span>

                        <select
                          value={selectedResume}
                          onChange={(event) =>
                            setSelectedResume(event.target.value)
                          }
                        >
                          {candidates.map((candidate) => (
                            <option
                              key={candidate.id}
                              value={candidate.id}
                            >
                              {candidate.name} — {candidate.title}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    <label className="hl-field">
                      <span className="hl-field-label">Role</span>

                      <input
                        value={role}
                        onChange={(event) => setRole(event.target.value)}
                        placeholder="e.g. Senior Data Engineer"
                      />
                    </label>

                    <label className="hl-field">
                      <span className="hl-field-label">
                        Job description
                      </span>

                      <textarea
                        rows={6}
                        value={jobDescription}
                        onChange={(event) =>
                          setJobDescription(event.target.value)
                        }
                        placeholder="Describe the skills and experience needed…"
                      />
                    </label>

                    <div className="hl-match-button">
                      <Button
                        variant="primary"
                        style={{ width: '100%' }}
                        onClick={runMatch}
                        disabled={
                          !role.trim() || !jobDescription.trim()
                        }
                      >
                        <svg
                          width="17"
                          height="17"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                        >
                          <path d="M13 2 3 14h9l-1 8 10-12h-9z" />
                        </svg>

                        <span>
                          {matchMode === 'best'
                            ? 'Find best resume match'
                            : 'Check compatibility'}
                        </span>
                      </Button>
                    </div>
                  </div>

                  <div className="hl-result-panel">
                    <div className="hl-result-heading">
                      <div>
                        <div className="hl-panel-label">
                          02 · Signal
                        </div>

                        <h3 className="hl-panel-title">
                          Ranked candidates.
                        </h3>
                      </div>

                      {matchResult && (
                        <div className="hl-result-count">
                          {matchResult.length} candidates
                        </div>
                      )}
                    </div>

                    {!matchResult && (
                      <div className="hl-empty-state">
                        <div>
                          <div className="hl-empty-icon">
                            <svg
                              width="21"
                              height="21"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.7"
                            >
                              <circle cx="11" cy="11" r="7" />
                              <path d="m20 20-4-4" />
                            </svg>
                          </div>

                          <div className="hl-empty-title">
                            Your shortlist starts here.
                          </div>

                          <p className="hl-empty-copy">
                            Enter a role and run a match to see candidates
                            ranked by the evidence they share with the role.
                          </p>
                        </div>
                      </div>
                    )}

                    {matchResult && (
                      <div className="hl-results">
                        {matchResult.map((candidate, index) => (
                          <div
                            className={`hl-result-card ${
                              index === 0 ? 'top' : ''
                            }`}
                            key={candidate.id}
                          >
                            <div className="hl-result-top">
                              <div className="hl-result-person">
                                <div className="hl-result-rank">
                                  #{index + 1}
                                </div>

                                <div>
                                  <div className="hl-result-name">
                                    {candidate.name}
                                  </div>

                                  <div className="hl-result-role">
                                    {candidate.title}
                                  </div>
                                </div>
                              </div>

                              <div className="hl-result-score">
                                {candidate.score}% match
                              </div>
                            </div>

                            <div className="hl-reasoning">
                              <strong>
                                Compatibility analysis:
                              </strong>{' '}
                              {candidate.evidence.length
                                ? `Matched ${candidate.evidence.join(
                                    ', '
                                  )} to this role.`
                                : 'No direct skill terms were found; review this candidate manually.'}

                              <div className="hl-evidence">
                                {candidate.evidence.length ? (
                                  candidate.evidence.map((term) => (
                                    <span
                                      className="hl-evidence-tag"
                                      key={term}
                                    >
                                      ✓ {term}
                                    </span>
                                  ))
                                ) : (
                                  <span className="hl-evidence-tag">
                                    Needs human review
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="hl-trust-strip">
                  <div className="hl-trust-item">
                    <span className="hl-trust-number">
                      Semantic
                    </span>
                    <span className="hl-trust-label">
                      Meaning over keywords
                    </span>
                  </div>

                  <div className="hl-trust-item">
                    <span className="hl-trust-number">
                      Explainable
                    </span>
                    <span className="hl-trust-label">
                      Evidence behind every result
                    </span>
                  </div>

                  <div className="hl-trust-item">
                    <span className="hl-trust-number">
                      Scoped
                    </span>
                    <span className="hl-trust-label">
                      Results protected by auth boundaries
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}