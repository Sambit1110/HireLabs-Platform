import { afterEach, describe, expect, it, vi } from 'vitest';

import { candidateSchema, validateAnalysis } from '../lib/ai/candidate-prompt.js';
import { checkEvidence } from '../lib/ai/evidence.js';
import {
  analyzeCandidate,
  buildRoleBrief,
  evaluatorProvider,
  jobSkills,
  modelSignals,
  skillEvidence,
} from '../lib/ai/own-analysis.js';
import { SKILL_INDEX } from '../lib/ai/skill-lexicon.js';

const INTERN_JOB =
  'We are seeking an AI & Full-Stack Software Engineering Intern to help build and scale intelligent web applications. ' +
  'You will work alongside our engineering team to develop backend APIs, integrate large language models (LLMs) and ' +
  'vector search pipelines, and craft responsive frontend interfaces.';

const TEMPLATE_JOB = [
  'Mid Data Analyst',
  'We are hiring a Data Analyst to support teams in Retail.',
  'Required skills: SQL, Python, Tableau',
  'Preferred skills: dbt, Asana',
  'Collaborate with stakeholders and communicate progress clearly',
].join('\n');

const AARAV = [
  'Aarav Mehta',
  'AI & Full-Stack Software Engineering Student',
  'Skills: Python, JavaScript, TypeScript, React, Next.js, Node.js, FastAPI, PostgreSQL, Docker, Git',
  'Experience',
  '(cid:127) Built FastAPI endpoints for a document search product and cut p95 latency from 900 ms to 300 ms.',
  '(cid:127) Added a vector search pipeline with PostgreSQL + pgvector and sentence embeddings.',
  '• Shipped a Next.js dashboard with React hooks and a React frontend, 2025.',
  'Projects',
  '• Resume Q&A bot: RAG over uploaded PDFs with a local LLM, streaming answers in a React chat UI.',
  'Education: B.Tech Computer Science, 2022 - 2026',
].join('\n');

const skill = (name) => SKILL_INDEX.find((entry) => entry.name === name);

describe('jobSkills', () => {
  it('reads labelled Required/Preferred lines and keeps the job wording', () => {
    const skills = jobSkills(TEMPLATE_JOB);
    expect(skills.map((s) => [s.name, s.kind])).toEqual([
      ['SQL', 'required'], ['Python', 'required'], ['Tableau', 'required'], ['dbt', 'preferred'], ['Asana', 'preferred'],
    ]);
  });

  it('falls back to known skills in the text, honouring a preferred section', () => {
    const skills = jobSkills('Requirements\nStrong React and Node.js\nNice to have:\nDocker experience');
    expect(skills.map((s) => [s.name, s.kind])).toEqual([['React', 'required'], ['Node.js', 'required'], ['Docker', 'preferred']]);
  });

  it('finds the skills in a plain-prose job description', () => {
    expect(jobSkills(INTERN_JOB).map((s) => s.name)).toEqual(
      expect.arrayContaining(['REST APIs', 'Large language models', 'Vector search', 'Frontend development'])
    );
  });
});

describe('skillEvidence', () => {
  const lines = AARAV.split('\n');

  it('quotes a work or project line verbatim, without the PDF bullet', () => {
    const result = skillEvidence(skill('Vector search'), lines);
    expect(result).toEqual({ status: 'demonstrated', quote: 'Added a vector search pipeline with PostgreSQL + pgvector and sentence embeddings.' });
  });

  it('marks a skill that only appears in the skills list as unverified', () => {
    expect(skillEvidence(skill('Docker'), lines).status).toBe('unverified');
  });

  it('counts a related term as partial evidence', () => {
    expect(skillEvidence(skill('SQL'), lines)).toMatchObject({ status: 'partial' });
  });

  it('reports missing skills', () => {
    expect(skillEvidence(skill('Kubernetes'), lines)).toEqual({ status: 'missing', quote: null });
  });

  it('never matches inside a longer word', () => {
    expect(skillEvidence(skill('Java'), ['Built apps in JavaScript every day.']).status).toBe('missing');
    expect(skillEvidence(skill('JavaScript'), ['Built a Node.js service in 2024.']).status).not.toBe('demonstrated');
  });
});

