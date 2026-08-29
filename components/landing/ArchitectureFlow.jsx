import React, { useEffect, useRef, useState } from 'react';

export function ArchitectureFlow() {
  const sectionRef = useRef(null);
  const [progress, setProgress] = useState(0);

  const steps = [
    {
      num: '01',
      title: 'Secure Upload',
      short: 'Start with the source',
      desc: 'PDF/DOCX uploaded to user-scoped private Supabase Storage bucket.',
      label: 'PRIVATE INPUT',
      visual: 'upload',
    },
    {
      num: '02',
      title: 'LLM Normalize',
      short: 'Turn a resume into structure',
      desc: 'Gemini extracts candidate profile, skills ontology, and work history.',
      label: 'STRUCTURED DATA',
      visual: 'normalize',
    },
    {
      num: '03',
      title: '1536-dim Embed',
      short: 'Create a searchable signal',
      desc: 'Vector representation generated via Gemini Embedding-002 model.',
      label: 'VECTOR SIGNAL',
      visual: 'embed',
    },
    {
      num: '04',
      title: 'pgvector RPC',
      short: 'Find the closest candidates',
      desc: 'Cosine distance calculated in Postgres filtered by signed-in auth.uid().',
      label: 'SEMANTIC SEARCH',
      visual: 'search',
    },
    {
      num: '05',
      title: 'Explain & Rank',
      short: 'Make the result useful',
      desc: 'AI generates evidence quotes & flags gap analysis for HR decision support.',
      label: 'DECISION SUPPORT',
      visual: 'explain',
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const totalDistance = Math.max(
        section.offsetHeight - viewportHeight,
        1
      );

      const nextProgress = Math.min(
        1,
        Math.max(0, -rect.top / totalDistance)
      );

      setProgress(nextProgress);
    };

    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const clamp = (value, min = 0, max = 1) =>
    Math.min(max, Math.max(min, value));

  const activeIndex = Math.min(
    steps.length - 1,
    Math.floor(progress * steps.length)
  );

  const lineProgress = progress * (steps.length - 1);

  return (
    <section
      ref={sectionRef}
      className="hl-architecture"
      id="architecture"
    >
      <style>{`
        .hl-architecture {
          --cream: #F5F1E8;
          --cream-soft: #ECE6DA;
          --white: #FFFFFF;
          --espresso: #211C18;
          --espresso-soft: #615850;
          --olive: #6F7D55;
          --olive-dark: #596544;
          --taupe: #C8C0AF;
          --border: #DED7CA;

          position: relative;
          min-height: 420vh;
          background: var(--cream);
          color: var(--espresso);
          overflow: clip;
        }

        .hl-architecture *,
        .hl-architecture *::before,
        .hl-architecture *::after {
          box-sizing: border-box;
        }

        .hl-arch-sticky {
          position: sticky;
          top: 0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          overflow: hidden;
        }

        .hl-arch-shell {
          width: min(1180px, calc(100% - 56px));
          margin: 0 auto;
          position: relative;
        }

        .hl-arch-intro {
          position: absolute;
          top: 7vh;
          left: 0;
          z-index: 4;
          max-width: 670px;
          transition: opacity 120ms linear;
        }

        .hl-arch-kicker {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 17px;
          color: var(--olive-dark);
          font-size: 10px;
          line-height: 1;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          font-weight: 800;
        }

        .hl-arch-kicker-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--olive);
          box-shadow: 0 0 0 4px rgba(111,125,85,0.11);
        }

        .hl-arch-title {
          margin: 0;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(48px, 5.4vw, 76px);
          line-height: 0.96;
          letter-spacing: -0.055em;
          font-weight: 500;
        }

        .hl-arch-title em {
          color: var(--olive);
          font-style: italic;
        }

        .hl-arch-description {
          max-width: 610px;
          margin: 20px 0 0;
          color: var(--espresso-soft);
          font-size: 14px;
          line-height: 1.7;
        }

        .hl-arch-scene {
          min-height: 100vh;
          position: relative;
          display: grid;
          grid-template-columns: 0.78fr 1.22fr;
          gap: clamp(50px, 8vw, 120px);
          align-items: center;
          padding-top: 90px;
        }

        .hl-arch-nav {
          padding-top: 100px;
        }

        .hl-arch-step {
          position: relative;
          display: grid;
          grid-template-columns: 52px 1fr;
          gap: 15px;
          min-height: 84px;
          padding-bottom: 22px;
          cursor: default;
        }

        .hl-arch-step-marker {
          position: relative;
          display: flex;
          justify-content: center;
        }

        .hl-arch-step-marker::before {
          content: '';
          position: absolute;
          top: 33px;
          bottom: -2px;
          width: 1px;
          background: var(--border);
        }

        .hl-arch-step:last-child .hl-arch-step-marker::before {
          display: none;
        }

        .hl-arch-step-number {
          position: relative;
          z-index: 2;
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border: 1px solid var(--border);
          border-radius: 50%;
          background: var(--cream);
          color: #857B71;
          font-size: 9px;
          font-weight: 900;
          transition:
            background 240ms ease,
            color 240ms ease,
            border-color 240ms ease,
            transform 240ms ease;
        }

        .hl-arch-step.active .hl-arch-step-number {
          background: var(--espresso);
          border-color: var(--espresso);
          color: var(--cream);
          transform: scale(1.08);
        }

        .hl-arch-step-title {
          margin-top: 1px;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 22px;
          line-height: 1.1;
          letter-spacing: -0.03em;
          transition: color 220ms ease;
        }

        .hl-arch-step.active .hl-arch-step-title {
          color: var(--olive-dark);
        }

        .hl-arch-step-desc {
          max-width: 330px;
          margin: 6px 0 0;
          color: #847B72;
          font-size: 10px;
          line-height: 1.55;
        }

        .hl-arch-step-label {
          display: inline-block;
          margin-top: 8px;
          padding: 6px 8px;
          border-radius: 999px;
          background: #ECE8DE;
          color: #7A7168;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .hl-arch-step.active .hl-arch-step-label {
          background: #E9EEE0;
          color: var(--olive-dark);
        }

        .hl-arch-stage {
          position: relative;
          min-height: 570px;
          display: grid;
          place-items: center;
        }

        .hl-arch-stage-bg {
          position: absolute;
          width: min(620px, 48vw);
          aspect-ratio: 1;
          border: 1px solid rgba(111,125,85,0.13);
          border-radius: 50%;
        }

        .hl-arch-stage-bg::before,
        .hl-arch-stage-bg::after {
          content: '';
          position: absolute;
          border: 1px dashed rgba(111,125,85,0.12);
          border-radius: 50%;
        }

        .hl-arch-stage-bg::before {
          inset: 15%;
        }

        .hl-arch-stage-bg::after {
          inset: 30%;
          border-style: solid;
          opacity: 0.6;
        }

        .hl-arch-card {
          position: relative;
          width: min(510px, 90%);
          min-height: 425px;
          padding: 34px;
          border-radius: 30px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.82);
          box-shadow:
            0 35px 90px rgba(48,43,37,0.11),
            0 10px 30px rgba(48,43,37,0.05);
          overflow: hidden;
          z-index: 2;
        }

        .hl-arch-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding-bottom: 23px;
          border-bottom: 1px solid #E8E2D7;
        }

        .hl-arch-card-index {
          color: var(--olive-dark);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .hl-arch-card-title {
          margin-top: 8px;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 31px;
          line-height: 1;
          letter-spacing: -0.04em;
          font-weight: 500;
        }

        .hl-arch-card-pill {
          padding: 8px 10px;
          border: 1px solid var(--border);
          border-radius: 999px;
          color: #7D746B;
          font-size: 8px;
          line-height: 1;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          white-space: nowrap;
        }

        .hl-arch-card-copy {
          max-width: 420px;
          margin: 19px 0 0;
          color: #6F665D;
          font-size: 12px;
          line-height: 1.7;
        }

        .hl-visual {
          position: absolute;
          left: 34px;
          right: 34px;
          bottom: 34px;
          top: 205px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hl-upload-visual {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 16px;
        }

        .hl-file-box,
        .hl-storage-box {
          padding: 20px;
          border: 1px solid var(--border);
          border-radius: 19px;
          background: #FAF8F3;
        }

        .hl-file-icon,
        .hl-storage-icon {
          width: 39px;
          height: 39px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: var(--espresso);
          color: var(--cream);
          margin-bottom: 14px;
        }

        .hl-visual-title {
          font-size: 11px;
          font-weight: 900;
        }

        .hl-visual-sub {
          margin-top: 5px;
          color: #857B72;
          font-size: 9px;
          line-height: 1.45;
        }

        .hl-arrow {
          color: var(--olive);
          font-size: 18px;
          font-weight: 900;
        }

        .hl-normalize-visual {
          width: 100%;
          display: grid;
          grid-template-columns: 0.75fr 1fr;
          gap: 13px;
        }

        .hl-document-mini,
        .hl-profile-mini {
          min-height: 170px;
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: 17px;
          background: #FAF8F3;
        }

        .hl-mini-heading {
          margin-bottom: 12px;
          color: #81786F;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .hl-mini-line {
          height: 7px;
          margin: 8px 0;
          border-radius: 999px;
          background: #E7E1D6;
        }

        .hl-mini-line.short {
          width: 58%;
        }

        .hl-mini-line.mid {
          width: 76%;
        }

        .hl-profile-tag {
          display: inline-flex;
          padding: 7px 8px;
          margin: 3px;
          border-radius: 999px;
          background: #ECEFE5;
          color: var(--olive-dark);
          font-size: 8px;
          font-weight: 800;
        }

        .hl-embed-visual {
          width: 100%;
        }

        .hl-embedding-label {
          margin-bottom: 10px;
          color: #7F766D;
          font-size: 8px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-weight: 900;
        }

        .hl-vector-field {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 6px;
          padding: 15px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: #FAF8F3;
        }

        .hl-vector-cell {
          height: 18px;
          border-radius: 5px;
          background: #DFE5D4;
          opacity: 0.55;
          animation: hl-pulse 2.8s ease-in-out infinite;
        }

        .hl-vector-cell:nth-child(2n) {
          background: #CFD7BF;
          animation-delay: 120ms;
        }

        .hl-vector-cell:nth-child(3n) {
          background: #BFCBA7;
          animation-delay: 240ms;
        }

        @keyframes hl-pulse {
          0%, 100% {
            transform: scaleY(0.72);
            opacity: 0.45;
          }
          50% {
            transform: scaleY(1);
            opacity: 0.9;
          }
        }

        .hl-embed-meta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-top: 12px;
        }

        .hl-embed-stat {
          flex: 1;
          padding: 12px;
          border-radius: 13px;
          background: #F0EEE7;
        }

        .hl-embed-stat strong {
          display: block;
          font-size: 16px;
          line-height: 1;
        }

        .hl-embed-stat span {
          display: block;
          margin-top: 5px;
          color: #847B72;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .hl-search-visual {
          width: 100%;
        }

        .hl-query-box {
          padding: 15px;
          border-radius: 15px;
          background: var(--espresso);
          color: var(--cream);
        }

        .hl-query-label {
          color: #9C958B;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 900;
        }

        .hl-query-text {
          margin-top: 7px;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 18px;
          letter-spacing: -0.02em;
        }

        .hl-search-results {
          display: grid;
          gap: 8px;
          margin-top: 12px;
        }

        .hl-search-result {
          display: grid;
          grid-template-columns: 31px 1fr auto;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border: 1px solid var(--border);
          border-radius: 13px;
          background: #FAF8F3;
        }

        .hl-search-rank {
          width: 29px;
          height: 29px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          background: #ECE8DE;
          color: #6F665D;
          font-size: 9px;
          font-weight: 900;
        }

        .hl-search-result:first-child .hl-search-rank {
          background: #E8EDDE;
          color: var(--olive-dark);
        }

        .hl-search-name {
          font-size: 10px;
          font-weight: 900;
        }

        .hl-search-role {
          margin-top: 3px;
          color: #857C73;
          font-size: 8px;
        }

        .hl-search-score {
          font-size: 11px;
          color: var(--olive-dark);
          font-weight: 900;
        }

        .hl-explain-visual {
          width: 100%;
        }

        .hl-score-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: 17px;
          background: #FAF8F3;
        }

        .hl-score-main {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .hl-score-circle {
          width: 72px;
          height: 72px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background:
            radial-gradient(circle at center, #FAF8F3 54%, transparent 55%),
            conic-gradient(var(--olive) 0 97.4%, #E3DED2 97.4% 100%);
        }

        .hl-score-circle span {
          font-size: 16px;
          font-weight: 900;
        }

        .hl-score-name {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 19px;
          line-height: 1;
        }

        .hl-score-role {
          margin-top: 5px;
          color: #847B72;
          font-size: 9px;
        }

        .hl-evidence-list {
          margin-top: 12px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }

        .hl-evidence {
          padding: 10px;
          border-radius: 11px;
          background: #ECEFE5;
          color: var(--olive-dark);
          font-size: 8px;
          line-height: 1.45;
          font-weight: 800;
        }

        .hl-gap {
          padding: 10px;
          border-radius: 11px;
          background: #F3EAE1;
          color: #8A6250;
          font-size: 8px;
          line-height: 1.45;
          font-weight: 800;
        }

        .hl-progress-bar {
          position: absolute;
          left: 0;
          right: 0;
          bottom: -1px;
          height: 3px;
          background: #E3DDD0;
        }

        .hl-progress-fill {
          height: 100%;
          width: ${lineProgress * 100}%;
          background: var(--olive);
          transition: width 80ms linear;
        }

        .hl-progress-dots {
          position: absolute;
          left: 0;
          right: 0;
          bottom: -8px;
          display: flex;
          justify-content: space-between;
          pointer-events: none;
        }

        .hl-progress-dot {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          border: 3px solid var(--cream);
          background: #C9C2B5;
          box-shadow: 0 0 0 1px var(--border);
          transition:
            background 180ms ease,
            transform 180ms ease;
        }

        .hl-progress-dot.active {
          background: var(--olive);
          transform: scale(1.1);
        }

        .hl-final-note {
          position: absolute;
          right: 0;
          bottom: 6vh;
          max-width: 270px;
          color: #887F75;
          font-size: 10px;
          line-height: 1.5;
          text-align: right;
          z-index: 5;
        }

        .hl-final-note strong {
          color: var(--espresso);
          font-size: 11px;
        }

        @media (max-width: 950px) {
          .hl-architecture {
            min-height: auto;
          }

          .hl-arch-sticky {
            position: relative;
            min-height: auto;
            padding: 105px 0 120px;
          }

          .hl-arch-intro {
            position: relative;
            top: auto;
            left: auto;
            margin-bottom: 70px;
          }

          .hl-arch-scene {
            grid-template-columns: 1fr;
            gap: 35px;
            padding-top: 0;
          }

          .hl-arch-nav {
            padding-top: 0;
          }

          .hl-arch-step {
            min-height: 70px;
          }

          .hl-arch-stage {
            min-height: 500px;
          }

          .hl-final-note {
            position: relative;
            right: auto;
            bottom: auto;
            margin: 25px 0 0 auto;
          }
        }

        @media (max-width: 620px) {
          .hl-arch-shell {
            width: min(100% - 30px, 1180px);
          }

          .hl-arch-title {
            font-size: 46px;
          }

          .hl-arch-card {
            min-height: 420px;
            padding: 24px;
            border-radius: 23px;
          }

          .hl-arch-card-title {
            font-size: 27px;
          }

          .hl-visual {
            left: 24px;
            right: 24px;
            top: 195px;
          }

          .hl-upload-visual {
            grid-template-columns: 1fr;
          }

          .hl-arrow {
            transform: rotate(90deg);
            justify-self: center;
          }

          .hl-normalize-visual {
            grid-template-columns: 1fr;
          }

          .hl-profile-mini {
            min-height: 115px;
          }

          .hl-document-mini {
            min-height: 115px;
          }

          .hl-vector-field {
            grid-template-columns: repeat(6, 1fr);
          }

          .hl-evidence-list {
            grid-template-columns: 1fr;
          }

          .hl-arch-stage-bg {
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hl-vector-cell {
            animation: none;
          }

          .hl-arch-step-number,
          .hl-arch-step-title,
          .hl-progress-dot {
            transition: none;
          }
        }
      `}</style>

      <div className="hl-arch-sticky">
        <div className="hl-arch-shell">
          <div
            className="hl-arch-intro"
            style={{
              opacity: 1 - clamp(progress / 0.34) * 0.55,
            }}
          >
            <div className="hl-arch-kicker">
              <span className="hl-arch-kicker-dot" />
              Behind the product
            </div>

            <h2 className="hl-arch-title">
              From resume
              <br />
              to <em>hiring signal.</em>
            </h2>

            <p className="hl-arch-description">
              HireLabs moves through a simple five-stage pipeline: securely
              ingest the resume, understand its meaning, create a searchable
              representation, compare it against the role, and explain the
              result.
            </p>
          </div>

          <div className="hl-arch-scene">
            <div className="hl-arch-nav">
              {steps.map((step, index) => {
                const isActive = index === activeIndex;
                const isPassed = index < activeIndex;

                return (
                  <div
                    key={step.num}
                    className={`hl-arch-step ${
                      isActive || isPassed ? 'active' : ''
                    }`}
                  >
                    <div className="hl-arch-step-marker">
                      <div className="hl-arch-step-number">
                        {step.num}
                      </div>
                    </div>

                    <div>
                      <div className="hl-arch-step-title">
                        {step.title}
                      </div>

                      <p className="hl-arch-step-desc">
                        {step.desc}
                      </p>

                      <span className="hl-arch-step-label">
                        {step.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hl-arch-stage">
              <div className="hl-arch-stage-bg" />

              <div className="hl-arch-card">
                <div className="hl-arch-card-top">
                  <div>
                    <div className="hl-arch-card-index">
                      Stage {String(activeIndex + 1).padStart(2, '0')}
                    </div>

                    <div className="hl-arch-card-title">
                      {steps[activeIndex].short}
                    </div>
                  </div>

                  <div className="hl-arch-card-pill">
                    {steps[activeIndex].label}
                  </div>
                </div>

                <p className="hl-arch-card-copy">
                  {steps[activeIndex].desc}
                </p>

                <div className="hl-visual">
                  {steps[activeIndex].visual === 'upload' && (
                    <div className="hl-upload-visual">
                      <div className="hl-file-box">
                        <div className="hl-file-icon">
                          <svg
                            width="19"
                            height="19"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>

                        <div className="hl-visual-title">
                          alex-mercer.pdf
                        </div>

                        <div className="hl-visual-sub">
                          PDF · 2.4 MB
                        </div>
                      </div>

                      <div className="hl-arrow">→</div>

                      <div className="hl-storage-box">
                        <div className="hl-storage-icon">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path d="M3 7h18" />
                            <path d="M5 7v13h14V7" />
                            <path d="M8 3h8l2 4H6z" />
                          </svg>
                        </div>

                        <div className="hl-visual-title">
                          Private storage
                        </div>

                        <div className="hl-visual-sub">
                          user-scoped Supabase bucket
                        </div>
                      </div>
                    </div>
                  )}

                  {steps[activeIndex].visual === 'normalize' && (
                    <div className="hl-normalize-visual">
                      <div className="hl-document-mini">
                        <div className="hl-mini-heading">
                          Raw resume
                        </div>

                        <div className="hl-mini-line" />
                        <div className="hl-mini-line mid" />
                        <div className="hl-mini-line" />
                        <div className="hl-mini-line short" />
                        <div className="hl-mini-line mid" />
                        <div className="hl-mini-line" />
                      </div>

                      <div className="hl-profile-mini">
                        <div className="hl-mini-heading">
                          Gemini profile
                        </div>

                        <span className="hl-profile-tag">
                          React
                        </span>

                        <span className="hl-profile-tag">
                          PostgreSQL
                        </span>

                        <span className="hl-profile-tag">
                          AI / ML
                        </span>

                        <span className="hl-profile-tag">
                          8 yrs
                        </span>

                        <span className="hl-profile-tag">
                          Next.js
                        </span>
                      </div>
                    </div>
                  )}

                  {steps[activeIndex].visual === 'embed' && (
                    <div className="hl-embed-visual">
                      <div className="hl-embedding-label">
                        Gemini Embedding-002
                      </div>

                      <div className="hl-vector-field">
                        {Array.from({ length: 40 }).map((_, index) => (
                          <span
                            className="hl-vector-cell"
                            key={index}
                          />
                        ))}
                      </div>

                      <div className="hl-embed-meta">
                        <div className="hl-embed-stat">
                          <strong>1536</strong>
                          <span>dimensions</span>
                        </div>

                        <div className="hl-embed-stat">
                          <strong>Vector</strong>
                          <span>representation</span>
                        </div>

                        <div className="hl-embed-stat">
                          <strong>Searchable</strong>
                          <span>signal</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {steps[activeIndex].visual === 'search' && (
                    <div className="hl-search-visual">
                      <div className="hl-query-box">
                        <div className="hl-query-label">
                          Semantic query
                        </div>

                        <div className="hl-query-text">
                          Senior Full-Stack AI Engineer
                        </div>
                      </div>

                      <div className="hl-search-results">
                        <div className="hl-search-result">
                          <div className="hl-search-rank">
                            #1
                          </div>

                          <div>
                            <div className="hl-search-name">
                              Alex Mercer
                            </div>
                            <div className="hl-search-role">
                              Lead Full-Stack AI Engineer
                            </div>
                          </div>

                          <div className="hl-search-score">
                            97.4%
                          </div>
                        </div>

                        <div className="hl-search-result">
                          <div className="hl-search-rank">
                            #2
                          </div>

                          <div>
                            <div className="hl-search-name">
                              Dr. Sarah Lin
                            </div>
                            <div className="hl-search-role">
                              Staff ML &amp; Vector Systems Engineer
                            </div>
                          </div>

                          <div className="hl-search-score">
                            84.7%
                          </div>
                        </div>

                        <div className="hl-search-result">
                          <div className="hl-search-rank">
                            #3
                          </div>

                          <div>
                            <div className="hl-search-name">
                              Elena Rostova
                            </div>
                            <div className="hl-search-role">
                              Principal Cloud Architect
                            </div>
                          </div>

                          <div className="hl-search-score">
                            71.2%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {steps[activeIndex].visual === 'explain' && (
                    <div className="hl-explain-visual">
                      <div className="hl-score-card">
                        <div className="hl-score-main">
                          <div className="hl-score-circle">
                            <span>97%</span>
                          </div>

                          <div>
                            <div className="hl-score-name">
                              Alex Mercer
                            </div>

                            <div className="hl-score-role">
                              Lead Full-Stack AI Engineer
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="hl-evidence-list">
                        <div className="hl-evidence">
                          ✓ Next.js App Router experience
                        </div>

                        <div className="hl-evidence">
                          ✓ PostgreSQL + pgvector
                        </div>

                        <div className="hl-evidence">
                          ✓ AI / ML background
                        </div>

                        <div className="hl-gap">
                          Gap: limited Kubernetes experience
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="hl-progress-bar">
                  <div className="hl-progress-fill" />
                </div>

                <div className="hl-progress-dots">
                  {steps.map((step, index) => (
                    <span
                      key={step.num}
                      className={`hl-progress-dot ${
                        index <= activeIndex ? 'active' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="hl-final-note">
                <strong>One pipeline. One hiring signal.</strong>
                <br />
                Built to keep the technical complexity underneath a simple
                recruiting experience.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}