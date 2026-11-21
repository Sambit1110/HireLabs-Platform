import React, { useState } from 'react';

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      number: '01',
      q: 'Why use Gemini 1536-dimensional embeddings with pgvector?',
      a: "Gemini's 1536-dimensional embedding model captures intricate semantic relationships across software engineering domains, leadership experience, and technical nuances. Pairing this directly with PostgreSQL's pgvector extension allows instant sub-85ms cosine similarity ranking without paying for separate third-party vector databases.",
    },
    {
      number: '02',
      q: 'How does Row Level Security (RLS) protect candidate resumes?',
      a: "Every candidate row and vector embedding is strictly bound to the authenticated recruiter's auth.uid(). Even if a direct SQL RPC is triggered, the query plan filters by the caller's session UID, guaranteeing that other organizations or team members never see unauthorized candidate data.",
    },
    {
      number: '03',
      q: 'Can I deploy this on Vercel and Supabase?',
      a: 'Yes! HireLabs is built using Next.js App Router and deploys seamlessly to Vercel with zero configuration. The database migrations in supabase/migrations/ can be pushed in seconds using Supabase CLI or SQL Editor.',
    },
    {
      number: '04',
      q: 'How does HireLabs prevent AI hallucinations in match scores?',
      a: 'The match explanation layer requires Gemini to cite direct quotes and extracted snippets from the resume for each required criteria. It explicitly flags missing requirements as gaps and avoids protected characteristics, providing transparent audit trails for hiring teams.',
    },
  ];

  const toggleFAQ = (index) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <section className="hl-faq-section" id="faq">
      <style>{`
        .hl-faq-section {
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
          padding: 160px 0 180px;
          background: var(--cream);
          color: var(--espresso);
          overflow: hidden;
        }

        .hl-faq-section *,
        .hl-faq-section *::before,
        .hl-faq-section *::after {
          box-sizing: border-box;
        }

        .hl-faq-shell {
          width: min(1080px, calc(100% - 48px));
          margin: 0 auto;
        }

        .hl-faq-heading {
          display: grid;
          grid-template-columns: 0.8fr 1.2fr;
          gap: 70px;
          align-items: end;
          margin-bottom: 75px;
        }

        .hl-faq-kicker {
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

        .hl-faq-kicker-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--olive);
          box-shadow: 0 0 0 4px rgba(111,125,85,0.11);
        }

        .hl-faq-title {
          margin: 0;
          max-width: 510px;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(48px, 5.7vw, 74px);
          line-height: 0.95;
          letter-spacing: -0.055em;
          font-weight: 500;
        }

        .hl-faq-title em {
          color: var(--olive);
          font-style: italic;
        }

        .hl-faq-intro {
          max-width: 525px;
          margin: 0 0 3px auto;
          color: var(--espresso-soft);
          font-size: 15px;
          line-height: 1.75;
        }

        .hl-faq-note {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 17px;
          color: #837A70;
          font-size: 9px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 800;
        }

        .hl-faq-note span {
          width: 22px;
          height: 1px;
          background: var(--olive);
        }

        .hl-faq-list {
          border-top: 1px solid var(--border);
        }

        .hl-faq-item {
          border-bottom: 1px solid var(--border);
        }

        .hl-faq-question {
          width: 100%;
          display: grid;
          grid-template-columns: 58px 1fr auto;
          align-items: center;
          gap: 20px;
          padding: 28px 4px;
          border: 0;
          background: transparent;
          color: var(--espresso);
          text-align: left;
          cursor: pointer;
        }

        .hl-faq-number {
          color: #9B9287;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .hl-faq-question-text {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: clamp(19px, 2vw, 25px);
          line-height: 1.2;
          letter-spacing: -0.025em;
          transition: color 180ms ease;
        }

        .hl-faq-item:hover .hl-faq-question-text {
          color: var(--olive-dark);
        }

        .hl-faq-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 1px solid var(--border);
          border-radius: 50%;
          color: #756C63;
          transition:
            transform 220ms ease,
            background 220ms ease,
            color 220ms ease,
            border-color 220ms ease;
        }

        .hl-faq-item.open .hl-faq-icon {
          transform: rotate(180deg);
          background: var(--espresso);
          border-color: var(--espresso);
          color: var(--cream);
        }

        .hl-faq-answer-wrap {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 320ms ease;
        }

        .hl-faq-item.open .hl-faq-answer-wrap {
          grid-template-rows: 1fr;
        }

        .hl-faq-answer-inner {
          min-height: 0;
          overflow: hidden;
        }

        .hl-faq-answer {
          max-width: 700px;
          padding: 0 75px 30px 78px;
          color: #746B62;
          font-size: 13px;
          line-height: 1.8;
        }

        .hl-faq-answer-mark {
          display: inline-block;
          width: 24px;
          height: 1px;
          margin: 0 9px 4px 0;
          background: var(--olive);
        }

        .hl-faq-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
          margin-top: 48px;
          padding-top: 20px;
          border-top: 1px solid var(--border);
        }

        .hl-faq-bottom-copy {
          color: #847B72;
          font-size: 10px;
          line-height: 1.55;
        }

        .hl-faq-bottom-copy strong {
          color: var(--espresso);
        }

        .hl-faq-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 11px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: rgba(255,255,255,0.46);
          color: #756C63;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .hl-faq-pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--olive);
        }

        @media (max-width: 820px) {
          .hl-faq-heading {
            grid-template-columns: 1fr;
            gap: 22px;
          }

          .hl-faq-intro {
            margin-left: 0;
          }
        }

        @media (max-width: 600px) {
          .hl-faq-section {
            padding: 110px 0 125px;
          }

          .hl-faq-shell {
            width: min(100% - 28px, 1080px);
          }

          .hl-faq-title {
            font-size: 46px;
          }

          .hl-faq-question {
            grid-template-columns: 36px 1fr auto;
            gap: 12px;
            padding: 22px 0;
          }

          .hl-faq-question-text {
            font-size: 18px;
          }

          .hl-faq-icon {
            width: 30px;
            height: 30px;
          }

          .hl-faq-answer {
            padding: 0 42px 25px 48px;
            font-size: 12px;
          }

          .hl-faq-bottom {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hl-faq-answer-wrap,
          .hl-faq-icon,
          .hl-faq-question-text {
            transition: none;
          }
        }
      `}</style>

      <div className="hl-faq-shell">
        <div className="hl-faq-heading">
          <div>
            <div className="hl-faq-kicker">
              <span className="hl-faq-kicker-dot" />
              Questions, answered
            </div>

            <h2 className="hl-faq-title">
              The details
              <br />
              <em>behind the system.</em>
            </h2>
          </div>

          <div>
            <p className="hl-faq-intro">
              A few of the questions that matter when your hiring workflow
              depends on embeddings, database search, private candidate data,
              and explainable AI.
            </p>

            <div className="hl-faq-note">
              <span />
              No jargon without the reason behind it.
            </div>
          </div>
        </div>

        <div className="hl-faq-list">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={faq.number}
                className={`hl-faq-item ${
                  isOpen ? 'open' : ''
                }`}
              >
                <button
                  type="button"
                  className="hl-faq-question"
                  onClick={() => toggleFAQ(index)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span className="hl-faq-number">
                    {faq.number}
                  </span>

                  <span className="hl-faq-question-text">
                    {faq.q}
                  </span>

                  <span className="hl-faq-icon">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </button>

                <div
                  id={`faq-answer-${index}`}
                  className="hl-faq-answer-wrap"
                  role="region"
                  aria-hidden={!isOpen}
                >
                  <div className="hl-faq-answer-inner">
                    <div className="hl-faq-answer">
                      <span className="hl-faq-answer-mark" />
                      {faq.a}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hl-faq-bottom">
          <div className="hl-faq-bottom-copy">
            <strong>Built to be understandable.</strong>{' '}
            The interface stays simple even when the infrastructure underneath
            is not.
          </div>

          <div className="hl-faq-pill">
            <span className="hl-faq-pill-dot" />
            HireLabs knowledge base
          </div>
        </div>
      </div>
    </section>
  );
}