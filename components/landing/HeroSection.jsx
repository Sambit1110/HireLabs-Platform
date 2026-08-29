'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';

export function HeroSection({
  onExploreClick,
  onViewArchClick,
}) {
  const sectionRef = useRef(null);
  const [progress, setProgress] = useState(0);

  const stages = [
    {
      number: '01',
      label: 'RAW RESUME',
      title: 'Start with the source.',
      description:
        'A resume begins as an unstructured document full of experience, skills, and context.',
    },
    {
      number: '02',
      label: 'UNDERSTANDING',
      title: 'Read between the lines.',
      description:
        'HireLabs extracts the parts that matter: skills, seniority, experience, and technical context.',
    },
    {
      number: '03',
      label: 'VECTOR SIGNAL',
      title: 'Turn meaning into a signal.',
      description:
        'The candidate becomes a high-dimensional representation designed for semantic search.',
    },
    {
      number: '04',
      label: 'SEMANTIC SEARCH',
      title: 'Find the right match.',
      description:
        'Instead of relying on exact keywords, the system compares meaning between the role and the candidate.',
    },
    {
      number: '05',
      label: 'DECISION SUPPORT',
      title: 'Make the result useful.',
      description:
        'Candidates are ranked with evidence and qualification gaps so recruiters can make better decisions.',
    },
  ];

  useEffect(() => {
    let rafId = null;

    const updateProgress = () => {
      const section = sectionRef.current;

      if (!section) {
        return;
      }

      const rect =
        section.getBoundingClientRect();

      const viewportHeight =
        window.innerHeight;

      const scrollDistance =
        Math.max(
          section.offsetHeight -
            viewportHeight,
          1
        );

      const rawProgress =
        -rect.top /
        scrollDistance;

      const nextProgress =
        Math.min(
          1,
          Math.max(
            0,
            rawProgress
          )
        );

      setProgress(nextProgress);

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

  const clamp = (
    value,
    min = 0,
    max = 1
  ) =>
    Math.min(
      max,
      Math.max(
        min,
        value
      )
    );

  const stageProgress =
    progress *
    (stages.length - 1);

  const activeStage =
    Math.min(
      stages.length - 1,
      Math.floor(stageProgress)
    );

  const localStageProgress =
    stageProgress -
    activeStage;

  const smoothStage =
    clamp(
      localStageProgress
    );

  /*
   * Intro fades slightly as the visual
   * story takes over.
   */
  const heroIntro =
    1 -
    clamp(
      progress / 0.28
    ) *
      0.45;

  /*
   * Large central scene movement.
   */
  const sceneScale =
    1 +
    progress *
      0.035;

  const sceneY =
    progress *
    -16;

  /*
   * Text overlay on the left.
   */
  const textY =
    progress *
    -24;

  /*
   * Stage-specific transitions.
   */
  const stageFade =
    smoothStage >
    0.78
      ? 1 -
        ((smoothStage -
          0.78) /
          0.22)
      : 1;

  const nextStageFade =
    smoothStage < 0.22
      ? smoothStage /
        0.22
      : 1;

  const currentStage =
    stages[activeStage];

  /*
   * Progress around the five-step
   * story.
   */
  const progressPercent =
    progress * 100;

  /*
   * Decorative vector particles.
   */
  const particles =
    Array.from({
      length: 72,
    });

  return (
    <section
      ref={sectionRef}
      className="hl-story-hero"
      id="heroSection"
    >
      <style>{`

        /* ======================================================
           ROOT
           ====================================================== */

        .hl-story-hero {
          --cream: #F5F1E8;
          --cream-soft: #ECE6DA;
          --white: #FFFFFF;

          --espresso: #211C18;
          --espresso-soft: #625950;

          --olive: #6F7D55;
          --olive-dark: #596544;

          --taupe: #C8C0AF;
          --border: #DED7CA;

          position: relative;

          min-height: 480vh;

          background:
            linear-gradient(
              180deg,
              #F7F2E8 0%,
              #F5F1E8 48%,
              #EFE9DE 100%
            );

          color:
            var(--espresso);

          overflow: clip;

          isolation: isolate;
        }


        .hl-story-hero *,
        .hl-story-hero *::before,
        .hl-story-hero *::after {
          box-sizing: border-box;
        }


        /* ======================================================
           STICKY VIEW
           ====================================================== */

        .hl-story-sticky {
          position: sticky;

          top: 0;

          height: 100vh;

          min-height: 680px;

          overflow: hidden;

          display: flex;

          align-items: center;

          isolation: isolate;
        }


        /* ======================================================
           GRAIN
           ====================================================== */

        .hl-story-grain {
          position: absolute;

          inset: 0;

          z-index: 0;

          pointer-events: none;

          opacity: 0.16;

          background-image:
            radial-gradient(
              rgba(
                33,
                28,
                24,
                0.13
              )
              0.5px,
              transparent
              0.5px
            );

          background-size:
            7px 7px;

          mask-image:
            linear-gradient(
              to bottom,
              black,
              transparent
              94%
            );
        }


        /* ======================================================
           BACKGROUND RINGS
           ====================================================== */

        .hl-story-ring {
          position: absolute;

          border:
            1px solid
            rgba(
              111,
              125,
              85,
              0.11
            );

          border-radius:
            50%;

          pointer-events: none;

          z-index: 0;
        }


        .hl-story-ring.one {
          width:
            min(
              900px,
              78vw
            );

          aspect-ratio: 1;

          right:
            -260px;

          top:
            -240px;

          transform:
            rotate(
              ${progress * -12}deg
            );
        }


        .hl-story-ring.two {
          width:
            min(
              640px,
              58vw
            );

          aspect-ratio: 1;

          right:
            -120px;

          top:
            -100px;

          border-style:
            dashed;

          transform:
            rotate(
              ${progress * 18}deg
            );
        }


        .hl-story-ring.three {
          width:
            430px;

          height:
            430px;

          left:
            -280px;

          bottom:
            -240px;

          border-style:
            dashed;

          opacity:
            0.5;
        }


        /* ======================================================
           MAIN WRAPPER
           ====================================================== */

        .hl-story-shell {
          position: relative;

          z-index: 2;

          width:
            min(
              1320px,
              calc(100% - 64px)
            );

          height: 100%;

          margin: 0 auto;
        }


        /* ======================================================
           TOP META
           ====================================================== */

        .hl-story-meta {
          position: absolute;

          top:
            34px;

          left: 0;

          right: 0;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 20px;

          z-index: 12;

          opacity:
            ${heroIntro};
        }


        .hl-story-meta-left {
          display: inline-flex;

          align-items: center;

          gap: 10px;

          color:
            var(--espresso-soft);

          font-size: 9px;

          line-height: 1;

          font-weight: 800;

          letter-spacing:
            0.15em;

          text-transform:
            uppercase;
        }


        .hl-story-meta-dot {
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


        .hl-story-meta-pill {
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
              0.46
            );

          color:
            #766D63;

          font-size:
            8px;

          font-weight:
            800;

          letter-spacing:
            0.08em;

          text-transform:
            uppercase;
        }


        /* ======================================================
           INTRO COPY
           ====================================================== */

        .hl-story-copy {
          position: absolute;

          z-index: 10;

          left: 0;

          top:
            50%;

          width:
            min(
              590px,
              48%
            );

          transform:
            translate3d(
              0,
              calc(
                -50% +
                ${textY}px
              ),
              0
            );

          opacity:
            ${heroIntro};
        }


        .hl-story-kicker {
          display: inline-flex;

          align-items: center;

          gap: 9px;

          margin-bottom:
            22px;

          color:
            var(--olive-dark);

          font-size:
            10px;

          line-height: 1;

          font-weight:
            900;

          letter-spacing:
            0.14em;

          text-transform:
            uppercase;
        }


        .hl-story-kicker-line {
          width:
            28px;

          height:
            1px;

          background:
            var(--olive);
        }


        .hl-story-title {
          margin: 0;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            clamp(
              58px,
              7vw,
              98px
            );

          line-height:
            0.9;

          letter-spacing:
            -0.06em;

          font-weight:
            500;
        }


        .hl-story-title em {
          color:
            var(--olive);

          font-style:
            italic;
        }


        .hl-story-description {
          max-width:
            530px;

          margin:
            27px 0 0;

          color:
            var(--espresso-soft);

          font-size:
            15px;

          line-height:
            1.72;
        }


        .hl-story-actions {
          display: flex;

          align-items: center;

          flex-wrap: wrap;

          gap: 11px;

          margin-top:
            31px;
        }


        .hl-story-note {
          margin-top:
            18px;

          color:
            #857C73;

          font-size:
            9px;

          line-height:
            1.5;

          letter-spacing:
            0.03em;
        }


        /* ======================================================
           STORY STAGE
           ====================================================== */

        .hl-story-stage {
          position: absolute;

          right:
            -20px;

          top: 0;

          width:
            65%;

          height:
            100%;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          transform:
            translate3d(
              0,
              ${sceneY}px,
              0
            )
            scale(
              ${sceneScale}
            );

          transform-origin:
            center center;

          will-change:
            transform;
        }


        /* ======================================================
           CENTRAL VISUAL FRAME
           ====================================================== */

        .hl-story-frame {
          position: relative;

          width:
            min(
              720px,
              100%
            );

          height:
            min(
              650px,
              76vh
            );

          border:
            1px solid
            rgba(
              222,
              215,
              202,
              0.9
            );

          border-radius:
            34px;

          background:
            rgba(
              255,
              255,
              255,
              0.52
            );

          box-shadow:
            0 35px 100px
            rgba(
              47,
              41,
              35,
              0.07
            );

          overflow:
            hidden;
        }


        /* ======================================================
           FRAME TOP
           ====================================================== */

        .hl-story-frame-top {
          position: absolute;

          top: 0;

          left: 0;

          right: 0;

          height:
            63px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          padding:
            0 22px;

          border-bottom:
            1px solid
            var(--border);

          background:
            rgba(
              255,
              255,
              255,
              0.38
            );

          z-index: 20;
        }


        .hl-story-frame-status {
          display:
            flex;

          align-items:
            center;

          gap: 8px;

          color:
            #746B62;

          font-size:
            8px;

          font-weight:
            800;

          letter-spacing:
            0.1em;

          text-transform:
            uppercase;
        }


        .hl-story-frame-status-dot {
          width:
            6px;

          height:
            6px;

          border-radius:
            50%;

          background:
            var(--olive);
        }


        .hl-story-frame-stage {
          color:
            var(--olive-dark);

          font-size:
            8px;

          font-weight:
            900;

          letter-spacing:
            0.1em;

          text-transform:
            uppercase;
        }


        /* ======================================================
           VISUAL CANVAS
           ====================================================== */

        .hl-story-canvas {
          position: absolute;

          inset:
            63px 0 0 0;

          overflow:
            hidden;
        }


        .hl-story-canvas::before {
          content:
            '';

          position: absolute;

          width:
            520px;

          height:
            520px;

          left:
            50%;

          top:
            50%;

          transform:
            translate(
              -50%,
              -50%
            );

          border:
            1px solid
            rgba(
              111,
              125,
              85,
              0.1
            );

          border-radius:
            50%;

          pointer-events:
            none;
        }


        .hl-story-canvas::after {
          content:
            '';

          position: absolute;

          width:
            370px;

          height:
            370px;

          left:
            50%;

          top:
            50%;

          transform:
            translate(
              -50%,
              -50%
            );

          border:
            1px dashed
            rgba(
              111,
              125,
              85,
              0.08
            );

          border-radius:
            50%;

          pointer-events:
            none;
        }


        /* ======================================================
           STAGE LABEL
           ====================================================== */

        .hl-stage-label {
          position:
            absolute;

          top:
            32px;

          left:
            32px;

          z-index:
            15;

          padding:
            7px 9px;

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
              0.7
            );

          color:
            #736A61;

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
        }


        .hl-stage-title {
          position:
            absolute;

          left:
            32px;

          bottom:
            35px;

          z-index:
            15;

          max-width:
            250px;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            28px;

          line-height:
            0.98;

          letter-spacing:
            -0.035em;
        }


        .hl-stage-description {
          position:
            absolute;

          right:
            31px;

          bottom:
            36px;

          z-index:
            15;

          max-width:
            220px;

          color:
            #776E65;

          font-size:
            9px;

          line-height:
            1.55;

          text-align:
            right;
        }


        /* ======================================================
           COMMON DOCUMENT
           ====================================================== */

        .hl-scene-document {
          position:
            absolute;

          left:
            50%;

          top:
            50%;

          width:
            390px;

          min-height:
            480px;

          padding:
            26px;

          background:
            #FFFFFF;

          border:
            1px solid
            var(--border);

          border-radius:
            13px;

          box-shadow:
            0 30px 75px
            rgba(
              40,
              35,
              30,
              0.12
            );

          transform:
            translate(
              -50%,
              -50%
            )
            rotate(
              -3deg
            );

          transition:
            transform 900ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),
            opacity 600ms ease;
        }


        .hl-document-name {
          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            23px;

          letter-spacing:
            -0.03em;
        }


        .hl-document-role {
          margin-top:
            6px;

          color:
            #7E756C;

          font-size:
            9px;
        }


        .hl-document-rule {
          height:
            1px;

          margin:
            18px 0;

          background:
            #E8E2D7;
        }


        .hl-document-label {
          margin-bottom:
            9px;

          color:
            #8A8177;

          font-size:
            7px;

          font-weight:
            900;

          letter-spacing:
            0.1em;

          text-transform:
            uppercase;
        }


        .hl-document-line {
          height:
            7px;

          margin:
            8px 0;

          border-radius:
            999px;

          background:
            #E8E3D9;
        }


        .hl-document-line.long {
          width:
            94%;
        }


        .hl-document-line.medium {
          width:
            77%;
        }


        .hl-document-line.short {
          width:
            53%;
        }


        .hl-document-skills {
          display:
            flex;

          flex-wrap:
            wrap;

          gap:
            6px;

          margin-top:
            12px;
        }


        .hl-document-skill {
          padding:
            7px 8px;

          border-radius:
            999px;

          background:
            #F1EDE4;

          color:
            #665E56;

          font-size:
            7px;

          font-weight:
            800;
        }


        /* ======================================================
           EXTRACTED SIGNALS
           ====================================================== */

        .hl-extraction-layer {
          position:
            absolute;

          inset:
            0;

          z-index:
            8;

          pointer-events:
            none;
        }


        .hl-extraction-tag {
          position:
            absolute;

          padding:
            8px 10px;

          border:
            1px solid
            rgba(
              111,
              125,
              85,
              0.2
            );

          border-radius:
            10px;

          background:
            rgba(
              246,
              244,
              237,
              0.94
            );

          color:
            #626B50;

          font-size:
            8px;

          font-weight:
            800;

          box-shadow:
            0 10px 22px
            rgba(
              48,
              42,
              36,
              0.07
            );
        }


        .hl-extraction-tag.one {
          left:
            20%;

          top:
            25%;
        }


        .hl-extraction-tag.two {
          right:
            15%;

          top:
            34%;
        }


        .hl-extraction-tag.three {
          left:
            25%;

          bottom:
            33%;
        }


        .hl-extraction-tag.four {
          right:
            20%;

          bottom:
            25%;
        }


        /* ======================================================
           PARTICLE FIELD
           ====================================================== */

        .hl-particle-field {
          position:
            absolute;

          inset:
            0;

          z-index:
            5;

          pointer-events:
            none;
        }


        .hl-particle {
          position:
            absolute;

          width:
            5px;

          height:
            5px;

          border-radius:
            50%;

          background:
            var(--olive);

          opacity:
            calc(
              0.18 +
              var(--particle-opacity)
            );

          transform:
            translate3d(
              var(--particle-x),
              var(--particle-y),
              0
            )
            scale(
              var(--particle-scale)
            );

          transition:
            transform 900ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),
            opacity 500ms ease;
        }


        /* ======================================================
           VECTOR GRID
           ====================================================== */

        .hl-story-vector-grid {
          position:
            absolute;

          left:
            50%;

          top:
            46%;

          width:
            490px;

          height:
            260px;

          transform:
            translate(
              -50%,
              -50%
            );

          display:
            grid;

          grid-template-columns:
            repeat(
              10,
              1fr
            );

          grid-template-rows:
            repeat(
              6,
              1fr
            );

          gap:
            8px;

          padding:
            20px;

          border:
            1px solid
            rgba(
              111,
              125,
              85,
              0.13
            );

          border-radius:
            20px;

          background:
            rgba(
              250,
              248,
              243,
              0.72
            );

          box-shadow:
            0 22px 50px
            rgba(
              48,
              43,
              37,
              0.06
            );
        }


        .hl-vector-dot {
          width:
            100%;

          height:
            100%;

          min-height:
            8px;

          border-radius:
            999px;

          background:
            var(--olive);

          opacity:
            calc(
              0.18 +
              var(--vector-opacity)
            );

          transform:
            scaleY(
              var(--vector-scale)
            );

          transform-origin:
            center;

          animation:
            hlVectorPulse
            3.6s
            ease-in-out
            infinite;
        }


        .hl-vector-dot:nth-child(
          3n
        ) {
          animation-delay:
            150ms;
        }


        .hl-vector-dot:nth-child(
          5n
        ) {
          animation-delay:
            310ms;
        }


        @keyframes hlVectorPulse {
          0%,
          100% {
            transform:
              scaleY(
                calc(
                  var(
                    --vector-scale
                  ) *
                  0.82
                )
              );
          }

          50% {
            transform:
              scaleY(
                var(
                  --vector-scale
                )
              );
          }
        }


        /* ======================================================
           VECTOR CORE
           ====================================================== */

        .hl-vector-core {
          position:
            absolute;

          left:
            50%;

          top:
            50%;

          width:
            95px;

          height:
            95px;

          transform:
            translate(
              -50%,
              -50%
            )
            scale(
              ${0.65 +
              clamp(
                (progress -
                  0.38) /
                  0.18
              ) *
                0.35}
            );

          border:
            1px solid
            rgba(
              111,
              125,
              85,
              0.35
            );

          border-radius:
            50%;

          box-shadow:
            0 0 0 18px
              rgba(
                111,
                125,
                85,
                0.055
              ),

            0 0 0 38px
              rgba(
                111,
                125,
                85,
                0.025
              );

          opacity:
            clamp(
              (progress -
                0.34) /
                0.16,
              0,
              1
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


        .hl-vector-core::before {
          content:
            '';

          position:
            absolute;

          left:
            50%;

          top:
            50%;

          width:
            18px;

          height:
            18px;

          transform:
            translate(
              -50%,
              -50%
            );

          border-radius:
            50%;

          background:
            var(--olive);

          box-shadow:
            0 0 28px
            rgba(
              111,
              125,
              85,
              0.3
            );
        }


        /* ======================================================
           SEARCH CONNECTION
           ====================================================== */

        .hl-search-path {
          position:
            absolute;

          left:
            50%;

          top:
            50%;

          width:
            470px;

          height:
            180px;

          transform:
            translate(
              -50%,
              -50%
            );

          pointer-events:
            none;

          opacity:
            clamp(
              (progress -
                0.48) /
                0.16,
              0,
              1
            );
        }


        .hl-search-path svg {
          width:
            100%;

          height:
            100%;

          overflow:
            visible;
        }


        .hl-search-path path {
          fill:
            none;

          stroke:
            var(--olive);

          stroke-width:
            1.5;

          stroke-dasharray:
            8 9;

          stroke-linecap:
            round;

          animation:
            hlSearchFlow
            3s
            linear
            infinite;
        }


        @keyframes hlSearchFlow {
          to {
            stroke-dashoffset:
              -80;
          }
        }


        .hl-search-node {
          position:
            absolute;

          top:
            50%;

          transform:
            translateY(
              -50%
            );

          padding:
            13px 15px;

          border:
            1px solid
            rgba(
              111,
              125,
              85,
              0.18
            );

          border-radius:
            14px;

          background:
            rgba(
              255,
              255,
              255,
              0.86
            );

          box-shadow:
            0 15px 35px
            rgba(
              47,
              42,
              37,
              0.07
            );
        }


        .hl-search-node.left {
          left:
            -12px;
        }


        .hl-search-node.right {
          right:
            -12px;
        }


        .hl-search-node-label {
          display:
            block;

          color:
            #877E74;

          font-size:
            7px;

          font-weight:
            900;

          letter-spacing:
            0.1em;

          text-transform:
            uppercase;
        }


        .hl-search-node-title {
          margin-top:
            6px;

          color:
            var(--espresso);

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            14px;
        }


        /* ======================================================
           FINAL MATCH CARD
           ====================================================== */

        .hl-match-result {
          position:
            absolute;

          left:
            50%;

          top:
            46%;

          width:
            540px;

          transform:
            translate(
              -50%,
              -50%
            )
            scale(
              ${0.94 +
              clamp(
                (progress -
                  0.66) /
                  0.2
              ) *
                0.06}
            );

          opacity:
            clamp(
              (progress -
                0.63) /
                0.16,
              0,
              1
            );

          z-index:
            10;

          border:
            1px solid
            rgba(
              245,
              241,
              232,
              0.14
            );

          border-radius:
            22px;

          background:
            var(--espresso);

          color:
            var(--cream);

          padding:
            21px;

          box-shadow:
            0 35px 85px
            rgba(
              33,
              28,
              24,
              0.19
            );
        }


        .hl-match-top {
          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            14px;
        }


        .hl-match-person {
          display:
            flex;

          align-items:
            center;

          gap:
            11px;
        }


        .hl-match-avatar {
          width:
            42px;

          height:
            42px;

          display:
            grid;

          place-items:
            center;

          border-radius:
            13px;

          background:
            #F1EDE4;

          color:
            var(--espresso);

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            15px;
        }


        .hl-match-name {
          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            19px;
        }


        .hl-match-role {
          margin-top:
            4px;

          color:
            #9C958B;

          font-size:
            8px;
        }


        .hl-match-score {
          text-align:
            right;
        }


        .hl-match-score-value {
          display:
            block;

          color:
            #B8C697;

          font-size:
            27px;

          line-height:
            1;

          font-weight:
            900;

          letter-spacing:
            -0.04em;
        }


        .hl-match-score-label {
          display:
            block;

          margin-top:
            4px;

          color:
            #8E877D;

          font-size:
            7px;

          letter-spacing:
            0.08em;

          text-transform:
            uppercase;
        }


        .hl-match-divider {
          height:
            1px;

          margin:
            19px 0;

          background:
            rgba(
              245,
              241,
              232,
              0.11
            );
        }


        .hl-match-evidence {
          display:
            grid;

          grid-template-columns:
            1fr
            1fr;

          gap:
            7px;
        }


        .hl-match-evidence-item {
          padding:
            9px 10px;

          border-radius:
            10px;

          background:
            rgba(
              111,
              125,
              85,
              0.13
            );

          color:
            #B7C398;

          font-size:
            8px;

          font-weight:
            800;
        }


        .hl-match-footer {
          display:
            flex;

          justify-content:
            space-between;

          align-items:
            center;

          gap:
            10px;

          margin-top:
            13px;

          color:
            #827A71;

          font-size:
            7px;

          text-transform:
            uppercase;

          letter-spacing:
            0.08em;
        }


        /* ======================================================
           STAGE TRANSITION COVER
           ====================================================== */

        .hl-stage-transition {
          position:
            absolute;

          inset:
            0;

          z-index:
            25;

          pointer-events:
            none;

          background:
            var(--cream);

          opacity:
            clamp(
              0,
              ${Math.max(
                0,
                smoothStage -
                  0.78
              ) *
                5},
              1
            );

          transition:
            opacity 250ms ease;
        }


        /* ======================================================
           PROGRESS INDICATOR
           ====================================================== */

        .hl-story-progress {
          position:
            absolute;

          right:
            0;

          top:
            50%;

          transform:
            translateY(
              -50%
            );

          display:
            flex;

          flex-direction:
            column;

          gap:
            8px;

          z-index:
            20;
        }


        .hl-story-progress-item {
          display:
            flex;

          align-items:
            center;

          gap:
            7px;

          color:
            #988F84;

          font-size:
            7px;

          font-weight:
            800;

          letter-spacing:
            0.1em;

          transition:
            color 250ms ease;
        }


        .hl-story-progress-line {
          width:
            15px;

          height:
            1px;

          background:
            #D4CDBF;

          transition:
            width 300ms ease,
            background 300ms ease;
        }


        .hl-story-progress-item.active {
          color:
            var(--olive-dark);
        }


        .hl-story-progress-item.active
          .hl-story-progress-line {
          width:
            28px;

          background:
            var(--olive);
        }


        /* ======================================================
           BOTTOM LABEL
           ====================================================== */

        .hl-story-bottom {
          position:
            absolute;

          left:
            0;

          right:
            0;

          bottom:
            26px;

          z-index:
            20;

          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            20px;

          color:
            #837A70;

          font-size:
            9px;

          line-height:
            1.45;

          opacity:
            ${1 -
            progress *
              0.45};
        }


        .hl-story-bottom-left {
          max-width:
            300px;
        }


        .hl-story-bottom-right {
          display:
            inline-flex;

          align-items:
            center;

          gap:
            8px;

          text-transform:
            uppercase;

          letter-spacing:
            0.08em;

          font-weight:
            800;
        }


        .hl-story-scroll-line {
          width:
            44px;

          height:
            1px;

          background:
            linear-gradient(
              90deg,
              var(--olive),
              transparent
            );
        }


        /* ======================================================
           TABLET
           ====================================================== */

        @media (max-width: 1050px) {

          .hl-story-copy {
            width:
              45%;
          }

          .hl-story-title {
            font-size:
              clamp(
                50px,
                6vw,
                76px
              );
          }

          .hl-story-stage {
            width:
              62%;
          }

          .hl-story-frame {
            width:
              670px;

            height:
              610px;
          }

          .hl-story-progress {
            right:
              2px;
          }

        }


        /* ======================================================
           MOBILE / STACK
           ====================================================== */

        @media (max-width: 800px) {

          .hl-story-hero {
            min-height:
              auto;
          }


          .hl-story-sticky {
            position:
              relative;

            height:
              auto;

            min-height:
              auto;

            display:
              block;

            padding:
              120px 0
              100px;
          }


          .hl-story-shell {
            width:
              min(
                100% - 30px,
                1320px
              );

            height:
              auto;
          }


          .hl-story-meta {
            position:
              relative;

            top:
              auto;

            left:
              auto;

            right:
              auto;

            margin-bottom:
              55px;

            opacity:
              1 !important;
          }


          .hl-story-copy {
            position:
              relative;

            left:
              auto;

            top:
              auto;

            width:
              100%;

            transform:
              none !important;

            opacity:
              1 !important;

            margin-bottom:
              55px;
          }


          .hl-story-title {
            font-size:
              clamp(
                50px,
                14vw,
                76px
              );
          }


          .hl-story-description {
            font-size:
              14px;
          }


          .hl-story-stage {
            position:
              relative;

            right:
              auto;

            top:
              auto;

            width:
              100%;

            height:
              600px;

            transform:
              none !important;
          }


          .hl-story-frame {
            width:
              100%;

            height:
              560px;
          }


          .hl-story-progress,
          .hl-story-bottom {
            display:
              none;
          }

        }


        /* ======================================================
           PHONE
           ====================================================== */

        @media (max-width: 560px) {

          .hl-story-sticky {
            padding:
              100px 0
              80px;
          }


          .hl-story-meta {
            margin-bottom:
              44px;
          }


          .hl-story-meta-left {
            font-size:
              8px;
          }


          .hl-story-description {
            line-height:
              1.65;
          }


          .hl-story-actions {
            align-items:
              stretch;

            flex-direction:
              column;
          }


          .hl-story-actions > * {
            width:
              100%;
          }


          .hl-story-stage {
            height:
              520px;
          }


          .hl-story-frame {
            height:
              500px;

            border-radius:
              23px;
          }


          .hl-story-frame-top {
            height:
              55px;

            padding:
              0 15px;
          }


          .hl-story-canvas {
            inset:
              55px 0 0 0;
          }


          .hl-scene-document {
            width:
              270px;

            min-height:
              355px;

            padding:
              20px;
          }


          .hl-document-name {
            font-size:
              19px;
          }


          .hl-story-vector-grid {
            width:
              88%;

            height:
              210px;

            gap:
              5px;

            padding:
              13px;
          }


          .hl-match-result {
            width:
              87%;

            padding:
              17px;
          }


          .hl-match-evidence {
            grid-template-columns:
              1fr;
          }


          .hl-stage-title {
            left:
              18px;

            bottom:
              18px;

            font-size:
              22px;
          }


          .hl-stage-description {
            right:
              18px;

            bottom:
              18px;

            max-width:
              150px;

            font-size:
              7px;
          }


          .hl-stage-label {
            left:
              18px;

            top:
              18px;
          }


          .hl-search-node {
            padding:
              9px 10px;
          }


          .hl-search-node.left {
            left:
              8px;
          }


          .hl-search-node.right {
            right:
              8px;
          }

        }


        /* ======================================================
           REDUCED MOTION
           ====================================================== */

        @media (
          prefers-reduced-motion: reduce
        ) {

          .hl-story-ring,
          .hl-vector-dot,
          .hl-search-path path {
            animation:
              none !important;
          }

        }

      `}</style>

      <div className="hl-story-sticky">

        <div className="hl-story-grain" />

        <div className="hl-story-ring one" />
        <div className="hl-story-ring two" />
        <div className="hl-story-ring three" />

        <div className="hl-story-shell">

          {/* ==================================================
              TOP META
             ================================================== */}

          <div className="hl-story-meta">

            <div className="hl-story-meta-left">
              <span className="hl-story-meta-dot" />

              Intelligent hiring infrastructure
            </div>

            <div className="hl-story-meta-pill">
              HireLabs · v2.4
            </div>

          </div>


          {/* ==================================================
              LEFT INTRO
             ================================================== */}

          <div className="hl-story-copy">

            <div className="hl-story-kicker">
              <span className="hl-story-kicker-line" />

              Semantic candidate matching
            </div>

            <h1 className="hl-story-title">

              Hire better.
              <br />

              See the{' '}
              <em>
                signal.
              </em>

            </h1>

            <p className="hl-story-description">
              HireLabs turns resumes into structured,
              searchable candidate intelligence — then
              matches people to roles based on meaning,
              experience, and evidence.
            </p>

            <div className="hl-story-actions">

              <Button
                variant="primary"
                size="lg"
                onClick={
                  onExploreClick
                }
              >
                <span>
                  Explore Live Sandbox
                </span>

                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>

              </Button>


              <Button
                variant="secondary"
                size="lg"
                onClick={
                  onViewArchClick
                }
              >
                View Architecture
              </Button>

            </div>

            <div className="hl-story-note">
              Gemini embeddings · pgvector ·
              Supabase · evidence-backed matching
            </div>

          </div>


          {/* ==================================================
              VISUAL STORY
             ================================================== */}

          <div className="hl-story-stage">

            <div className="hl-story-frame">

              {/* ==============================================
                  FRAME HEADER
                 ============================================== */}

              <div className="hl-story-frame-top">

                <div className="hl-story-frame-status">

                  <span className="hl-story-frame-status-dot" />

                  HireLabs intelligence engine

                </div>

                <div className="hl-story-frame-stage">

                  Stage{' '}
                  {String(
                    activeStage + 1
                  ).padStart(2, '0')}

                </div>

              </div>


              {/* ==============================================
                  CANVAS
                 ============================================== */}

              <div className="hl-story-canvas">

                {/* ============================================
                    STAGE LABEL
                   ============================================ */}

                <div className="hl-stage-label">
                  {currentStage.label}
                </div>


                {/* ============================================
                    STAGE TITLE
                   ============================================ */}

                <div className="hl-stage-title">
                  {currentStage.title}
                </div>


                <div className="hl-stage-description">
                  {currentStage.description}
                </div>


                {/* ============================================
                    STAGE 01 — RESUME
                   ============================================ */}

                <div
                  className="hl-scene-document"
                  style={{
                    opacity:
                      activeStage ===
                      0
                        ? 0.98
                        : activeStage ===
                            1
                          ? stageFade
                          : 0,

                    transform:
                      activeStage ===
                      0
                        ? 'translate(-50%, -50%) rotate(-3deg) scale(1)'
                        : activeStage ===
                            1
                          ? `translate(-50%, -50%) rotate(-1deg) scale(${0.98})`
                          : 'translate(-50%, -58%) rotate(3deg) scale(0.82)',
                  }}
                >

                  <div className="hl-document-name">
                    Alex Mercer
                  </div>

                  <div className="hl-document-role">
                    Lead Full-Stack AI Engineer
                  </div>

                  <div className="hl-document-rule" />

                  <div className="hl-document-label">
                    Experience
                  </div>

                  <div className="hl-document-line long" />
                  <div className="hl-document-line medium" />
                  <div className="hl-document-line long" />
                  <div className="hl-document-line short" />

                  <div className="hl-document-rule" />

                  <div className="hl-document-label">
                    Skills
                  </div>

                  <div className="hl-document-skills">

                    <span className="hl-document-skill">
                      React
                    </span>

                    <span className="hl-document-skill">
                      Node.js
                    </span>

                    <span className="hl-document-skill">
                      PostgreSQL
                    </span>

                    <span className="hl-document-skill">
                      Python
                    </span>

                    <span className="hl-document-skill">
                      AWS
                    </span>

                    <span className="hl-document-skill">
                      AI / ML
                    </span>

                  </div>

                  <div className="hl-document-rule" />

                  <div className="hl-document-label">
                    Education
                  </div>

                  <div className="hl-document-line medium" />
                  <div className="hl-document-line short" />

                </div>


                {/* ============================================
                    STAGE 02 — EXTRACTION
                   ============================================ */}

                <div
                  className="hl-extraction-layer"
                  style={{
                    opacity:
                      activeStage ===
                      1
                        ? 1
                        : 0,
                    transform:
                      activeStage ===
                      1
                        ? 'scale(1)'
                        : 'scale(0.95)',
                    transition:
                      'opacity 600ms ease, transform 700ms cubic-bezier(0.16,1,0.3,1)',
                  }}
                >

                  <div className="hl-extraction-tag one">
                    Next.js 15
                  </div>

                  <div className="hl-extraction-tag two">
                    8+ years experience
                  </div>

                  <div className="hl-extraction-tag three">
                    PostgreSQL
                  </div>

                  <div className="hl-extraction-tag four">
                    AI / ML
                  </div>

                </div>


                {/* ============================================
                    PARTICLES
                   ============================================ */}

                <div
                  className="hl-particle-field"
                  style={{
                    opacity:
                      activeStage >=
                      1 &&
                      activeStage <=
                        3
                        ? 1
                        : 0,
                  }}
                >

                  {particles.map(
                    (_, index) => {

                      const row =
                        Math.floor(
                          index /
                            12
                        );

                      const column =
                        index %
                        12;

                      const x =
                        (column -
                          5.5) *
                          (14 +
                            progress *
                              18);

                      const y =
                        (row -
                          2.5) *
                          (24 +
                            progress *
                              12);

                      const scale =
                        0.45 +
                        ((index *
                          17) %
                          70) /
                          100;

                      const opacity =
                        ((index *
                          13) %
                          60) /
                          100;

                      return (
                        <span
                          key={index}
                          className="hl-particle"
                          style={{
                            '--particle-x': `${x}px`,
                            '--particle-y': `${y}px`,
                            '--particle-scale': scale,
                            '--particle-opacity': opacity,
                          }}
                        />
                      );
                    }
                  )}

                </div>


                {/* ============================================
                    STAGE 03 — VECTOR FIELD
                   ============================================ */}

                <div
                  style={{
                    position:
                      'absolute',

                    inset:
                      0,

                    opacity:
                      activeStage >=
                      2 &&
                      activeStage <=
                        3
                        ? 1
                        : 0,

                    transition:
                      'opacity 650ms ease',

                    pointerEvents:
                      'none',
                  }}
                >

                  <div className="hl-story-vector-grid">

                    {Array.from({
                      length: 60,
                    }).map(
                      (_, index) => {

                        const scale =
                          0.45 +
                          ((index *
                            19) %
                            55) /
                            100;

                        const opacity =
                          ((index *
                            11) %
                            65) /
                          100;

                        return (
                          <span
                            key={index}
                            className="hl-vector-dot"
                            style={{
                              '--vector-scale': scale,
                              '--vector-opacity': opacity,
                            }}
                          />
                        );
                      }
                    )}

                  </div>


                  <div className="hl-vector-core" />

                </div>


                {/* ============================================
                    STAGE 04 — SEARCH
                   ============================================ */}

                <div
                  className="hl-search-path"
                  style={{
                    transform:
                      `translate(-50%, -50%) scale(${nextStageFade})`,
                  }}
                >

                  <svg
                    viewBox="0 0 470 180"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 110 C95 20 130 50 185 90 S315 160 470 55"
                    />
                  </svg>

                  <div className="hl-search-node left">

                    <span className="hl-search-node-label">
                      Job requirements
                    </span>

                    <div className="hl-search-node-title">
                      Full-Stack AI Engineer
                    </div>

                  </div>


                  <div className="hl-search-node right">

                    <span className="hl-search-node-label">
                      Candidate vector
                    </span>

                    <div className="hl-search-node-title">
                      Alex Mercer
                    </div>

                  </div>

                </div>


                {/* ============================================
                    STAGE 05 — RESULT
                   ============================================ */}

                <div className="hl-match-result">

                  <div className="hl-match-top">

                    <div className="hl-match-person">

                      <div className="hl-match-avatar">
                        AM
                      </div>

                      <div>

                        <div className="hl-match-name">
                          Alex Mercer
                        </div>

                        <div className="hl-match-role">
                          Full-Stack AI Engineer · 8+ years
                        </div>

                      </div>

                    </div>


                    <div className="hl-match-score">

                      <span className="hl-match-score-value">
                        97%
                      </span>

                      <span className="hl-match-score-label">
                        semantic match
                      </span>

                    </div>

                  </div>


                  <div className="hl-match-divider" />


                  <div className="hl-match-evidence">

                    <div className="hl-match-evidence-item">
                      ✓ Next.js experience
                    </div>

                    <div className="hl-match-evidence-item">
                      ✓ PostgreSQL + pgvector
                    </div>

                    <div className="hl-match-evidence-item">
                      ✓ AI / ML background
                    </div>

                    <div className="hl-match-evidence-item">
                      ✓ Seniority aligned
                    </div>

                  </div>


                  <div className="hl-match-footer">

                    <span>
                      Evidence-backed ranking
                    </span>

                    <span>
                      Human decision support
                    </span>

                  </div>

                </div>


                {/* ============================================
                    TRANSITION
                   ============================================ */}

                <div className="hl-stage-transition" />

              </div>

            </div>

          </div>


          {/* ==================================================
              STAGE PROGRESS
             ================================================== */}

          <div className="hl-story-progress">

            {stages.map(
              (stage, index) => {

                const active =
                  index <=
                  activeStage;

                return (
                  <div
                    key={stage.number}
                    className={`hl-story-progress-item ${
                      active
                        ? 'active'
                        : ''
                    }`}
                  >

                    <span className="hl-story-progress-line" />

                    <span>
                      {stage.number}
                    </span>

                  </div>
                );
              }
            )}

          </div>


          {/* ==================================================
              BOTTOM STORY
             ================================================== */}

          <div className="hl-story-bottom">

            <div className="hl-story-bottom-left">

              Resumes become structured signals.
              Signals become searchable meaning.
              Meaning becomes better hiring decisions.

            </div>


            <div className="hl-story-bottom-right">

              <span className="hl-story-scroll-line" />

              Scroll to transform

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}