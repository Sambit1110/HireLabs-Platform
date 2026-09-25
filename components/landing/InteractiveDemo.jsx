'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Button } from '../ui/Button';
import { ProfileJson } from './ProfileJson';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useResumeProcessing, RESUME_CONCURRENCY } from '@/hooks/useResumeProcessing';
import { useResumeMatching } from '@/hooks/useResumeMatching';
import { useAiAnalysis } from '@/hooks/useAiAnalysis';
import { SAMPLE_CANDIDATES, toCandidate } from '@/lib/resume/candidates';
import { MAX_BATCH_FILES } from '@/lib/resume/validation';

const JOB_STATUS_LABELS = {
  queued: 'Queued',
  uploading: 'Uploading',
  processing: 'Parsing',
  completed: 'Done',
  failed: 'Failed',
};

export function InteractiveDemo({ onAuthRequired }) {
  const [activeTab, setActiveTab] = useState('parser');
  const [selectedResume, setSelectedResume] = useState('alex');
  const [role, setRole] = useState('Full-Stack AI Engineer');
  const [jobDescription, setJobDescription] = useState(
    'Looking for an engineer experienced in Next.js, React, Supabase, PostgreSQL, pgvector and Gemini embeddings.'
  );
  const [matchMode, setMatchMode] = useState('best');
  const [matchEnabled, setMatchEnabled] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [now, setNow] = useState(() => Date.now());

  const sectionRef = useRef(null);
  const fileInputRef = useRef(null);

  const { user } = useAuthSession();

  const handleResumeReady = useCallback((resume) => {
    setSelectedResume(`uploaded-${resume.id}`);
  }, []);

  const library = useResumeProcessing({
    user,
    onAuthRequired,
    onResumeReady: handleResumeReady,
  });

  const ai = useAiAnalysis({ user, onAuthRequired });

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  // Re-evaluate "stalled" processing rows periodically so Retry can appear.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const defaultCandidates = SAMPLE_CANDIDATES;

  const uploadedCandidates = useMemo(
    () => library.resumes.map((row) => toCandidate(row, now)),
    [library.resumes, now]
  );

  const candidates = useMemo(
    () => [...SAMPLE_CANDIDATES, ...uploadedCandidates],
    [uploadedCandidates]
  );

  const activeCandidate =
    candidates.find((candidate) => candidate.id === selectedResume) ||
    candidates[0];

  // Local scoring only: no auth or network calls while typing.
  const match = useResumeMatching({
    enabled: matchEnabled && Boolean(user),
    candidates,
    role,
    jobDescription,
    mode: matchMode,
    selectedId: selectedResume,
  });
  const matchResult = match?.results ?? null;

  const runMatch = () => {
    if (!user) {
      onAuthRequired?.();
      return;
    }
    setMatchEnabled(true);
  };

  const aiContext = { role, jobDescription };
  const runAiRoleBrief = () => ai.analyzeRole(aiContext);
  const runAiCandidateAnalysis = (candidate) => ai.analyzeCandidates([candidate], aiContext);
  const topCandidates = (matchResult || []).filter((candidate) => !candidate.profilePending).slice(0, 3);
  const runAiTopCandidates = () => ai.analyzeCandidates(topCandidates, aiContext);

  const analyzedIds = Object.keys(ai.insights);
  const focusedInsight = ai.focusedId ? ai.insights[ai.focusedId] : null;
  const aiInsight = focusedInsight?.status === 'completed' ? focusedInsight.result : null;
  const isRoleBriefLoading = ai.roleBrief.status === 'loading';
  const aiRoleBrief = ai.roleBrief.result;
  const aiPanelVisible = ai.roleBrief.status !== 'idle' || analyzedIds.length > 0;

  const uploadNotice = library.notice;
  const isBusy = library.isLoading || library.isClearing;
  const { jobs, jobSummary } = library;
  const stageReached = (statuses) => jobs.some((job) => statuses.includes(job.status));

  const handleDrop = (event) => {
    event.preventDefault();
    void library.uploadFiles(event.dataTransfer.files);
  };

  const clearUploadedResumes = async () => {
    if (library.isClearing) return;

    if (library.isProcessing) {
      library.setNotice({ tone: 'error', text: 'Wait for the current batch to finish before clearing.' });
      return;
    }

    if (!library.resumes.length) {
      library.setNotice({ tone: 'neutral', text: 'There are no uploaded resumes to clear.' });
      return;
    }

    const count = library.resumes.length;
    const confirmed = window.confirm(
      `Clear all ${count} uploaded resume${count === 1 ? '' : 's'}? This will permanently remove them from your private resume library.`
    );

    if (!confirmed) return;

    await library.clearAll();
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
        >
          <circle
            cx="11"
            cy="11"
            r="8"
          />

          <line
            x1="21"
            y1="21"
            x2="16.65"
            y2="16.65"
          />
        </svg>
      ),
    },
  ];

  const switchTab = (tab) => {
    setIsInteractive(false);

    requestAnimationFrame(() => {
      setActiveTab(tab);

      requestAnimationFrame(() => {
        setIsInteractive(true);
      });
    });
  };

  return (
    <section
      ref={sectionRef}
      className={`hl-demo-section ${
        isInteractive
          ? 'hl-demo-interactive'
          : ''
      } ${
        isVisible
          ? 'hl-demo-visible'
          : ''
      }`}
      id="demo"
    >
      <style>{`
        /* =====================================================
           MAIN SECTION
           ===================================================== */

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

          padding:
            175px 0
            185px;

          background:
            linear-gradient(
              180deg,
              var(--cream) 0%,
              #F3EEE4 100%
            );

          color:
            var(--espresso);

          overflow: hidden;
        }

        .hl-demo-section *,
        .hl-demo-section *::before,
        .hl-demo-section *::after {
          box-sizing: border-box;
        }


        /* =====================================================
           HERO → DEMO CONTINUITY
           ===================================================== */

        .hl-demo-section::before {
          content: '';

          position: absolute;

          top: 0;
          left: 50%;

          width: 1px;
          height: 150px;

          transform:
            translateX(-50%)
            scaleY(0);

          transform-origin:
            top center;

          background:
            linear-gradient(
              to bottom,
              rgba(
                111,
                125,
                85,
                0
              ),
              rgba(
                111,
                125,
                85,
                0.42
              ),
              rgba(
                111,
                125,
                85,
                0
              )
            );

          transition:
            transform 1.2s
            cubic-bezier(
              0.16,
              1,
              0.3,
              1
            );

          z-index: 1;

          pointer-events:
            none;
        }

        .hl-demo-section.hl-demo-visible::before {
          transform:
            translateX(-50%)
            scaleY(1);
        }


        /* =====================================================
           AMBIENT BACKGROUND RINGS
           ===================================================== */

        .hl-demo-section .hl-demo-ambient-ring {
          position: absolute;

          border-radius: 50%;

          border:
            1px solid
            rgba(
              111,
              125,
              85,
              0.08
            );

          pointer-events: none;
        }

        .hl-demo-section .hl-demo-ambient-ring.one {
          width: 780px;
          height: 780px;

          right: -390px;
          top: 4%;
        }

        .hl-demo-section .hl-demo-ambient-ring.two {
          width: 500px;
          height: 500px;

          left: -300px;
          bottom: 4%;

          border-style: dashed;
        }


        /* =====================================================
           SHELL
           ===================================================== */

        .hl-demo-shell {
          position: relative;

          z-index: 2;

          width:
            min(
              1180px,
              calc(100% - 48px)
            );

          margin: 0 auto;
        }


        /* =====================================================
           CONTINUATION LABEL
           ===================================================== */

        .hl-demo-shell::before {
          content:
            'THE SIGNAL CONTINUES';

          display: block;

          width: fit-content;

          margin:
            0 auto 38px;

          padding:
            8px 11px;

          border:
            1px solid
            var(--border);

          border-radius:
            999px;

          background:
            rgba(
              255,
              255,
              255,
              0.58
            );

          color:
            var(--olive-dark);

          font-size:
            8px;

          line-height: 1;

          font-weight:
            900;

          letter-spacing:
            0.14em;

          text-transform:
            uppercase;

          opacity: 0;

          transform:
            translate3d(
              0,
              22px,
              0
            );

          transition:
            opacity 800ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),

            transform 900ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }

        .hl-demo-section.hl-demo-visible
          .hl-demo-shell::before {
          opacity: 1;

          transform:
            translate3d(
              0,
              0,
              0
            );
        }


        /* =====================================================
           HEADING
           ===================================================== */

        .hl-demo-heading {
          max-width: 820px;

          margin-top: 12px;

          margin-bottom: 58px;

          opacity: 0;

          transform:
            translate3d(
              0,
              38px,
              0
            );

          animation: none;
        }

        .hl-demo-section.hl-demo-visible
          .hl-demo-heading {
          animation:
            hlDemoHeadingIn
            1s
            cubic-bezier(
              0.16,
              1,
              0.3,
              1
            )
            180ms
            forwards;
        }

        @keyframes hlDemoHeadingIn {
          to {
            opacity: 1;

            transform:
              translate3d(
                0,
                0,
                0
              );
          }
        }

        .hl-demo-kicker {
          display: inline-flex;

          align-items: center;

          gap: 9px;

          margin-bottom: 18px;

          color:
            var(--olive-dark);

          font-size: 10px;

          font-weight: 800;

          line-height: 1;

          letter-spacing: 0.15em;

          text-transform: uppercase;
        }

        .hl-demo-kicker-dot {
          width: 7px;
          height: 7px;

          border-radius: 999px;

          background:
            var(--olive);

          box-shadow:
            0 0 0 4px
            rgba(
              111,
              125,
              85,
              0.12
            );
        }

        .hl-demo-title {
          margin: 0;

          max-width: 790px;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            clamp(
              50px,
              6vw,
              80px
            );

          line-height: 0.95;

          letter-spacing: -0.055em;

          font-weight: 500;
        }

        .hl-demo-title em {
          color:
            var(--olive);

          font-style: italic;
        }

        .hl-demo-description {
          max-width: 660px;

          margin:
            25px 0 0;

          color:
            var(--espresso-soft);

          font-size: 16px;

          line-height: 1.7;
        }


        /* =====================================================
           TABS
           ===================================================== */

        .hl-demo-tabs {
          display: inline-flex;

          align-items: center;

          gap: 4px;

          padding: 5px;

          margin-bottom: 27px;

          border:
            1px solid
            var(--border);

          border-radius: 999px;

          background:
            rgba(
              255,
              255,
              255,
              0.55
            );

          opacity: 0;

          transform:
            translate3d(
              0,
              24px,
              0
            );

          animation: none;
        }

        .hl-demo-section.hl-demo-visible
          .hl-demo-tabs {
          animation:
            hlDemoTabsIn
            850ms
            cubic-bezier(
              0.16,
              1,
              0.3,
              1
            )
            390ms
            forwards;
        }

        @keyframes hlDemoTabsIn {
          to {
            opacity: 1;

            transform:
              translate3d(
                0,
                0,
                0
              );
          }
        }

        .hl-demo-tab {
          display: inline-flex;

          align-items: center;

          justify-content: center;

          gap: 8px;

          min-height: 42px;

          padding:
            0 17px;

          border: 0;

          border-radius: 999px;

          background: transparent;

          color: #776E65;

          font-size: 12px;

          font-weight: 800;

          cursor: pointer;

          transition:
            background 250ms ease,
            color 250ms ease,
            transform 250ms ease;
        }

        .hl-demo-tab:hover {
          color:
            var(--espresso);

          transform:
            translateY(-1px);
        }

        .hl-demo-tab.active {
          background:
            var(--espresso);

          color:
            var(--cream);

          box-shadow:
            0 10px 25px
            rgba(
              33,
              28,
              24,
              0.12
            );
        }


        /* =====================================================
           MAIN DEMO CARD
           ===================================================== */

        .hl-demo-card {
          border:
            1px solid
            var(--border);

          border-radius: 30px;

          padding: 1px;

          background:
            rgba(
              255,
              255,
              255,
              0.42
            );

          box-shadow:
            0 35px 95px
            rgba(
              46,
              40,
              34,
              0.085
            );

          opacity: 0;

          transform:
            translate3d(
              0,
              48px,
              0
            )
            scale(
              0.975
            );

          animation: none;
        }

        .hl-demo-section.hl-demo-visible
          .hl-demo-card {
          animation:
            hlDemoCardIn
            1.2s
            cubic-bezier(
              0.16,
              1,
              0.3,
              1
            )
            560ms
            forwards;
        }

        @keyframes hlDemoCardIn {
          to {
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
        }

        .hl-demo-inner {
          border-radius: 29px;

          background:
            rgba(
              255,
              255,
              255,
              0.75
            );

          overflow: hidden;
        }


        /* =====================================================
           TOOLBAR
           ===================================================== */

        .hl-demo-toolbar {
          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 20px;

          min-height: 68px;

          padding:
            0 25px;

          border-bottom:
            1px solid
            var(--border);
        }

        .hl-demo-toolbar-title {
          display: flex;

          align-items: center;

          gap: 10px;

          font-size: 12px;

          font-weight: 800;
        }

        .hl-demo-toolbar-title > span:first-child {
          width: 30px;
          height: 30px;

          display: grid;

          place-items: center;

          border-radius: 10px;

          background:
            var(--espresso);

          color:
            var(--cream);
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

          background:
            var(--olive);

          box-shadow:
            0 0 0 4px
            rgba(
              111,
              125,
              85,
              0.08
            );
        }


        /* =====================================================
           PARSER LAYOUT
           ===================================================== */

        .hl-demo-grid {
          display: grid;

          grid-template-columns:
            minmax(
              0,
              0.82fr
            )
            minmax(
              0,
              1.18fr
            );

          min-height: 610px;
        }

        .hl-demo-panel {
          padding: 30px;
        }

        .hl-demo-panel + .hl-demo-panel {
          border-left:
            1px solid
            var(--border);
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

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size: 28px;

          line-height: 1.05;

          font-weight: 500;

          letter-spacing: -0.035em;
        }

        .hl-panel-copy {
          max-width: 470px;

          margin:
            11px 0 27px;

          color:
            var(--espresso-soft);

          font-size: 12px;

          line-height: 1.65;
        }


        /* =====================================================
           SAMPLE RESUMES
           ===================================================== */

        .hl-sample-list {
          display: flex;

          flex-wrap: wrap;

          gap: 7px;

          margin-bottom: 24px;
        }

        .hl-sample-button {
          padding:
            9px 12px;

          border:
            1px solid
            var(--border);

          border-radius: 999px;

          background:
            rgba(
              255,
              255,
              255,
              0.82
            );

          color: #655D54;

          font-size: 9px;

          font-weight: 800;

          cursor: pointer;

          transition:
            border-color 180ms ease,
            background 180ms ease,
            color 180ms ease,
            transform 180ms ease;
        }

        .hl-sample-button:hover {
          transform:
            translateY(-1px);

          border-color:
            var(--taupe);

          color:
            var(--espresso);
        }

        .hl-sample-button.active {
          border-color:
            var(--espresso);

          background:
            var(--espresso);

          color:
            var(--cream);
        }

        .hl-sample-divider {
          flex-basis: 100%;
          margin-top: 4px;
          color: #8A8177;
          font-size: 8px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .hl-clear-resumes-button {
          border: 1px solid #D8D0C2;
          border-radius: 999px;
          background: #F8F5EE;
          color: #756C63;
          padding: 6px 9px;
          font-size: 8px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 180ms ease, border-color 180ms ease, color 180ms ease, transform 180ms ease;
        }

        .hl-clear-resumes-button:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: #BCAFA0;
          background: #F0EBE1;
          color: #211C18;
        }

        .hl-clear-resumes-button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .hl-uploaded-sample {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .hl-sample-loading {
          flex-basis: 100%;
          color: #8A8177;
          font-size: 9px;
        }


        /* =====================================================
           DROPZONE
           ===================================================== */

        .hl-dropzone {
          display: flex;

          align-items: center;

          gap: 16px;

          min-height: 150px;

          padding: 23px;

          border:
            1px dashed
            #BFB6A7;

          border-radius: 21px;

          background:
            #FAF8F3;

          cursor: pointer;

          transition:
            transform 300ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),

            border-color 250ms ease,

            background 250ms ease,

            box-shadow 300ms ease;
        }

        .hl-dropzone:hover {
          transform:
            translateY(-3px);

          border-color:
            var(--olive);

          background:
            #F7F4EC;

          box-shadow:
            0 18px 40px
            rgba(
              52,
              45,
              38,
              0.06
            );
        }

        .hl-drop-icon {
          width: 49px;
          height: 49px;

          flex: 0 0 49px;

          display: grid;

          place-items: center;

          border-radius: 15px;

          background:
            var(--espresso);

          color:
            var(--cream);

          transition:
            transform 300ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }

        .hl-dropzone:hover
          .hl-drop-icon {
          transform:
            translateY(-2px)
            rotate(-2deg);
        }

        .hl-upload-title {
          color:
            var(--espresso);

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
          margin:
            11px 0 0;

          color:
            var(--olive-dark);

          font-size: 10px;

          line-height: 1.5;

          font-weight: 700;
        }

        .hl-upload-status.error {
          color:
            #9A5948;
        }

        .hl-upload-status.neutral {
          color:
            #7E756C;
        }


        /* =====================================================
           PROCESSING PIPELINE
           ===================================================== */

        .hl-pipeline {
          margin-top: 25px;

          padding-top: 23px;

          border-top:
            1px solid
            var(--border);
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

          background:
            var(--olive);
        }

        .hl-pipeline-row {
          display: grid;

          grid-template-columns:
            repeat(
              4,
              1fr
            );

          gap: 8px;
        }

        .hl-pipeline-stage {
          min-height: 74px;

          padding: 12px;

          border:
            1px solid
            var(--border);

          border-radius: 15px;

          background:
            rgba(
              255,
              255,
              255,
              0.72
            );

          transition:
            transform 300ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),

            border-color 250ms ease,

            background 250ms ease;
        }

        .hl-pipeline-stage:hover {
          transform:
            translateY(-2px);
        }

        .hl-pipeline-stage.active {
          border-color:
            rgba(
              111,
              125,
              85,
              0.38
            );

          background:
            #F2F3EB;
        }

        .hl-pipeline-icon {
          display: block;

          margin-bottom: 9px;

          color:
            var(--olive-dark);

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


        /* =====================================================
           CODE PANEL
           ===================================================== */

        .hl-code-card {
          height: 100%;

          border-radius: 21px;

          overflow: hidden;

          background:
            var(--espresso);

          color:
            var(--cream);

          box-shadow:
            inset 0 1px
            rgba(
              255,
              255,
              255,
              0.03
            );
        }

        .hl-code-top {
          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 15px;

          min-height: 60px;

          padding:
            0 18px;

          border-bottom:
            1px solid
            rgba(
              245,
              241,
              232,
              0.1
            );
        }

        .hl-code-file {
          display: flex;

          align-items: center;

          gap: 8px;

          color:
            #D9D2C7;

          font-size: 10px;

          font-family:
            'SFMono-Regular',
            Consolas,
            monospace;
        }

        .hl-code-dot {
          width: 6px;
          height: 6px;

          border-radius: 50%;

          background:
            #A9B686;

          box-shadow:
            0 0 10px
            rgba(
              169,
              182,
              134,
              0.18
            );
        }

        .hl-code-model {
          padding:
            7px 10px;

          border:
            1px solid
            rgba(
              245,
              241,
              232,
              0.12
            );

          border-radius: 999px;

          color:
            #BDB5AA;

          font-size: 8px;

          font-weight: 800;

          letter-spacing: 0.05em;

          text-transform: uppercase;
        }

        .hl-code-content {
          height:
            calc(
              100% - 60px
            );

          padding: 22px;

          overflow: auto;
        }

        .hl-code-content pre {
          margin: 0;

          color:
            #DDD6CB;

          font-size: 10px;

          line-height: 1.75;

          font-family:
            'SFMono-Regular',
            Consolas,
            monospace;

          white-space: pre-wrap;

          overflow-wrap:
            anywhere;
        }

        .hl-code-key {
          color:
            #BFCB9F;
        }

        .hl-code-string {
          color:
            #E8D6BD;
        }

        .hl-code-number {
          color:
            #C8B99E;
        }

        .hl-vector-box {
          margin-top: 22px;

          padding: 17px;

          border:
            1px solid
            rgba(
              245,
              241,
              232,
              0.12
            );

          border-radius: 16px;

          background:
            rgba(
              255,
              255,
              255,
              0.04
            );

          transition:
            transform 350ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),

            background 250ms ease;
        }

        .hl-vector-box:hover {
          transform:
            translateY(-2px);

          background:
            rgba(
              255,
              255,
              255,
              0.055
            );
        }

        .hl-vector-label {
          margin-bottom: 8px;

          color:
            #8F897F;

          font-size: 8px;

          font-weight: 800;

          letter-spacing: 0.13em;

          text-transform: uppercase;
        }

        .hl-vector-value {
          color:
            #CBC3B8;

          font-size: 9px;

          line-height: 1.6;

          font-family:
            'SFMono-Regular',
            Consolas,
            monospace;
        }

        .hl-vector-meta {
          display: flex;

          flex-wrap: wrap;

          gap: 7px;

          margin-top: 13px;
        }

        .hl-mini-pill {
          padding:
            7px 9px;

          border-radius: 999px;

          background:
            rgba(
              111,
              125,
              85,
              0.17
            );

          color:
            #B9C69C;

          font-size: 8px;

          font-weight: 800;
        }


        /* =====================================================
           TAB TRANSITION
           ===================================================== */

        .hl-demo-transition {
          animation:
            hlDemoContentIn
            650ms
            cubic-bezier(
              0.16,
              1,
              0.3,
              1
            );
        }

        @keyframes hlDemoContentIn {
          from {
            opacity: 0;

            transform:
              translate3d(
                0,
                14px,
                0
              )
              scale(
                0.995
              );
          }

          to {
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
        }


        /* =====================================================
           MATCHER
           ===================================================== */

        .hl-match-layout {
          display: grid;

          grid-template-columns:
            0.82fr
            1.18fr;

          min-height: 600px;
        }

        .hl-form-panel {
          padding: 30px;
        }

        .hl-result-panel {
          padding: 30px;

          border-left:
            1px solid
            var(--border);

          background:
            rgba(
              250,
              248,
              243,
              0.45
            );
        }

        .hl-toggle {
          display: inline-flex;

          gap: 3px;

          padding: 4px;

          margin:
            4px 0 24px;

          border-radius: 999px;

          border:
            1px solid
            var(--border);

          background:
            #F7F3EA;
        }

        .hl-toggle button {
          border: 0;

          border-radius: 999px;

          padding:
            9px 12px;

          background: transparent;

          color: #81786F;

          font-size: 9px;

          font-weight: 800;

          cursor: pointer;

          transition:
            background 200ms ease,
            color 200ms ease,
            transform 200ms ease;
        }

        .hl-toggle button:hover {
          transform:
            translateY(-1px);
        }

        .hl-toggle button.active {
          background:
            var(--espresso);

          color:
            var(--cream);
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

          border:
            1px solid
            var(--border);

          border-radius: 14px;

          background:
            rgba(
              255,
              255,
              255,
              0.88
            );

          color:
            var(--espresso);

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

          padding:
            0 13px;
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
          border-color:
            var(--olive);

          box-shadow:
            0 0 0 4px
            rgba(
              111,
              125,
              85,
              0.09
            );
        }

        .hl-match-button {
          width: 100%;

          margin-top: 21px;
        }


        /* =====================================================
           RESULTS
           ===================================================== */

        .hl-result-heading {
          display: flex;

          align-items: flex-end;

          justify-content:
            space-between;

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

        .hl-result-view-switcher {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.6);
        }

        .hl-result-view-button {
          border: 0;
          border-radius: 999px;
          padding: 8px 11px;
          background: transparent;
          color: #81786F;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: background 200ms ease, color 200ms ease, transform 200ms ease;
        }

        .hl-result-view-button:hover {
          transform: translateY(-1px);
        }

        .hl-result-view-button.active {
          background: var(--espresso);
          color: var(--cream);
          box-shadow: 0 8px 18px rgba(33, 28, 24, 0.12);
        }

        .hl-results-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 16px;
        }

        .hl-results-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (min-width: 1280px) {
          .hl-results-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        .hl-empty-state {
          min-height: 390px;

          display: grid;

          place-items: center;

          text-align: center;

          border:
            1px dashed
            #CEC6B8;

          border-radius: 20px;

          background:
            rgba(
              255,
              255,
              255,
              0.44
            );

          padding: 34px;
        }

        .hl-empty-icon {
          width: 52px;
          height: 52px;

          margin:
            0 auto
            15px;

          display: grid;

          place-items: center;

          border-radius: 17px;

          background:
            #ECE8DE;

          color:
            var(--olive-dark);
        }

        .hl-empty-title {
          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size: 22px;

          letter-spacing:
            -0.03em;
        }

        .hl-empty-copy {
          max-width: 330px;

          margin:
            8px auto 0;

          color:
            #847B72;

          font-size: 11px;

          line-height: 1.6;
        }

        .hl-results {
          display: grid;

          gap: 12px;
        }

        .hl-result-card {
          padding: 18px;

          border:
            1px solid
            var(--border);

          border-radius: 18px;

          background:
            rgba(
              255,
              255,
              255,
              0.86
            );

          opacity: 0;

          transform:
            translate3d(
              0,
              15px,
              0
            );

          animation:
            hlResultIn
            650ms
            cubic-bezier(
              0.16,
              1,
              0.3,
              1
            )
            forwards;

          transition:
            transform 250ms ease,
            box-shadow 250ms ease;
        }

        .hl-result-card:nth-child(1) {
          animation-delay:
            100ms;
        }

        .hl-result-card:nth-child(2) {
          animation-delay:
            180ms;
        }

        .hl-result-card:nth-child(3) {
          animation-delay:
            260ms;
        }

        @keyframes hlResultIn {
          to {
            opacity: 1;

            transform:
              translate3d(
                0,
                0,
                0
              );
          }
        }

        .hl-result-card:hover {
          transform:
            translateY(-3px);

          box-shadow:
            0 16px 38px
            rgba(
              45,
              40,
              34,
              0.065
            );
        }

        .hl-result-card.top {
          border-color:
            rgba(
              111,
              125,
              85,
              0.44
            );

          box-shadow:
            0 14px 35px
            rgba(
              67,
              74,
              53,
              0.08
            );
        }

        .hl-result-top {
          display: flex;

          align-items: center;

          justify-content:
            space-between;

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

          background:
            #F0ECE3;

          color:
            #71685F;

          font-size: 9px;

          font-weight: 800;
        }

        .hl-result-name {
          color:
            var(--espresso);

          font-size: 13px;

          line-height: 1.35;

          font-weight: 800;
        }

        .hl-result-role {
          margin-top: 3px;

          color:
            #857C73;

          font-size: 9px;

          line-height: 1.4;
        }

        .hl-result-score {
          flex-shrink: 0;

          min-width: 88px;
          text-align: center;
          padding: 8px 10px;

          border-radius: 999px;

          background: #EDF1E5;

          color: var(--olive-dark);

          font-size: 10px;

          font-weight: 900;
        }

        .hl-result-score.pending {
          background: #F1EEE7;
          color: #7D756C;
        }

        .hl-reasoning {
          margin-top: 15px;
          padding: 14px;
          border: 1px solid rgba(94, 85, 76, 0.07);
          border-radius: 15px;
          background: #F7F4ED;
          color: #6E665D;
          font-size: 10px;
          line-height: 1.65;
        }

        .hl-analysis-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 7px;
        }

        .hl-analysis-label {
          color: var(--espresso);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .hl-analysis-meta {
          color: #8A8177;
          font-size: 8px;
          font-weight: 800;
        }

        .hl-analysis-copy {
          margin: 0;
        }

        .hl-analysis-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 12px;
        }

        .hl-analysis-block {
          padding: 10px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.62);
        }

        .hl-analysis-block-title {
          margin-bottom: 7px;
          color: #8A8177;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .hl-evidence {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .hl-evidence-tag {
          padding: 6px 8px;
          border-radius: 999px;
          background: #EDEFE5;
          color: var(--olive-dark);
          font-size: 8px;
          font-weight: 800;
        }

        .hl-evidence-tag.missing {
          background: #F1ECE4;
          color: #746B62;
        }

        .hl-evidence-tag.pending {
          background: #ECE8DE;
          color: #756D63;
        }

        .hl-analysis-bar {
          height: 6px;
          margin-top: 11px;
          overflow: hidden;
          border-radius: 999px;
          background: #E7E1D7;
        }

        .hl-analysis-fill {
          height: 100%;
          border-radius: inherit;
          background: var(--olive);
          transition: width 500ms ease;
        }


        .hl-ai-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: 9px;
        }

        .hl-ai-secondary,
        .hl-ai-card-button {
          min-height: 40px;
          padding: 0 12px;
          border: 1px solid var(--border);
          border-radius: 11px;
          background: #FAF8F3;
          color: var(--olive-dark);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: transform 180ms ease, background 180ms ease, border-color 180ms ease;
        }

        .hl-ai-secondary:hover,
        .hl-ai-card-button:hover {
          transform: translateY(-1px);
          background: var(--white);
          border-color: var(--taupe);
        }

        .hl-ai-secondary:disabled,
        .hl-ai-card-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
          transform: none;
        }

        .hl-result-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 10px;
        }

        .hl-ai-card-button {
          min-height: 34px;
          font-size: 7px;
        }

        .hl-ai-panel {
          margin-top: 20px;
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.6);
        }

        .hl-ai-panel-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .hl-ai-badge {
          padding: 7px 10px;
          border: 1px solid #D9DDC8;
          border-radius: 999px;
          background: #F0F2E8;
          color: var(--olive-dark);
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .hl-ai-error {
          margin-top: 12px;
          padding: 10px 11px;
          border-radius: 11px;
          background: #F3E9E1;
          color: #805B4D;
          font-size: 9px;
          line-height: 1.55;
        }

        .hl-ai-role-grid,
        .hl-ai-candidate-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .hl-ai-summary,
        .hl-ai-column {
          padding: 12px;
          border-radius: 13px;
          background: #F7F4ED;
        }

        .hl-ai-column.full {
          grid-column: 1 / -1;
        }

        .hl-ai-section-label {
          margin-bottom: 7px;
          color: #8A8177;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .hl-ai-summary p {
          margin: 0;
          color: #655E56;
          font-size: 10px;
          line-height: 1.6;
        }

        .hl-ai-seniority {
          display: inline-flex;
          margin-top: 10px;
          padding: 6px 8px;
          border-radius: 999px;
          background: #EBEEE2;
          color: var(--olive-dark);
          font-size: 7px;
          font-weight: 900;
        }

        .hl-ai-chip-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .hl-ai-chip {
          padding: 6px 8px;
          border-radius: 999px;
          background: #EDEFE5;
          color: var(--olive-dark);
          font-size: 7px;
          font-weight: 800;
        }

        .hl-ai-chip.muted {
          background: #F0ECE4;
          color: #746B62;
        }

        .hl-ai-list {
          margin: 0;
          padding-left: 16px;
          color: #625B53;
          font-size: 9px;
          line-height: 1.65;
        }

        .hl-ai-verdict-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .hl-ai-verdict {
          display: inline-flex;
          padding: 6px 9px;
          border-radius: 999px;
          background: #ECE8DE;
          color: #746B62;
          font-size: 8px;
          font-weight: 900;
          text-transform: capitalize;
        }

        .hl-ai-verdict.strong {
          background: #E8EEDF;
          color: #596544;
        }

        .hl-ai-verdict.moderate {
          background: #EEF0E8;
          color: #677154;
        }

        .hl-ai-verdict.weak,
        .hl-ai-verdict.insufficient_evidence {
          background: #F1EAE2;
          color: #7A685A;
        }

        .hl-ai-confidence {
          color: #8A8177;
          font-size: 8px;
          font-weight: 800;
        }

        .hl-ai-recommendation {
          margin-top: 10px !important;
          font-weight: 800;
          color: var(--espresso) !important;
        }

        .hl-ai-questions {
          display: grid;
          gap: 8px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .hl-ai-questions li {
          display: grid;
          grid-template-columns: 22px 1fr;
          gap: 8px;
          align-items: start;
          color: #625B53;
          font-size: 9px;
          line-height: 1.6;
        }

        .hl-ai-questions li > span {
          display: grid;
          place-items: center;
          width: 22px;
          height: 22px;
          border-radius: 8px;
          background: #ECEFE5;
          color: var(--olive-dark);
          font-size: 7px;
          font-weight: 900;
        }

        /* =====================================================
           TRUST STRIP
           ===================================================== */

        .hl-trust-strip {
          display: grid;

          grid-template-columns:
            repeat(
              3,
              1fr
            );

          border-top:
            1px solid
            var(--border);

          background:
            rgba(
              255,
              255,
              255,
              0.35
            );
        }

        .hl-trust-item {
          padding:
            21px 24px;

          border-right:
            1px solid
            var(--border);
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

          color:
            #837A70;

          font-size: 8px;

          line-height: 1.4;

          letter-spacing: 0.09em;

          text-transform:
            uppercase;
        }


        /* =====================================================
           TABLET
           ===================================================== */

        @media (max-width: 980px) {
          .hl-demo-grid,
          .hl-match-layout {
            grid-template-columns:
              1fr;
          }

          .hl-demo-panel
            + .hl-demo-panel,
          .hl-result-panel {
            border-left: 0;

            border-top:
              1px solid
              var(--border);
          }

          .hl-demo-grid,
          .hl-match-layout {
            min-height: 0;
          }
        }


        /* =====================================================
           MOBILE
           ===================================================== */

        @media (max-width: 680px) {
          .hl-demo-section {
            padding:
              110px 0
              125px;
          }

          .hl-demo-shell {
            width:
              min(
                100% - 28px,
                1180px
              );
          }

          .hl-demo-section::before {
            height:
              95px;
          }

          .hl-demo-shell::before {
            margin-bottom:
              27px;
          }

          .hl-demo-heading {
            margin-top:
              5px;

            margin-bottom:
              44px;
          }

          .hl-demo-title {
            font-size:
              clamp(
                44px,
                13vw,
                66px
              );
          }

          .hl-demo-description {
            font-size: 14px;
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
            padding:
              0 17px;
          }

          .hl-demo-status {
            display: none;
          }

          .hl-demo-panel,
          .hl-form-panel,
          .hl-result-panel {
            padding: 20px;
          }

          .hl-pipeline-row {
            grid-template-columns:
              repeat(
                2,
                1fr
              );
          }

          .hl-trust-strip {
            grid-template-columns:
              1fr;
          }

          .hl-trust-item {
            border-right: 0;

            border-bottom:
              1px solid
              var(--border);
          }

          .hl-trust-item:last-child {
            border-bottom: 0;
          }

          .hl-result-top {
            align-items:
              flex-start;
          }

          .hl-result-score {
            font-size: 9px;
          }
        }


        /* =====================================================
           REDUCED MOTION
           ===================================================== */

        @media (
          prefers-reduced-motion: reduce
        ) {
          .hl-demo-heading,
          .hl-demo-tabs,
          .hl-demo-card,
          .hl-result-card,
          .hl-demo-shell::before,
          .hl-demo-section::before {
            animation: none !important;

            opacity: 1 !important;

            transform:
              none !important;

            transition: none !important;
          }

          .hl-dropzone,
          .hl-drop-icon,
          .hl-pipeline-stage,
          .hl-vector-box,
          .hl-result-card {
            transition: none !important;
          }
        }

        /* =====================================================
           BATCH JOBS, RESUME STATUS, REQUIREMENTS, AI TABS
           ===================================================== */

        .hl-resume-status {
          flex-shrink: 0;
          padding: 5px 7px;
          border-radius: 999px;
          background: #ECE8DE;
          color: #756D63;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .hl-resume-status.failed {
          background: #F4E6E1;
          color: #9A5948;
        }

        .hl-resume-status.processing {
          background: #EDEFE5;
          color: var(--olive-dark);
        }

        .hl-job-list {
          display: grid;
          gap: 7px;
          margin-top: 11px;
        }

        .hl-job {
          padding: 8px 10px;
          border: 1px solid var(--border);
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.55);
        }

        .hl-job-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: 9px;
          font-weight: 800;
          color: #3A332D;
        }

        .hl-job-name {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .hl-job-status {
          flex-shrink: 0;
          color: #7E756C;
          font-size: 8px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .hl-job.completed .hl-job-status {
          color: var(--olive-dark);
        }

        .hl-job.failed .hl-job-status,
        .hl-job-error {
          color: #9A5948;
        }

        .hl-job-bar {
          height: 4px;
          margin-top: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: #E7E1D7;
        }

        .hl-job-fill {
          height: 100%;
          border-radius: inherit;
          background: var(--olive);
          transition: width 400ms ease;
        }

        .hl-job.failed .hl-job-fill {
          background: #C99A8C;
        }

        .hl-job-error {
          margin-top: 5px;
          font-size: 9px;
          line-height: 1.45;
        }

        .hl-job-dismiss {
          justify-self: start;
          border: 0;
          background: transparent;
          color: #7C736A;
          padding: 0;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        .hl-requirements {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          margin-bottom: 12px;
        }

        .hl-requirements-label {
          margin-right: 4px;
          color: #7E756C;
          font-size: 9px;
          font-weight: 800;
        }

        .hl-ai-privacy {
          margin: 10px 0 0;
          color: #857C72;
          font-size: 9px;
          line-height: 1.5;
        }

        .hl-ai-loading {
          margin-bottom: 12px;
          color: #7E756C;
          font-size: 10px;
          font-weight: 700;
        }

        .hl-ai-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin: 4px 0 14px;
        }

        .hl-ai-tab {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: #FAF8F3;
          color: #3A332D;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        .hl-ai-tab.active {
          border-color: var(--olive);
          background: var(--white);
        }

        .hl-ai-tab-state {
          color: #7E756C;
          font-size: 8px;
          text-transform: capitalize;
        }

        .hl-ai-tab.failed .hl-ai-tab-state {
          color: #9A5948;
        }
      `}</style>

      {/* =====================================================
          MAIN DEMO SHELL
          ===================================================== */}

      <div className="hl-demo-shell">

        {/* ===================================================
            INTRO
           =================================================== */}

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
            Upload a resume, inspect the structured profile
            HireLabs creates, then see how skill-based matching
            ranks candidates against a real role.
          </p>

        </div>


        {/* ===================================================
            TABS
           =================================================== */}

        <div className="hl-demo-tabs">

          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`hl-demo-tab ${
                activeTab === tab.id
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                switchTab(tab.id)
              }
              aria-pressed={
                activeTab === tab.id
              }
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}

        </div>


        {/* ===================================================
            DEMO CARD
           =================================================== */}

        <div
          className={`hl-demo-card ${
            isInteractive
              ? 'hl-demo-transition'
              : ''
          }`}
        >
          <div className="hl-demo-inner">

            {/* =================================================
                TOOLBAR
               ================================================= */}

            <div className="hl-demo-toolbar">

              <div className="hl-demo-toolbar-title">

                <span>

                  {activeTab ===
                  'parser' ? (

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
                      <circle
                        cx="11"
                        cy="11"
                        r="8"
                      />

                      <line
                        x1="21"
                        y1="21"
                        x2="16.65"
                        y2="16.65"
                      />
                    </svg>

                  )}

                </span>

                <span>

                  {activeTab ===
                  'parser'
                    ? 'Resume intelligence'
                    : 'Skill-based candidate matching'}

                </span>

              </div>


              <div className="hl-demo-status">

                <span className="hl-demo-status-dot" />

                Private workspace

              </div>

            </div>


            {/* =================================================
                PARSER TAB
               ================================================= */}

            {activeTab ===
              'parser' && (
              <div className="hl-demo-transition">

                <div className="hl-demo-grid">

                  {/* =========================================
                      LEFT PANEL
                     ========================================= */}

                  <div className="hl-demo-panel">

                    <div className="hl-panel-label">
                      01 · Source
                    </div>

                    <h3 className="hl-panel-title">
                      Give HireLabs a resume.
                    </h3>

                    <p className="hl-panel-copy">
                      Start with a sample profile or upload
                      your own PDF/DOCX. The file is saved to
                      your private resume library after
                      authentication.
                    </p>


                    {/* SAMPLE CANDIDATES */}

                    <div className="hl-sample-list">

                      {defaultCandidates.map((candidate) => (
                        <button
                          key={candidate.id}
                          type="button"
                          className={`hl-sample-button ${
                            selectedResume === candidate.id ? 'active' : ''
                          }`}
                          onClick={() => setSelectedResume(candidate.id)}
                        >
                          {candidate.name}
                        </button>
                      ))}

                      {uploadedCandidates.length > 0 && (
                        <>
                          <div
                            className="hl-sample-divider"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '10px',
                              width: '100%',
                            }}
                          >
                            <span>Your resumes</span>

                            <button
                              type="button"
                              className="hl-clear-resumes-button"
                              onClick={clearUploadedResumes}
                              disabled={isBusy || library.isProcessing}
                              title="Permanently remove all uploaded resumes"
                            >
                              Clear all
                            </button>
                          </div>

                          {uploadedCandidates.map((candidate) => (
                            <div
                              key={candidate.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                width: '100%',
                              }}
                            >
                              <button
                                type="button"
                                title={candidate.fileName}
                                className={`hl-sample-button hl-uploaded-sample ${
                                  selectedResume === candidate.id ? 'active' : ''
                                }`}
                                style={{ flex: 1, minWidth: 0 }}
                                onClick={() => setSelectedResume(candidate.id)}
                              >
                                {candidate.fileName}
                              </button>

                              {candidate.processingStatus !== 'completed' && (
                                <span
                                  className={`hl-resume-status ${candidate.processingStatus}`}
                                  title={candidate.parserError || undefined}
                                >
                                  {candidate.processingStatus === 'failed'
                                    ? 'Failed'
                                    : candidate.processingStatus === 'processing' && !candidate.stalled
                                      ? 'Parsing'
                                      : candidate.stalled
                                        ? 'Stalled'
                                        : 'Queued'}
                                </span>
                              )}

                              {(candidate.processingStatus === 'failed' || candidate.stalled) && (
                                <button
                                  type="button"
                                  className="hl-clear-resumes-button"
                                  disabled={isBusy}
                                  onClick={() => void library.retryResume(candidate.resumeId)}
                                  title="Retry parsing this resume"
                                >
                                  Retry
                                </button>
                              )}
                            </div>
                          ))}
                        </>
                      )}

                      {library.isLoading && (
                        <div className="hl-sample-loading">
                          Loading your saved resumes…
                        </div>
                      )}

                    </div>


                    {/* FILE INPUT */}

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      style={{
                        display: 'none',
                      }}
                      onChange={(event) => {
                        void library.uploadFiles(event.target.files);
                        event.target.value = '';
                      }}
                    />


                    {/* DROPZONE */}

                    <div
                      className="hl-dropzone"
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      onKeyDown={(
                        event
                      ) => {
                        if (
                          event.key ===
                            'Enter' ||
                          event.key === ' '
                        ) {
                          event.preventDefault();

                          fileInputRef.current?.click();
                        }
                      }}
                      onDragOver={(
                        event
                      ) =>
                        event.preventDefault()
                      }
                      onDrop={
                        handleDrop
                      }
                      aria-label="Upload one or more PDF or DOCX resumes"
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

                          {jobSummary.active
                            ? `Processing ${jobSummary.active} of ${jobSummary.total} resume${jobSummary.total === 1 ? '' : 's'}…`
                            : 'Drop resumes here'}

                        </div>


                        <div className="hl-upload-subtitle">

                          {`PDF or DOCX · max 5 MB each · up to ${MAX_BATCH_FILES} files, ${RESUME_CONCURRENCY} processed in parallel`}

                        </div>

                      </div>

                    </div>


                    {/* UPLOAD STATUS */}

                    {uploadNotice && (
                      <p
                        className={`hl-upload-status ${
                          uploadNotice.tone === 'error'
                            ? 'error'
                            : uploadNotice.tone === 'neutral'
                              ? 'neutral'
                              : ''
                        }`}
                        role="status"
                      >
                        {uploadNotice.text}
                      </p>
                    )}


                    {/* PER-FILE BATCH STATUS */}

                    {jobs.length > 0 && (
                      <div className="hl-job-list" aria-live="polite">
                        {jobs.map((job) => (
                          <div className={`hl-job ${job.status}`} key={job.id}>
                            <div className="hl-job-row">
                              <span className="hl-job-name" title={job.fileName}>
                                {job.fileName}
                              </span>
                              <span className="hl-job-status">
                                {JOB_STATUS_LABELS[job.status]}
                              </span>
                            </div>

                            <div className="hl-job-bar">
                              <div
                                className="hl-job-fill"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>

                            {job.error && (
                              <div className="hl-job-error">{job.error}</div>
                            )}
                          </div>
                        ))}

                        {!jobSummary.active && (
                          <button
                            type="button"
                            className="hl-job-dismiss"
                            onClick={library.dismissJobs}
                          >
                            Clear finished
                          </button>
                        )}
                      </div>
                    )}


                    {/* PROCESSING PIPELINE */}

                    <div className="hl-pipeline">

                      <div className="hl-pipeline-title">

                        <span />

                        Processing flow

                      </div>


                      <div className="hl-pipeline-row">

                        {/* STAGE 01 */}

                        <div
                          className={`hl-pipeline-stage ${
                            stageReached(['uploading', 'processing', 'completed'])
                              ? 'active'
                              : ''
                          }`}
                        >

                          <span className="hl-pipeline-icon">
                            01
                          </span>

                          <span>
                            Private upload
                          </span>

                        </div>


                        {/* STAGE 02 */}

                        <div
                          className={`hl-pipeline-stage ${
                            stageReached(['processing', 'completed'])
                              ? 'active'
                              : ''
                          }`}
                        >

                          <span className="hl-pipeline-icon">
                            02
                          </span>

                          <span>
                            Text extraction
                          </span>

                        </div>


                        {/* STAGE 03 */}

                        <div
                          className={`hl-pipeline-stage ${
                            stageReached(['completed'])
                              ? 'active'
                              : ''
                          }`}
                        >

                          <span className="hl-pipeline-icon">
                            03
                          </span>

                          <span>
                            Profile extraction
                          </span>

                        </div>


                        {/* STAGE 04 */}

                        <div
                          className={`hl-pipeline-stage ${
                            stageReached(['completed'])
                              ? 'active'
                              : ''
                          }`}
                        >

                          <span className="hl-pipeline-icon">
                            04
                          </span>

                          <span>
                            Skill matching
                          </span>

                        </div>

                      </div>

                    </div>

                  </div>


                  {/* =========================================
                      RIGHT PANEL
                     ========================================= */}

                  <div className="hl-demo-panel">

                    <div className="hl-code-card">

                      <div className="hl-code-top">

                        <div className="hl-code-file">

                          <span className="hl-code-dot" />

                          normalized_profile.json

                        </div>


                        <div className="hl-code-model">
                          Rule-based parser
                        </div>

                      </div>


                      <div className="hl-code-content">

                        <ProfileJson candidate={activeCandidate} />


                        <div className="hl-vector-box">

                          <div className="hl-vector-label">
                            Matchable skills
                          </div>


                          <div className="hl-vector-value">
                            {activeCandidate.skills.length
                              ? activeCandidate.skills.join(' · ')
                              : activeCandidate.profileReady
                                ? 'No catalog skills found in this resume'
                                : 'Available once parsing completes'}
                          </div>


                          <div className="hl-vector-meta">

                            <span className="hl-mini-pill">
                              {activeCandidate.skills.length} skill{activeCandidate.skills.length === 1 ? '' : 's'}
                            </span>

                            <span className="hl-mini-pill">
                              {activeCandidate.source === 'sample'
                                ? 'Sample profile'
                                : `${activeCandidate.profileCompleteness}% complete`}
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


                {/* TRUST STRIP */}

                <div className="hl-trust-strip">

                  <div className="hl-trust-item">

                    <span className="hl-trust-number">
                      PDF + DOCX
                    </span>

                    <span className="hl-trust-label">
                      Resume input formats
                    </span>

                  </div>


                  <div className="hl-trust-item">

                    <span className="hl-trust-number">
                      {RESUME_CONCURRENCY}× parallel
                    </span>

                    <span className="hl-trust-label">
                      Resumes processed concurrently
                    </span>

                  </div>


                  <div className="hl-trust-item">

                    <span className="hl-trust-number">
                      RLS
                    </span>

                    <span className="hl-trust-label">
                      Private data boundary
                    </span>

                  </div>

                </div>

              </div>
            )}


            {/* =================================================
                MATCHER TAB
               ================================================= */}

            {activeTab ===
              'matcher' && (
              <div className="hl-demo-transition">

                <div className="hl-match-layout">

                  {/* =========================================
                      FORM PANEL
                     ========================================= */}

                  <div className="hl-form-panel">

                    <div className="hl-panel-label">
                      01 · Target
                    </div>

                    <h3 className="hl-panel-title">
                      Describe who you need.
                    </h3>

                    <p className="hl-panel-copy">
                      Give HireLabs the role context, then rank
                      candidates by the required skills their
                      resumes actually show.
                    </p>


                    {/* MATCH MODE */}

                    <div className="hl-toggle">

                      <button
                        type="button"
                        className={
                          matchMode ===
                          'best'
                            ? 'active'
                            : ''
                        }
                        onClick={() =>
                          setMatchMode(
                            'best'
                          )
                        }
                      >
                        Find best match
                      </button>


                      <button
                        type="button"
                        className={
                          matchMode ===
                          'specific'
                            ? 'active'
                            : ''
                        }
                        onClick={() =>
                          setMatchMode(
                            'specific'
                          )
                        }
                      >
                        Check one resume
                      </button>

                    </div>


                    {/* SPECIFIC RESUME */}

                    {matchMode ===
                      'specific' && (
                      <label className="hl-field">

                        <span className="hl-field-label">
                          Resume to evaluate
                        </span>


                        <select
                          value={
                            selectedResume
                          }
                          onChange={(
                            event
                          ) =>
                            setSelectedResume(
                              event.target
                                .value
                            )
                          }
                        >

                          {candidates.map(
                            (candidate) => (
                              <option
                                key={
                                  candidate.id
                                }
                                value={
                                  candidate.id
                                }
                              >
                                {
                                  candidate.name
                                }{' '}
                                —{' '}
                                {
                                  candidate.title
                                }
                              </option>
                            )
                          )}

                        </select>

                      </label>
                    )}


                    {/* ROLE */}

                    <label className="hl-field">

                      <span className="hl-field-label">
                        Role
                      </span>


                      <input
                        value={role}
                        onChange={(
                          event
                        ) =>
                          setRole(
                            event.target
                              .value
                          )
                        }
                        placeholder="e.g. Senior Data Engineer"
                      />

                    </label>


                    {/* JOB DESCRIPTION */}

                    <label className="hl-field">

                      <span className="hl-field-label">
                        Job description
                      </span>


                      <textarea
                        rows={6}
                        value={
                          jobDescription
                        }
                        onChange={(
                          event
                        ) =>
                          setJobDescription(
                            event.target
                              .value
                          )
                        }
                        placeholder="Describe the skills and experience needed…"
                      />

                    </label>


                    {/* MATCH BUTTON */}

                    <div className="hl-match-button">

                      <Button
                        variant="primary"
                        style={{
                          width:
                            '100%',
                        }}
                        onClick={
                          runMatch
                        }
                        disabled={
                          !role.trim() ||
                          !jobDescription.trim()
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

                          {matchMode ===
                          'best'
                            ? 'Find best resume match'
                            : 'Check compatibility'}

                        </span>

                      </Button>

                      <div className="hl-ai-actions">
                        <button
                          type="button"
                          className="hl-ai-secondary"
                          onClick={runAiRoleBrief}
                          disabled={isRoleBriefLoading || !role.trim() || !jobDescription.trim()}
                        >
                          {isRoleBriefLoading ? 'Thinking…' : '✦ AI role brief'}
                        </button>

                        {topCandidates.length > 1 ? (
                          <button
                            type="button"
                            className="hl-ai-secondary"
                            onClick={runAiTopCandidates}
                            disabled={
                              !role.trim() ||
                              !jobDescription.trim() ||
                              topCandidates.every((candidate) => ai.insights[candidate.id]?.status === 'loading')
                            }
                          >
                            {`✦ AI deep dive: top ${topCandidates.length}`}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="hl-ai-secondary"
                            onClick={() => runAiCandidateAnalysis(activeCandidate)}
                            disabled={
                              !activeCandidate ||
                              !role.trim() ||
                              !jobDescription.trim() ||
                              activeCandidate.profileReady === false ||
                              ai.insights[activeCandidate.id]?.status === 'loading'
                            }
                          >
                            {ai.insights[activeCandidate?.id]?.status === 'loading' ? 'Thinking…' : '✦ AI deep dive'}
                          </button>
                        )}
                      </div>

                      <p className="hl-ai-privacy">
                        AI features send the role, job description and the
                        selected candidate profile, including parsed resume
                        text for uploaded resumes, to the configured AI
                        provider (Google Gemini) for analysis. HireLabs does
                        not store AI results. Skill matching runs entirely in
                        your browser.
                      </p>

                    </div>

                  </div>


                  {/* =========================================
                      RESULTS PANEL
                     ========================================= */}

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


                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {matchResult && (
                          <div className="hl-result-count">
                            {
                              matchResult.length
                            } candidate{matchResult.length === 1 ? '' : 's'}
                          </div>
                        )}

                        <div className="hl-result-view-switcher" aria-label="Candidate result layout">
                          <button
                            type="button"
                            className={`hl-result-view-button ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            aria-pressed={viewMode === 'grid'}
                          >
                            Grid View
                          </button>
                          <button
                            type="button"
                            className={`hl-result-view-button ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                            aria-pressed={viewMode === 'list'}
                          >
                            List View
                          </button>
                        </div>
                      </div>

                    </div>


                    {/* EMPTY STATE */}

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
                              <circle
                                cx="11"
                                cy="11"
                                r="7"
                              />

                              <path d="m20 20-4-4" />
                            </svg>

                          </div>


                          <div className="hl-empty-title">
                            Your shortlist starts here.
                          </div>


                          <p className="hl-empty-copy">
                            Enter a role and run a match
                            to see candidates ranked by
                            the evidence they share with
                            the role.
                          </p>

                        </div>

                      </div>
                    )}


                    {/* REQUIREMENTS CONSIDERED */}

                    {match && (
                      <div className="hl-requirements">
                        <span className="hl-requirements-label">
                          {match.requirements.type === 'keywords'
                            ? `${match.requirements.items.length} keywords considered (no catalog skills found)`
                            : `${match.requirements.items.length} required skill${match.requirements.items.length === 1 ? '' : 's'} considered`}
                        </span>
                        {match.requirements.items.map((item) => (
                          <span className="hl-evidence-tag pending" key={`req-${item}`}>
                            {item}
                          </span>
                        ))}
                      </div>
                    )}


                    {/* RESULTS */}

                    {matchResult && (
                      <div
                        className={`hl-results ${
                          viewMode === 'grid'
                            ? 'grid grid-cols-1 xl:grid-cols-2 gap-4 hl-results-grid'
                            : 'flex flex-col gap-4 hl-results-list'
                        }`}
                      >

                        {matchResult.map(
                          (
                            candidate,
                            index
                          ) => (
                            <div
                              className={`hl-result-card ${
                                index === 0
                                  ? 'top'
                                  : ''
                              }`}
                              key={
                                candidate.id
                              }
                            >

                              <div className="hl-result-top">

                                <div className="hl-result-person">

                                  <div className="hl-result-rank">
                                    #{index + 1}
                                  </div>


                                  <div>

                                    <div className="hl-result-name">
                                      {
                                        candidate.name
                                      }
                                    </div>


                                    <div className="hl-result-role">
                                      {
                                        candidate.title
                                      }
                                    </div>

                                  </div>

                                </div>


                                <div
                                className={`hl-result-score ${
                                  candidate.score === null ? 'pending' : ''
                                }`}
                              >
                                {candidate.score === null
                                  ? 'Profile pending'
                                  : `${candidate.score}% match`}
                              </div>

                              </div>

                              <div className="hl-result-actions">
                                <button
                                  type="button"
                                  className="hl-ai-card-button"
                                  onClick={() => {
                                    setSelectedResume(candidate.id);
                                    if (ai.insights[candidate.id]?.status === 'completed') {
                                      ai.setFocusedId(candidate.id);
                                    } else {
                                      void runAiCandidateAnalysis(candidate);
                                    }
                                  }}
                                  disabled={
                                    candidate.profilePending ||
                                    ai.insights[candidate.id]?.status === 'loading'
                                  }
                                >
                                  {ai.insights[candidate.id]?.status === 'loading'
                                    ? 'Analyzing…'
                                    : ai.insights[candidate.id]?.status === 'completed'
                                      ? '✦ View AI analysis'
                                      : '✦ Analyze with AI'}
                                </button>
                              </div>

                              <div className="hl-reasoning">

                                <div className="hl-analysis-head">
                                  <span className="hl-analysis-label">
                                    Compatibility analysis
                                  </span>
                                  <span className="hl-analysis-meta">
                                    {candidate.score === null
                                      ? 'Parsing required'
                                      : `${candidate.matched.length} of ${candidate.total} matched`}
                                  </span>
                                </div>

                                <p className="hl-analysis-copy">
                                  {candidate.analysisText}
                                </p>

                                {!candidate.profilePending && (
                                  <div className="hl-analysis-bar">
                                    <div
                                      className="hl-analysis-fill"
                                      style={{
                                        width: `${candidate.score}%`,
                                      }}
                                    />
                                  </div>
                                )}

                                <div className="hl-analysis-grid">

                                  <div className="hl-analysis-block">
                                    <div className="hl-analysis-block-title">
                                      Matched requirements
                                    </div>

                                    <div className="hl-evidence">
                                      {candidate.matched.length ? (
                                        candidate.matched.map((term) => (
                                          <span
                                            className="hl-evidence-tag"
                                            key={`matched-${term}`}
                                          >
                                            ✓ {term}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="hl-evidence-tag pending">
                                          {candidate.profilePending ? 'No extracted evidence yet' : 'None found'}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="hl-analysis-block">
                                    <div className="hl-analysis-block-title">
                                      Missing / needs evidence
                                    </div>

                                    <div className="hl-evidence">
                                      {candidate.missing.length ? (
                                        candidate.missing.map((term) => (
                                          <span
                                            className="hl-evidence-tag missing"
                                            key={`missing-${term}`}
                                          >
                                            − {term}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="hl-evidence-tag">
                                          None identified
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                </div>

                              </div>

                            </div>
                          )
                        )}

                      </div>
                    )}

                  </div>

                </div>

                {aiPanelVisible && (
                  <div className="hl-ai-panel">
                    <div className="hl-ai-panel-head">
                      <div>
                        <div className="hl-panel-label">03 · AI copilot</div>
                        <h3 className="hl-panel-title">Decision support, not just a score.</h3>
                      </div>
                      <span className="hl-ai-badge">Gemini</span>
                    </div>

                    {isRoleBriefLoading && (
                      <div className="hl-ai-loading">Generating the role brief…</div>
                    )}

                    {ai.roleBrief.error && (
                      <div className="hl-ai-error">
                        Role brief: {ai.roleBrief.error}
                      </div>
                    )}

                    {aiRoleBrief && (
                      <div className="hl-ai-role-grid">
                        <div className="hl-ai-summary">
                          <div className="hl-ai-section-label">Role brief</div>
                          <p>{aiRoleBrief.role_summary}</p>
                          <div className="hl-ai-seniority">{aiRoleBrief.seniority}</div>
                        </div>

                        <div className="hl-ai-column">
                          <div className="hl-ai-section-label">Must-have</div>
                          <div className="hl-ai-chip-list">
                            {(aiRoleBrief.must_have_skills || []).map((item) => (
                              <span className="hl-ai-chip" key={item}>✓ {item}</span>
                            ))}
                          </div>
                        </div>

                        <div className="hl-ai-column">
                          <div className="hl-ai-section-label">Nice-to-have</div>
                          <div className="hl-ai-chip-list">
                            {(aiRoleBrief.nice_to_have_skills || []).map((item) => (
                              <span className="hl-ai-chip muted" key={item}>+ {item}</span>
                            ))}
                          </div>
                        </div>

                        <div className="hl-ai-column">
                          <div className="hl-ai-section-label">Interview focus</div>
                          <ul className="hl-ai-list">
                            {(aiRoleBrief.interview_focus || []).map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {analyzedIds.length > 0 && (
                      <div className="hl-ai-tabs" role="tablist" aria-label="Analyzed candidates">
                        {analyzedIds.map((candidateId) => {
                          const insight = ai.insights[candidateId];
                          return (
                            <button
                              key={candidateId}
                              type="button"
                              role="tab"
                              aria-selected={ai.focusedId === candidateId}
                              className={`hl-ai-tab ${insight.status} ${ai.focusedId === candidateId ? 'active' : ''}`}
                              onClick={() => ai.setFocusedId(candidateId)}
                            >
                              {insight.candidateName}
                              <span className="hl-ai-tab-state">
                                {insight.status === 'loading'
                                  ? 'Analyzing…'
                                  : insight.status === 'failed'
                                    ? 'Failed'
                                    : insight.result?.fit_verdict?.replace('_', ' ') || 'Ready'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {focusedInsight?.status === 'loading' && (
                      <div className="hl-ai-loading">
                        Analyzing {focusedInsight.candidateName}…
                      </div>
                    )}

                    {focusedInsight?.status === 'failed' && (
                      <div className="hl-ai-error">
                        {focusedInsight.candidateName}: {focusedInsight.error}
                      </div>
                    )}

                    {aiInsight && (
                      <div className="hl-ai-candidate-grid">
                        <div className="hl-ai-summary">
                          <div className="hl-ai-section-label">AI candidate read</div>
                          <div className="hl-ai-verdict-row">
                            <span className={`hl-ai-verdict ${aiInsight.fit_verdict || ''}`}>
                              {(aiInsight.fit_verdict || 'unknown').replace('_', ' ')}
                            </span>
                            <span className="hl-ai-confidence">
                              {Math.max(0, Math.min(100, Number(aiInsight.confidence) || 0))}% confidence
                            </span>
                          </div>
                          <p>{aiInsight.candidate_summary}</p>
                          <p className="hl-ai-recommendation">{aiInsight.recommendation}</p>
                        </div>

                        <div className="hl-ai-column">
                          <div className="hl-ai-section-label">Strengths</div>
                          <ul className="hl-ai-list">
                            {(aiInsight.strengths || []).map((item) => (
                              <li key={item}>✓ {item}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="hl-ai-column">
                          <div className="hl-ai-section-label">Gaps / risks</div>
                          <ul className="hl-ai-list">
                            {(aiInsight.gaps || []).concat(aiInsight.risk_flags || []).slice(0, 8).map((item) => (
                              <li key={item}>− {item}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="hl-ai-column full">
                          <div className="hl-ai-section-label">Tailored interview questions</div>
                          <ol className="hl-ai-questions">
                            {(aiInsight.interview_questions || []).map((item, index) => (
                              <li key={item}>
                                <span>{index + 1}</span>
                                {item}
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TRUST STRIP */}

                <div className="hl-trust-strip">

                  <div className="hl-trust-item">

                    <span className="hl-trust-number">
                      Transparent
                    </span>

                    <span className="hl-trust-label">
                      Score = matched ÷ required skills
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

              </div>
            )}

          </div>
        </div>

      </div>
    </section>
  );
}
