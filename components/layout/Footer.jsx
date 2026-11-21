import React from 'react';

export function Footer() {
  const productLinks = [
    { label: 'AI Resume Parser', href: '#demo' },
    { label: 'Semantic Match Engine', href: '#demo' },
    { label: 'Architecture Pipeline', href: '#architecture' },
    { label: 'Legacy ATS vs HireLabs', href: '#comparison' },
  ];

  const securityLinks = [
    { label: 'PostgreSQL RLS Policies', href: '#security' },
    { label: 'Private Storage Isolation', href: '#security' },
    { label: 'Gemini Embedding-002', href: '#security' },
    { label: 'Explainable AI', href: '#security' },
    { label: 'Next.js App Router', href: '#architecture' },
  ];

  return (
    <footer className="hl-footer">
      <style>{`
        .hl-footer {
          --cream: #F5F1E8;
          --cream-soft: #ECE6DA;
          --white: #FFFFFF;
          --espresso: #211C18;
          --espresso-soft: #655C53;
          --olive: #6F7D55;
          --olive-dark: #596544;
          --taupe: #C8C0AF;
          --border: #DED7CA;

          position: relative;
          padding: 105px 0 28px;
          background: var(--espresso);
          color: var(--cream);
          overflow: hidden;
        }

        .hl-footer *,
        .hl-footer *::before,
        .hl-footer *::after {
          box-sizing: border-box;
        }

        .hl-footer-shell {
          width: min(1180px, calc(100% - 48px));
          margin: 0 auto;
        }

        /* --------------------------------
           Top statement
           -------------------------------- */

        .hl-footer-hero {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 80px;
          padding-bottom: 88px;
          border-bottom: 1px solid rgba(245,241,232,0.12);
        }

        .hl-footer-kicker {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 18px;
          color: #AAB68A;
          font-size: 9px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .hl-footer-kicker-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #AAB68A;
        }

        .hl-footer-title {
          margin: 0;
          max-width: 680px;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(48px, 6vw, 82px);
          line-height: 0.94;
          letter-spacing: -0.055em;
          font-weight: 500;
        }

        .hl-footer-title em {
          color: #AAB68A;
          font-style: italic;
        }

        .hl-footer-description {
          max-width: 500px;
          margin: 23px 0 0;
          color: #AAA198;
          font-size: 12px;
          line-height: 1.7;
        }

        .hl-footer-brand-block {
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
        }

        .hl-footer-brand-mark {
          display: inline-flex;
          align-items: center;
          gap: 13px;
        }

        .hl-footer-logo {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(245,241,232,0.16);
          border-radius: 15px;
          background: rgba(255,255,255,0.045);
          color: var(--cream);
        }

        .hl-footer-wordmark {
          font-family:
            'DM Sans',
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;
          font-size: 26px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: -0.05em;
        }

        .hl-footer-wordmark span {
          color: #AAB68A;
        }

        /* --------------------------------
           Main links
           -------------------------------- */

        .hl-footer-content {
          display: grid;
          grid-template-columns: 1.15fr 1fr 1fr 0.75fr;
          gap: 45px;
          padding: 65px 0 70px;
        }

        .hl-footer-brand-copy {
          max-width: 330px;
        }

        .hl-footer-brand-label {
          color: #8E877E;
          font-size: 8px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .hl-footer-brand-text {
          margin-top: 13px;
          color: #A49C92;
          font-size: 10px;
          line-height: 1.7;
        }

        .hl-footer-tech {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 19px;
        }

        .hl-footer-tech-pill {
          padding: 7px 9px;
          border: 1px solid rgba(245,241,232,0.11);
          border-radius: 999px;
          background: rgba(255,255,255,0.035);
          color: #B0A89E;
          font-size: 7px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: 0.04em;
        }

        .hl-footer-column-title {
          margin-bottom: 15px;
          color: var(--cream);
          font-size: 9px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .hl-footer-links {
          display: grid;
          gap: 9px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .hl-footer-links a {
          position: relative;
          display: inline-flex;
          align-items: center;
          width: fit-content;
          color: #928A81;
          font-size: 10px;
          line-height: 1.4;
          text-decoration: none;
          transition:
            color 170ms ease,
            transform 170ms ease;
        }

        .hl-footer-links a:hover {
          color: #D7D0C5;
          transform: translateX(2px);
        }

        .hl-footer-developer {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #A39A91;
          font-size: 10px;
          text-decoration: none;
          transition: color 170ms ease;
        }

        .hl-footer-developer:hover {
          color: var(--cream);
        }

        .hl-footer-github {
          width: 29px;
          height: 29px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(245,241,232,0.12);
          border-radius: 9px;
          background: rgba(255,255,255,0.035);
          transition:
            background 170ms ease,
            border-color 170ms ease;
        }

        .hl-footer-developer:hover .hl-footer-github {
          background: rgba(255,255,255,0.08);
          border-color: rgba(245,241,232,0.2);
        }

        /* --------------------------------
           Bottom
           -------------------------------- */

        .hl-footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding-top: 21px;
          border-top: 1px solid rgba(245,241,232,0.1);
          color: #777068;
          font-size: 8px;
          line-height: 1.5;
        }

        .hl-footer-legal {
          display: flex;
          align-items: center;
          gap: 21px;
        }

        .hl-footer-legal a {
          color: #777068;
          text-decoration: none;
          transition: color 170ms ease;
        }

        .hl-footer-legal a:hover {
          color: #B9B1A7;
        }

        .hl-footer-built {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .hl-footer-built-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #AAB68A;
        }

        /* --------------------------------
           Decorative text
           -------------------------------- */

        .hl-footer-ghost {
          position: absolute;
          right: -20px;
          bottom: 40px;
          color: rgba(245,241,232,0.025);
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(120px, 18vw, 260px);
          line-height: 0.7;
          letter-spacing: -0.08em;
          pointer-events: none;
          user-select: none;
        }

        @media (max-width: 900px) {
          .hl-footer-hero {
            grid-template-columns: 1fr;
            gap: 35px;
          }

          .hl-footer-brand-block {
            justify-content: flex-start;
          }

          .hl-footer-content {
            grid-template-columns: repeat(2, 1fr);
          }

          .hl-footer-brand-copy {
            grid-column: span 2;
            max-width: 470px;
          }
        }

        @media (max-width: 600px) {
          .hl-footer {
            padding-top: 85px;
          }

          .hl-footer-shell {
            width: min(100% - 28px, 1180px);
          }

          .hl-footer-title {
            font-size: 48px;
          }

          .hl-footer-content {
            grid-template-columns: 1fr;
            gap: 38px;
            padding: 50px 0 55px;
          }

          .hl-footer-brand-copy {
            grid-column: span 1;
          }

          .hl-footer-bottom {
            align-items: flex-start;
            flex-direction: column;
          }

          .hl-footer-legal {
            flex-wrap: wrap;
            gap: 13px 19px;
          }

          .hl-footer-ghost {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hl-footer-links a,
          .hl-footer-developer,
          .hl-footer-github,
          .hl-footer-legal a {
            transition: none;
          }
        }
      `}</style>

      <div className="hl-footer-ghost">
        HL
      </div>

      <div className="hl-footer-shell">
        {/* Closing statement */}
        <div className="hl-footer-hero">
          <div>
            <div className="hl-footer-kicker">
              <span className="hl-footer-kicker-dot" />
              Hire with better signals
            </div>

            <h2 className="hl-footer-title">
              Find the people
              <br />
              behind the <em>resume.</em>
            </h2>

            <p className="hl-footer-description">
              HireLabs turns unstructured resumes into searchable candidate
              intelligence, giving recruiting teams a clearer way to discover,
              compare, and evaluate talent.
            </p>
          </div>

          <div className="hl-footer-brand-block">
            <div className="hl-footer-brand-mark">
              <div className="hl-footer-logo">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>

              <div className="hl-footer-wordmark">
                Hire<span>Labs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer links */}
        <div className="hl-footer-content">
          <div className="hl-footer-brand-copy">
            <div className="hl-footer-brand-label">
              Intelligent hiring infrastructure
            </div>

            <p className="hl-footer-brand-text">
              Built around semantic matching, PostgreSQL, pgvector, Gemini
              embeddings, and private Supabase data boundaries.
            </p>

            <div className="hl-footer-tech">
              <span className="hl-footer-tech-pill">
                Gemini
              </span>

              <span className="hl-footer-tech-pill">
                pgvector
              </span>

              <span className="hl-footer-tech-pill">
                Supabase
              </span>

              <span className="hl-footer-tech-pill">
                Next.js
              </span>
            </div>
          </div>

          <div>
            <div className="hl-footer-column-title">
              Product
            </div>

            <ul className="hl-footer-links">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="hl-footer-column-title">
              Technology & Security
            </div>

            <ul className="hl-footer-links">
              {securityLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="hl-footer-column-title">
              Developers
            </div>

            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hl-footer-developer"
            >
              <span className="hl-footer-github">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  aria-hidden="true"
                >
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.2 0 6.5-1.6 6.5-7A5.4 5.4 0 0 0 19 3.5 5 5 0 0 0 18.9 1S17.7.7 15 2.5a13.4 13.4 0 0 0-6 0C6.3.7 5.1 1 5.1 1A5 5 0 0 0 5 3.5a5.4 5.4 0 0 0-1.5 4c0 5.4 3.3 7 6.5 7a4.8 4.8 0 0 0-1 3.5v4" />
                  <path d="M9 18c-4.5 2-5-2-7-2" />
                </svg>
              </span>

              GitHub Repository
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="hl-footer-bottom">
          <div>
            © 2026 HireLabs Platform Inc. All rights reserved.
          </div>

          <div className="hl-footer-legal">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Security Whitepaper</a>
          </div>

          <div className="hl-footer-built">
            <span className="hl-footer-built-dot" />
            Built for better hiring decisions
          </div>
        </div>
      </div>
    </footer>
  );
}