describe('analyzeCandidate', () => {
  const body = (job, parsedText, extra = {}) => ({
    role: '', jobDescription: job, candidate: { parsedText, name: 'Aarav Mehta', title: 'Student', yearsExperience: 1, ...extra },
  });

  it('returns a valid analysis whose quotes all appear in the resume', () => {
    const result = analyzeCandidate(body(INTERN_JOB, AARAV), { similarity: 0.67, llmScore: 100 });
    expect(validateAnalysis(result, candidateSchema, 'candidate')).toBe(true);
    expect(result.fit_verdict).toBe('strong');
    const evidence = checkEvidence(result.evidence_signals, AARAV);
    expect(evidence.removed).toEqual([]);
    expect(evidence.kept.length).toBeGreaterThan(2);
    expect(result.recommendation).toContain("HireLabs' own models");
  });

  it('weights skills 55%, similarity 30% and the LLM 15%, re-weighting over available signals', () => {
    const job = 'Required skills: Python, Kubernetes';
    const text = `${AARAV}\nUsed Python daily for data scripts, 2024.`;
    // Python demonstrated (1) + Kubernetes missing (0) = coverage 0.5.
    expect(analyzeCandidate(body(job, text), {}).fit_score).toBe(50);
    // similarity 0.7 -> semantic 1.0; LLM 10: 0.55*0.5 + 0.3*1 + 0.15*0.1 = 0.59.
    expect(analyzeCandidate(body(job, text), { similarity: 0.7, llmScore: 10 }).fit_score).toBe(59);
  });

  it('flags strong disagreement between the skill check and hirelabs-llm', () => {
    const result = analyzeCandidate(body('Required skills: Kubernetes, Terraform', AARAV), { llmScore: 100 });
    expect(result.risk_flags.join(' ')).toContain('disagree');
    expect(result.fit_verdict).toBe('weak');
  });

  it('reports insufficient evidence for a near-empty resume', () => {
    const result = analyzeCandidate(body(INTERN_JOB, 'Aarav Mehta\nStudent'), { similarity: 0.5 });
    expect(result.fit_verdict).toBe('insufficient_evidence');
    expect(validateAnalysis(result, candidateSchema, 'candidate')).toBe(true);
  });

  it('lists unverified and missing skills in the gap analysis', () => {
    const result = analyzeCandidate(body('Required skills: Docker, Kubernetes', AARAV));
    expect(result.skill_gap_analysis.unverified_skills).toEqual(['Docker']);
    expect(result.skill_gap_analysis.missing_required_skills).toEqual(['Kubernetes']);
    expect(result.interview_questions[0]).toContain('Kubernetes');
  });
});

describe('buildRoleBrief', () => {
  it('names the role, its level, skills and duties', () => {
    const brief = buildRoleBrief({ role: '', jobDescription: INTERN_JOB });
    expect(brief.seniority).toBe('Intern');
    expect(brief.role_summary.startsWith('AI & Full-Stack Software Engineering Intern (Intern).')).toBe(true);
    expect(brief.responsibilities[0]).toMatch(/^You will work alongside/);
    expect(brief.must_have_skills).toEqual(expect.arrayContaining(['Large language models', 'Vector search']));
    expect(brief.interview_focus.length).toBeGreaterThan(0);
  });

  it('separates must-have from nice-to-have skills and reads years', () => {
    const brief = buildRoleBrief({ role: 'Data Analyst', jobDescription: `${TEMPLATE_JOB}\n3+ years of experience` });
    expect(brief.must_have_skills).toEqual(['SQL', 'Python', 'Tableau']);
    expect(brief.nice_to_have_skills).toEqual(['dbt', 'Asana']);
    expect(brief.seniority).toBe('Mid-level (asks for 3+ years)');
  });
});

describe('provider and model signals', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.EVALUATOR_PROVIDER;
    delete process.env.MODEL_SERVER_URL;
  });

  it('uses the explainer unless EVALUATOR_PROVIDER=ollama', () => {
    expect(evaluatorProvider()).toBe('hirelabs');
    process.env.EVALUATOR_PROVIDER = 'ollama';
    expect(evaluatorProvider()).toBe('ollama');
  });

  it('reads matcher similarity and LLM fit from the model server', async () => {
    process.env.MODEL_SERVER_URL = 'https://models.example.test';
    const unit = (i) => Array.from({ length: 384 }, (_, j) => (j === i ? 1 : 0));
    globalThis.fetch = vi.fn(async (url) => (String(url).endsWith('/embed')
      ? Response.json({ vectors: [unit(0), unit(0)], dim: 384, model_used: 'hirelabs-matcher' })
      : Response.json({ score: 70, verdict: 'moderate', missingSkills: [] })));
    expect(await modelSignals('job', 'resume')).toEqual({ similarity: 1, llmScore: 70 });
  });

  it('returns nulls when the model server is down', async () => {
    process.env.MODEL_SERVER_URL = 'https://models.example.test';
    globalThis.fetch = vi.fn(async () => new Response('down', { status: 503 }));
    expect(await modelSignals('job', 'resume')).toEqual({ similarity: null, llmScore: null });
  });
});
