'use client';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

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
  const [selectedUploadFiles, setSelectedUploadFiles] = useState([]);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadedResumes, setUploadedResumes] = useState([]);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const sectionRef = useRef(null);
  const fileInputRef = useRef(null);

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

  const defaultCandidates = [
    {
      id: 'alex',
      name: 'Alex Mercer',
      title: 'Lead Full-Stack AI Engineer',
      skills:
        'next.js react typescript supabase postgresql pgvector gemini embeddings',
      source: 'sample',
      yearsExperience: 8,
    },
    {
      id: 'sarah',
      name: 'Dr. Sarah Lin',
      title: 'Staff ML & Vector Systems Engineer',
      skills:
        'python machine learning vector search pgvector hnsw gemini embeddings',
      source: 'sample',
      yearsExperience: 10,
    },
    {
      id: 'elena',
      name: 'Elena Rostova',
      title: 'Principal Cloud Architect',
      skills:
        'aws cloud architecture kubernetes postgres security terraform',
      source: 'sample',
      yearsExperience: 12,
    },
  ];

  const uploadedCandidates = uploadedResumes.map((resume) => {
    const displayName = resume.file_name
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      id: `uploaded-${resume.id}`,
      resumeId: resume.id,
      name: displayName || resume.file_name,
      title: 'Uploaded candidate resume',
      skills: '',
      source: 'uploaded',
      fileName: resume.file_name,
      filePath: resume.file_path,
      processingStatus: resume.processing_status,
      createdAt: resume.created_at,
      yearsExperience: null,
    };
  });

  const candidates = [
    ...defaultCandidates,
    ...uploadedCandidates,
  ];


  const activeCandidate =
    candidates.find(
      (candidate) =>
        candidate.id === selectedResume
    ) || candidates[0];

  useEffect(() => {
    let cancelled = false;

    const loadUploadedResumes = async () => {
      setIsLoadingResumes(true);

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) setUploadedResumes([]);
          return;
        }

        const { data, error } = await supabase
          .from('resumes')
          .select(
            'id, file_name, file_path, file_type, file_size, processing_status, created_at'
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (!cancelled) {
          setUploadedResumes(data || []);
        }
      } catch (error) {
        console.error('Unable to load uploaded resumes:', error);
      } finally {
        if (!cancelled) setIsLoadingResumes(false);
      }
    };

    void loadUploadedResumes();

    return () => {
      cancelled = true;
    };
  }, []);

  const acceptResume = async (filesInput) => {
    const files = Array.from(filesInput || []).filter(Boolean);

    if (!files.length) return;

    const invalidFile = files.find((file) => {
      const isSupported =
        [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ].includes(file.type) ||
        /\.(pdf|docx)$/i.test(file.name);

      return !isSupported || file.size > 5 * 1024 * 1024;
    });

    if (invalidFile) {
      const isSupported =
        [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ].includes(invalidFile.type) ||
        /\.(pdf|docx)$/i.test(invalidFile.name);

      setUploadMessage(
        !isSupported
          ? `${invalidFile.name}: please choose a PDF or DOCX file.`
          : `${invalidFile.name}: files must be 5 MB or smaller.`
      );
      return;
    }

    setSelectedUploadFiles(files);
    setUploadedFile(files[0] || null);
    setUploadMessage(
      files.length === 1
        ? 'Uploading your resume securely…'
        : `Uploading ${files.length} resumes securely…`
    );
    setIsParsing(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        onAuthRequired?.();
        throw new Error(
          'Sign in to upload and save resumes.'
        );
      }

      const savedResumes = [];
      const failedFiles = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];

        setUploadMessage(
          files.length === 1
            ? `Uploading ${file.name}…`
            : `Uploading ${index + 1} of ${files.length}: ${file.name}…`
        );

        const extension = file.name
          .split('.')
          .pop()
          ?.toLowerCase() || 'bin';

        const filePath =
          `${user.id}/${crypto.randomUUID()}.${extension}`;

        const {
          error: storageError,
        } = await supabase.storage
          .from('resumes')
          .upload(
            filePath,
            file,
            {
              contentType: file.type || 'application/octet-stream',
              upsert: false,
            }
          );

        if (storageError) {
          failedFiles.push({
            file,
            error: storageError,
          });
          continue;
        }

        const {
          data: savedResume,
          error: dbError,
        } = await (supabase
          .from('resumes') as any)
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type || 'application/octet-stream',
            file_size: file.size,
            processing_status: 'uploaded',
          })
          .select(
            'id, file_name, file_path, file_type, file_size, processing_status, created_at'
          )
          .single();

        if (dbError) {
          await supabase.storage
            .from('resumes')
            .remove([filePath]);

          failedFiles.push({
            file,
            error: dbError,
          });
          continue;
        }

        savedResumes.push(savedResume);
      }

      if (!savedResumes.length) {
        throw new Error(
          'None of the selected resumes could be uploaded.'
        );
      }

      setUploadedResumes((current) => {
        const merged = [
          ...savedResumes,
          ...current,
        ];

        const unique = new Map(
          merged.map((resume) => [resume.id, resume])
        );

        return Array.from(unique.values());
      });

      // Select the most recently uploaded resume.
      const lastSavedResume =
        savedResumes[savedResumes.length - 1];

      setSelectedResume(
        `uploaded-${lastSavedResume.id}`
      );

      if (failedFiles.length) {
        setUploadMessage(
          `${savedResumes.length} of ${files.length} resumes were saved. ${failedFiles.length} failed.`
        );
      } else {
        setUploadMessage(
          savedResumes.length === 1
            ? `${savedResumes[0].file_name} was saved and selected.`
            : `${savedResumes.length} resumes were saved. ${lastSavedResume.file_name} is selected.`
        );
      }
    } catch (error) {
      setUploadMessage(
        error instanceof Error
          ? error.message
          : 'Upload failed.'
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

    const STOP_WORDS = new Set([
      'the', 'and', 'for', 'with', 'from', 'this', 'that',
      'into', 'your', 'you', 'our', 'are', 'was', 'were',
      'will', 'have', 'has', 'had', 'who', 'what', 'where',
      'when', 'how', 'not', 'but', 'all', 'any', 'can', 'its',
      'their', 'they', 'them', 'job', 'role', 'looking',
      'engineer', 'engineer', 'candidate', 'experience',
      'experienced', 'years', 'year', 'need', 'needed',
      'strong', 'good', 'work', 'working', 'team',
    ]);

    const normalize = (value = '') =>
      value
        .toLowerCase()
        .replace(/[’']/g, '')
        .replace(/[^a-z0-9.+#/-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const targetText = normalize(`${role} ${jobDescription}`);

    const rawTerms = targetText.match(/[a-z0-9.+#/-]{3,}/g) || [];

    const uniqueTerms = [...new Set(
      rawTerms.filter((term) => !STOP_WORDS.has(term))
    )];

    const roleTerms = [...new Set(
      normalize(role)
        .match(/[a-z0-9.+#/-]{3,}/g)
        ?.filter((term) => !STOP_WORDS.has(term)) || []
    )];

    const pool =
      matchMode === 'specific'
        ? candidates.filter(
            (candidate) =>
              candidate.id === selectedResume
          )
        : candidates;

    const results = pool.map((candidate) => {
      const profileText = normalize(
        `${candidate.title} ${candidate.skills}`
      );

      const profileTerms = new Set(
        profileText.match(/[a-z0-9.+#/-]{2,}/g) || []
      );

      const matchedRequirements = uniqueTerms.filter((term) => {
        if (term.length < 3) return false;

        if (profileText.includes(term)) return true;

        for (const skill of profileTerms) {
          if (skill === term) return true;
          if (skill.includes(term) || term.includes(skill)) return true;
        }

        return false;
      });

      const missingRequirements = uniqueTerms.filter(
        (term) => !matchedRequirements.includes(term)
      );

      const roleMatches = roleTerms.filter((term) =>
        profileText.includes(term)
      );

      const hasStructuredProfile =
        candidate.source === 'sample' ||
        Boolean(candidate.skills?.trim());

      if (!hasStructuredProfile) {
        return {
          ...candidate,
          evidence: [],
          missingRequirements,
          roleMatches,
          matchedRequirements: [],
          score: null,
          profilePending: true,
          profileCompleteness: 20,
          analysisText:
            'Resume saved successfully, but its text profile has not been extracted yet. Compatibility scoring will appear after parsing.',
        };
      }

      const skillCoverage = uniqueTerms.length
        ? matchedRequirements.length / uniqueTerms.length
        : 0;

      const roleCoverage = roleTerms.length
        ? roleMatches.length / roleTerms.length
        : 0;

      const score = Math.min(99, Math.max(18, Math.round(
        30 +
        skillCoverage * 54 +
        roleCoverage * 16
      )));

      const analysisText =
        matchedRequirements.length && missingRequirements.length
          ? `${matchedRequirements.length} of ${uniqueTerms.length} key requirements are supported by this profile. The strongest overlap is ${matchedRequirements.slice(0, 4).join(', ')}. ${missingRequirements.length} requirement${missingRequirements.length === 1 ? '' : 's'} still need evidence.`
          : matchedRequirements.length
            ? `${matchedRequirements.length} of ${uniqueTerms.length} key requirements are supported by this profile. Strong alignment across ${matchedRequirements.slice(0, 5).join(', ')}.`
            : `No meaningful requirement overlap was found in the current profile. Review the resume against the role before shortlisting.`;

      return {
        ...candidate,
        evidence: matchedRequirements.slice(0, 8),
        matchedRequirements,
        missingRequirements: missingRequirements.slice(0, 8),
        roleMatches,
        score,
        profilePending: false,
        profileCompleteness: 100,
        analysisText,
      };
    });

    results.sort((a, b) => {
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score;
    });

    setMatchResult(results);
  };

  const handleDrop = (event) => {
    event.preventDefault();

    acceptResume(event.dataTransfer.files);
  };

  const resetUpload = () => {
    setUploadedFile(null);
    setSelectedUploadFiles([]);
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
            HireLabs creates, then test how semantic matching
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
                    : 'Semantic candidate matching'}

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
                          onClick={() => {
                            setSelectedResume(candidate.id);
                            setUploadMessage('');
                            setUploadedFile(null);
                          }}
                        >
                          {candidate.name}
                        </button>
                      ))}

                      {uploadedCandidates.length > 0 && (
                        <>
                          <div className="hl-sample-divider">
                            Your resumes
                          </div>

                          {uploadedCandidates.map((candidate) => (
                            <button
                              key={candidate.id}
                              type="button"
                              title={candidate.fileName}
                              className={`hl-sample-button hl-uploaded-sample ${
                                selectedResume === candidate.id ? 'active' : ''
                              }`}
                              onClick={() => {
                                setSelectedResume(candidate.id);
                                setUploadMessage('');
                                setUploadedFile(null);
                              }}
                            >
                              {candidate.fileName}
                            </button>
                          ))}
                        </>
                      )}

                      {isLoadingResumes && (
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
                        acceptResume(event.target.files);
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

                          {isParsing
                            ? `Uploading ${selectedUploadFiles.length || 1} resume${(selectedUploadFiles.length || 1) === 1 ? '' : 's'}…`
                            : selectedUploadFiles.length > 1
                              ? `${selectedUploadFiles.length} resumes selected`
                              : uploadedFile
                                ? uploadedFile.name
                                : 'Drop resumes here'}

                        </div>


                        <div className="hl-upload-subtitle">

                          {selectedUploadFiles.length > 1
                            ? 'Multiple PDF or DOCX files · maximum 5 MB each'
                            : 'PDF or DOCX · maximum file size 5 MB each · multiple files supported'}

                        </div>

                      </div>

                    </div>


                    {/* UPLOAD STATUS */}

                    {uploadMessage && (
                      <p
                        className={`hl-upload-status ${
                          uploadMessage.includes(
                            'failed'
                          ) ||
                          uploadMessage.includes(
                            'Please'
                          ) ||
                          uploadMessage.includes(
                            'Sign in'
                          )
                            ? 'error'
                            : uploadMessage.includes(
                                'Uploading'
                              )
                              ? 'neutral'
                              : ''
                        }`}
                        role="status"
                      >
                        {uploadMessage}
                      </p>
                    )}


                    {/* REMOVE FILE */}

                    {uploadedFile &&
                      !isParsing && (
                        <button
                          type="button"
                          onClick={
                            resetUpload
                          }
                          style={{
                            marginTop:
                              '10px',

                            border: 0,

                            background:
                              'transparent',

                            color:
                              '#7C736A',

                            padding: 0,

                            fontSize:
                              '9px',

                            fontWeight:
                              800,

                            cursor:
                              'pointer',
                          }}
                        >
                          Clear current selection
                        </button>
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
                            isParsing ||
                            uploadMessage.includes(
                              'saved'
                            )
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
                            uploadMessage.includes(
                              'saved'
                            )
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
                            uploadMessage.includes(
                              'saved'
                            )
                              ? 'active'
                              : ''
                          }`}
                        >

                          <span className="hl-pipeline-icon">
                            03
                          </span>

                          <span>
                            AI normalization
                          </span>

                        </div>


                        {/* STAGE 04 */}

                        <div
                          className={`hl-pipeline-stage ${
                            uploadMessage.includes(
                              'saved'
                            )
                              ? 'active'
                              : ''
                          }`}
                        >

                          <span className="hl-pipeline-icon">
                            04
                          </span>

                          <span>
                            Vector embedding
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
                          Gemini embedding 002
                        </div>

                      </div>


                      <div className="hl-code-content">

                        <pre>
{`{
  `}
<span className="hl-code-key">
  "candidate_profile"
</span>{`: {
    `}
<span className="hl-code-key">
  "full_name"
</span>{`: `}
<span className="hl-code-string">
  "${activeCandidate.name}"
</span>{`,
    `}
<span className="hl-code-key">
  "title"
</span>{`: `}
<span className="hl-code-string">
  "${activeCandidate.title}"
</span>{`,
    `}
<span className="hl-code-key">
  "years_experience"
</span>{`: `}
<span className="hl-code-number">
  {activeCandidate.source === 'sample'
    ? activeCandidate.yearsExperience
    : 'pending'}
</span>{`
  },
  `}
{activeCandidate.source === 'uploaded' ? (
  <>
    <span className="hl-code-key">
      "source_file"
    </span>{`: `}
    <span className="hl-code-string">
      "${activeCandidate.fileName}"
    </span>{`,
    `}
    <span className="hl-code-key">
      "processing_status"
    </span>{`: `}
    <span className="hl-code-string">
      "${activeCandidate.processingStatus}"
    </span>{`
  },
  `}
  </>
) : (
  <>
    <span className="hl-code-key">
      "skills_normalized"
    </span>{`: {
      `}
    <span className="hl-code-key">
      "frontend"
    </span>{`: [
        `}
    <span className="hl-code-string">
      "Next.js 15"
    </span>{`,
        `}
    <span className="hl-code-string">
      "React"
    </span>{`,
        `}
    <span className="hl-code-string">
      "TypeScript"
    </span>{`
      ],
      `}
    <span className="hl-code-key">
      "backend_database"
    </span>{`: [
        `}
    <span className="hl-code-string">
      "Supabase"
    </span>{`,
        `}
    <span className="hl-code-string">
      "PostgreSQL"
    </span>{`,
        `}
    <span className="hl-code-string">
      "pgvector"
    </span>{`
      ],
      `}
    <span className="hl-code-key">
      "ai_ml"
    </span>{`: [
        `}
    <span className="hl-code-string">
      "Gemini Embeddings"
    </span>{`,
        `}
    <span className="hl-code-string">
      "RAG Pipelines"
    </span>{`
      ]
    },
    `}
  </>
)}
<span className="hl-code-key">
  "vector_embedding"
</span>{`: {
    `}
<span className="hl-code-key">
  "model"
</span>{`: `}
<span className="hl-code-string">
  "models/gemini-embedding-002"
</span>{`,
    `}
<span className="hl-code-key">
  "dimensions"
</span>{`: `}
<span className="hl-code-number">
  1536
</span>{`,
    `}
<span className="hl-code-key">
  "sample_vector"
</span>{`: [
      `}
<span className="hl-code-number">
  -0.02341
</span>{`, `}
<span className="hl-code-number">
  0.08412
</span>{`, `}
<span className="hl-code-number">
  -0.05193
</span>{`,
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
                      1536
                    </span>

                    <span className="hl-trust-label">
                      Embedding dimensions
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
                      Give HireLabs the role context, then let
                      semantic similarity rank the candidates
                      against it.
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


                      {matchResult && (
                        <div className="hl-result-count">
                          {
                            matchResult.length
                          } candidates
                        </div>
                      )}

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


                    {/* RESULTS */}

                    {matchResult && (
                      <div className="hl-results">

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


                              <div className="hl-reasoning">

                                <div className="hl-analysis-head">
                                  <span className="hl-analysis-label">
                                    Compatibility analysis
                                  </span>
                                  <span className="hl-analysis-meta">
                                    {candidate.score === null
                                      ? 'Parsing required'
                                      : `${candidate.matchedRequirements.length} matched · ${candidate.missingRequirements.length} missing`}
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
                                      {candidate.evidence.length ? (
                                        candidate.evidence.map((term) => (
                                          <span
                                            className="hl-evidence-tag"
                                            key={`matched-${term}`}
                                          >
                                            ✓ {term}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="hl-evidence-tag pending">
                                          No extracted evidence yet
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="hl-analysis-block">
                                    <div className="hl-analysis-block-title">
                                      Missing / needs evidence
                                    </div>

                                    <div className="hl-evidence">
                                      {candidate.missingRequirements.length ? (
                                        candidate.missingRequirements.map((term) => (
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


                {/* TRUST STRIP */}

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

              </div>
            )}

          </div>
        </div>

      </div>
    </section>
  );
}