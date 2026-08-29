import React from 'react';

export function SecuritySection() {
  return (
    <section className="hl-security-section" id="security">
      <style>{`
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

          position: relative;
          padding: 170px 0;
          background: var(--cream);
          color: var(--espresso);
          overflow: hidden;
        }

        .hl-security-section *,
        .hl-security-section *::before,
        .hl-security-section *::after {
          box-sizing: border-box;
        }

        .hl-security-shell {
          width: min(1180px, calc(100% - 48px));
          margin: 0 auto;
        }

        .hl-security-heading {
          max-width: 820px;
          margin-bottom: 75px;
        }

        .hl-security-kicker {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 18px;
          color: var(--olive-dark);
          font-size: 10px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .hl-security-kicker-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--olive);
          box-shadow: 0 0 0 4px rgba(111, 125, 85, 0.11);
        }

        .hl-security-title {
          margin: 0;
          max-width: 820px;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(48px, 6vw, 78px);
          line-height: 0.95;
          letter-spacing: -0.055em;
          font-weight: 500;
        }

        .hl-security-title em {
          color: var(--olive);
          font-style: italic;
        }

        .hl-security-intro {
          max-width: 680px;
          margin: 23px 0 0;
          color: var(--espresso-soft);
          font-size: 15px;
          line-height: 1.72;
        }

        .hl-security-layout {
          display: grid;
          grid-template-columns: 0.82fr 1.18fr;
          gap: 18px;
          align-items: stretch;
        }

        .hl-security-info {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .hl-security-item {
          position: relative;
          padding: 23px;
          border: 1px solid var(--border);
          border-radius: 19px;
          background: rgba(255,255,255,0.48);
          transition:
            transform 220ms ease,
            background 220ms ease,
            box-shadow 220ms ease;
        }

        .hl-security-item:hover {
          transform: translateY(-3px);
          background: rgba(255,255,255,0.7);
          box-shadow: 0 17px 38px rgba(44,39,34,0.06);
        }

        .hl-security-item-top {
          display: flex;
          align-items: flex-start;
          gap: 13px;
        }

        .hl-security-icon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: var(--espresso);
          color: var(--cream);
        }

        .hl-security-number {
          color: #A39A8D;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .hl-security-item-title {
          margin-top: 4px;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 19px;
          line-height: 1.05;
          letter-spacing: -0.025em;
        }

        .hl-security-item-text {
          margin: 14px 0 0 53px;
          color: #756C63;
          font-size: 10px;
          line-height: 1.65;
        }

        .hl-security-item-text code {
          padding: 2px 5px;
          border-radius: 5px;
          background: #ECE8DE;
          color: var(--olive-dark);
          font-family: 'SFMono-Regular', Consolas, monospace;
          font-size: 9px;
        }

        .hl-security-visual {
          min-height: 620px;
          position: relative;
          padding: 30px;
          border: 1px solid var(--border);
          border-radius: 25px;
          background: var(--espresso);
          color: var(--cream);
          overflow: hidden;
          box-shadow: 0 28px 70px rgba(37,32,28,0.14);
        }

        .hl-security-visual::before {
          content: '';
          position: absolute;
          width: 460px;
          height: 460px;
          top: -180px;
          right: -130px;
          border: 1px solid rgba(245,241,232,0.08);
          border-radius: 50%;
        }

        .hl-security-visual::after {
          content: '';
          position: absolute;
          width: 320px;
          height: 320px;
          top: -110px;
          right: -70px;
          border: 1px dashed rgba(174,187,141,0.12);
          border-radius: 50%;
        }

        .hl-security-visual-top {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding-bottom: 22px;
          border-bottom: 1px solid rgba(245,241,232,0.12);
        }

        .hl-security-terminal-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #B0A89E;
          font-size: 9px;
          font-family: 'SFMono-Regular', Consolas, monospace;
        }

        .hl-security-terminal-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #AEBB8D;
        }

        .hl-security-status {
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(111,125,85,0.18);
          color: #B7C59A;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .hl-security-code {
          position: relative;
          z-index: 2;
          margin-top: 27px;
          padding: 21px;
          border: 1px solid rgba(245,241,232,0.1);
          border-radius: 18px;
          background: rgba(255,255,255,0.035);
        }

        .hl-security-code-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 15px;
        }

        .hl-security-code-file {
          color: #938C82;
          font-size: 8px;
          font-family: 'SFMono-Regular', Consolas, monospace;
        }

        .hl-security-code-lang {
          color: #776F66;
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .hl-security-code pre {
          margin: 0;
          color: #D8D1C6;
          font-family: 'SFMono-Regular', Consolas, monospace;
          font-size: 9px;
          line-height: 1.8;
          white-space: pre-wrap;
          overflow-x: auto;
        }

        .hl-code-keyword {
          color: #B6C494;
        }

        .hl-code-function {
          color: #DDD2C2;
        }

        .hl-code-value {
          color: #D6BFA1;
        }

        .hl-security-explainer {
          position: relative;
          z-index: 2;
          margin-top: 24px;
        }

        .hl-security-explainer-title {
          margin-bottom: 11px;
          color: #9B9389;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .hl-security-flow {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 9px;
        }

        .hl-security-node {
          padding: 15px;
          border: 1px solid rgba(245,241,232,0.11);
          border-radius: 14px;
          background: rgba(255,255,255,0.035);
        }

        .hl-security-node-label {
          color: #7F786F;
          font-size: 7px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 900;
        }

        .hl-security-node-value {
          margin-top: 6px;
          color: #E9E2D8;
          font-size: 11px;
          font-weight: 800;
        }

        .hl-security-node-sub {
          margin-top: 4px;
          color: #857E74;
          font-size: 7px;
          line-height: 1.4;
        }

        .hl-security-flow-arrow {
          color: #9EAB7E;
          font-size: 16px;
        }

        .hl-security-access {
          position: relative;
          z-index: 2;
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .hl-access-item {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 43px;
          padding: 10px;
          border-radius: 11px;
          font-size: 8px;
          font-weight: 800;
        }

        .hl-access-item.allowed {
          background: rgba(111,125,85,0.15);
          color: #B8C59A;
        }

        .hl-access-item.blocked {
          background: rgba(173,105,82,0.11);
          color: #C69A89;
        }

        .hl-access-icon {
          width: 20px;
          height: 20px;
          display: grid;
          place-items: center;
          border-radius: 7px;
          background: rgba(255,255,255,0.06);
          font-size: 9px;
        }

        .hl-security-bottom {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 19px;
        }

        .hl-security-stat {
          padding: 13px;
          border: 1px solid rgba(245,241,232,0.1);
          border-radius: 12px;
          background: rgba(255,255,255,0.025);
        }

        .hl-security-stat strong {
          display: block;
          font-size: 12px;
          line-height: 1;
        }

        .hl-security-stat span {
          display: block;
          margin-top: 5px;
          color: #80786F;
          font-size: 7px;
          line-height: 1.4;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .hl-security-note {
          margin-top: 42px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
          padding: 23px 0 0;
          border-top: 1px solid var(--border);
        }

        .hl-security-note strong {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 25px;
          line-height: 1.05;
          font-weight: 500;
          letter-spacing: -0.03em;
        }

        .hl-security-note p {
          max-width: 480px;
          margin: 0;
          color: #7A7168;
          font-size: 10px;
          line-height: 1.6;
        }

        @media (max-width: 950px) {
          .hl-security-layout {
            grid-template-columns: 1fr;
          }

          .hl-security-visual {
            min-height: 560px;
          }
        }

        @media (max-width: 650px) {
          .hl-security-section {
            padding: 110px 0;
          }

          .hl-security-shell {
            width: min(100% - 28px, 1180px);
          }

          .hl-security-title {
            font-size: 46px;
          }

          .hl-security-item {
            padding: 19px;
          }

          .hl-security-item-text {
            margin-left: 0;
          }

          .hl-security-visual {
            min-height: 660px;
            padding: 20px;
            border-radius: 20px;
          }

          .hl-security-flow {
            grid-template-columns: 1fr;
          }

          .hl-security-flow-arrow {
            justify-self: center;
            transform: rotate(90deg);
          }

          .hl-security-access {
            grid-template-columns: 1fr;
          }

          .hl-security-bottom {
            grid-template-columns: 1fr;
          }

          .hl-security-note {
            align-items: flex-start;
            flex-direction: column;
            gap: 15px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hl-security-item {
            transition: none;
          }
        }
      `}</style>

      <div className="hl-security-shell">
        <div className="hl-security-heading">
          <div className="hl-security-kicker">
            <span className="hl-security-kicker-dot" />
            Security by design
          </div>

          <h2 className="hl-security-title">
            Your candidates belong
            <br />
            to <em>your team.</em>
          </h2>

          <p className="hl-security-intro">
            HireLabs treats candidate data as private infrastructure, not
            shared application state. Authentication, database policies and
            private file paths work together to keep each workspace isolated.
          </p>
        </div>

        <div className="hl-security-layout">
          <div className="hl-security-info">
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
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>

                <div>
                  <div className="hl-security-number">
                    01 · DATABASE
                  </div>

                  <div className="hl-security-item-title">
                    Row Level Security, everywhere it matters.
                  </div>
                </div>
              </div>

              <div className="hl-security-item-text">
                Application tables enforce RLS at the database layer. Candidate
                vectors are filtered by the authenticated user instead of
                relying only on application-side checks.
              </div>
            </article>

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
                    <rect x="3" y="11" width="18" height="10" rx="2" />
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
                <code>&lt;auth-user-id&gt;/*</code> paths so files stay inside
                the owning recruiter's storage boundary.
              </div>
            </article>

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
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </div>

                <div>
                  <div className="hl-security-number">
                    03 · DECISIONS
                  </div>

                  <div className="hl-security-item-title">
                    AI supports people, not the other way around.
                  </div>
                </div>
              </div>

              <div className="hl-security-item-text">
                Match scores are presented as decision support with evidence
                and qualification gaps, keeping recruiters in the loop rather
                than replacing human judgment.
              </div>
            </article>
          </div>

          <div className="hl-security-visual">
            <div className="hl-security-visual-top">
              <div className="hl-security-terminal-label">
                <span className="hl-security-terminal-dot" />
                supabase / database policy
              </div>

              <div className="hl-security-status">
                policy active
              </div>
            </div>

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
<span className="hl-code-keyword">CREATE POLICY</span>{' '}
<span className="hl-code-value">
  "Users can only view their own candidate vectors"
</span>
{`

`}
<span className="hl-code-keyword">ON</span>{' '}
<span className="hl-code-function">
  public.candidate_embeddings
</span>
{`

`}
<span className="hl-code-keyword">FOR SELECT</span>
{`

`}
<span className="hl-code-keyword">USING</span>{' '}
(auth.uid() = user_id);

{`

`}
<span className="hl-code-keyword">WHERE</span>{' '}
user_id = auth.uid();</pre>
            </div>

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

              <div className="hl-security-access">
                <div className="hl-access-item allowed">
                  <span className="hl-access-icon">✓</span>
                  Own candidate vectors
                </div>

                <div className="hl-access-item allowed">
                  <span className="hl-access-icon">✓</span>
                  Own resume files
                </div>

                <div className="hl-access-item blocked">
                  <span className="hl-access-icon">×</span>
                  Another user's vectors
                </div>

                <div className="hl-access-item blocked">
                  <span className="hl-access-icon">×</span>
                  Another user's files
                </div>
              </div>
            </div>

            <div className="hl-security-bottom">
              <div className="hl-security-stat">
                <strong>RLS</strong>
                <span>Database-level isolation</span>
              </div>

              <div className="hl-security-stat">
                <strong>Private</strong>
                <span>Scoped storage paths</span>
              </div>

              <div className="hl-security-stat">
                <strong>Human</strong>
                <span>Decision support model</span>
              </div>
            </div>
          </div>
        </div>

        <div className="hl-security-note">
          <strong>
            Security should feel invisible.
          </strong>

          <p>
            The recruiting experience stays simple because the access rules
            live underneath it — at the database and storage boundaries where
            they can be consistently enforced.
          </p>
        </div>
      </div>
    </section>
  );
}