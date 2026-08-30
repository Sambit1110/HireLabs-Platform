'use client';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export function HeroSection({
  onExploreClick,
  onViewArchClick,
}) {
  const sectionRef =
    useRef(null);

  const [scrollProgress, setScrollProgress] =
    useState(0);

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

      setScrollProgress(
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

  const heroProgress =
    clamp(scrollProgress);

  /*
   * ==========================================================
   * HERO STORY TIMELINE
   * ==========================================================
   *
   * 0.00 - 0.20
   * Resume is introduced.
   *
   * 0.20 - 0.52
   * Resume transforms and the match card enters.
   *
   * 0.52 - 0.70
   * Match card exits.
   *
   * 0.52 - 0.80
   * Vector/detail layer enters.
   *
   * 0.72 - 1.00
   * Metrics / final state.
   */

  const introProgress =
    clamp(
      heroProgress / 0.28
    );

  const transformProgress =
    clamp(
      (heroProgress - 0.18) /
        0.42
    );

  const detailProgress =
    clamp(
      (heroProgress - 0.52) /
        0.28
    );

  const metricsProgress =
    clamp(
      (heroProgress - 0.72) /
        0.28
    );


  /*
   * ==========================================================
   * RESUME
   * ==========================================================
   */

  const resumeScale =
    1 -
    transformProgress *
      0.18;

  const resumeY =
    transformProgress *
    -70;

  const resumeOpacity =
    1 -
    transformProgress *
      0.72;


  /*
   * ==========================================================
   * MATCH CARD
   * ==========================================================
   *
   * Important fix:
   *
   * The card does NOT simply use transformProgress as its
   * opacity anymore.
   *
   * It has an explicit ENTER range and EXIT range.
   */

  const insightEnter =
    clamp(
      (heroProgress - 0.22) /
        0.16
    );

  const insightExit =
    1 -
    clamp(
      (heroProgress - 0.56) /
        0.18
    );

  const insightVisibility =
    insightEnter *
    clamp(
      insightExit
    );

  const insightY =
    90 -
    insightEnter *
      90;

  const insightScale =
    0.92 +
    insightEnter *
      0.08;

  const insightOpacity =
    insightVisibility;


  /*
   * ==========================================================
   * DETAIL CARD
   * ==========================================================
   */

  const detailY =
    45 -
    detailProgress *
      45;

  const detailOpacity =
    detailProgress;


  /*
   * ==========================================================
   * Z-INDEX / VISIBILITY
   * ==========================================================
   *
   * This ensures the black match card is genuinely absent from
   * the visual stack before and after its animation window.
   */

  const insightIsVisible =
    insightOpacity >
    0.012;


  return (
    <>
      <style>{`

        /* =====================================================
           HERO ROOT
           ===================================================== */

        .hirelabs-hero {
          --hl-cream: #F5F1E8;
          --hl-cream-soft: #EEE9DD;
          --hl-white: #FFFFFF;

          --hl-espresso: #211C18;
          --hl-espresso-soft: #5E554D;

          --hl-olive: #6F7D55;
          --hl-olive-dark: #596544;

          --hl-taupe: #C8C0AF;
          --hl-border: #DED7CA;

          position: relative;

          min-height:
            300vh;

          background:
            linear-gradient(
              180deg,
              #F5F1E8 0%,
              #F4EFE6 100%
            );

          color:
            var(--hl-espresso);

          overflow:
            clip;

          isolation:
            isolate;
        }


        .hirelabs-hero *,
        .hirelabs-hero
          *::before,
        .hirelabs-hero
          *::after {
          box-sizing:
            border-box;
        }


        /* =====================================================
           STICKY HERO SCENE
           ===================================================== */

        .hl-hero-sticky {
          position:
            sticky;

          top:
            0;

          height:
            100vh;

          min-height:
            680px;

          display:
            flex;

          align-items:
            center;

          overflow:
            hidden;

          isolation:
            isolate;
        }


        .hl-hero-container {
          position:
            relative;

          z-index:
            2;

          width:
            min(
              1240px,
              calc(100% - 64px)
            );

          height:
            100%;

          margin:
            0 auto;
        }


        /* =====================================================
           TOP LINE
           ===================================================== */

        .hl-hero-topline {
          position:
            absolute;

          left:
            0;

          right:
            0;

          top:
            7.5vh;

          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            24px;

          z-index:
            12;
        }


        .hl-eyebrow {
          display:
            inline-flex;

          align-items:
            center;

          gap:
            10px;

          font-size:
            11px;

          line-height:
            1;

          letter-spacing:
            0.16em;

          text-transform:
            uppercase;

          font-weight:
            800;

          color:
            var(--hl-espresso-soft);
        }


        .hl-eyebrow-dot {
          width:
            7px;

          height:
            7px;

          border-radius:
            999px;

          background:
            var(--hl-olive);

          box-shadow:
            0 0 0 4px
            rgba(
              111,
              125,
              85,
              0.12
            );
        }


        .hl-version {
          padding:
            8px 11px;

          border:
            1px solid
            var(--hl-border);

          border-radius:
            999px;

          background:
            rgba(
              255,
              255,
              255,
              0.46
            );

          font-size:
            10px;

          letter-spacing:
            0.1em;

          text-transform:
            uppercase;

          font-weight:
            700;

          color:
            var(--hl-espresso-soft);

          white-space:
            nowrap;
        }


        /* =====================================================
           HERO GRID
           ===================================================== */

        .hl-hero-grid {
          position:
            absolute;

          inset:
            0;

          display:
            grid;

          grid-template-columns:
            minmax(
              0,
              1.02fr
            )
            minmax(
              420px,
              0.98fr
            );

          gap:
            clamp(
              48px,
              7vw,
              120px
            );

          align-items:
            center;

          padding-top:
            68px;

          padding-bottom:
            80px;
        }


        /* =====================================================
           LEFT COPY
           ===================================================== */

        .hl-copy {
          position:
            relative;

          z-index:
            10;

          max-width:
            690px;

          transform:
            translateY(
              ${
                introProgress *
                -16
              }px
            );

          opacity:
            ${
              1 -
              introProgress *
              0.06
            };

          transition:
            opacity 120ms linear;
        }


        .hl-kicker {
          display:
            inline-block;

          margin-bottom:
            24px;

          color:
            var(--hl-olive-dark);

          font-size:
            12px;

          line-height:
            1;

          font-weight:
            800;

          letter-spacing:
            0.11em;

          text-transform:
            uppercase;
        }


        .hl-title {
          margin:
            0;

          max-width:
            760px;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            clamp(
              52px,
              6.3vw,
              92px
            );

          line-height:
            0.94;

          letter-spacing:
            -0.055em;

          font-weight:
            500;
        }


        .hl-title-line {
          display:
            block;
        }


        .hl-title-accent {
          color:
            var(--hl-olive);

          font-style:
            italic;
        }


        .hl-description {
          max-width:
            600px;

          margin:
            32px 0 0;

          color:
            var(--hl-espresso-soft);

          font-size:
            clamp(
              15px,
              1.35vw,
              18px
            );

          line-height:
            1.7;
        }


        .hl-actions {
          display:
            flex;

          flex-wrap:
            wrap;

          align-items:
            center;

          gap:
            12px;

          margin-top:
            34px;
        }


        .hl-quiet-note {
          margin-top:
            22px;

          color:
            #7A7168;

          font-size:
            12px;

          line-height:
            1.5;
        }


        /* =====================================================
           PRODUCT STAGE
           ===================================================== */

        .hl-product-stage {
          position:
            relative;

          width:
            100%;

          min-height:
            min(
              650px,
              72vh
            );

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          isolation:
            isolate;

          z-index:
            4;
        }


        /* =====================================================
           ORBIT
           ===================================================== */

        .hl-product-orbit {
          position:
            absolute;

          width:
            min(
              620px,
              52vw
            );

          aspect-ratio:
            1;

          border:
            1px solid
            rgba(
              111,
              125,
              85,
              0.15
            );

          border-radius:
            50%;

          transform:
            rotate(-14deg)
            scale(
              ${
                1 -
                detailProgress *
                0.05
              }
            );

          z-index:
            0;

          pointer-events:
            none;
        }


        .hl-product-orbit::before,
        .hl-product-orbit::after {
          content:
            '';

          position:
            absolute;

          inset:
            12%;

          border:
            1px dashed
            rgba(
              111,
              125,
              85,
              0.13
            );

          border-radius:
            50%;
        }


        .hl-product-orbit::after {
          inset:
            25%;

          border-style:
            solid;

          opacity:
            0.45;
        }


        /* =====================================================
           RESUME CARD
           ===================================================== */

        .hl-resume-card {
          position:
            relative;

          width:
            min(
              450px,
              90%
            );

          min-height:
            540px;

          padding:
            28px;

          border-radius:
            26px;

          background:
            var(--hl-white);

          border:
            1px solid
            var(--hl-border);

          box-shadow:
            0 30px 80px
            rgba(
              49,
              43,
              36,
              0.12
            ),

            0 8px 24px
            rgba(
              49,
              43,
              36,
              0.05
            );

          transform:
            translate3d(
              0,
              ${
                resumeY
              }px,
              0
            )
            scale(
              ${
                resumeScale
              }
            )
            rotate(
              ${
                transformProgress *
                -1.8
              }deg
            );

          opacity:
            ${
              resumeOpacity
            };

          z-index:
            3;

          overflow:
            hidden;

          will-change:
            transform,
            opacity;
        }


        .hl-resume-top {
          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            20px;

          padding-bottom:
            22px;

          border-bottom:
            1px solid
            #E9E4DA;
        }


        .hl-resume-name {
          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            24px;

          line-height:
            1;

          letter-spacing:
            -0.03em;
        }


        .hl-resume-role {
          margin-top:
            7px;

          color:
            #7B7269;

          font-size:
            11px;
        }


        .hl-resume-mark {
          width:
            43px;

          height:
            43px;

          display:
            grid;

          place-items:
            center;

          flex:
            0 0 43px;

          border-radius:
            14px;

          background:
            var(--hl-espresso);

          color:
            var(--hl-cream);

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            17px;
        }


        .hl-resume-section {
          margin-top:
            25px;
        }


        .hl-resume-section-label {
          margin-bottom:
            13px;

          color:
            #8A8177;

          font-size:
            9px;

          line-height:
            1;

          letter-spacing:
            0.14em;

          text-transform:
            uppercase;

          font-weight:
            800;
        }


        .hl-resume-line {
          height:
            9px;

          border-radius:
            999px;

          margin:
            9px 0;

          background:
            #EAE5DA;
        }


        .hl-resume-line.short {
          width:
            58%;
        }


        .hl-resume-line.medium {
          width:
            77%;
        }


        .hl-resume-line.long {
          width:
            92%;
        }


        .hl-resume-skills {
          display:
            flex;

          flex-wrap:
            wrap;

          gap:
            8px;
        }


        .hl-skill {
          padding:
            8px 10px;

          border-radius:
            999px;

          background:
            #F2EEE4;

          border:
            1px solid
            #E4DED2;

          color:
            #5F574F;

          font-size:
            10px;

          font-weight:
            700;
        }


        .hl-resume-footer {
          position:
            absolute;

          left:
            28px;

          right:
            28px;

          bottom:
            26px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            16px;

          padding-top:
            18px;

          border-top:
            1px solid
            #E9E4DA;

          color:
            #8A8177;

          font-size:
            10px;
        }


        /* =====================================================
           MATCH / INSIGHT CARD
           ===================================================== */

        .hl-transform-layer {
          position:
            absolute;

          width:
            min(
              420px,
              82%
            );

          transform:
            translate3d(
              0,
              ${
                insightY
              }px,
              0
            )
            scale(
              ${
                insightScale
              }
            );

          opacity:
            ${
              insightOpacity
            };

          visibility:
            ${
              insightIsVisible
                ? 'visible'
                : 'hidden'
            };

          pointer-events:
            none;

          z-index:
            ${
              insightIsVisible
                ? 8
                : 1
            };

          transition:
            opacity 120ms linear,
            visibility 0s linear
              ${
                insightIsVisible
                  ? '0s'
                  : '120ms'
              };

          will-change:
            transform,
            opacity;
        }


        .hl-transform-layer.is-hidden {
          visibility:
            hidden;

          opacity:
            0;

          pointer-events:
            none;

          z-index:
            1;
        }


        .hl-insight-card {
          width:
            100%;

          padding:
            24px;

          border-radius:
            24px;

          background:
            var(--hl-espresso);

          color:
            var(--hl-cream);

          box-shadow:
            0 36px 90px
            rgba(
              33,
              28,
              24,
              0.2
            );
        }


        .hl-insight-header {
          display:
            flex;

          align-items:
            flex-start;

          justify-content:
            space-between;

          gap:
            20px;
        }


        .hl-insight-label {
          font-size:
            9px;

          line-height:
            1;

          letter-spacing:
            0.14em;

          text-transform:
            uppercase;

          color:
            #BEB8AE;

          font-weight:
            800;
        }


        .hl-insight-title {
          margin-top:
            9px;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            24px;

          letter-spacing:
            -0.03em;
        }


        .hl-score {
          min-width:
            84px;

          text-align:
            right;
        }


        .hl-score-number {
          display:
            block;

          color:
            #B9C69A;

          font-size:
            28px;

          line-height:
            1;

          font-weight:
            800;

          letter-spacing:
            -0.04em;
        }


        .hl-score-label {
          margin-top:
            5px;

          color:
            #9D978D;

          font-size:
            9px;

          text-transform:
            uppercase;

          letter-spacing:
            0.08em;
        }


        .hl-insight-divider {
          height:
            1px;

          margin:
            20px 0;

          background:
            rgba(
              255,
              255,
              255,
              0.13
            );
        }


        .hl-match-grid {
          display:
            grid;

          gap:
            11px;
        }


        .hl-match-row {
          display:
            grid;

          grid-template-columns:
            1fr
            auto;

          gap:
            15px;

          align-items:
            center;
        }


        .hl-match-left {
          display:
            flex;

          align-items:
            center;

          gap:
            9px;

          color:
            #E2DDD3;

          font-size:
            11px;
        }


        .hl-check {
          width:
            18px;

          height:
            18px;

          display:
            grid;

          place-items:
            center;

          border-radius:
            50%;

          background:
            rgba(
              111,
              125,
              85,
              0.3
            );

          color:
            #C2D19F;

          font-size:
            10px;

          font-weight:
            800;
        }


        .hl-match-value {
          color:
            #AAA39A;

          font-size:
            10px;

          font-weight:
            700;
        }


        /* =====================================================
           DETAIL CARD
           ===================================================== */

        .hl-detail-card {
          position:
            absolute;

          right:
            -24px;

          bottom:
            40px;

          width:
            235px;

          padding:
            18px;

          border-radius:
            18px;

          background:
            rgba(
              255,
              255,
              255,
              0.94
            );

          border:
            1px solid
            var(--hl-border);

          box-shadow:
            0 22px 55px
            rgba(
              49,
              43,
              36,
              0.12
            );

          transform:
            translate3d(
              ${
                detailY
              }px,
              0,
              0
            );

          opacity:
            ${
              detailOpacity
            };

          z-index:
            9;

          backdrop-filter:
            blur(14px);

          will-change:
            transform,
            opacity;
        }


        .hl-detail-label {
          color:
            #8A8177;

          font-size:
            8px;

          line-height:
            1;

          letter-spacing:
            0.14em;

          text-transform:
            uppercase;

          font-weight:
            800;
        }


        .hl-detail-title {
          margin-top:
            7px;

          font-size:
            13px;

          font-weight:
            800;
        }


        .hl-vector {
          margin-top:
            13px;

          padding:
            11px;

          border-radius:
            11px;

          background:
            #F4F0E7;

          color:
            #696158;

          font-family:
            'SFMono-Regular',
            Consolas,
            monospace;

          font-size:
            8px;

          line-height:
            1.65;

          overflow:
            hidden;
        }


        /* =====================================================
           BOTTOM METRICS
           ===================================================== */

        .hl-hero-bottom {
          position:
            absolute;

          left:
            0;

          right:
            0;

          bottom:
            30px;

          z-index:
            12;

          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            30px;

          width:
            min(
              1240px,
              calc(100% - 64px)
            );

          margin:
            0 auto;
        }


        .hl-bottom-copy {
          max-width:
            330px;

          color:
            #82796F;

          font-size:
            11px;

          line-height:
            1.5;

          opacity:
            ${
              1 -
              metricsProgress *
              0.2
            };
        }


        .hl-metrics {
          display:
            flex;

          align-items:
            stretch;

          gap:
            0;

          border:
            1px solid
            var(--hl-border);

          border-radius:
            18px;

          overflow:
            hidden;

          background:
            rgba(
              255,
              255,
              255,
              0.48
            );

          backdrop-filter:
            blur(12px);
        }


        .hl-metric {
          min-width:
            145px;

          padding:
            15px 18px;

          border-right:
            1px solid
            var(--hl-border);
        }


        .hl-metric:last-child {
          border-right:
            0;
        }


        .hl-metric-number {
          display:
            block;

          font-size:
            18px;

          line-height:
            1;

          font-weight:
            800;

          letter-spacing:
            -0.03em;
        }


        .hl-metric-label {
          display:
            block;

          margin-top:
            6px;

          color:
            #857D74;

          font-size:
            9px;

          line-height:
            1.3;

          text-transform:
            uppercase;

          letter-spacing:
            0.08em;
        }


        /* =====================================================
           SCROLL INDICATOR
           ===================================================== */

        .hl-scroll-indicator {
          position:
            absolute;

          right:
            24px;

          top:
            50%;

          transform:
            translateY(
              -50%
            );

          z-index:
            11;

          writing-mode:
            vertical-rl;

          display:
            flex;

          align-items:
            center;

          gap:
            10px;

          color:
            #8B8278;

          font-size:
            9px;

          letter-spacing:
            0.15em;

          text-transform:
            uppercase;

          font-weight:
            800;
        }


        .hl-scroll-line {
          width:
            1px;

          height:
            62px;

          background:
            linear-gradient(
              to bottom,
              var(--hl-taupe),
              transparent
            );
        }


        /* =====================================================
           FLOATING DOTS
           ===================================================== */

        .hl-floating-dot {
          position:
            absolute;

          border-radius:
            50%;

          background:
            var(--hl-olive);

          opacity:
            0.28;

          filter:
            blur(1px);

          pointer-events:
            none;
        }


        .hl-floating-dot.one {
          width:
            8px;

          height:
            8px;

          left:
            8%;

          top:
            27%;

          z-index:
            1;
        }


        .hl-floating-dot.two {
          width:
            5px;

          height:
            5px;

          left:
            46%;

          top:
            12%;

          opacity:
            0.16;

          z-index:
            1;
        }


        .hl-floating-dot.three {
          width:
            6px;

          height:
            6px;

          right:
            10%;

          top:
            32%;

          opacity:
            0.18;

          z-index:
            1;
        }


        /* =====================================================
           FILM GRAIN
           ===================================================== */

        .hl-grain {
          position:
            absolute;

          inset:
            0;

          z-index:
            0;

          pointer-events:
            none;

          opacity:
            0.18;

          background-image:
            radial-gradient(
              rgba(
                33,
                28,
                24,
                0.12
              )
              0.6px,
              transparent
              0.6px
            );

          background-size:
            6px 6px;

          mask-image:
            linear-gradient(
              to bottom,
              black,
              transparent 92%
            );
        }


        /* =====================================================
           TABLET
           ===================================================== */

        @media (max-width: 1100px) {

          .hl-hero-grid {
            grid-template-columns:
              minmax(
                0,
                1fr
              )
              minmax(
                360px,
                0.85fr
              );

            gap:
              48px;
          }


          .hl-detail-card {
            right:
              -8px;
          }


          .hl-metric {
            min-width:
              125px;
          }

        }


        /* =====================================================
           TABLET / MOBILE LAYOUT
           ===================================================== */

        @media (max-width: 860px) {

          .hirelabs-hero {
            min-height:
              auto;
          }


          .hl-hero-sticky {
            position:
              relative;

            height:
              auto;

            min-height:
              auto;

            padding:
              88px 0
              130px;

            overflow:
              visible;
          }


          .hl-hero-container {
            height:
              auto;
          }


          .hl-hero-topline {
            position:
              relative;

            top:
              auto;

            margin-bottom:
              50px;
          }


          .hl-hero-grid {
            position:
              relative;

            inset:
              auto;

            grid-template-columns:
              1fr;

            gap:
              70px;

            padding:
              0;
          }


          .hl-copy {
            transform:
              none !important;

            opacity:
              1 !important;
          }


          .hl-product-stage {
            min-height:
              570px;
          }


          .hl-hero-bottom {
            position:
              relative;

            left:
              auto;

            right:
              auto;

            bottom:
              auto;

            width:
              min(
                1240px,
                calc(100% - 64px)
              );

            margin:
              40px auto 0;

            flex-direction:
              column;

            align-items:
              flex-start;
          }


          .hl-metrics {
            width:
              100%;
          }


          .hl-metric {
            flex:
              1;

            min-width:
              0;
          }


          .hl-scroll-indicator {
            display:
              none;
          }

        }


        /* =====================================================
           SMALL MOBILE
           ===================================================== */

        @media (max-width: 600px) {

          .hl-hero-container,
          .hl-hero-bottom {
            width:
              min(
                100% - 32px,
                1240px
              );
          }


          .hl-hero-topline {
            margin-bottom:
              50px;
          }


          .hl-title {
            font-size:
              clamp(
                48px,
                14vw,
                70px
              );
          }


          .hl-description {
            font-size:
              15px;
          }


          .hl-actions {
            align-items:
              stretch;

            flex-direction:
              column;
          }


          .hl-actions > * {
            width:
              100%;
          }


          .hl-product-stage {
            min-height:
              510px;
          }


          .hl-resume-card {
            width:
              94%;

            min-height:
              465px;

            padding:
              22px;

            border-radius:
              21px;
          }


          .hl-resume-footer {
            left:
              22px;

            right:
              22px;

            bottom:
              22px;
          }


          .hl-transform-layer {
            width:
              90%;
          }


          .hl-detail-card {
            right:
              0;

            bottom:
              16px;

            width:
              205px;
          }


          .hl-metrics {
            display:
              grid;

            grid-template-columns:
              1fr;

            width:
              100%;
          }


          .hl-metric {
            border-right:
              0;

            border-bottom:
              1px solid
              var(--hl-border);
          }


          .hl-metric:last-child {
            border-bottom:
              0;
          }


          .hl-floating-dot {
            display:
              none;
          }

        }


        /* =====================================================
           REDUCED MOTION
           ===================================================== */

        @media (
          prefers-reduced-motion:
            reduce
        ) {

          .hl-copy,
          .hl-resume-card,
          .hl-transform-layer,
          .hl-detail-card,
          .hl-product-orbit {
            transform:
              none !important;

            transition:
              none !important;
          }


          .hl-transform-layer {
            opacity:
              0 !important;

            visibility:
              hidden !important;
          }

        }

      `}</style>


      {/* =====================================================
          HERO SECTION
         ===================================================== */}

      <section
        ref={sectionRef}
        className="hirelabs-hero"
        id="heroSection"
        aria-label="HireLabs introduction"
      >

        <div className="hl-hero-sticky">

          {/* =================================================
              BACKGROUND
             ================================================= */}

          <div className="hl-grain" />

          <div className="hl-floating-dot one" />
          <div className="hl-floating-dot two" />
          <div className="hl-floating-dot three" />


          <div className="hl-hero-container">

            {/* ===============================================
                TOP LINE
               =============================================== */}

            <div className="hl-hero-topline">

              <div className="hl-eyebrow">

                <span className="hl-eyebrow-dot" />

                Intelligent hiring infrastructure

              </div>


              <div className="hl-version">
                HireLabs · v2.4
              </div>

            </div>


            {/* ===============================================
                MAIN GRID
               =============================================== */}

            <div className="hl-hero-grid">

              {/* =============================================
                  LEFT CONTENT
                 ============================================= */}

              <div className="hl-copy">

                <span className="hl-kicker">
                  Semantic candidate matching
                </span>


                <h1 className="hl-title">

                  <span className="hl-title-line">
                    Hire better.
                  </span>


                  <span className="hl-title-line">

                    Skip the{' '}

                    <span className="hl-title-accent">
                      guesswork.
                    </span>

                  </span>

                </h1>


                <p className="hl-description">
                  HireLabs turns resumes into structured,
                  searchable candidate intelligence — then
                  matches people to the roles where they can
                  actually make an impact.
                </p>


                <div className="hl-actions">

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
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
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

                    <span>
                      View Architecture
                    </span>

                  </Button>

                </div>


                <div className="hl-quiet-note">
                  Semantic matching · Gemini embeddings ·
                  pgvector · Supabase
                </div>

              </div>


              {/* =============================================
                  PRODUCT VISUAL
                 ============================================= */}

              <div
                className="hl-product-stage"
                aria-hidden="true"
              >

                <div className="hl-product-orbit" />


                {/* =========================================
                    RESUME
                   ========================================= */}

                <div className="hl-resume-card">

                  <div className="hl-resume-top">

                    <div>

                      <div className="hl-resume-name">
                        Alex Mercer
                      </div>


                      <div className="hl-resume-role">
                        Lead Full-Stack AI Engineer
                      </div>

                    </div>


                    <div className="hl-resume-mark">
                      AM
                    </div>

                  </div>


                  <div className="hl-resume-section">

                    <div className="hl-resume-section-label">
                      Experience
                    </div>


                    <div className="hl-resume-line long" />
                    <div className="hl-resume-line medium" />
                    <div className="hl-resume-line long" />
                    <div className="hl-resume-line short" />

                  </div>


                  <div className="hl-resume-section">

                    <div className="hl-resume-section-label">
                      Skills
                    </div>


                    <div className="hl-resume-skills">

                      <span className="hl-skill">
                        React
                      </span>

                      <span className="hl-skill">
                        Node.js
                      </span>

                      <span className="hl-skill">
                        PostgreSQL
                      </span>

                      <span className="hl-skill">
                        AWS
                      </span>

                      <span className="hl-skill">
                        Python
                      </span>

                      <span className="hl-skill">
                        AI / ML
                      </span>

                    </div>

                  </div>


                  <div className="hl-resume-section">

                    <div className="hl-resume-section-label">
                      Education
                    </div>


                    <div className="hl-resume-line medium" />
                    <div className="hl-resume-line short" />

                  </div>


                  <div className="hl-resume-footer">

                    <span>
                      resume.pdf
                    </span>

                    <span>
                      Parsed successfully
                    </span>

                  </div>

                </div>


                {/* =========================================
                    MATCHING RESULT
                   ========================================= */}

                <div
                  className={`hl-transform-layer ${
                    insightIsVisible
                      ? ''
                      : 'is-hidden'
                  }`}
                  style={{
                    opacity:
                      insightOpacity,

                    visibility:
                      insightIsVisible
                        ? 'visible'
                        : 'hidden',

                    pointerEvents:
                      'none',

                    zIndex:
                      insightIsVisible
                        ? 8
                        : 1,

                    transform:
                      `translate3d(0, ${insightY}px, 0) scale(${insightScale})`,
                  }}
                >

                  <div className="hl-insight-card">

                    <div className="hl-insight-header">

                      <div>

                        <div className="hl-insight-label">
                          HireLabs analysis
                        </div>


                        <div className="hl-insight-title">
                          Strong candidate fit
                        </div>

                      </div>


                      <div className="hl-score">

                        <span className="hl-score-number">
                          97.4%
                        </span>


                        <span className="hl-score-label">
                          semantic match
                        </span>

                      </div>

                    </div>


                    <div className="hl-insight-divider" />


                    <div className="hl-match-grid">

                      <div className="hl-match-row">

                        <div className="hl-match-left">

                          <span className="hl-check">
                            ✓
                          </span>

                          React &amp; Node.js

                        </div>


                        <span className="hl-match-value">
                          matched
                        </span>

                      </div>


                      <div className="hl-match-row">

                        <div className="hl-match-left">

                          <span className="hl-check">
                            ✓
                          </span>

                          System architecture

                        </div>


                        <span className="hl-match-value">
                          matched
                        </span>

                      </div>


                      <div className="hl-match-row">

                        <div className="hl-match-left">

                          <span className="hl-check">
                            ✓
                          </span>

                          5+ years experience

                        </div>


                        <span className="hl-match-value">
                          matched
                        </span>

                      </div>


                      <div className="hl-match-row">

                        <div className="hl-match-left">

                          <span className="hl-check">
                            ✓
                          </span>

                          AI / ML background

                        </div>


                        <span className="hl-match-value">
                          strong fit
                        </span>

                      </div>

                    </div>

                  </div>

                </div>


                {/* =========================================
                    TECHNICAL DETAIL
                   ========================================= */}

                <div
                  className="hl-detail-card"
                  style={{
                    opacity:
                      detailOpacity,

                    transform:
                      `translate3d(${detailY}px, 0, 0)`,
                  }}
                >

                  <div className="hl-detail-label">
                    Vector intelligence
                  </div>


                  <div className="hl-detail-title">
                    Searchable candidate representation
                  </div>


                  <div className="hl-vector">

                    [
                    {' '}
                    -0.0234,
                    {' '}
                    0.0841,
                    {' '}
                    -0.0519,

                    <br />

                    0.0911,
                    {' '}
                    0.0172,
                    ...
                    ]

                    <br />
                    <br />

                    1536 dimensions

                    <br />

                    cosine distance → 0.026

                  </div>

                </div>

              </div>

            </div>


            {/* ===============================================
                BOTTOM DATA
               =============================================== */}

            <div className="hl-hero-bottom">

              <div
                className="hl-bottom-copy"
              >
                Scroll to see a resume transform into a
                ranked candidate signal.
              </div>


              <div className="hl-metrics">

                <div className="hl-metric">

                  <span className="hl-metric-number">
                    1536
                  </span>

                  <span className="hl-metric-label">
                    Vector dimensions
                  </span>

                </div>


                <div className="hl-metric">

                  <span className="hl-metric-number">
                    &lt; 85ms
                  </span>

                  <span className="hl-metric-label">
                    Match query
                  </span>

                </div>


                <div className="hl-metric">

                  <span className="hl-metric-number">
                    100%
                  </span>

                  <span className="hl-metric-label">
                    RLS scoped
                  </span>

                </div>

              </div>

            </div>


            {/* ===============================================
                SCROLL INDICATOR
               =============================================== */}

            <div className="hl-scroll-indicator">

              <span className="hl-scroll-line" />

              Scroll to explore

            </div>

          </div>

        </div>

      </section>
    </>
  );
}