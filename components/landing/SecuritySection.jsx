'use client';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

export function SecuritySection() {
  const sectionRef = useRef(null);

  const [isVisible, setIsVisible] =
    useState(false);

  useEffect(() => {
    const section =
      sectionRef.current;

    if (!section) return;

    const observer =
      new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        {
          threshold: 0.1,
          rootMargin:
            '0px 0px -8% 0px',
        }
      );

    observer.observe(section);

    return () =>
      observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`hl-security-section ${
        isVisible
          ? 'is-visible'
          : ''
      }`}
      id="security"
    >
      <style>{`

        /* =====================================================
           ROOT
           ===================================================== */

        .hl-security-section {
          --cream: #F5F1E8;
          --cream-soft: #ECE6DA;
          --white: #FFFFFF;

          --espresso: #211C18;
          --espresso-soft: #625950;

          --olive: #6F7D55;
          --olive-dark: #596544;

          --taupe: #C8C0AF;
          --border: #DED7CA;

          position:
            relative;

          padding:
            195px 0
            185px;

          background:
            linear-gradient(
              180deg,
              #F4EFE5 0%,
              #F5F1E8 100%
            );

          color:
            var(--espresso);

          overflow:
            hidden;

          isolation:
            isolate;
        }


        .hl-security-section *,
        .hl-security-section
          *::before,
        .hl-security-section
          *::after {
          box-sizing:
            border-box;
        }


        /* =====================================================
           BACKGROUND ORBITS
           ===================================================== */

        .hl-security-section::before {
          content:
            '';

          position:
            absolute;

          width:
            min(
              900px,
              82vw
            );

          height:
            min(
              900px,
              82vw
            );

          right:
            -430px;

          top:
            9%;

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

          opacity:
            0;

          transform:
            scale(
              0.9
            )
            rotate(
              -8deg
            );

          transition:
            opacity 1.4s ease,
            transform 1.8s
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );

          pointer-events:
            none;

          z-index:
            -1;
        }


        .hl-security-section::after {
          content:
            '';

          position:
            absolute;

          width:
            520px;

          height:
            520px;

          left:
            -350px;

          bottom:
            6%;

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

          opacity:
            0;

          transform:
            scale(
              0.93
            );

          transition:
            opacity 1.3s ease 150ms,
            transform 1.5s
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              )
              150ms;

          pointer-events:
            none;

          z-index:
            -1;
        }


        .hl-security-section.is-visible::before,
        .hl-security-section.is-visible::after {
          opacity:
            1;

          transform:
            scale(
              1
            )
            rotate(
              0deg
            );
        }


        /* =====================================================
           SHELL
           ===================================================== */

        .hl-security-shell {
          position:
            relative;

          z-index:
            2;

          width:
            min(
              1180px,
              calc(100% - 48px)
            );

          margin:
            0 auto;
        }


        /* =====================================================
           INTRO
           ===================================================== */

        .hl-security-heading {
          max-width:
            850px;

          margin-bottom:
            92px;

          opacity:
            0;

          transform:
            translate3d(
              0,
              38px,
              0
            );

          transition:
            opacity 950ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),

            transform 1050ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }


        .hl-security-section.is-visible
          .hl-security-heading {
          opacity:
            1;

          transform:
            translate3d(
              0,
              0,
              0
            );
        }


        .hl-security-kicker {
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

          font-weight:
            900;

          letter-spacing:
            0.15em;

          text-transform:
            uppercase;
        }


        .hl-security-kicker-dot {
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


        .hl-security-title {
          margin:
            0;

          max-width:
            850px;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            clamp(
              50px,
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


        .hl-security-title em {
          color:
            var(--olive);

          font-style:
            italic;
        }


        .hl-security-intro {
          max-width:
            690px;

          margin:
            26px 0 0;

          color:
            var(--espresso-soft);

          font-size:
            15px;

          line-height:
            1.72;
        }


        /* =====================================================
           MAIN LAYOUT
           ===================================================== */

        .hl-security-layout {
          display:
            grid;

          grid-template-columns:
            minmax(
              0,
              0.82fr
            )
            minmax(
              0,
              1.18fr
            );

          gap:
            18px;

          align-items:
            stretch;
        }


        /* =====================================================
           LEFT INFO
           ===================================================== */

        .hl-security-info {
          display:
            flex;

          flex-direction:
            column;

          gap:
            11px;
        }


        .hl-security-item {
          position:
            relative;

          padding:
            25px;

          border:
            1px solid
            var(--border);

          border-radius:
            21px;

          background:
            rgba(
              255,
              255,
              255,
              0.5
            );

          opacity:
            0;

          transform:
            translate3d(
              -28px,
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
              ),

            background 260ms ease,

            box-shadow 260ms ease;
        }


        .hl-security-section.is-visible
          .hl-security-item {
          opacity:
            1;

          transform:
            translate3d(
              0,
              0,
              0
            );
        }


        .hl-security-section.is-visible
          .hl-security-item:nth-child(
            1
          ) {
          transition-delay:
            220ms;
        }


        .hl-security-section.is-visible
          .hl-security-item:nth-child(
            2
          ) {
          transition-delay:
            340ms;
        }


        .hl-security-section.is-visible
          .hl-security-item:nth-child(
            3
          ) {
          transition-delay:
            460ms;
        }


        .hl-security-item:hover {
          background:
            rgba(
              255,
              255,
              255,
              0.76
            );

          box-shadow:
            0 18px 45px
            rgba(
              44,
              39,
              34,
              0.06
            );

          transform:
            translate3d(
              0,
              -3px,
              0
            );
        }


        .hl-security-item-top {
          display:
            flex;

          align-items:
            flex-start;

          gap:
            13px;
        }


        .hl-security-icon {
          width:
            41px;

          height:
            41px;

          flex:
            0 0 41px;

          display:
            grid;

          place-items:
            center;

          border-radius:
            13px;

          background:
            var(--espresso);

          color:
            var(--cream);

          transition:
            transform 280ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }


        .hl-security-item:hover
          .hl-security-icon {
          transform:
            translateY(
              -2px
            )
            rotate(
              -2deg
            );
        }


        .hl-security-number {
          color:
            #A39A8D;

          font-size:
            8px;

          font-weight:
            900;

          letter-spacing:
            0.12em;
        }


        .hl-security-item-title {
          margin-top:
            4px;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            21px;

          line-height:
            1.04;

          letter-spacing:
            -0.028em;
        }


        .hl-security-item-text {
          margin:
            15px 0 0 54px;

          color:
            #756C63;

          font-size:
            10px;

          line-height:
            1.68;
        }


        .hl-security-item-text code {
          padding:
            2px 5px;

          border-radius:
            5px;

          background:
            #ECE8DE;

          color:
            var(--olive-dark);

          font-family:
            'SFMono-Regular',
            Consolas,
            monospace;

          font-size:
            9px;
        }


        /* =====================================================
           LARGE SECURITY OBJECT
           ===================================================== */

        .hl-security-visual {
          position:
            relative;

          min-height:
            655px;

          padding:
            32px;

          border:
            1px solid
            var(--border);

          border-radius:
            29px;

          background:
            var(--espresso);

          color:
            var(--cream);

          overflow:
            hidden;

          box-shadow:
            0 32px 85px
            rgba(
              37,
              32,
              28,
              0.15
            );

          opacity:
            0;

          transform:
            translate3d(
              32px,
              28px,
              0
            )
            scale(
              0.985
            );

          transition:
            opacity 1050ms
              340ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),

            transform 1150ms
              340ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }


        .hl-security-section.is-visible
          .hl-security-visual {
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


        /* =====================================================
           ORBIT DECORATION
           ===================================================== */

        .hl-security-visual::before {
          content:
            '';

          position:
            absolute;

          width:
            500px;

          height:
            500px;

          top:
            -195px;

          right:
            -155px;

          border:
            1px solid
            rgba(
              245,
              241,
              232,
              0.08
            );

          border-radius:
            50%;

          animation:
            hlSecurityOrbit
            18s
            linear
            infinite;

          pointer-events:
            none;
        }


        .hl-security-visual::after {
          content:
            '';

          position:
            absolute;

          width:
            345px;

          height:
            345px;

          top:
            -120px;

          right:
            -75px;

          border:
            1px dashed
            rgba(
              174,
              187,
              141,
              0.13
            );

          border-radius:
            50%;

          animation:
            hlSecurityOrbitReverse
            25s
            linear
            infinite;

          pointer-events:
            none;
        }


        @keyframes hlSecurityOrbit {
          from {
            transform:
              rotate(
                0deg
              );
          }

          to {
            transform:
              rotate(
                360deg
              );
          }
        }


        @keyframes hlSecurityOrbitReverse {
          from {
            transform:
              rotate(
                360deg
              );
          }

          to {
            transform:
              rotate(
                0deg
              );
          }
        }


        /* =====================================================
           TERMINAL HEADER
           ===================================================== */

        .hl-security-visual-top {
          position:
            relative;

          z-index:
            5;

          display:
            flex;

          align-items:
            flex-start;

          justify-content:
            space-between;

          gap:
            18px;

          padding-bottom:
            23px;

          border-bottom:
            1px solid
            rgba(
              245,
              241,
              232,
              0.12
            );
        }


        .hl-security-terminal-label {
          display:
            flex;

          align-items:
            center;

          gap:
            8px;

          color:
            #B0A89E;

          font-size:
            9px;

          font-family:
            'SFMono-Regular',
            Consolas,
            monospace;
        }


        .hl-security-terminal-dot {
          width:
            6px;

          height:
            6px;

          border-radius:
            50%;

          background:
            #AEBB8D;

          box-shadow:
            0 0 10px
            rgba(
              174,
              187,
              141,
              0.18
            );
        }


        .hl-security-status {
          padding:
            7px 10px;

          border-radius:
            999px;

          background:
            rgba(
              111,
              125,
              85,
              0.18
            );

          color:
            #B7C59A;

          font-size:
            7px;

          font-weight:
            900;

          letter-spacing:
            0.1em;

          text-transform:
            uppercase;
        }


        /* =====================================================
           CODE WINDOW
           ===================================================== */

        .hl-security-code {
          position:
            relative;

          z-index:
            4;

          margin-top:
            28px;

          padding:
            22px;

          border:
            1px solid
            rgba(
              245,
              241,
              232,
              0.1
            );

          border-radius:
            18px;

          background:
            rgba(
              255,
              255,
              255,
              0.035
            );

          opacity:
            0;

          transform:
            translate3d(
              0,
              18px,
              0
            );

          transition:
            opacity 850ms
              540ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),

            transform 900ms
              540ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }


        .hl-security-section.is-visible
          .hl-security-code {
          opacity:
            1;

          transform:
            translate3d(
              0,
              0,
              0
            );
        }


        .hl-security-code-header {
          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            12px;

          margin-bottom:
            15px;
        }


        .hl-security-code-file {
          color:
            #938C82;

          font-size:
            8px;

          font-family:
            'SFMono-Regular',
            Consolas,
            monospace;
        }


        .hl-security-code-lang {
          color:
            #776F66;

          font-size:
            7px;

          font-weight:
            800;

          letter-spacing:
            0.08em;

          text-transform:
            uppercase;
        }


        .hl-security-code pre {
          margin:
            0;

          color:
            #D8D1C6;

          font-family:
            'SFMono-Regular',
            Consolas,
            monospace;

          font-size:
            9px;

          line-height:
            1.8;

          white-space:
            pre-wrap;

          overflow-x:
            auto;
        }


        .hl-code-keyword {
          color:
            #B6C494;
        }


        .hl-code-function {
          color:
            #DDD2C2;
        }


        .hl-code-value {
          color:
            #D6BFA1;
        }


        /* =====================================================
           POLICY EXPLAINER
           ===================================================== */

        .hl-security-explainer {
          position:
            relative;

          z-index:
            4;

          margin-top:
            24px;

          opacity:
            0;

          transform:
            translate3d(
              0,
              18px,
              0
            );

          transition:
            opacity 850ms
              660ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),

            transform 900ms
              660ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }


        .hl-security-section.is-visible
          .hl-security-explainer {
          opacity:
            1;

          transform:
            translate3d(
              0,
              0,
              0
            );
        }


        .hl-security-explainer-title {
          margin-bottom:
            11px;

          color:
            #9B9389;

          font-size:
            8px;

          font-weight:
            900;

          letter-spacing:
            0.12em;

          text-transform:
            uppercase;
        }


        .hl-security-flow {
          display:
            grid;

          grid-template-columns:
            1fr
            auto
            1fr;

          align-items:
            center;

          gap:
            9px;
        }


        .hl-security-node {
          min-width:
            0;

          padding:
            15px;

          border:
            1px solid
            rgba(
              245,
              241,
              232,
              0.11
            );

          border-radius:
            14px;

          background:
            rgba(
              255,
              255,
              255,
              0.035
            );

          transition:
            transform 250ms ease,
            background 250ms ease,
            border-color 250ms ease;
        }


        .hl-security-node:hover {
          transform:
            translateY(
              -2px
            );

          background:
            rgba(
              255,
              255,
              255,
              0.055
            );

          border-color:
            rgba(
              174,
              187,
              141,
              0.2
            );
        }


        .hl-security-node-label {
          color:
            #7F786F;

          font-size:
            7px;

          text-transform:
            uppercase;

          letter-spacing:
            0.1em;

          font-weight:
            900;
        }


        .hl-security-node-value {
          margin-top:
            6px;

          color:
            #E9E2D8;

          font-size:
            11px;

          font-weight:
            800;

          word-break:
            break-word;
        }


        .hl-security-node-sub {
          margin-top:
            4px;

          color:
            #857E74;

          font-size:
            7px;

          line-height:
            1.4;
        }


        .hl-security-flow-arrow {
          color:
            #9EAB7E;

          font-size:
            16px;

          animation:
            hlSecurityArrow
            2.2s
            ease-in-out
            infinite;
        }


        @keyframes hlSecurityArrow {
          0%,
          100% {
            opacity:
              0.45;

            transform:
              translateX(
                0
              );
          }

          50% {
            opacity:
              1;

            transform:
              translateX(
                4px
              );
          }
        }


        /* =====================================================
           ACCESS GRID
           ===================================================== */

        .hl-security-access {
          position:
            relative;

          z-index:
            4;

          display:
            grid;

          grid-template-columns:
            1fr
            1fr;

          gap:
            8px;

          margin-top:
            14px;

          opacity:
            0;

          transform:
            translate3d(
              0,
              13px,
              0
            );

          transition:
            opacity 750ms
              810ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),

            transform 850ms
              810ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }


        .hl-security-section.is-visible
          .hl-security-access {
          opacity:
            1;

          transform:
            translate3d(
              0,
              0,
              0
            );
        }


        .hl-access-item {
          min-width:
            0;

          display:
            flex;

          align-items:
            center;

          gap:
            8px;

          min-height:
            45px;

          padding:
            10px;

          border-radius:
            11px;

          font-size:
            8px;

          font-weight:
            800;

          transition:
            transform 220ms ease,
            background 220ms ease;
        }


        .hl-access-item:hover {
          transform:
            translateY(
              -2px
            );
        }


        .hl-access-item.allowed {
          background:
            rgba(
              111,
              125,
              85,
              0.15
            );

          color:
            #B8C59A;
        }


        .hl-access-item.blocked {
          background:
            rgba(
              173,
              105,
              82,
              0.11
            );

          color:
            #C69A89;
        }


        .hl-access-icon {
          width:
            20px;

          height:
            20px;

          flex:
            0 0 20px;

          display:
            grid;

          place-items:
            center;

          border-radius:
            7px;

          background:
            rgba(
              255,
              255,
              255,
              0.06
            );

          font-size:
            9px;
        }


        /* =====================================================
           STATS
           ===================================================== */

        .hl-security-bottom {
          position:
            relative;

          z-index:
            4;

          display:
            grid;

          grid-template-columns:
            repeat(
              3,
              1fr
            );

          gap:
            8px;

          margin-top:
            21px;

          opacity:
            0;

          transform:
            translate3d(
              0,
              14px,
              0
            );

          transition:
            opacity 750ms
              940ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),

            transform 850ms
              940ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }


        .hl-security-section.is-visible
          .hl-security-bottom {
          opacity:
            1;

          transform:
            translate3d(
              0,
              0,
              0
            );
        }


        .hl-security-stat {
          min-width:
            0;

          padding:
            13px;

          border:
            1px solid
            rgba(
              245,
              241,
              232,
              0.1
            );

          border-radius:
            12px;

          background:
            rgba(
              255,
              255,
              255,
              0.025
            );

          transition:
            transform 230ms ease,
            background 230ms ease;
        }


        .hl-security-stat:hover {
          transform:
            translateY(
              -2px
            );

          background:
            rgba(
              255,
              255,
              255,
              0.045
            );
        }


        .hl-security-stat strong {
          display:
            block;

          font-size:
            12px;

          line-height:
            1;
        }


        .hl-security-stat span {
          display:
            block;

          margin-top:
            5px;

          color:
            #80786F;

          font-size:
            7px;

          line-height:
            1.4;

          text-transform:
            uppercase;

          letter-spacing:
            0.08em;
        }


        /* =====================================================
           FINAL STATEMENT
           ===================================================== */

        .hl-security-note {
          display:
            grid;

          grid-template-columns:
            0.9fr
            1.1fr;

          align-items:
            center;

          gap:
            65px;

          margin-top:
            58px;

          padding:
            28px 0 0;

          border-top:
            1px solid
            var(--border);

          opacity:
            0;

          transform:
            translate3d(
              0,
              22px,
              0
            );

          transition:
            opacity 850ms
              1080ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),

            transform 950ms
              1080ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }


        .hl-security-section.is-visible
          .hl-security-note {
          opacity:
            1;

          transform:
            translate3d(
              0,
              0,
              0
            );
        }


        .hl-security-note strong {
          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            29px;

          line-height:
            1.02;

          font-weight:
            500;

          letter-spacing:
            -0.035em;
        }


        .hl-security-note p {
          max-width:
            500px;

          margin:
            0;

          color:
            #7A7168;

          font-size:
            10px;

          line-height:
            1.7;
        }


        /* =====================================================
           TABLET
           ===================================================== */

        @media (max-width: 950px) {

          .hl-security-layout {
            grid-template-columns:
              1fr;
          }


          .hl-security-visual {
            min-height:
              610px;
          }


          .hl-security-note {
            grid-template-columns:
              1fr
              1fr;
          }

        }


        /* =====================================================
           MOBILE
           ===================================================== */

        @media (max-width: 650px) {

          .hl-security-section {
            padding:
              115px 0
              125px;
          }


          .hl-security-shell {
            width:
              min(
                100% - 28px,
                1180px
              );
          }


          .hl-security-heading {
            margin-bottom:
              55px;
          }


          .hl-security-title {
            font-size:
              46px;
          }


          .hl-security-intro {
            font-size:
              14px;
          }


          .hl-security-item {
            padding:
              20px;
          }


          .hl-security-item-text {
            margin-left:
              0;
          }


          .hl-security-visual {
            min-height:
              670px;

            padding:
              20px;

            border-radius:
              22px;
          }


          .hl-security-code {
            padding:
              17px;
          }


          .hl-security-code pre {
            font-size:
              8px;

            line-height:
              1.7;
          }


          .hl-security-flow {
            grid-template-columns:
              1fr;
          }


          .hl-security-flow-arrow {
            justify-self:
              center;

            transform:
              rotate(
                90deg
              );
          }


          .hl-security-access {
            grid-template-columns:
              1fr;
          }


          .hl-security-bottom {
            grid-template-columns:
              1fr;
          }


          .hl-security-note {
            grid-template-columns:
              1fr;

            gap:
              16px;
          }


          .hl-security-note strong {
            font-size:
              25px;
          }


          .hl-security-section::before {
            width:
              620px;

            height:
              620px;
          }

        }


        /* =====================================================
           REDUCED MOTION
           ===================================================== */

        @media (
          prefers-reduced-motion:
            reduce
        ) {

          .hl-security-section::before,
          .hl-security-section::after,
          .hl-security-heading,
          .hl-security-item,
          .hl-security-visual,
          .hl-security-code,
          .hl-security-explainer,
          .hl-security-access,
          .hl-security-bottom,
          .hl-security-note {
            opacity:
              1 !important;

            transform:
              none !important;

            transition:
              none !important;
          }


          .hl-security-visual::before,
          .hl-security-visual::after,
          .hl-security-flow-arrow {
            animation:
              none !important;
          }


          .hl-security-item:hover,
          .hl-security-stat:hover,
          .hl-access-item:hover,
          .hl-security-node:hover {
            transform:
              none !important;
          }

        }

      `}</style>


      <div className="hl-security-shell">

        {/* ===================================================
            INTRO
           =================================================== */}

        <div className="hl-security-heading">

          <div className="hl-security-kicker">

            <span className="hl-security-kicker-dot" />

            Security by design

          </div>


          <h2 className="hl-security-title">

            Your candidates belong
            <br />

            to{' '}
            <em>
              your team.
            </em>

          </h2>


          <p className="hl-security-intro">
            HireLabs treats candidate data as private
            infrastructure, not shared application state.
            Authentication, database policies and private
            file paths work together to keep each workspace
            isolated.
          </p>

        </div>


        {/* ===================================================
            SECURITY LAYOUT
           =================================================== */}

        <div className="hl-security-layout">

          {/* =================================================
              LEFT INFORMATION
             ================================================= */}

          <div className="hl-security-info">

            {/* -----------------------------------------------
                DATABASE
               ----------------------------------------------- */}

            <article className="hl-security-item">

              <div className="hl-security-item-top">

                <div className="hl-security-icon">

                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8-4 8-10 8-10 8-10 8-10z" />
                  </svg>

                </div>


                <div>

                  <div className="hl-security-number">
                    01 · DATABASE
                  </div>


                  <div className="hl-security-item-title">
                    Row Level Security,
                    everywhere it matters.
                  </div>

                </div>

              </div>


              <div className="hl-security-item-text">
                Application tables enforce RLS at the
                database layer. Candidate vectors are
                filtered by the authenticated user instead
                of relying only on application-side checks.
              </div>

            </article>


            {/* -----------------------------------------------
                STORAGE
               ----------------------------------------------- */}

            <article className="hl-security-item">

              <div className="hl-security-item-top">

                <div className="hl-security-icon">

                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <rect
                      x="3"
                      y="11"
                      width="18"
                      height="10"
                      rx="2"
                    />

                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />

                  </svg>

                </div>


                <div>

                  <div className="hl-security-number">
                    02 · STORAGE
                  </div>


                  <div className="hl-security-item-title">
                    Private resume storage.
                  </div>

                </div>

              </div>


              <div className="hl-security-item-text">
                Resume PDF/DOCX files use{' '}
                <code>
                  &lt;auth-user-id&gt;/*
                </code>{' '}
                paths so files stay inside the owning
                recruiter's storage boundary.
              </div>

            </article>


            {/* -----------------------------------------------
                DECISIONS
               ----------------------------------------------- */}

            <article className="hl-security-item">

              <div className="hl-security-item-top">

                <div className="hl-security-icon">

                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                    />

                    <path d="M12 7v5l3 2" />

                  </svg>

                </div>


                <div>

                  <div className="hl-security-number">
                    03 · DECISIONS
                  </div>


                  <div className="hl-security-item-title">
                    AI supports people,
                    not the other way around.
                  </div>

                </div>

              </div>


              <div className="hl-security-item-text">
                Match scores are presented as decision
                support with evidence and qualification
                gaps, keeping recruiters in the loop rather
                than replacing human judgment.
              </div>

            </article>

          </div>


          {/* =================================================
              DARK SECURITY OBJECT
             ================================================= */}

          <div className="hl-security-visual">

            {/* -----------------------------------------------
                HEADER
               ----------------------------------------------- */}

            <div className="hl-security-visual-top">

              <div className="hl-security-terminal-label">

                <span className="hl-security-terminal-dot" />

                supabase / database policy

              </div>


              <div className="hl-security-status">
                policy active
              </div>

            </div>


            {/* -----------------------------------------------
                CODE
               ----------------------------------------------- */}

            <div className="hl-security-code">

              <div className="hl-security-code-header">

                <span className="hl-security-code-file">
                  candidate_embeddings.sql
                </span>


                <span className="hl-security-code-lang">
                  PostgreSQL
                </span>

              </div>


              <pre>
