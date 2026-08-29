import React from 'react';

export function ComparisonTable() {
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

  return (
    <section className="hl-comparison-section" id="comparison">
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
          padding: 165px 0;
          background: var(--cream);
          color: var(--espresso);
          overflow: hidden;
        }

        .hl-comparison-section *,
        .hl-comparison-section *::before,
        .hl-comparison-section *::after {
          box-sizing: border-box;
        }

        .hl-comparison-shell {
          width: min(1180px, calc(100% - 48px));
          margin: 0 auto;
        }

        .hl-comparison-heading {
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 80px;
          align-items: end;
          margin-bottom: 72px;
        }

        .hl-comparison-kicker {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 17px;
          color: var(--olive-dark);
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
          background: var(--olive);
          box-shadow: 0 0 0 4px rgba(111,125,85,0.11);
        }

        .hl-comparison-title {
          margin: 0;
          max-width: 560px;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(49px, 5.7vw, 76px);
          line-height: 0.95;
          letter-spacing: -0.055em;
          font-weight: 500;
        }

        .hl-comparison-title em {
          color: var(--olive);
          font-style: italic;
        }

        .hl-comparison-description {
          max-width: 560px;
          margin: 0 0 3px auto;
          color: var(--espresso-soft);
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
          width: 22px;
          height: 1px;
          background: var(--olive);
        }

        .hl-comparison-card {
          border: 1px solid var(--border);
          border-radius: 26px;
          background: rgba(255,255,255,0.5);
          overflow: hidden;
          box-shadow: 0 25px 70px rgba(45,40,34,0.06);
        }

        .hl-comparison-top {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          min-height: 78px;
          border-bottom: 1px solid var(--border);
        }

        .hl-comparison-top-cell {
          display: flex;
          align-items: center;
          padding: 0 25px;
        }

        .hl-comparison-top-cell + .hl-comparison-top-cell {
          border-left: 1px solid var(--border);
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
          background: var(--espresso);
          color: var(--cream);
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .hl-comparison-top-cell.hirelabs::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--olive);
        }

        .hl-comparison-table {
          width: 100%;
        }

        .hl-comparison-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          min-height: 115px;
          border-bottom: 1px solid var(--border);
        }

        .hl-comparison-row:last-child {
          border-bottom: 0;
        }

        .hl-comparison-cell {
          display: flex;
          align-items: center;
          padding: 22px 25px;
        }

        .hl-comparison-cell + .hl-comparison-cell {
          border-left: 1px solid var(--border);
        }

        .hl-feature-label {
          color: var(--espresso);
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 17px;
          line-height: 1.1;
          letter-spacing: -0.025em;
        }

        .hl-legacy-content {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          color: #8A8076;
          font-size: 10px;
          line-height: 1.6;
        }

        .hl-legacy-mark {
          width: 19px;
          height: 19px;
          flex: 0 0 19px;
          display: grid;
          place-items: center;
          margin-top: 1px;
          border-radius: 50%;
          background: #EAE5DC;
          color: #8C8177;
          font-size: 10px;
          font-weight: 900;
        }

        .hl-hirelabs-cell {
          background: rgba(255,255,255,0.7);
        }

        .hl-hirelabs-content {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          color: #5E6651;
          font-size: 10px;
          line-height: 1.6;
          font-weight: 700;
        }

        .hl-hirelabs-mark {
          width: 19px;
          height: 19px;
          flex: 0 0 19px;
          display: grid;
          place-items: center;
          margin-top: 1px;
          border-radius: 50%;
          background: #E7EDDD;
          color: var(--olive-dark);
          font-size: 10px;
          font-weight: 900;
        }

        .hl-comparison-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
          margin-top: 35px;
        }

        .hl-comparison-footer-copy {
          max-width: 500px;
          color: #82796F;
          font-size: 10px;
          line-height: 1.6;
        }

        .hl-comparison-footer-copy strong {
          color: var(--espresso);
        }

        .hl-comparison-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: rgba(255,255,255,0.5);
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
          background: var(--olive);
        }

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
            min-width: 780px;
          }

          .hl-comparison-footer {
            align-items: flex-start;
            flex-direction: column;
            gap: 16px;
          }
        }

        @media (max-width: 620px) {
          .hl-comparison-section {
            padding: 110px 0;
          }

          .hl-comparison-shell {
            width: min(100% - 28px, 1180px);
          }

          .hl-comparison-title {
            font-size: 46px;
          }

          .hl-comparison-description {
            font-size: 14px;
          }
        }
      `}</style>

      <div className="hl-comparison-shell">
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
              Traditional ATS workflows are built around finding exact words.
              HireLabs looks at the relationship between skills, experience,
              context, and the role itself.
            </p>

            <div className="hl-comparison-note">
              <span />
              Same resume pool. Different signal.
            </div>
          </div>
        </div>

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
                    <span className="hl-legacy-mark">×</span>

                    <span>{row.legacy}</span>
                  </div>
                </div>

                <div className="hl-comparison-cell hl-hirelabs-cell">
                  <div className="hl-hirelabs-content">
                    <span className="hl-hirelabs-mark">✓</span>

                    <span>{row.hirelabs}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hl-comparison-footer">
          <p className="hl-comparison-footer-copy">
            <strong>The difference is not more filters.</strong>{' '}
            It is a better representation of what the candidate actually brings
            to the role.
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