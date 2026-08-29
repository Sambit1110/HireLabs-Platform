'use client';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

export function ArchitectureFlow() {
  const sectionRef = useRef(null);
  const [progress, setProgress] = useState(0);

  const steps = [
    {
      num: '01',
      title: 'Secure Upload',
      short: 'Start with the source',
      desc:
        'PDF/DOCX uploaded to a user-scoped private Supabase Storage bucket.',
      label: 'PRIVATE INPUT',
      visual: 'upload',
    },
    {
      num: '02',
      title: 'LLM Normalize',
      short: 'Turn a resume into structure',
      desc:
        'Gemini extracts candidate profile, skills ontology, and work history.',
      label: 'STRUCTURED DATA',
      visual: 'normalize',
    },
    {
      num: '03',
      title: '1536-dim Embed',
      short: 'Create a searchable signal',
      desc:
        'Vector representation generated via Gemini Embedding-002 model.',
      label: 'VECTOR SIGNAL',
      visual: 'embed',
    },
    {
      num: '04',
      title: 'pgvector RPC',
      short: 'Find the closest candidates',
      desc:
        'Cosine distance calculated in Postgres filtered by signed-in auth.uid().',
      label: 'SEMANTIC SEARCH',
      visual: 'search',
    },
    {
      num: '05',
      title: 'Explain & Rank',
      short: 'Make the result useful',
      desc:
        'AI generates evidence quotes and flags gap analysis for HR decision support.',
      label: 'DECISION SUPPORT',
      visual: 'explain',
    },
  ];

  useEffect(() => {
    let frame = null;

    const updateProgress = () => {
      const section = sectionRef.current;

      if (!section) {
        return;
      }

      const rect =
        section.getBoundingClientRect();

      const viewportHeight =
        window.innerHeight;

      const totalDistance =
        Math.max(
          section.offsetHeight -
            viewportHeight,
          1
        );

      const nextProgress = Math.min(
        1,
        Math.max(
          0,
          -rect.top /
            totalDistance
        )
      );

      setProgress(
        nextProgress
      );

      frame = null;
    };

    const handleScroll = () => {
      if (frame !== null) {
        return;
      }

      frame =
        window.requestAnimationFrame(
          updateProgress
        );
    };

    updateProgress();

    window.addEventListener(
      'scroll',
      handleScroll,
      {
        passive: true,
      }
    );

    window.addEventListener(
      'resize',
      handleScroll
    );

    return () => {
      window.removeEventListener(
        'scroll',
        handleScroll
      );

      window.removeEventListener(
        'resize',
        handleScroll
      );

      if (frame !== null) {
        window.cancelAnimationFrame(
          frame
        );
      }
    };
  }, []);

  const activeIndex = Math.min(
    steps.length - 1,
    Math.floor(
      progress *
        steps.length
    )
  );

  const stagePosition =
    progress *
    (steps.length - 1);

  const activeStage =
    Math.min(
      steps.length - 1,
      Math.floor(
        stagePosition
      )
    );

  const localProgress =
    stagePosition -
    activeStage;

  const progressToNext =
    Math.min(
      1,
      Math.max(
        0,
        localProgress
      )
    );

  const lineProgress =
    progress *
    (steps.length - 1);

  const activeStep =
    steps[activeStage];

  return (
    <section
      ref={sectionRef}
      className="hl-architecture"
      id="architecture"
    >
      <style>{`
        /* =====================================================
           ROOT
           ===================================================== */

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

          min-height:
            430vh;

          background:
            linear-gradient(
              180deg,
              #F5F1E8 0%,
              #F2ECE2 100%
            );

          color:
            var(--espresso);

          overflow: clip;

          isolation: isolate;
        }


        .hl-architecture *,
        .hl-architecture *::before,
        .hl-architecture *::after {
          box-sizing:
            border-box;
        }


        /* =====================================================
           AMBIENT FIELD
           ===================================================== */

        .hl-architecture::before {
          content: '';

          position: absolute;

          width:
            min(
              900px,
              80vw
            );

          height:
            min(
              900px,
              80vw
            );

          right:
            -390px;

          top:
            12vh;

          border:
            1px solid
            rgba(
              111,
              125,
              85,
              0.07
            );

          border-radius:
            50%;

          pointer-events:
            none;
        }


        .hl-architecture::after {
          content: '';

          position: absolute;

          width:
            520px;

          height:
            520px;

          left:
            -350px;

          bottom:
            8vh;

          border:
            1px dashed
            rgba(
              111,
              125,
              85,
              0.065
            );

          border-radius:
            50%;

          pointer-events:
            none;
        }


        /* =====================================================
           STICKY VIEWPORT
           ===================================================== */

        .hl-arch-sticky {
          position: sticky;

          top: 0;

          height: 100vh;

          min-height: 720px;

          display:
            flex;

          align-items:
            center;

          overflow: hidden;

          isolation: isolate;
        }


        .hl-arch-shell {
          position: relative;

          width:
            min(
              1210px,
              calc(100% - 64px)
            );

          height:
            100vh;

          margin:
            0 auto;
        }


        /* =====================================================
           INTRO
           ===================================================== */

        .hl-arch-intro {
          position: absolute;

          z-index: 12;

          left: 0;

          top:
            8.5vh;

          width:
            min(
              650px,
              52%
            );

          pointer-events:
            none;

          opacity:
            ${
              1 -
              Math.min(
                1,
                progress /
                  0.34
              ) *
                0.54
            };

          transform:
            translate3d(
              0,
              ${
                progress *
                -18
              }px,
              0
            );
        }


        .hl-arch-kicker {
          display:
            inline-flex;

          align-items:
            center;

          gap:
            9px;

          margin-bottom:
            18px;

          color:
            var(--olive-dark);

          font-size:
            10px;

          line-height:
            1;

          letter-spacing:
            0.15em;

          text-transform:
            uppercase;

          font-weight:
            900;
        }


        .hl-arch-kicker-dot {
          width:
            7px;

          height:
            7px;

          border-radius:
            50%;

          background:
            var(--olive);

          box-shadow:
            0 0 0 4px
            rgba(
              111,
              125,
              85,
              0.11
            );
        }


        .hl-arch-title {
          margin:
            0;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            clamp(
              52px,
              6vw,
              82px
            );

          line-height:
            0.92;

          letter-spacing:
            -0.058em;

          font-weight:
            500;
        }


        .hl-arch-title em {
          color:
            var(--olive);

          font-style:
            italic;
        }


        .hl-arch-description {
          max-width:
            610px;

          margin:
            24px 0 0;

          color:
            var(--espresso-soft);

          font-size:
            14px;

          line-height:
            1.72;
        }


        /* =====================================================
           MAIN STORY GRID
           ===================================================== */

        .hl-arch-scene {
          position: absolute;

          inset: 0;

          display:
            grid;

          grid-template-columns:
            minmax(
              300px,
              0.78fr
            )
            minmax(
              0,
              1.22fr
            );

          gap:
            clamp(
              55px,
              8vw,
              120px
            );

          align-items:
            center;

          padding-top:
            155px;

          padding-bottom:
            40px;
        }


        /* =====================================================
           LEFT PIPELINE
           ===================================================== */

        .hl-arch-nav {
          position:
            relative;

          z-index: 12;

          align-self:
            center;

          padding-top:
            112px;
        }


        .hl-arch-step {
          position:
            relative;

          display:
            grid;

          grid-template-columns:
            52px
            minmax(
              0,
              1fr
            );

          gap:
            15px;

          min-height:
            88px;

          padding-bottom:
            23px;
        }


        .hl-arch-step-marker {
          position:
            relative;

          display:
            flex;

          justify-content:
            center;
        }


        .hl-arch-step-marker::before {
          content: '';

          position:
            absolute;

          top:
            34px;

          bottom:
            -4px;

          width:
            1px;

          background:
            var(--border);

          opacity:
            0.95;
        }


        .hl-arch-step:last-child
          .hl-arch-step-marker::before {
          display:
            none;
        }


        .hl-arch-progress-line {
          position:
            absolute;

          left:
            50%;

          top:
            34px;

          bottom:
            -4px;

          width:
            2px;

          transform:
            translateX(-50%)
            scaleY(
              var(
                --step-progress,
                0
              )
            );

          transform-origin:
            top center;

          background:
            var(--olive);

          opacity:
            0.6;

          transition:
            transform 300ms
            cubic-bezier(
              0.16,
              1,
              0.3,
              1
            );
        }


        .hl-arch-step-number {
          position:
            relative;

          z-index:
            2;

          width:
            37px;

          height:
            37px;

          display:
            grid;

          place-items:
            center;

          border:
            1px solid
            var(--border);

          border-radius:
            50%;

          background:
            var(--cream);

          color:
            #857B71;

          font-size:
            9px;

          font-weight:
            900;

          transition:
            background 320ms ease,
            color 320ms ease,
            border-color 320ms ease,
            transform 320ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),
            box-shadow 320ms ease;
        }


        .hl-arch-step.active
          .hl-arch-step-number {
          background:
            var(--espresso);

          border-color:
            var(--espresso);

          color:
            var(--cream);

          transform:
            scale(
              1.11
            );

          box-shadow:
            0 12px 28px
            rgba(
              33,
              28,
              24,
              0.12
            );
        }


        .hl-arch-step-content {
          min-width:
            0;

          opacity:
            0.42;

          transform:
            translateX(0);

          transition:
            opacity 320ms ease,
            transform 320ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }


        .hl-arch-step.active
          .hl-arch-step-content {
          opacity:
            1;

          transform:
            translateX(
              5px
            );
        }


        .hl-arch-step-title {
          margin-top:
            1px;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            22px;

          line-height:
            1.1;

          letter-spacing:
            -0.03em;

          transition:
            color 320ms ease;
        }


        .hl-arch-step.active
          .hl-arch-step-title {
          color:
            var(--olive-dark);
        }


        .hl-arch-step-desc {
          max-width:
            330px;

          margin:
            7px 0 0;

          color:
            #847B72;

          font-size:
            10px;

          line-height:
            1.55;
        }


        .hl-arch-step-label {
          display:
            inline-flex;

          margin-top:
            9px;

          padding:
            6px 8px;

          border-radius:
            999px;

          background:
            #ECE8DE;

          color:
            #7A7168;

          font-size:
            7px;

          line-height:
            1;

          font-weight:
            900;

          letter-spacing:
            0.1em;

          text-transform:
            uppercase;

          transition:
            background 320ms ease,
            color 320ms ease;
        }


        .hl-arch-step.active
          .hl-arch-step-label {
          background:
            #E9EEE0;

          color:
            var(--olive-dark);
        }


        /* =====================================================
           RIGHT VISUAL STAGE
           ===================================================== */

        .hl-arch-stage {
          position:
            relative;

          align-self:
            center;

          width:
            100%;

          height:
            100vh;

          min-height:
            720px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          padding-top:
            104px;

          padding-bottom:
            34px;

          z-index:
            10;
        }


        /* =====================================================
           ORBIT FIELD
           ===================================================== */

        .hl-arch-stage-bg {
          position:
            absolute;

          left:
            50%;

          top:
            50%;

          width:
            min(
              680px,
              50vw
            );

          aspect-ratio:
            1;

          transform:
            translate(
              -50%,
              -50%
            )
            rotate(
              ${
                progress *
                -14
              }deg
            );

          border:
            1px solid
            rgba(
              111,
              125,
              85,
              0.13
            );

          border-radius:
            50%;

          pointer-events:
            none;

          transition:
            transform 140ms linear;
        }


        .hl-arch-stage-bg::before,
        .hl-arch-stage-bg::after {
          content: '';

          position:
            absolute;

          border:
            1px dashed
            rgba(
              111,
              125,
              85,
              0.12
            );

          border-radius:
            50%;
        }


        .hl-arch-stage-bg::before {
          inset:
            15%;
        }


        .hl-arch-stage-bg::after {
          inset:
            31%;

          border-style:
            solid;

          opacity:
            0.55;
        }


        /* =====================================================
           CENTRAL CARD
           ===================================================== */

        .hl-arch-card {
          position:
            relative;

          width:
            min(
              540px,
              88%
            );

          min-height:
            465px;

          padding:
            35px;

          border:
            1px solid
            var(--border);

          border-radius:
            30px;

          background:
            rgba(
              255,
              255,
              255,
              0.9
            );

          box-shadow:
            0 42px 100px
            rgba(
              48,
              43,
              37,
              0.11
            ),

            0 12px 30px
            rgba(
              48,
              43,
              37,
              0.045
            );

          overflow:
            hidden;

          z-index:
            5;

          transform:
            translate3d(
              ${
                progressToNext *
                -6
              }px,
              ${
                progressToNext *
                -4
              }px,
              0
            )
            scale(
              ${
                1 -
                progressToNext *
                0.012
              }
            );

          transition:
            transform 500ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }


        .hl-arch-card::before {
          content: '';

          position:
            absolute;

          width:
            300px;

          height:
            300px;

          right:
            -150px;

          top:
            -150px;

          border:
            1px solid
            rgba(
              111,
              125,
              85,
              0.075
            );

          border-radius:
            50%;

          pointer-events:
            none;
        }


        .hl-arch-card-top {
          display:
            flex;

          align-items:
            flex-start;

          justify-content:
            space-between;

          gap:
            20px;

          padding-bottom:
            23px;

          border-bottom:
            1px solid
            #E8E2D7;
        }


        .hl-arch-card-index {
          color:
            var(--olive-dark);

          font-size:
            9px;

          line-height:
            1;

          font-weight:
            900;

          letter-spacing:
            0.15em;

          text-transform:
            uppercase;
        }


        .hl-arch-card-title {
          margin-top:
            8px;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            31px;

          line-height:
            1;

          letter-spacing:
            -0.04em;

          font-weight:
            500;
        }


        .hl-arch-card-pill {
          flex-shrink:
            0;

          padding:
            8px 10px;

          border:
            1px solid
            var(--border);

          border-radius:
            999px;

          color:
            #7D746B;

          font-size:
            8px;

          line-height:
            1;

          font-weight:
            800;

          text-transform:
            uppercase;

          letter-spacing:
            0.08em;

          white-space:
            nowrap;
        }


        .hl-arch-card-copy {
          max-width:
            430px;

          margin:
            19px 0 0;

          color:
            #6F665D;

          font-size:
            12px;

          line-height:
            1.7;
        }


        /* =====================================================
           VISUAL AREA
           ===================================================== */

        .hl-visual {
          position:
            absolute;

          left:
            35px;

          right:
            35px;

          top:
            206px;

          bottom:
            34px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;
        }


        .hl-visual-stage {
          width:
            100%;

          animation:
            hlArchitectureStageIn
            700ms
            cubic-bezier(
              0.16,
              1,
              0.3,
              1
            );
        }


        @keyframes hlArchitectureStageIn {
          from {
            opacity:
              0;

            transform:
              translate3d(
                0,
                18px,
                0
              )
              scale(
                0.985
              );
          }

          to {
            opacity:
              1;

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
           UPLOAD
           ===================================================== */

        .hl-upload-visual {
          width:
            100%;

          display:
            grid;

          grid-template-columns:
            1fr
            auto
            1fr;

          align-items:
            center;

          gap:
            16px;
        }


        .hl-file-box,
        .hl-storage-box {
          min-width:
            0;

          padding:
            20px;

          border:
            1px solid
            var(--border);

          border-radius:
            19px;

          background:
            #FAF8F3;

          transition:
            transform 250ms ease,
            box-shadow 250ms ease;
        }


        .hl-file-box:hover,
        .hl-storage-box:hover {
          transform:
            translateY(
              -3px
            );

          box-shadow:
            0 14px 30px
            rgba(
              45,
              40,
              34,
              0.07
            );
        }


        .hl-file-icon,
        .hl-storage-icon {
          width:
            39px;

          height:
            39px;

          display:
            grid;

          place-items:
            center;

          border-radius:
            12px;

          background:
            var(--espresso);

          color:
            var(--cream);

          margin-bottom:
            14px;
        }


        .hl-visual-title {
          font-size:
            11px;

          font-weight:
            900;
        }


        .hl-visual-sub {
          margin-top:
            5px;

          color:
            #857B72;

          font-size:
            9px;

          line-height:
            1.45;
        }


        .hl-arrow {
          color:
            var(--olive);

          font-size:
            18px;

          font-weight:
            900;

          animation:
            hlArchArrow
            2.4s
            ease-in-out
            infinite;
        }


        @keyframes hlArchArrow {
          0%,
          100% {
            transform:
              translateX(
                0
              );

            opacity:
              0.55;
          }

          50% {
            transform:
              translateX(
                5px
              );

            opacity:
              1;
          }
        }


        /* =====================================================
           NORMALIZE
           ===================================================== */

        .hl-normalize-visual {
          width:
            100%;

          display:
            grid;

          grid-template-columns:
            0.75fr
            1fr;

          gap:
            13px;
        }


        .hl-document-mini,
        .hl-profile-mini {
          min-height:
            170px;

          padding:
            16px;

          border:
            1px solid
            var(--border);

          border-radius:
            17px;

          background:
            #FAF8F3;
        }


        .hl-mini-heading {
          margin-bottom:
            12px;

          color:
            #81786F;

          font-size:
            8px;

          font-weight:
            900;

          letter-spacing:
            0.1em;

          text-transform:
            uppercase;
        }


        .hl-mini-line {
          height:
            7px;

          margin:
            8px 0;

          border-radius:
            999px;

          background:
            #E7E1D6;
        }


        .hl-mini-line.short {
          width:
            58%;
        }


        .hl-mini-line.mid {
          width:
            76%;
        }


        .hl-profile-tag {
          display:
            inline-flex;

          padding:
            7px 8px;

          margin:
            3px;

          border-radius:
            999px;

          background:
            #ECEFE5;

          color:
            var(--olive-dark);

          font-size:
            8px;

          font-weight:
            800;
        }


        /* =====================================================
           EMBEDDING
           ===================================================== */

        .hl-embed-visual {
          width:
            100%;

          display:
            flex;

          flex-direction:
            column;

          justify-content:
            center;

          gap:
            14px;
        }


        .hl-embedding-label {
          margin:
            0;

          color:
            #7F766D;

          font-size:
            8px;

          line-height:
            1;

          letter-spacing:
            0.1em;

          text-transform:
            uppercase;

          font-weight:
            900;
        }


        .hl-vector-field {
          display:
            grid;

          grid-template-columns:
            repeat(
              8,
              minmax(
                0,
                1fr
              )
            );

          grid-auto-rows:
            16px;

          gap:
            6px;

          width:
            100%;

          padding:
            14px;

          border:
            1px solid
            var(--border);

          border-radius:
            17px;

          background:
            #FAF8F3;

          overflow:
            hidden;
        }


        .hl-vector-cell {
          width:
            100%;

          height:
            16px;

          border-radius:
            999px;

          background:
            #DFE5D4;

          opacity:
            0.55;

          transform-origin:
            center;

          animation:
            hlArchitecturePulse
            2.8s
            ease-in-out
            infinite;
        }


        .hl-vector-cell:nth-child(2n) {
          background:
            #CFD7BF;

          animation-delay:
            120ms;
        }


        .hl-vector-cell:nth-child(3n) {
          background:
            #BFCBA7;

          animation-delay:
            240ms;
        }


        @keyframes hlArchitecturePulse {
          0%,
          100% {
            transform:
              scaleY(
                0.72
              );

            opacity:
              0.45;
          }

          50% {
            transform:
              scaleY(
                1
              );

            opacity:
              0.9;
          }
        }


        .hl-embed-meta {
          display:
            grid;

          grid-template-columns:
            repeat(
              3,
              minmax(
                0,
                1fr
              )
            );

          gap:
            10px;

          width:
            100%;
        }


        .hl-embed-stat {
          min-width:
            0;

          padding:
            11px;

          border-radius:
            11px;

          background:
            #F0EEE7;

          overflow:
            hidden;
        }


        .hl-embed-stat strong {
          display:
            block;

          font-size:
            14px;

          line-height:
            1;

          white-space:
            nowrap;

          overflow:
            hidden;

          text-overflow:
            ellipsis;
        }


        .hl-embed-stat span {
          display:
            block;

          margin-top:
            5px;

          color:
            #847B72;

          font-size:
            7px;

          line-height:
            1.35;

          text-transform:
            uppercase;

          letter-spacing:
            0.08em;
        }


        /* =====================================================
           SEARCH
           ===================================================== */

        .hl-search-visual {
          width:
            100%;
        }


        .hl-query-box {
          padding:
            15px;

          border-radius:
            15px;

          background:
            var(--espresso);

          color:
            var(--cream);
        }


        .hl-query-label {
          color:
            #9C958B;

          font-size:
            8px;

          text-transform:
            uppercase;

          letter-spacing:
            0.1em;

          font-weight:
            900;
        }


        .hl-query-text {
          margin-top:
            7px;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            18px;

          letter-spacing:
            -0.02em;
        }


        .hl-search-results {
          display:
            grid;

          gap:
            8px;

          margin-top:
            12px;
        }


        .hl-search-result {
          display:
            grid;

          grid-template-columns:
            31px
            1fr
            auto;

          align-items:
            center;

          gap:
            10px;

          padding:
            10px;

          border:
            1px solid
            var(--border);

          border-radius:
            13px;

          background:
            #FAF8F3;

          transition:
            transform 250ms ease,
            border-color 250ms ease;
        }


        .hl-search-result:hover {
          transform:
            translateX(
              3px
            );

          border-color:
            rgba(
              111,
              125,
              85,
              0.3
            );
        }


        .hl-search-rank {
          width:
            29px;

          height:
            29px;

          display:
            grid;

          place-items:
            center;

          border-radius:
            9px;

          background:
            #ECE8DE;

          color:
            #6F665D;

          font-size:
            9px;

          font-weight:
            900;
        }


        .hl-search-result:first-child
          .hl-search-rank {
          background:
            #E8EDDE;

          color:
            var(--olive-dark);
        }


        .hl-search-name {
          font-size:
            10px;

          font-weight:
            900;
        }


        .hl-search-role {
          margin-top:
            3px;

          color:
            #857C73;

          font-size:
            8px;
        }


        .hl-search-score {
          font-size:
            11px;

          color:
            var(--olive-dark);

          font-weight:
            900;
        }


        /* =====================================================
           EXPLAIN
           ===================================================== */

        .hl-explain-visual {
          width:
            100%;
        }


        .hl-score-card {
          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            15px;

          padding:
            18px;

          border:
            1px solid
            var(--border);

          border-radius:
            17px;

          background:
            #FAF8F3;
        }


        .hl-score-main {
          display:
            flex;

          align-items:
            center;

          gap:
            14px;
        }


        .hl-score-circle {
          width:
            72px;

          height:
            72px;

          display:
            grid;

          place-items:
            center;

          border-radius:
            50%;

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
          font-size:
            16px;

          font-weight:
            900;
        }


        .hl-score-name {
          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            19px;

          line-height:
            1;
        }


        .hl-score-role {
          margin-top:
            5px;

          color:
            #847B72;

          font-size:
            9px;
        }


        .hl-evidence-list {
          margin-top:
            12px;

          display:
            grid;

          grid-template-columns:
            1fr
            1fr;

          gap:
            7px;
        }


        .hl-evidence,
        .hl-gap {
          padding:
            10px;

          border-radius:
            11px;

          font-size:
            8px;

          line-height:
            1.45;

          font-weight:
            800;
        }


        .hl-evidence {
          background:
            #ECEFE5;

          color:
            var(--olive-dark);
        }


        .hl-gap {
          background:
            #F3EAE1;

          color:
            #8A6250;
        }


        /* =====================================================
           TRANSITION BETWEEN ACTIVE VISUALS
           ===================================================== */

        .hl-arch-visual-enter {
          animation:
            hlArchVisualEnter
            650ms
            cubic-bezier(
              0.16,
              1,
              0.3,
              1
            );
        }


        @keyframes hlArchVisualEnter {
          from {
            opacity:
              0;

            transform:
              translate3d(
                0,
                17px,
                0
              )
              scale(
                0.985
              );
          }

          to {
            opacity:
              1;

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
           PROGRESS TRACK
           ===================================================== */

        .hl-arch-track {
          position:
            absolute;

          left:
            calc(
              100% - 6px
            );

          top:
            50%;

          width:
            min(
              500px,
              40vw
            );

          height:
            1px;

          transform:
            rotate(
              -34deg
            )
            translateY(
              -50%
            );

          transform-origin:
            left center;

          background:
            linear-gradient(
              90deg,
              rgba(
                111,
                125,
                85,
                0.03
              ),
              rgba(
                111,
                125,
                85,
                0.13
              ),
              rgba(
                111,
                125,
                85,
                0.02
              )
            );

          pointer-events:
            none;

          opacity:
            0.7;
        }


        .hl-arch-progress-bar {
          position:
            absolute;

          left:
            0;

          right:
            0;

          bottom:
            -1px;

          height:
            3px;

          background:
            #E3DDD0;

          z-index:
            20;
        }


        .hl-arch-progress-fill {
          height:
            100%;

          width:
            ${lineProgress *
            100}%;

          background:
            var(--olive);

          transform-origin:
            left center;

          transition:
            width 100ms
            linear;
        }


        .hl-arch-progress-dots {
          position:
            absolute;

          left:
            0;

          right:
            0;

          bottom:
            -8px;

          display:
            flex;

          justify-content:
            space-between;

          pointer-events:
            none;

          z-index:
            21;
        }


        .hl-arch-progress-dot {
          width:
            15px;

          height:
            15px;

          border-radius:
            50%;

          border:
            3px solid
            var(--cream);

          background:
            #C9C2B5;

          box-shadow:
            0 0 0 1px
            var(--border);

          transition:
            background 200ms ease,
            transform 200ms ease,
            box-shadow 200ms ease;
        }


        .hl-arch-progress-dot.active {
          background:
            var(--olive);

          transform:
            scale(
              1.1
            );

          box-shadow:
            0 0 0 1px
            var(--olive),
            0 5px 15px
            rgba(
              111,
              125,
              85,
              0.15
            );
        }


        /* =====================================================
           FINAL NOTE
           ===================================================== */

        .hl-final-note {
          position:
            absolute;

          right:
            0;

          bottom:
            4vh;

          width:
            min(
              320px,
              40%
            );

          padding-top:
            14px;

          border-top:
            1px solid
            var(--border);

          color:
            #887F75;

          font-size:
            9px;

          line-height:
            1.55;

          text-align:
            right;

          z-index:
            14;

          pointer-events:
            none;

          opacity:
            ${
              0.7 +
              progress *
              0.25
            };
        }


        .hl-final-note strong {
          display:
            block;

          margin-bottom:
            4px;

          color:
            var(--espresso);

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            18px;

          line-height:
            1.1;

          font-weight:
            500;

          letter-spacing:
            -0.02em;
        }


        /* =====================================================
           RESPONSIVE TABLET
           ===================================================== */

        @media (max-width: 950px) {

          .hl-architecture {
            min-height:
              auto;
          }


          .hl-arch-sticky {
            position:
              relative;

            height:
              auto;

            min-height:
              auto;

            display:
              block;

            padding:
              115px 0
              125px;

            overflow:
              visible;
          }


          .hl-arch-shell {
            width:
              min(
                100% - 42px,
                1210px
              );

            height:
              auto;
          }


          .hl-arch-intro {
            position:
              relative;

            top:
              auto;

            left:
              auto;

            width:
              100%;

            max-width:
              760px;

            margin-bottom:
              65px;

            opacity:
              1 !important;

            transform:
              none !important;

            pointer-events:
              auto;
          }


          .hl-arch-scene {
            position:
              relative;

            inset:
              auto;

            display:
              grid;

            grid-template-columns:
              1fr;

            gap:
              55px;

            padding:
              0;
          }


          .hl-arch-nav {
            padding:
              0;

            align-self:
              auto;
          }


          .hl-arch-stage {
            height:
              auto;

            min-height:
              580px;

            padding:
              0;
          }


          .hl-arch-stage-bg {
            width:
              min(
                620px,
                90vw
              );
          }


          .hl-arch-card {
            width:
              min(
                570px,
                95%
              );

            margin:
              0 auto 30px;
          }


          .hl-final-note {
            position:
              relative;

            right:
              auto;

            bottom:
              auto;

            width:
              min(
                570px,
                95%
              );

            margin:
              0 auto;

            text-align:
              left;
          }


          .hl-arch-track {
            display:
              none;
          }

        }


        /* =====================================================
           MOBILE
           ===================================================== */

        @media (max-width: 620px) {

          .hl-arch-shell {
            width:
              min(
                100% - 30px,
                1210px
              );
          }


          .hl-arch-title {
            font-size:
              48px;
          }


          .hl-arch-description {
            font-size:
              12px;
          }


          .hl-arch-step {
            grid-template-columns:
              43px
              minmax(
                0,
                1fr
              );

            min-height:
              71px;
          }


          .hl-arch-step-title {
            font-size:
              19px;
          }


          .hl-arch-step-desc {
            font-size:
              8px;
          }


          .hl-arch-step-label {
            font-size:
              6.5px;
          }


          .hl-arch-stage {
            min-height:
              555px;
          }


          .hl-arch-stage-bg {
            width:
              100%;
          }


          .hl-arch-card {
            width:
              94%;

            min-height:
              430px;

            padding:
              24px;

            border-radius:
              23px;
          }


          .hl-arch-card-title {
            font-size:
              27px;
          }


          .hl-arch-card-pill {
            max-width:
              130px;

            overflow:
              hidden;

            text-overflow:
              ellipsis;
          }


          .hl-visual {
            left:
              24px;

            right:
              24px;

            top:
              199px;

            bottom:
              24px;
          }


          .hl-upload-visual {
            grid-template-columns:
              1fr;
          }


          .hl-arrow {
            transform:
              rotate(
                90deg
              );

            justify-self:
              center;
          }


          .hl-normalize-visual {
            grid-template-columns:
              1fr;
          }


          .hl-profile-mini,
          .hl-document-mini {
            min-height:
              115px;
          }


          .hl-vector-field {
            grid-template-columns:
              repeat(
                6,
                minmax(
                  0,
                  1fr
                )
              );

            grid-auto-rows:
              13px;

            gap:
              5px;

            padding:
              12px;
          }


          .hl-vector-cell {
            height:
              13px;
          }


          .hl-embed-meta {
            grid-template-columns:
              repeat(
                3,
                minmax(
                  0,
                  1fr
                )
              );

            gap:
              7px;
          }


          .hl-embed-stat {
            padding:
              9px;
          }


          .hl-embed-stat strong {
            font-size:
              12px;
          }


          .hl-embed-stat span {
            font-size:
              6px;

            line-height:
              1.25;
          }


          .hl-evidence-list {
            grid-template-columns:
              1fr;
          }


          .hl-final-note {
            width:
              94%;

            padding-top:
              13px;

            text-align:
              left;

            font-size:
              8px;
          }


          .hl-final-note strong {
            font-size:
              16px;
          }

        }


        /* =====================================================
           REDUCED MOTION
           ===================================================== */

        @media (
          prefers-reduced-motion:
            reduce
        ) {

          .hl-vector-cell,
          .hl-arrow {
            animation:
              none;
          }


          .hl-arch-step-number,
          .hl-arch-step-title,
          .hl-arch-step-content,
          .hl-arch-progress-dot,
          .hl-arch-card,
          .hl-visual-stage {
            transition:
              none !important;
          }


          .hl-arch-card,
          .hl-visual-stage {
            animation:
              none !important;
          }

        }

      `}</style>


      {/* =====================================================
          STICKY EXPERIENCE
         ===================================================== */}

      <div className="hl-arch-sticky">

        <div className="hl-arch-shell">

          {/* ===================================================
              INTRO
             =================================================== */}

          <div className="hl-arch-intro">

            <div className="hl-arch-kicker">

              <span className="hl-arch-kicker-dot" />

              Behind the product

            </div>


            <h2 className="hl-arch-title">

              From resume
              <br />

              to{' '}
              <em>
                hiring signal.
              </em>

            </h2>


            <p className="hl-arch-description">
              HireLabs moves through a simple five-stage
              pipeline: securely ingest the resume, understand
              its meaning, create a searchable representation,
              compare it against the role, and explain the result.
            </p>

          </div>


          {/* ===================================================
              STORY SCENE
             =================================================== */}

          <div className="hl-arch-scene">

            {/* =================================================
                LEFT PIPELINE
               ================================================= */}

            <div className="hl-arch-nav">

              {steps.map(
                (step, index) => {

                  const isActive =
                    index ===
                    activeStage;

                  const isPassed =
                    index <
                    activeStage;

                  const isCompleted =
                    isPassed ||
                    isActive;

                  const stepProgress =
                    index <
                    activeStage
                      ? 1
                      : index ===
                          activeStage
                        ? progressToNext
                        : 0;

                  return (
                    <div
                      key={
                        step.num
                      }
                      className={`hl-arch-step ${
                        isCompleted
                          ? 'active'
                          : ''
                      }`}
                      style={{
                        '--step-progress':
                          stepProgress,
                      }}
                    >

                      <div className="hl-arch-step-marker">

                        <span className="hl-arch-progress-line" />

                        <div className="hl-arch-step-number">
                          {step.num}
                        </div>

                      </div>


                      <div className="hl-arch-step-content">

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
                }
              )}

            </div>


            {/* =================================================
                RIGHT VISUAL
               ================================================= */}

            <div className="hl-arch-stage">

              <div className="hl-arch-stage-bg" />


              <div className="hl-arch-card">

                <div className="hl-arch-card-top">

                  <div>

                    <div className="hl-arch-card-index">

                      Stage{' '}

                      {String(
                        activeStage +
                          1
                      ).padStart(
                        2,
                        '0'
                      )}

                    </div>


                    <div className="hl-arch-card-title">
                      {activeStep.short}
                    </div>

                  </div>


                  <div className="hl-arch-card-pill">
                    {activeStep.label}
                  </div>

                </div>


                <p className="hl-arch-card-copy">
                  {activeStep.desc}
                </p>


                <div className="hl-visual">

                  {/* =================================================
                      UPLOAD
                     ================================================= */}

                  {activeStep.visual ===
                    'upload' && (
                    <div
                      className="hl-visual-stage"
                      key="upload"
                    >

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


                        <div className="hl-arrow">
                          →
                        </div>


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

                    </div>
                  )}


                  {/* =================================================
                      NORMALIZE
                     ================================================= */}

                  {activeStep.visual ===
                    'normalize' && (
                    <div
                      className="hl-visual-stage"
                      key="normalize"
                    >

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

                    </div>
                  )}


                  {/* =================================================
                      EMBED
                     ================================================= */}

                  {activeStep.visual ===
                    'embed' && (
                    <div
                      className="hl-visual-stage"
                      key="embed"
                    >

                      <div className="hl-embed-visual">

                        <div className="hl-embedding-label">
                          Gemini Embedding-002
                        </div>


                        <div className="hl-vector-field">

                          {Array.from({
                            length: 40,
                          }).map(
                            (
                              _,
                              index
                            ) => (
                              <span
                                className="hl-vector-cell"
                                key={
                                  index
                                }
                              />
                            )
                          )}

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

                    </div>
                  )}


                  {/* =================================================
                      SEARCH
                     ================================================= */}

                  {activeStep.visual ===
                    'search' && (
                    <div
                      className="hl-visual-stage"
                      key="search"
                    >

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

                    </div>
                  )}


                  {/* =================================================
                      EXPLAIN
                     ================================================= */}

                  {activeStep.visual ===
                    'explain' && (
                    <div
                      className="hl-visual-stage"
                      key="explain"
                    >

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

                    </div>
                  )}

                </div>


                {/* =================================================
                    PROGRESS
                   ================================================= */}

                <div className="hl-arch-progress-bar">

                  <div
                    className="hl-arch-progress-fill"
                    style={{
                      width:
                        `${
                          lineProgress *
                          100
                        }%`,
                    }}
                  />

                </div>


                <div className="hl-arch-progress-dots">

                  {steps.map(
                    (
                      step,
                      index
                    ) => (
                      <span
                        key={
                          step.num
                        }
                        className={`hl-arch-progress-dot ${
                          index <=
                          activeIndex
                            ? 'active'
                            : ''
                        }`}
                      />
                    )
                  )}

                </div>

              </div>


              {/* =================================================
                  FINAL NOTE
                 ================================================= */}

              <div className="hl-final-note">

                <strong>
                  One pipeline.
                  <br />
                  One hiring signal.
                </strong>

                Built to keep the technical complexity
                underneath a simple recruiting experience.

              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}