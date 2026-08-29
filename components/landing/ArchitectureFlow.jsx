'use client';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

export function ArchitectureFlow() {
  const sectionRef = useRef(null);

  const [progress, setProgress] =
    useState(0);

  const steps = [
    {
      num: '01',
      title: 'Secure Upload',
      short: 'Start with the source',
      desc:
        'PDF/DOCX uploaded to user-scoped private Supabase Storage bucket.',
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
    let rafId = null;

    const updateProgress = () => {
      const section =
        sectionRef.current;

      if (!section) {
        rafId = null;
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

      const nextProgress =
        Math.min(
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

      rafId = null;
    };

    const handleScroll = () => {
      if (rafId !== null) {
        return;
      }

      rafId =
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

      if (rafId !== null) {
        window.cancelAnimationFrame(
          rafId
        );
      }
    };
  }, []);

  const activeIndex =
    Math.min(
      steps.length - 1,
      Math.floor(
        progress *
          steps.length
      )
    );

  const lineProgress =
    progress *
    (steps.length - 1);

  const activeStep =
    steps[activeIndex];

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
          --white: #FFFFFF;

          --espresso: #211C18;
          --espresso-soft: #615850;

          --olive: #6F7D55;
          --olive-dark: #596544;

          --taupe: #C8C0AF;
          --border: #DED7CA;

          position:
            relative;

          min-height:
            430vh;

          background:
            linear-gradient(
              180deg,
              #F5F1E8 0%,
              #F3EEE4 100%
            );

          color:
            var(--espresso);

          overflow:
            visible;

          isolation:
            isolate;
        }


        .hl-architecture *,
        .hl-architecture
          *::before,
        .hl-architecture
          *::after {
          box-sizing:
            border-box;
        }


        /* =====================================================
           BACKGROUND ORBITS
           ===================================================== */

        .hl-architecture::before {
          content:
            '';

          position:
            absolute;

          width:
            min(
              900px,
              76vw
            );

          height:
            min(
              900px,
              76vw
            );

          right:
            -410px;

          top:
            10vh;

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

          z-index:
            0;
        }


        .hl-architecture::after {
          content:
            '';

          position:
            absolute;

          width:
            520px;

          height:
            520px;

          left:
            -360px;

          bottom:
            5vh;

          border:
            1px dashed
            rgba(
              111,
              125,
              85,
              0.06
            );

          border-radius:
            50%;

          pointer-events:
            none;

          z-index:
            0;
        }


        /* =====================================================
           STICKY VIEWPORT

           IMPORTANT:
           The architecture header and story are now in
           separate vertical zones.

           This is the main overlap fix.
           ===================================================== */

        .hl-arch-sticky {
          position:
            sticky;

          top:
            0;

          height:
            100vh;

          min-height:
            720px;

          display:
            block;

          overflow:
            hidden;

          isolation:
            isolate;
        }


        .hl-arch-shell {
          position:
            relative;

          width:
            min(
              1180px,
              calc(100% - 56px)
            );

          height:
            100%;

          min-height:
            720px;

          margin:
            0 auto;
        }


        /* =====================================================
           INTRO

           Dedicated upper region.
           ===================================================== */

        .hl-arch-intro {
          position:
            absolute;

          left:
            0;

          top:
            clamp(
              72px,
              7vh,
              92px
            );

          width:
            min(
              640px,
              53%
            );

          z-index:
            20;

          pointer-events:
            none;

          opacity:
            1;

          transform:
            translateY(0);

          transition:
            opacity 180ms linear,
            transform 180ms ease;
        }


        .hl-arch-kicker {
          display:
            flex;

          align-items:
            center;

          gap:
            9px;

          margin-bottom:
            16px;

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

          flex:
            0 0 7px;

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
              47px,
              5.3vw,
              76px
            );

          line-height:
            0.94;

          letter-spacing:
            -0.055em;

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
            590px;

          margin:
            19px 0 0;

          color:
            var(--espresso-soft);

          font-size:
            13px;

          line-height:
            1.68;
        }


        /* =====================================================
           STORY AREA

           Starts BELOW the intro.

           This used to be inset: 0 which caused the overlap.
           ===================================================== */

        .hl-arch-scene {
          position:
            absolute;

          left:
            0;

          right:
            0;

          top:
            clamp(
              310px,
              30vh,
              365px
            );

          bottom:
            64px;

          display:
            grid;

          grid-template-columns:
            minmax(
              290px,
              0.78fr
            )
            minmax(
              0,
              1.22fr
            );

          gap:
            clamp(
              45px,
              7vw,
              105px
            );

          align-items:
            stretch;

          z-index:
            10;
        }


        /* =====================================================
           LEFT PIPELINE
           ===================================================== */

        .hl-arch-nav {
          position:
            relative;

          align-self:
            stretch;

          display:
            flex;

          flex-direction:
            column;

          justify-content:
            center;

          padding:
            0;

          z-index:
            12;
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
            14px;

          min-height:
            69px;

          padding-bottom:
            13px;
        }


        .hl-arch-step:last-child {
          padding-bottom:
            0;
        }


        .hl-arch-step-marker {
          position:
            relative;

          display:
            flex;

          justify-content:
            center;
        }


        /* connecting line */

        .hl-arch-step-marker::before {
          content:
            '';

          position:
            absolute;

          top:
            35px;

          bottom:
            0;

          width:
            1px;

          background:
            #D8D1C5;
        }


        .hl-arch-step:last-child
          .hl-arch-step-marker::before {
          display:
            none;
        }


        .hl-arch-step-number {
          position:
            relative;

          z-index:
            3;

          width:
            36px;

          height:
            36px;

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
            background 260ms ease,
            color 260ms ease,
            border-color 260ms ease,
            transform 260ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),
            box-shadow 260ms ease;
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
              1.08
            );

          box-shadow:
            0 10px 22px
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
            0.38;

          transform:
            translateX(
              0
            );

          transition:
            opacity 260ms ease,
            transform 280ms
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
              4px
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
            20px;

          line-height:
            1.08;

          letter-spacing:
            -0.03em;

          transition:
            color 260ms ease;
        }


        .hl-arch-step.active
          .hl-arch-step-title {
          color:
            var(--olive-dark);
        }


        .hl-arch-step-desc {
          max-width:
            325px;

          margin:
            5px 0 0;

          color:
            #847B72;

          font-size:
            9px;

          line-height:
            1.5;
        }


        .hl-arch-step-label {
          display:
            inline-block;

          margin-top:
            6px;

          padding:
            5px 7px;

          border-radius:
            999px;

          background:
            #ECE8DE;

          color:
            #7A7168;

          font-size:
            6.5px;

          line-height:
            1;

          font-weight:
            900;

          letter-spacing:
            0.1em;

          text-transform:
            uppercase;

          transition:
            background 260ms ease,
            color 260ms ease;
        }


        .hl-arch-step.active
          .hl-arch-step-label {
          background:
            #E9EEE0;

          color:
            var(--olive-dark);
        }


        /* =====================================================
           VISUAL STAGE
           ===================================================== */

        .hl-arch-stage {
          position:
            relative;

          min-width:
            0;

          min-height:
            0;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          overflow:
            visible;

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
              610px,
              47vw
            );

          aspect-ratio:
            1;

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

          transform:
            translate(
              -50%,
              -50%
            );

          pointer-events:
            none;

          z-index:
            0;
        }


        .hl-arch-stage-bg::before,
        .hl-arch-stage-bg::after {
          content:
            '';

          position:
            absolute;

          border:
            1px dashed
            rgba(
              111,
              125,
              85,
              0.11
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
           MAIN CARD

           It now stays inside the stage.
           ===================================================== */

        .hl-arch-card {
          position:
            relative;

          z-index:
            4;

          width:
            min(
              535px,
              91%
            );

          height:
            min(
              430px,
              calc(
                100vh - 410px
              )
            );

          min-height:
            410px;

          max-height:
            430px;

          padding:
            30px;

          border:
            1px solid
            var(--border);

          border-radius:
            28px;

          background:
            rgba(
              255,
              255,
              255,
              0.94
            );

          box-shadow:
            0 34px 85px
            rgba(
              48,
              43,
              37,
              0.11
            ),

            0 10px 28px
            rgba(
              48,
              43,
              37,
              0.05
            );

          overflow:
            hidden;

          display:
            flex;

          flex-direction:
            column;
        }


        .hl-arch-card::before {
          content:
            '';

          position:
            absolute;

          width:
            290px;

          height:
            290px;

          top:
            -150px;

          right:
            -150px;

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


        /* =====================================================
           CARD HEADER
           ===================================================== */

        .hl-arch-card-top {
          position:
            relative;

          z-index:
            2;

          display:
            flex;

          align-items:
            flex-start;

          justify-content:
            space-between;

          gap:
            18px;

          padding-bottom:
            18px;

          border-bottom:
            1px solid
            #E8E2D7;
        }


        .hl-arch-card-index {
          color:
            var(--olive-dark);

          font-size:
            8px;

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
            28px;

          line-height:
            1;

          letter-spacing:
            -0.04em;

          font-weight:
            500;
        }


        .hl-arch-card-pill {
          flex:
            0 0 auto;

          max-width:
            155px;

          overflow:
            hidden;

          text-overflow:
            ellipsis;

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
            7px;

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
          position:
            relative;

          z-index:
            2;

          flex:
            0 0 auto;

          max-width:
            430px;

          margin:
            15px 0 0;

          color:
            #6F665D;

          font-size:
            11px;

          line-height:
            1.58;
        }


        /* =====================================================
           VISUAL CONTENT
           ===================================================== */

        .hl-visual {
          position:
            absolute;

          left:
            30px;

          right:
            30px;

          top:
            174px;

          bottom:
            42px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          overflow:
            visible;

          z-index:
            2;
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
            minmax(
              0,
              1fr
            )
            auto
            minmax(
              0,
              1fr
            );

          align-items:
            center;

          gap:
            14px;
        }


        .hl-file-box,
        .hl-storage-box {
          min-width:
            0;

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


        .hl-file-icon,
        .hl-storage-icon {
          width:
            38px;

          height:
            38px;

          display:
            grid;

          place-items:
            center;

          margin-bottom:
            12px;

          border-radius:
            11px;

          background:
            var(--espresso);

          color:
            var(--cream);
        }


        .hl-visual-title {
          font-size:
            10px;

          font-weight:
            900;
        }


        .hl-visual-sub {
          margin-top:
            5px;

          color:
            #857B72;

          font-size:
            8px;

          line-height:
            1.4;
        }


        .hl-arrow {
          color:
            var(--olive);

          font-size:
            19px;

          font-weight:
            900;

          animation:
            hlArchArrow
            2.2s
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
              0.5;
          }

          50% {
            transform:
              translateX(
                4px
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
            0.78fr
            1fr;

          gap:
            11px;
        }


        .hl-document-mini,
        .hl-profile-mini {
          min-height:
            145px;

          padding:
            15px;

          border:
            1px solid
            var(--border);

          border-radius:
            16px;

          background:
            #FAF8F3;
        }


        .hl-mini-heading {
          margin-bottom:
            11px;

          color:
            #81786F;

          font-size:
            7px;

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
            6px 7px;

          margin:
            3px;

          border-radius:
            999px;

          background:
            #ECEFE5;

          color:
            var(--olive-dark);

          font-size:
            7px;

          font-weight:
            800;
        }


        /* =====================================================
           EMBED
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
            12px;
        }


        .hl-embedding-label {
          color:
            #7F766D;

          font-size:
            7px;

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
            14px;

          gap:
            5px;

          width:
            100%;

          padding:
            12px;

          border:
            1px solid
            var(--border);

          border-radius:
            16px;

          background:
            #FAF8F3;

          overflow:
            hidden;
        }


        .hl-vector-cell {
          width:
            100%;

          height:
            14px;

          border-radius:
            999px;

          background:
            #DFE5D4;

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
            8px;
        }


        .hl-embed-stat {
          min-width:
            0;

          padding:
            10px;

          border-radius:
            10px;

          background:
            #F0EEE7;

          overflow:
            hidden;
        }


        .hl-embed-stat strong {
          display:
            block;

          font-size:
            13px;

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
            4px;

          color:
            #847B72;

          font-size:
            6.5px;

          line-height:
            1.3;

          text-transform:
            uppercase;

          letter-spacing:
            0.07em;
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
            14px;

          border-radius:
            14px;

          background:
            var(--espresso);

          color:
            var(--cream);
        }


        .hl-query-label {
          color:
            #9C958B;

          font-size:
            7px;

          text-transform:
            uppercase;

          letter-spacing:
            0.1em;

          font-weight:
            900;
        }


        .hl-query-text {
          margin-top:
            6px;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            16px;

          line-height:
            1.1;
        }


        .hl-search-results {
          display:
            grid;

          gap:
            6px;

          margin-top:
            10px;
        }


        .hl-search-result {
          display:
            grid;

          grid-template-columns:
            30px
            minmax(
              0,
              1fr
            )
            auto;

          align-items:
            center;

          gap:
            9px;

          padding:
            9px;

          border:
            1px solid
            var(--border);

          border-radius:
            12px;

          background:
            #FAF8F3;
        }


        .hl-search-rank {
          width:
            28px;

          height:
            28px;

          display:
            grid;

          place-items:
            center;

          border-radius:
            8px;

          background:
            #ECE8DE;

          color:
            #6F665D;

          font-size:
            8px;

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
            9px;

          font-weight:
            900;
        }


        .hl-search-role {
          margin-top:
            3px;

          color:
            #857C73;

          font-size:
            7px;

          line-height:
            1.3;
        }


        .hl-search-score {
          color:
            var(--olive-dark);

          font-size:
            10px;

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
            14px;

          padding:
            17px;

          border:
            1px solid
            var(--border);

          border-radius:
            16px;

          background:
            #FAF8F3;
        }


        .hl-score-main {
          display:
            flex;

          align-items:
            center;

          gap:
            13px;
        }


        .hl-score-circle {
          width:
            68px;

          height:
            68px;

          flex:
            0 0 68px;

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
            15px;

          font-weight:
            900;
        }


        .hl-score-name {
          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            18px;

          line-height:
            1;
        }


        .hl-score-role {
          margin-top:
            4px;

          color:
            #847B72;

          font-size:
            8px;
        }


        .hl-evidence-list {
          display:
            grid;

          grid-template-columns:
            1fr
            1fr;

          gap:
            6px;

          margin-top:
            10px;
        }


        .hl-evidence,
        .hl-gap {
          min-width:
            0;

          padding:
            9px;

          border-radius:
            10px;

          font-size:
            7px;

          line-height:
            1.4;

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
           PROGRESS
           ===================================================== */

        .hl-progress-bar {
          position:
            absolute;

          left:
            24px;

          right:
            24px;

          bottom:
            17px;

          height:
            3px;

          border-radius:
            999px;

          background:
            #E3DDD0;

          overflow:
            hidden;

          z-index:
            12;
        }


        .hl-progress-fill {
          width:
            ${lineProgress * 100}%;

          height:
            100%;

          background:
            var(--olive);

          border-radius:
            inherit;

          transition:
            width 100ms linear;
        }


        .hl-progress-dots {
          position:
            absolute;

          left:
            24px;

          right:
            24px;

          bottom:
            9px;

          display:
            flex;

          justify-content:
            space-between;

          pointer-events:
            none;

          z-index:
            13;
        }


        .hl-progress-dot {
          width:
            14px;

          height:
            14px;

          border:
            3px solid
            #FFFFFF;

          border-radius:
            50%;

          background:
            #C9C2B5;

          box-shadow:
            0 0 0 1px
            var(--border);

          transition:
            background 180ms ease,
            transform 180ms ease;
        }


        .hl-progress-dot.active {
          background:
            var(--olive);

          transform:
            scale(
              1.08
            );

          box-shadow:
            0 0 0 1px
            var(--olive);
        }


        /* =====================================================
           FINAL NOTE

           It now sits BELOW the story area instead of
           competing with the card.
           ===================================================== */

        .hl-final-note {
          position:
            absolute;

          right:
            0;

          bottom:
            21px;

          width:
            290px;

          padding-top:
            9px;

          border-top:
            1px solid
            var(--border);

          color:
            #887F75;

          font-size:
            8px;

          line-height:
            1.45;

          text-align:
            right;

          z-index:
            20;

          pointer-events:
            none;
        }


        .hl-final-note strong {
          display:
            block;

          margin-bottom:
            3px;

          color:
            var(--espresso);

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            16px;

          line-height:
            1.03;

          font-weight:
            500;

          letter-spacing:
            -0.025em;
        }


        /* =====================================================
           TABLET
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

            padding:
              110px 0
              120px;

            overflow:
              visible;
          }


          .hl-arch-shell {
            width:
              min(
                100% - 42px,
                1180px
              );

            height:
              auto;

            min-height:
              0;
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
              55px;

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

            top:
              auto;

            bottom:
              auto;

            display:
              grid;

            grid-template-columns:
              1fr;

            gap:
              42px;
          }


          .hl-arch-nav {
            min-height:
              auto;

            display:
              flex;

            justify-content:
              flex-start;
          }


          .hl-arch-stage {
            min-height:
              540px;

            width:
              100%;
          }


          .hl-arch-card {
            width:
              min(
                560px,
                94%
              );

            height:
              460px;

            min-height:
              430px;

            max-height:
              none;

            margin:
              0 auto;
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
                560px,
                94%
              );

            margin:
              22px auto 0;

            text-align:
              left;
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
                1180px
              );
          }


          .hl-arch-title {
            font-size:
              45px;
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
              66px;
          }


          .hl-arch-step-title {
            font-size:
              18px;
          }


          .hl-arch-step-desc {
            font-size:
              8px;
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

            height:
              430px;

            min-height:
              430px;

            padding:
              22px;

            border-radius:
              22px;
          }


          .hl-arch-card-title {
            font-size:
              25px;
          }


          .hl-arch-card-pill {
            max-width:
              120px;
          }


          .hl-visual {
            left:
              22px;

            right:
              22px;

            top:
              183px;

            bottom:
              45px;
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


          .hl-document-mini,
          .hl-profile-mini {
            min-height:
              108px;
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
          }


          .hl-vector-cell {
            height:
              13px;
          }


          .hl-embed-meta {
            gap:
              5px;
          }


          .hl-embed-stat {
            padding:
              7px;
          }


          .hl-embed-stat strong {
            font-size:
              10px;
          }


          .hl-embed-stat span {
            font-size:
              5.5px;
          }


          .hl-evidence-list {
            grid-template-columns:
              1fr;
          }


          .hl-progress-bar {
            left:
              18px;

            right:
              18px;
          }


          .hl-progress-dots {
            left:
              18px;

            right:
              18px;
          }


          .hl-final-note {
            width:
              94%;

            font-size:
              8px;
          }


          .hl-final-note strong {
            font-size:
              15px;
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
              none !important;
          }


          .hl-arch-step-number,
          .hl-arch-step-content,
          .hl-arch-step-title,
          .hl-progress-dot {
            transition:
              none !important;
          }

        }

      `}</style>


      {/* =====================================================
          STICKY ARCHITECTURE EXPERIENCE
         ===================================================== */}

      <div className="hl-arch-sticky">

        <div className="hl-arch-shell">

          {/* =================================================
              INTRO
             ================================================= */}

          <div
            className="hl-arch-intro"
            style={{
              opacity:
                1 -
                Math.min(
                  1,
                  progress /
                    0.36
                ) *
                  0.58,

              transform:
                `translateY(${
                  progress *
                  -14
                }px)`,
            }}
          >

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


          {/* =================================================
              STORY
             ================================================= */}

          <div className="hl-arch-scene">

            {/* ===============================================
                LEFT PIPELINE
               =============================================== */}

            <div className="hl-arch-nav">

              {steps.map(
                (
                  step,
                  index
                ) => {

                  const isActive =
                    index ===
                    activeIndex;

                  const isPassed =
                    index <
                    activeIndex;

                  return (
                    <div
                      key={
                        step.num
                      }
                      className={`hl-arch-step ${
                        isActive ||
                        isPassed
                          ? 'active'
                          : ''
                      }`}
                    >

                      <div className="hl-arch-step-marker">

                        <div className="hl-arch-step-number">

                          {
                            step.num
                          }

                        </div>

                      </div>


                      <div className="hl-arch-step-content">

                        <div className="hl-arch-step-title">

                          {
                            step.title
                          }

                        </div>


                        <p className="hl-arch-step-desc">

                          {
                            step.desc
                          }

                        </p>


                        <span className="hl-arch-step-label">

                          {
                            step.label
                          }

                        </span>

                      </div>

                    </div>
                  );
                }
              )}

            </div>


            {/* ===============================================
                VISUAL STAGE
               =============================================== */}

            <div className="hl-arch-stage">

              <div
                className="hl-arch-stage-bg"
                style={{
                  transform:
                    `translate(-50%, -50%) rotate(${
                      progress *
                      -14
                    }deg)`,
                }}
              />


              <div className="hl-arch-card">

                {/* =========================================
                    CARD HEADER
                   ========================================= */}

                <div className="hl-arch-card-top">

                  <div>

                    <div className="hl-arch-card-index">

                      Stage{' '}

                      {String(
                        activeIndex +
                          1
                      ).padStart(
                        2,
                        '0'
                      )}

                    </div>


                    <div className="hl-arch-card-title">

                      {
                        activeStep.short
                      }

                    </div>

                  </div>


                  <div className="hl-arch-card-pill">

                    {
                      activeStep.label
                    }

                  </div>

                </div>


                {/* =========================================
                    DESCRIPTION
                   ========================================= */}

                <p className="hl-arch-card-copy">

                  {
                    activeStep.desc
                  }

                </p>


                {/* =========================================
                    VISUAL CONTENT
                   ========================================= */}

                <div className="hl-visual">

                  {/* =======================================
                      STAGE 01
                     ======================================= */}

                  {activeStep.visual ===
                    'upload' && (

                    <div
                      className="hl-upload-visual"
                      key="upload"
                    >

                      <div className="hl-file-box">

                        <div className="hl-file-icon">

                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            aria-hidden="true"
                          >

                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />

                            <polyline
                              points="14 2 14 8 20 8"
                            />

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
                            aria-hidden="true"
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


                  {/* =======================================
                      STAGE 02
                     ======================================= */}

                  {activeStep.visual ===
                    'normalize' && (

                    <div
                      className="hl-normalize-visual"
                      key="normalize"
                    >

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


                  {/* =======================================
                      STAGE 03
                     ======================================= */}

                  {activeStep.visual ===
                    'embed' && (

                    <div
                      className="hl-embed-visual"
                      key="embed"
                    >

                      <div className="hl-embedding-label">
                        Gemini Embedding-002
                      </div>


                      <div className="hl-vector-field">

                        {Array.from({
                          length:
                            40,
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
                  )}


                  {/* =======================================
                      STAGE 04
                     ======================================= */}

                  {activeStep.visual ===
                    'search' && (

                    <div
                      className="hl-search-visual"
                      key="search"
                    >

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


                  {/* =======================================
                      STAGE 05
                     ======================================= */}

                  {activeStep.visual ===
                    'explain' && (

                    <div
                      className="hl-explain-visual"
                      key="explain"
                    >

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


                {/* =========================================
                    PROGRESS
                   ========================================= */}

                <div className="hl-progress-bar">

                  <div
                    className="hl-progress-fill"
                    style={{
                      width:
                        `${lineProgress * 100}%`,
                    }}
                  />

                </div>


                <div className="hl-progress-dots">

                  {steps.map(
                    (
                      step,
                      index
                    ) => (
                      <span
                        key={
                          step.num
                        }
                        className={`hl-progress-dot ${
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


              {/* =============================================
                  FINAL NOTE
                 ============================================= */}

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