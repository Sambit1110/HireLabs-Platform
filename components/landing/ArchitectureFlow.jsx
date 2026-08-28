import React from 'react';
import { Badge } from '../ui/Badge';

export function ArchitectureFlow() {
  const steps = [
    {
      num: 1,
      title: 'Secure Upload',
      desc: 'PDF/DOCX uploaded to user-scoped private Supabase Storage bucket.'
    },
    {
      num: 2,
      title: 'LLM Normalize',
      desc: 'Gemini extracts candidate profile, skills ontology, and work history.'
    },
    {
      num: 3,
      title: '1536-dim Embed',
      desc: 'Vector representation generated via Gemini Embedding-002 model.'
    },
    {
      num: 4,
      title: 'pgvector RPC',
      desc: 'Cosine distance calculated in Postgres filtered by signed-in auth.uid().'
    },
    {
      num: 5,
      title: 'Explain & Rank',
      desc: 'AI generates evidence quotes & flags gap analysis for HR decision support.'
    }
  ];

  return (
    <section className="arch-section" id="architecture">
      <div className="container">
        <div className="section-header">
          <Badge variant="cyan" className="section-tag">
            System Architecture
          </Badge>
          <h2 className="section-title">
            The <span className="text-gradient">End-to-End Pipeline</span>
          </h2>
          <p className="section-desc">
            How HireLabs securely ingests, embeds, searches, and explains candidate matches.
          </p>
        </div>

        <div className="pipeline-flow">
          {steps.map((step) => (
            <div className="pipeline-step" key={step.num}>
              <div className="step-num">{step.num}</div>
              <div className="step-name">{step.title}</div>
              <p className="step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
