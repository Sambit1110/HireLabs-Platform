import React from 'react';
import { FeatureCard } from '../ui/Card';
import { Badge } from '../ui/Badge';

export function FeaturesGrid() {
  const features = [
    {
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      ),
      title: 'Gemini 1536-dim Embeddings',
      description: 'Leverage Google Gemini embedding models to capture nuanced technical skills, seniority levels, and cross-domain experience beyond basic keywords.',
      tags: ['1536 Dimensions', 'High Recall']
    },
    {
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
      title: 'Sub-second pgvector Search',
      description: 'Executes native Postgres <=> cosine distance queries directly within your database, eliminating external vector sync latency.',
      tags: ['HNSW Indexing', '<85ms Latency']
    },
    {
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      title: 'Supabase RLS Tenant Isolation',
      description: 'Every candidate record and vector row is strictly bounded by auth.uid() policies. Private files stay in locked Supabase storage buckets.',
      tags: ['Zero Vector Leakage', 'Enterprise RLS']
    },
    {
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
      title: 'Multi-Format Ingestion',
      description: 'Seamlessly extracts text, tables, and nested structures from PDF and DOCX files. Normalizes messy formatting into structured JSON schemas automatically.',
      tags: ['PDF & DOCX', 'Structured JSON']
    },
    {
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      title: 'Explainable Anti-Bias AI',
      description: 'AI match explanations are instructed to rely strictly on supplied evidence, cite verified experience, flag qualification gaps, and avoid protected demographic traits.',
      tags: ['Evidence Based', 'Audit Logs']
    },
    {
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
      title: 'Next.js App Router Architecture',
      description: 'Modular Next.js 15 full-stack application with authenticated API routes, edge caching, shadcn-ready components, and optimized server-side rendering.',
      tags: ['Next.js 15', 'Vercel Ready']
    }
  ];

  return (
    <section className="features-section" id="features">
      <div className="container">
        <div className="section-header">
          <Badge variant="purple" className="section-tag">
            Core Architecture & Capabilities
          </Badge>
          <h2 className="section-title">
            Engineered for <span className="text-gradient">Speed, Precision & Security</span>
          </h2>
          <p className="section-desc">
            Built from the ground up on modern cloud primitives. No opaque black boxes—everything is explainable, auditable, and isolated to your team.
          </p>
        </div>

        <div className="features-grid">
          {features.map((feat, idx) => (
            <FeatureCard
              key={idx}
              icon={feat.icon}
              title={feat.title}
              description={feat.description}
              tags={feat.tags}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
