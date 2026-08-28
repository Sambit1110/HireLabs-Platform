import React, { useState } from 'react';
import { Badge } from '../ui/Badge';

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      q: 'Why use Gemini 1536-dimensional embeddings with pgvector?',
      a: "Gemini's 1536-dimensional embedding model captures intricate semantic relationships across software engineering domains, leadership experience, and technical nuances. Pairing this directly with PostgreSQL's pgvector extension allows instant sub-85ms cosine similarity ranking without paying for separate third-party vector databases."
    },
    {
      q: 'How does Row Level Security (RLS) protect candidate resumes?',
      a: "Every candidate row and vector embedding is strictly bound to the authenticated recruiter's auth.uid(). Even if a direct SQL RPC is triggered, the query plan filters by the caller's session UID, guaranteeing that other organizations or team members never see unauthorized candidate data."
    },
    {
      q: 'Can I deploy this on Vercel and Supabase?',
      a: 'Yes! HireLabs is built using Next.js App Router and deploys seamlessly to Vercel with zero configuration. The database migrations in supabase/migrations/ can be pushed in seconds using Supabase CLI or SQL Editor.'
    },
    {
      q: 'How does HireLabs prevent AI hallucinations in match scores?',
      a: 'The match explanation layer requires Gemini to cite direct quotes and extracted snippets from the resume for each required criteria. It explicitly flags missing requirements as gaps and avoids protected characteristics, providing transparent audit trails for hiring teams.'
    }
  ];

  return (
    <section className="faq-section" id="faq">
      <div className="container">
        <div className="section-header">
          <Badge variant="purple" className="section-tag">
            Got Questions?
          </Badge>
          <h2 className="section-title">
            Frequently Asked <span className="text-gradient">Questions</span>
          </h2>
          <p className="section-desc">
            Everything you need to know about vector dimensions, RLS security, and deployment.
          </p>
        </div>

        <div className="faq-list">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className={`faq-item ${isOpen ? 'open' : ''}`}>
                <button
                  type="button"
                  className="faq-question"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                >
                  <span>{faq.q}</span>
                  <svg
                    className="faq-icon"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div className="faq-answer">{faq.a}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