<span className="hl-code-keyword">
CREATE POLICY
</span>{' '}
<span className="hl-code-value">
"Users can only view their own candidate vectors"
</span>

{'\n\n'}

<span className="hl-code-keyword">
ON
</span>{' '}
<span className="hl-code-function">
public.candidate_embeddings
</span>

{'\n\n'}

<span className="hl-code-keyword">
FOR SELECT
</span>

{'\n\n'}

<span className="hl-code-keyword">
USING
</span>{' '}
(auth.uid() = user_id);

{'\n\n'}

<span className="hl-code-keyword">
WHERE
</span>{' '}
user_id = auth.uid();
              </pre>

            </div>


            {/* -----------------------------------------------
                POLICY EXPLANATION
               ----------------------------------------------- */}

            <div className="hl-security-explainer">

              <div className="hl-security-explainer-title">
                What the policy means
              </div>


              <div className="hl-security-flow">

                <div className="hl-security-node">

                  <div className="hl-security-node-label">
                    Request
                  </div>


                  <div className="hl-security-node-value">
                    Authenticated recruiter
                  </div>


                  <div className="hl-security-node-sub">
                    Has a valid auth.uid()
                  </div>

                </div>


                <div className="hl-security-flow-arrow">
                  →
                </div>


                <div className="hl-security-node">

                  <div className="hl-security-node-label">
                    Database
                  </div>


                  <div className="hl-security-node-value">
                    auth.uid() = user_id
                  </div>


                  <div className="hl-security-node-sub">
                    Policy decides what can be returned
                  </div>

                </div>

              </div>


              {/* ---------------------------------------------
                  ACCESS
                 --------------------------------------------- */}

              <div className="hl-security-access">

                <div className="hl-access-item allowed">

                  <span className="hl-access-icon">
                    ✓
                  </span>

                  Own candidate vectors

                </div>


                <div className="hl-access-item allowed">

                  <span className="hl-access-icon">
                    ✓
                  </span>

                  Own resume files

                </div>


                <div className="hl-access-item blocked">

                  <span className="hl-access-icon">
                    ×
                  </span>

                  Another user's vectors

                </div>


                <div className="hl-access-item blocked">

                  <span className="hl-access-icon">
                    ×
                  </span>

                  Another user's files

                </div>

              </div>

            </div>


            {/* -----------------------------------------------
                STATS
               ----------------------------------------------- */}

            <div className="hl-security-bottom">

              <div className="hl-security-stat">

                <strong>
                  RLS
                </strong>

                <span>
                  Database-level isolation
                </span>

              </div>


              <div className="hl-security-stat">

                <strong>
                  Private
                </strong>

                <span>
                  Scoped storage paths
                </span>

              </div>


              <div className="hl-security-stat">

                <strong>
                  Human
                </strong>

                <span>
                  Decision support model
                </span>

              </div>

            </div>

          </div>

        </div>


        {/* ===================================================
            FINAL STATEMENT
           =================================================== */}

        <div className="hl-security-note">

          <strong>
            Security should feel invisible.
          </strong>


          <p>
            The recruiting experience stays simple because
            the access rules live underneath it — at the
            database and storage boundaries where they can
            be consistently enforced.
          </p>

        </div>

      </div>

    </section>
  );
}