import React, { useEffect, useRef, useState } from 'react';

export function ComparisonTable() {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  const rows = [
    {
      label: 'Matching method',
      legacy: 'Exact string / regex matching',
      hirelabs: '1536-dimensional semantic vectors',
    },
    {
      label: 'Context awareness',
      legacy: 'Misses equivalent phrasing such as “K8s” vs “Kubernetes”',
      hirelabs: 'Understands domain equivalents and architecture context',
    },
    {
      label: 'Match explanation',
      legacy: 'Opaque score with no rationale',
      hirelabs: 'Evidence citations and qualification-gap signals',
    },
    {
      label: 'Security',
      legacy: 'Application-level filtering',
      hirelabs: 'Postgres RLS + auth.uid() boundaries',
    },
    {
      label: 'Search architecture',
      legacy: 'Separate search infrastructure and sync overhead',
      hirelabs: 'pgvector directly inside PostgreSQL',
    },
  ];

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -8% 0px',
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`hl-comparison-section ${
        isVisible ? 'is-visible' : ''
      }`}
      id="comparison"
    >
      <style>{`
        .hl-comparison-section {
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

          padding: 185px 0 175px;

          background:
            linear-gradient(
              180deg,
              var(--cream) 0%,
              #F3EEE4 100%
            );

          color: var(--espresso);

          overflow: hidden;
        }

        .hl-comparison-section *,
        .hl-comparison-section *::before,
        .hl-comparison-section *::after {
          box-sizing: border-box;
        }

        /* =====================================================
           BACKGROUND DETAIL
           ===================================================== */

        .hl-comparison-section::before {
          content: '';

          position: absolute;

          width: 620px;
          height: 620px;

          top: 12%;
          right: -260px;

          border-radius: 50%;

          border:
            1px solid
            rgba(111,125,85,0.08);

          opacity: 0;

          transform: scale(0.92);

          transition:
            opacity 1.2s ease,
            transform 1.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .hl-comparison-section.is-visible::before {
          opacity: 1;

          transform: scale(1);
        }

        .hl-comparison-shell {
          width:
            min(
              1180px,
              calc(100% - 48px)
            );

          margin: 0 auto;

          position: relative;

          z-index: 1;
        }

        /* =====================================================
           HEADER
           ===================================================== */

        .hl-comparison-heading {
          display: grid;

          grid-template-columns:
            0.9fr
            1.1fr;

          gap: 80px;

          align-items: end;

          margin-bottom: 82px;
        }

        .hl-comparison-heading > div:first-child {
          opacity: 0;

          transform:
            translate3d(
              0,
              32px,
              0
            );

          transition:
            opacity 900ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),

            transform 1000ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }

        .hl-comparison-section.is-visible
          .hl-comparison-heading
          > div:first-child {
          opacity: 1;

          transform:
            translate3d(
              0,
              0,
              0
            );
        }

        .hl-comparison-heading > div:last-child {
          opacity: 0;

          transform:
            translate3d(
              0,
              28px,
              0
            );

          transition:
            opacity 900ms
              120ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),

            transform 1000ms
              120ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }

        .hl-comparison-section.is-visible
          .hl-comparison-heading
          > div:last-child {
          opacity: 1;

          transform:
            translate3d(
              0,
              0,
              0
            );
        }

        .hl-comparison-kicker {
          display: inline-flex;

          align-items: center;

          gap: 9px;

          margin-bottom: 18px;

          color:
            var(--olive-dark);

          font-size: 10px;

          line-height: 1;

          font-weight: 900;

          letter-spacing: 0.15em;

          text-transform: uppercase;
        }

        .hl-comparison-kicker-dot {
          width: 7px;
          height: 7px;

          border-radius: 50%;

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

        .hl-comparison-title {
          margin: 0;

          max-width: 560px;

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size:
            clamp(
              49px,
              5.7vw,
              76px
            );

          line-height: 0.93;

          letter-spacing: -0.055em;

          font-weight: 500;
        }

        .hl-comparison-title em {
          color:
            var(--olive);

          font-style: italic;
        }

        .hl-comparison-description {
          max-width: 560px;

          margin:
            0 0 3px
            auto;

          color:
            var(--espresso-soft);

          font-size: 15px;

          line-height: 1.75;
        }

        .hl-comparison-note {
          display: flex;

          align-items: center;

          gap: 9px;

          margin-top: 18px;

          color: #81786F;

          font-size: 9px;

          line-height: 1.5;

          text-transform: uppercase;

          letter-spacing: 0.08em;

          font-weight: 800;
        }

        .hl-comparison-note span {
          width: 28px;
          height: 1px;

          flex: 0 0 28px;

          background:
            var(--olive);
        }

        /* =====================================================
           COMPARISON CARD
           ===================================================== */

        .hl-comparison-card {
          border:
            1px solid
            var(--border);

          border-radius: 28px;

          background:
            rgba(
              255,
              255,
              255,
              0.52
            );

          overflow: hidden;

          box-shadow:
            0 30px 80px
            rgba(
              45,
              40,
              34,
              0.055
            );

          opacity: 0;

          transform:
            translate3d(
              0,
              38px,
              0
            )
            scale(0.985);

          transition:
            opacity 1000ms
              250ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),

            transform 1200ms
              250ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }

        .hl-comparison-section.is-visible
          .hl-comparison-card {
          opacity: 1;

          transform:
            translate3d(
              0,
              0,
              0
            )
            scale(1);
        }

        /* =====================================================
           HEADER ROW
           ===================================================== */

        .hl-comparison-top {
          display: grid;

          grid-template-columns:
            1fr
            1fr
            1fr;

          min-height: 82px;

          border-bottom:
            1px solid
            var(--border);
        }

        .hl-comparison-top-cell {
          display: flex;

          align-items: center;

          padding:
            0 28px;
        }

        .hl-comparison-top-cell
          + .hl-comparison-top-cell {
          border-left:
            1px solid
            var(--border);
        }

        .hl-comparison-top-cell:first-child {
          color: #897F74;

          font-size: 9px;

          font-weight: 900;

          letter-spacing: 0.13em;

          text-transform: uppercase;
        }

        .hl-comparison-top-cell.legacy {
          color: #81776D;

          font-size: 10px;

          font-weight: 900;

          text-transform: uppercase;

          letter-spacing: 0.08em;
        }

        .hl-comparison-top-cell.hirelabs {
          position: relative;

          background:
            var(--espresso);

          color:
            var(--cream);

          font-size: 10px;

          font-weight: 900;

          text-transform: uppercase;

          letter-spacing: 0.08em;
        }

        .hl-comparison-top-cell.hirelabs::before {
          content: '';

          position: absolute;

          left: 0;
          top: 0;

          width: 100%;
          height: 100%;

          background:
            linear-gradient(
              110deg,
              transparent 0%,
              rgba(
                255,
                255,
                255,
                0.04
              ) 45%,
              transparent 70%
            );

          transform:
            translateX(-100%);

          transition:
            transform 1.2s
            cubic-bezier(
              0.16,
              1,
              0.3,
              1
            );

          pointer-events: none;
        }

        .hl-comparison-section.is-visible
          .hl-comparison-top-cell.hirelabs::before {
          transform:
            translateX(100%);
        }

        .hl-comparison-top-cell.hirelabs::after {
          content: '';

          position: absolute;

          left: 0;
          right: 0;
          top: 0;

          height: 3px;

          background:
            var(--olive);
        }

        /* =====================================================
           BODY
           ===================================================== */

        .hl-comparison-table {
          width: 100%;
        }

        .hl-comparison-row {
          position: relative;

          display: grid;

          grid-template-columns:
            1fr
            1fr
            1fr;

          min-height: 118px;

          border-bottom:
            1px solid
            var(--border);

          opacity: 0;

          transform:
            translate3d(
              0,
              22px,
              0
            );

          transition:
            opacity 700ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),

            transform 800ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }

        .hl-comparison-section.is-visible
          .hl-comparison-row {
          opacity: 1;

          transform:
            translate3d(
              0,
              0,
              0
            );
        }

        .hl-comparison-section.is-visible
          .hl-comparison-row:nth-child(1) {
          transition-delay:
            420ms;
        }

        .hl-comparison-section.is-visible
          .hl-comparison-row:nth-child(2) {
          transition-delay:
            500ms;
        }

        .hl-comparison-section.is-visible
          .hl-comparison-row:nth-child(3) {
          transition-delay:
            580ms;
        }

        .hl-comparison-section.is-visible
          .hl-comparison-row:nth-child(4) {
          transition-delay:
            660ms;
        }

        .hl-comparison-section.is-visible
          .hl-comparison-row:nth-child(5) {
          transition-delay:
            740ms;
        }

        .hl-comparison-row:last-child {
          border-bottom: 0;
        }

        .hl-comparison-cell {
          display: flex;

          align-items: center;

          padding:
            24px 28px;

          min-width: 0;
        }

        .hl-comparison-cell
          + .hl-comparison-cell {
          border-left:
            1px solid
            var(--border);
        }

        /* =====================================================
           FEATURE LABEL
           ===================================================== */

        .hl-feature-label {
          color:
            var(--espresso);

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size: 18px;

          line-height: 1.15;

          letter-spacing: -0.025em;
        }

        /* =====================================================
           LEGACY SIDE
           ===================================================== */

        .hl-legacy-content {
          display: flex;

          align-items: flex-start;

          gap: 11px;

          color: #8A8076;

          font-size: 10px;

          line-height: 1.65;
        }

        .hl-legacy-mark {
          width: 21px;
          height: 21px;

          flex:
            0 0 21px;

          display: grid;

          place-items: center;

          margin-top: 1px;

          border-radius: 50%;

          background:
            #EAE5DC;

          color:
            #8C8177;

          font-size: 10px;

          font-weight: 900;
        }

        /* =====================================================
           HIRELABS SIDE
           ===================================================== */

        .hl-hirelabs-cell {
          position: relative;

          background:
            rgba(
              255,
              255,
              255,
              0.72
            );
        }

        .hl-hirelabs-cell::after {
          content: '';

          position: absolute;

          left: 0;
          top: 15%;

          width: 2px;

          height: 70%;

          background:
            var(--olive);

          opacity: 0.6;

          transform:
            scaleY(0);

          transform-origin:
            center;

          transition:
            transform 650ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }

        .hl-comparison-section.is-visible
          .hl-hirelabs-cell::after {
          transform:
            scaleY(1);
        }

        .hl-hirelabs-content {
          display: flex;

          align-items: flex-start;

          gap: 11px;

          color:
            #5E6651;

          font-size: 10px;

          line-height: 1.65;

          font-weight: 700;
        }

        .hl-hirelabs-mark {
          width: 21px;
          height: 21px;

          flex:
            0 0 21px;

          display: grid;

          place-items: center;

          margin-top: 1px;

          border-radius: 50%;

          background:
            #E7EDDD;

          color:
            var(--olive-dark);

          font-size: 10px;

          font-weight: 900;
        }

        /* =====================================================
           HOVER INTERACTION
           ===================================================== */

        .hl-comparison-row {
          transition:
            opacity 700ms cubic-bezier(
              0.16,
              1,
              0.3,
              1
            ),
            transform 800ms cubic-bezier(
              0.16,
              1,
              0.3,
              1
            ),
            background 250ms ease;
        }

        .hl-comparison-row:hover {
          background:
            rgba(
              255,
              255,
              255,
              0.28
            );
        }

        .hl-comparison-row:hover
          .hl-hirelabs-cell {
          background:
            rgba(
              255,
              255,
              255,
              0.9
            );
        }

        /* =====================================================
           FOOTER
           ===================================================== */

        .hl-comparison-footer {
          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 30px;

          margin-top: 38px;

          opacity: 0;

          transform:
            translate3d(
              0,
              18px,
              0
            );

          transition:
            opacity 700ms
              900ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),

            transform 800ms
              900ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              );
        }

        .hl-comparison-section.is-visible
          .hl-comparison-footer {
          opacity: 1;

          transform:
            translate3d(
              0,
              0,
              0
            );
        }

        .hl-comparison-footer-copy {
          max-width: 500px;

          margin: 0;

          color: #82796F;

          font-size: 10px;

          line-height: 1.6;
        }

        .hl-comparison-footer-copy strong {
          color:
            var(--espresso);
        }

        .hl-comparison-pill {
          display: inline-flex;

          align-items: center;

          gap: 8px;

          padding: 10px 13px;

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

          color: #746B62;

          font-size: 8px;

          font-weight: 900;

          letter-spacing: 0.08em;

          text-transform: uppercase;

          white-space: nowrap;
        }

        .hl-comparison-pill i {
          width: 6px;
          height: 6px;

          border-radius: 50%;

          background:
            var(--olive);
        }

        /* =====================================================
           TABLET
           ===================================================== */

        @media (max-width: 900px) {
          .hl-comparison-heading {
            grid-template-columns: 1fr;

            gap: 22px;
          }

          .hl-comparison-description {
            margin-left: 0;
          }

          .hl-comparison-card {
            overflow-x: auto;
          }

          .hl-comparison-top,
          .hl-comparison-row {
            min-width: 820px;
          }

          .hl-comparison-footer {
            align-items: flex-start;

            flex-direction: column;

            gap: 16px;
          }
        }

        /* =====================================================
           MOBILE
           ===================================================== */

        @media (max-width: 620px) {
          .hl-comparison-section {
            padding:
              115px 0
              120px;
          }

          .hl-comparison-shell {
            width:
              min(
                100% - 28px,
                1180px
              );
          }

          .hl-comparison-title {
            font-size: 46px;
          }

          .hl-comparison-description {
            font-size: 14px;
          }

          .hl-comparison-heading {
            margin-bottom: 55px;
          }

          .hl-comparison-top,
          .hl-comparison-row {
            min-width: 760px;
          }

          .hl-comparison-top-cell,
          .hl-comparison-cell {
            padding-left: 20px;
            padding-right: 20px;
          }
        }

        /* =====================================================
           REDUCED MOTION
           ===================================================== */

        @media (prefers-reduced-motion: reduce) {
          .hl-comparison-section::before,
          .hl-comparison-heading > div:first-child,
          .hl-comparison-heading > div:last-child,
          .hl-comparison-card,
          .hl-comparison-row,
          .hl-comparison-footer,
          .hl-hirelabs-cell::after,
          .hl-comparison-top-cell.hirelabs::before {
            opacity: 1 !important;

            transform: none !important;

            transition: none !important;
          }
        }
      `}</style>

      <div className="hl-comparison-shell">

        {/* =========================================
            HEADER
           ========================================= */}

        <div className="hl-comparison-heading">

          <div>
            <div className="hl-comparison-kicker">
              <span className="hl-comparison-kicker-dot" />

              Why semantic matching matters
            </div>

            <h2 className="hl-comparison-title">
              Stop filtering
              <br />
              for <em>keywords.</em>
            </h2>
          </div>

          <div>

            <p className="hl-comparison-description">
              Traditional ATS workflows are built around finding exact
              words. HireLabs looks at the relationship between skills,
              experience, context, and the role itself.
            </p>

            <div className="hl-comparison-note">
              <span />
              Same resume pool. Different signal.
            </div>

          </div>
        </div>

        {/* =========================================
            COMPARISON
           ========================================= */}

        <div className="hl-comparison-card">

          <div className="hl-comparison-top">

            <div className="hl-comparison-top-cell">
              Capability
            </div>

            <div className="hl-comparison-top-cell legacy">
              Legacy keyword ATS
            </div>

            <div className="hl-comparison-top-cell hirelabs">
              HireLabs semantic ATS
            </div>

          </div>

          <div className="hl-comparison-table">

            {rows.map((row) => (
              <div
                className="hl-comparison-row"
                key={row.label}
              >

                <div className="hl-comparison-cell">

                  <div className="hl-feature-label">
                    {row.label}
                  </div>

                </div>

                <div className="hl-comparison-cell">

                  <div className="hl-legacy-content">

                    <span className="hl-legacy-mark">
                      ×
                    </span>

                    <span>
                      {row.legacy}
                    </span>

                  </div>

                </div>

                <div className="hl-comparison-cell hl-hirelabs-cell">

                  <div className="hl-hirelabs-content">

                    <span className="hl-hirelabs-mark">
                      ✓
                    </span>

                    <span>
                      {row.hirelabs}
                    </span>

                  </div>

                </div>

              </div>
            ))}

          </div>
        </div>

        {/* =========================================
            FOOTER
           ========================================= */}

        <div className="hl-comparison-footer">

          <p className="hl-comparison-footer-copy">
            <strong>
              The difference is not more filters.
            </strong>{' '}
            It is a better representation of what the candidate
            actually brings to the role.
          </p>

          <div className="hl-comparison-pill">
            <i />
            Meaning over exact-match strings
          </div>

        </div>

      </div>
    </section>
  );
}