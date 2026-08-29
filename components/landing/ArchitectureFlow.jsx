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
      desc: 'AI generates evidence quotes and flags gap analysis for HR decision support.',
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

    window.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

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
          --white: #FFFFFF;
          --espresso: #211C18;
          --espresso-soft: #615850;
          --olive: #6F7D55;
          --olive-dark: #596544;
          --border: #DED7CA;

          position: relative;
          min-height: 430vh;

          background: var(--cream);
          color: var(--espresso);

          overflow: clip;
        }

        .hl-architecture *,
        .hl-architecture *::before,
        .hl-architecture *::after {
          box-sizing: border-box;
        }

        /* ================================
           STICKY AREA
           ================================ */

        .hl-arch-sticky {
          position: sticky;
          top: 0;

          min-height: 100vh;

          display: flex;
          align-items: center;

          padding: 100px 0 75px;

          overflow: hidden;
        }

        .hl-arch-shell {
          width: min(1180px, calc(100% - 56px));

          margin: 0 auto;

          position: relative;
        }

        /* ================================
           INTRO
           ================================ */

        .hl-arch-intro {
          position: relative;

          width: min(760px, 100%);

          margin-bottom: 52px;

          z-index: 5;

          transition: opacity 180ms linear;
        }

        .hl-arch-kicker {
          display: flex;
          align-items: center;
          gap: 9px;

          margin-bottom: 15px;

          color: var(--olive-dark);

          font-size: 10px;
          line-height: 1;
          font-weight: 800;

          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .hl-arch-kicker-dot {
          width: 7px;
          height: 7px;

          flex: 0 0 7px;

          border-radius: 50%;

          background: var(--olive);

          box-shadow:
            0 0 0 4px rgba(111,125,85,0.11);
        }

        .hl-arch-title {
          margin: 0;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size: clamp(48px, 5.3vw, 74px);

          line-height: 0.93;

          letter-spacing: -0.055em;

          font-weight: 500;
        }

        .hl-arch-title em {
          color: var(--olive);
          font-style: italic;
        }

        .hl-arch-description {
          max-width: 650px;

          margin: 17px 0 0;

          color: var(--espresso-soft);

          font-size: 13px;
          line-height: 1.68;
        }

        /* ================================
           STORY LAYOUT
           ================================ */

        .hl-arch-story {
          display: grid;

          grid-template-columns:
            minmax(300px, 0.78fr)
            minmax(0, 1.22fr);

          gap: clamp(40px, 6vw, 90px);

          align-items: center;
        }

        /* ================================
           STEPS
           ================================ */

        .hl-arch-nav {
          min-width: 0;
        }

        .hl-arch-step {
          position: relative;

          display: grid;

          grid-template-columns:
            48px
            minmax(0, 1fr);

          gap: 14px;

          min-height: 78px;

          padding-bottom: 18px;
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
          bottom: -1px;

          width: 1px;

          background: var(--border);
        }

        .hl-arch-step:last-child
          .hl-arch-step-marker::before {
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
            background 220ms ease,
            color 220ms ease,
            border-color 220ms ease,
            transform 220ms ease;
        }

        .hl-arch-step.active
          .hl-arch-step-number {
          background: var(--espresso);
          border-color: var(--espresso);
          color: var(--cream);

          transform: scale(1.06);
        }

        .hl-arch-step-title {
          margin-top: 2px;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size: 21px;

          line-height: 1.05;

          letter-spacing: -0.03em;

          transition: color 220ms ease;
        }

        .hl-arch-step.active
          .hl-arch-step-title {
          color: var(--olive-dark);
        }

        .hl-arch-step-desc {
          max-width: 345px;

          margin: 6px 0 0;

          color: #847B72;

          font-size: 9px;

          line-height: 1.5;
        }

        .hl-arch-step-label {
          display: inline-block;

          margin-top: 7px;

          padding: 5px 7px;

          border-radius: 999px;

          background: #ECE8DE;

          color: #7A7168;

          font-size: 6.5px;

          line-height: 1;

          font-weight: 900;

          letter-spacing: 0.1em;

          text-transform: uppercase;

          transition:
            background 220ms ease,
            color 220ms ease;
        }

        .hl-arch-step.active
          .hl-arch-step-label {
          background: #E9EEE0;
          color: var(--olive-dark);
        }

        /* ================================
           RIGHT SIDE
           ================================ */

        .hl-arch-stage {
          min-width: 0;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          gap: 20px;
        }

        .hl-arch-card-wrap {
          position: relative;

          width: 100%;

          min-height: 520px;

          display: grid;

          place-items: center;
        }

        .hl-arch-stage-bg {
          position: absolute;

          width: min(580px, 94%);

          aspect-ratio: 1;

          border:
            1px solid
            rgba(111,125,85,0.13);

          border-radius: 50%;
        }

        .hl-arch-stage-bg::before,
        .hl-arch-stage-bg::after {
          content: '';

          position: absolute;

          border:
            1px dashed
            rgba(111,125,85,0.11);

          border-radius: 50%;
        }

        .hl-arch-stage-bg::before {
          inset: 15%;
        }

        .hl-arch-stage-bg::after {
          inset: 30%;

          border-style: solid;

          opacity: 0.55;
        }

        /* ================================
           MAIN CARD
           ================================ */

        .hl-arch-card {
          position: relative;
          z-index: 3;

          width: min(500px, 88%);

          min-height: 400px;

          padding: 30px;

          border:
            1px solid
            var(--border);

          border-radius: 28px;

          background:
            rgba(255,255,255,0.89);

          box-shadow:
            0 30px 75px
            rgba(48,43,37,0.1),
            0 9px 27px
            rgba(48,43,37,0.045);

          overflow: hidden;
        }

        .hl-arch-card-top {
          display: flex;

          align-items: flex-start;

          justify-content: space-between;

          gap: 16px;

          padding-bottom: 20px;

          border-bottom:
            1px solid
            #E8E2D7;
        }

        .hl-arch-card-index {
          color: var(--olive-dark);

          font-size: 8px;

          line-height: 1;

          font-weight: 900;

          letter-spacing: 0.15em;

          text-transform: uppercase;
        }

        .hl-arch-card-title {
          margin-top: 7px;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size: 29px;

          line-height: 1;

          letter-spacing: -0.04em;

          font-weight: 500;
        }

        .hl-arch-card-pill {
          flex-shrink: 0;

          padding: 7px 9px;

          border:
            1px solid
            var(--border);

          border-radius: 999px;

          color: #7D746B;

          font-size: 7px;

          line-height: 1;

          font-weight: 800;

          letter-spacing: 0.08em;

          text-transform: uppercase;

          white-space: nowrap;
        }

        .hl-arch-card-copy {
          max-width: 410px;

          margin: 16px 0 0;

          color: #6F665D;

          font-size: 11px;

          line-height: 1.6;
        }

        /* ================================
           VISUAL AREA
           ================================ */

        .hl-visual {
          min-height: 205px;

          margin-top: 28px;

          display: flex;

          align-items: center;
          justify-content: center;
        }

        /* ================================
           UPLOAD
           ================================ */

        .hl-upload-visual {
          width: 100%;

          display: grid;

          grid-template-columns:
            minmax(0, 1fr)
            auto
            minmax(0, 1fr);

          align-items: center;

          gap: 13px;
        }

        .hl-file-box,
        .hl-storage-box {
          min-width: 0;

          padding: 18px;

          border:
            1px solid
            var(--border);

          border-radius: 17px;

          background: #FAF8F3;
        }

        .hl-file-icon,
        .hl-storage-icon {
          width: 36px;
          height: 36px;

          display: grid;
          place-items: center;

          margin-bottom: 12px;

          border-radius: 11px;

          background: var(--espresso);

          color: var(--cream);
        }

        .hl-visual-title {
          font-size: 10px;

          line-height: 1.25;

          font-weight: 900;
        }

        .hl-visual-sub {
          margin-top: 5px;

          color: #857B72;

          font-size: 8px;

          line-height: 1.4;
        }

        .hl-arrow {
          color: var(--olive);

          font-size: 17px;

          font-weight: 900;
        }

        /* ================================
           NORMALIZE
           ================================ */

        .hl-normalize-visual {
          width: 100%;

          display: grid;

          grid-template-columns:
            minmax(0, 0.8fr)
            minmax(0, 1fr);

          gap: 11px;
        }

        .hl-document-mini,
        .hl-profile-mini {
          min-height: 155px;

          padding: 15px;

          border:
            1px solid
            var(--border);

          border-radius: 16px;

          background: #FAF8F3;
        }

        .hl-mini-heading {
          margin-bottom: 11px;

          color: #81786F;

          font-size: 7px;

          font-weight: 900;

          letter-spacing: 0.1em;

          text-transform: uppercase;
        }

        .hl-mini-line {
          height: 6px;

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

          padding: 6px 7px;

          margin: 3px;

          border-radius: 999px;

          background: #ECEFE5;

          color: var(--olive-dark);

          font-size: 7px;

          font-weight: 800;
        }

        /* ================================
           EMBEDDING
           ================================ */

        .hl-embed-visual {
          width: 100%;
        }

        .hl-embedding-label {
          margin-bottom: 9px;

          color: #7F766D;

          font-size: 7px;

          letter-spacing: 0.1em;

          text-transform: uppercase;

          font-weight: 900;
        }

        .hl-vector-field {
          display: grid;

          grid-template-columns:
            repeat(8, 1fr);

          gap: 5px;

          padding: 13px;

          border:
            1px solid
            var(--border);

          border-radius: 16px;

          background: #FAF8F3;
        }

        .hl-vector-cell {
          height: 16px;

          border-radius: 5px;

          background: #DFE5D4;

          opacity: 0.55;

          animation:
            hl-vector-pulse
            2.8s
            ease-in-out
            infinite;
        }

        .hl-vector-cell:nth-child(2n) {
          background: #CFD7BF;

          animation-delay: 120ms;
        }

        .hl-vector-cell:nth-child(3n) {
          background: #BFCBA7;

          animation-delay: 240ms;
        }

        @keyframes hl-vector-pulse {
          0%,
          100% {
            transform: scaleY(0.72);
            opacity: 0.45;
          }

          50% {
            transform: scaleY(1);
            opacity: 0.9;
          }
        }

        .hl-embed-meta {
          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          gap: 8px;

          margin-top: 10px;
        }

        .hl-embed-stat {
          padding: 11px;

          border-radius: 11px;

          background: #F0EEE7;
        }

        .hl-embed-stat strong {
          display: block;

          font-size: 14px;

          line-height: 1;
        }

        .hl-embed-stat span {
          display: block;

          margin-top: 5px;

          color: #847B72;

          font-size: 7px;

          text-transform: uppercase;

          letter-spacing: 0.08em;
        }

        /* ================================
           SEARCH
           ================================ */

        .hl-search-visual {
          width: 100%;
        }

        .hl-query-box {
          padding: 13px;

          border-radius: 14px;

          background: var(--espresso);

          color: var(--cream);
        }

        .hl-query-label {
          color: #9C958B;

          font-size: 7px;

          text-transform: uppercase;

          letter-spacing: 0.1em;

          font-weight: 900;
        }

        .hl-query-text {
          margin-top: 6px;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size: 16px;

          letter-spacing: -0.02em;
        }

        .hl-search-results {
          display: grid;

          gap: 7px;

          margin-top: 10px;
        }

        .hl-search-result {
          display: grid;

          grid-template-columns:
            29px
            minmax(0, 1fr)
            auto;

          align-items: center;

          gap: 9px;

          padding: 8px;

          border:
            1px solid
            var(--border);

          border-radius: 12px;

          background: #FAF8F3;
        }

        .hl-search-rank {
          width: 27px;
          height: 27px;

          display: grid;
          place-items: center;

          border-radius: 8px;

          background: #ECE8DE;

          color: #6F665D;

          font-size: 8px;

          font-weight: 900;
        }

        .hl-search-result:first-child
          .hl-search-rank {
          background: #E8EDDE;

          color: var(--olive-dark);
        }

        .hl-search-name {
          font-size: 9px;

          font-weight: 900;
        }

        .hl-search-role {
          margin-top: 2px;

          color: #857C73;

          font-size: 7px;
        }

        .hl-search-score {
          color: var(--olive-dark);

          font-size: 10px;

          font-weight: 900;
        }

        /* ================================
           EXPLAIN / RANK
           ================================ */

        .hl-explain-visual {
          width: 100%;
        }

        .hl-score-card {
          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 13px;

          padding: 15px;

          border:
            1px solid
            var(--border);

          border-radius: 16px;

          background: #FAF8F3;
        }

        .hl-score-main {
          display: flex;

          align-items: center;

          gap: 12px;
        }

        .hl-score-circle {
          width: 66px;
          height: 66px;

          display: grid;
          place-items: center;

          border-radius: 50%;

          background:
            radial-gradient(
              circle at center,
              #FAF8F3 54%,
              transparent 55%
            ),
            conic-gradient(
              var(--olive)
              0 97.4%,
              #E3DED2
              97.4% 100%
            );
        }

        .hl-score-circle span {
          font-size: 15px;

          font-weight: 900;
        }

        .hl-score-name {
          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size: 18px;

          line-height: 1;
        }

        .hl-score-role {
          margin-top: 5px;

          color: #847B72;

          font-size: 8px;
        }

        .hl-evidence-list {
          display: grid;

          grid-template-columns:
            1fr
            1fr;

          gap: 6px;

          margin-top: 9px;
        }

        .hl-evidence,
        .hl-gap {
          padding: 9px;

          border-radius: 10px;

          font-size: 7px;

          line-height: 1.4;

          font-weight: 800;
        }

        .hl-evidence {
          background: #ECEFE5;

          color: var(--olive-dark);
        }

        .hl-gap {
          background: #F3EAE1;

          color: #8A6250;
        }

        /* ================================
           FINAL NOTE
           THIS IS THE IMPORTANT FIX
           ================================ */

        .hl-final-note {
          position: relative;

          width: min(500px, 88%);

          margin: 0 auto;

          padding:
            15px
            4px
            0;

          border-top:
            1px solid
            var(--border);

          color: #887F75;

          font-size: 9px;

          line-height: 1.55;

          text-align: right;

          z-index: 4;
        }

        .hl-final-note strong {
          display: block;

          margin-bottom: 3px;

          color: var(--espresso);

          font-size: 11px;

          font-weight: 800;
        }

        /* ================================
           TABLET
           ================================ */

        @media (max-width: 950px) {
          .hl-architecture {
            min-height: auto;
          }

          .hl-arch-sticky {
            position: relative;

            min-height: auto;

            padding:
              105px
              0
              115px;
          }

          .hl-arch-intro {
            width: 100%;

            margin-bottom: 55px;
          }

          .hl-arch-story {
            grid-template-columns: 1fr;

            gap: 45px;
          }

          .hl-arch-stage {
            width: 100%;
          }

          .hl-arch-card-wrap {
            min-height: 500px;
          }

          .hl-final-note {
            width: min(500px, 88%);

            text-align: left;
          }
        }

        /* ================================
           MOBILE
           ================================ */

        @media (max-width: 620px) {
          .hl-arch-shell {
            width: min(100% - 28px, 1180px);
          }

          .hl-arch-title {
            font-size: 46px;
          }

          .hl-arch-description {
            font-size: 12px;
          }

          .hl-arch-step {
            grid-template-columns:
              43px
              minmax(0, 1fr);

            min-height: 67px;
          }

          .hl-arch-step-title {
            font-size: 19px;
          }

          .hl-arch-step-desc {
            font-size: 8px;
          }

          .hl-arch-card-wrap {
            min-height: 510px;
          }

          .hl-arch-card {
            width: 94%;

            min-height: 405px;

            padding: 23px;

            border-radius: 22px;
          }

          .hl-arch-card-title {
            font-size: 25px;
          }

          .hl-arch-card-copy {
            font-size: 10px;
          }

          .hl-visual {
            min-height: 205px;

            margin-top: 24px;
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

          .hl-document-mini,
          .hl-profile-mini {
            min-height: 112px;
          }

          .hl-vector-field {
            grid-template-columns:
              repeat(6, 1fr);
          }

          .hl-evidence-list {
            grid-template-columns: 1fr;
          }

          .hl-final-note {
            width: 94%;

            padding-top: 13px;

            text-align: left;

            font-size: 8px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hl-vector-cell,
          .hl-arch-step-number,
          .hl-arch-step-title,
          .hl-arch-step-label,
          .hl-progress-dot {
            animation: none !important;

            transition: none !important;
          }
        }
      `}</style>

      <div className="hl-arch-sticky">
        <div className="hl-arch-shell">

          {/* =========================================
              INTRO
             ========================================= */}

          <div className="hl-arch-intro">
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

          {/* =========================================
              STORY
             ========================================= */}

          <div className="hl-arch-story">

            {/* LEFT SIDE */}

            <div className="hl-arch-nav">
              {steps.map((step, index) => {
                const isActive = index === activeIndex;
                const isPassed = index < activeIndex;

                return (
                  <div
                    key={step.num}
                    className={`hl-arch-step ${
                      isActive || isPassed
                        ? 'active'
                        : ''
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

            {/* RIGHT SIDE */}

            <div className="hl-arch-stage">

              {/* Card gets its own wrapper */}
              <div className="hl-arch-card-wrap">

                <div className="hl-arch-stage-bg" />

                <div className="hl-arch-card">

                  <div className="hl-arch-card-top">
                    <div>
                      <div className="hl-arch-card-index">
                        Stage{' '}
                        {String(activeIndex + 1).padStart(
                          2,
                          '0'
                        )}
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

                  {/* VISUAL */}

                  <div className="hl-visual">

                    {/* -------------------------
                        Stage 1
                       ------------------------- */}

                    {steps[activeIndex].visual ===
                      'upload' && (
                      <div className="hl-upload-visual">

                        <div className="hl-file-box">
                          <div className="hl-file-icon">
                            <svg
                              width="18"
                              height="18"
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

                        <div className="hl-arrow">
                          →
                        </div>

                        <div className="hl-storage-box">
                          <div className="hl-storage-icon">
                            <svg
                              width="17"
                              height="17"
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
                            User-scoped Supabase bucket
                          </div>
                        </div>

                      </div>
                    )}

                    {/* -------------------------
                        Stage 2
                       ------------------------- */}

                    {steps[activeIndex].visual ===
                      'normalize' && (
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

                    {/* -------------------------
                        Stage 3
                       ------------------------- */}

                    {steps[activeIndex].visual ===
                      'embed' && (
                      <div className="hl-embed-visual">

                        <div className="hl-embedding-label">
                          Gemini Embedding-002
                        </div>

                        <div className="hl-vector-field">
                          {Array.from({
                            length: 40,
                          }).map((_, index) => (
                            <span
                              className="hl-vector-cell"
                              key={index}
                            />
                          ))}
                        </div>

                        <div className="hl-embed-meta">

                          <div className="hl-embed-stat">
                            <strong>
                              1536
                            </strong>

                            <span>
                              dimensions
                            </span>
                          </div>

                          <div className="hl-embed-stat">
                            <strong>
                              Vector
                            </strong>

                            <span>
                              representation
                            </span>
                          </div>

                          <div className="hl-embed-stat">
                            <strong>
                              Searchable
                            </strong>

                            <span>
                              signal
                            </span>
                          </div>

                        </div>
                      </div>
                    )}

                    {/* -------------------------
                        Stage 4
                       ------------------------- */}

                    {steps[activeIndex].visual ===
                      'search' && (
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

                    {/* -------------------------
                        Stage 5
                       ------------------------- */}

                    {steps[activeIndex].visual ===
                      'explain' && (
                      <div className="hl-explain-visual">

                        <div className="hl-score-card">

                          <div className="hl-score-main">

                            <div className="hl-score-circle">
                              <span>
                                97%
                              </span>
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

                  {/* Progress */}

                  <div className="hl-progress-bar">
                    <div
                      className="hl-progress-fill"
                      style={{
                        width: `${lineProgress * 100}%`,
                      }}
                    />
                  </div>

                  <div className="hl-progress-dots">
                    {steps.map((step, index) => (
                      <span
                        key={step.num}
                        className={`hl-progress-dot ${
                          index <= activeIndex
                            ? 'active'
                            : ''
                        }`}
                      />
                    ))}
                  </div>

                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}