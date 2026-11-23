import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import CandidateEvaluation from '../components/dashboard/CandidateEvaluation';
import { normalizeEvaluation } from '../lib/ai/evaluation.js';
import { analyzeCandidate, buildRoleBrief, jobRequirements, tagLines, skillEvidence } from '../lib/ai/own-analysis.js';
import { roleProfileFor } from '../lib/ai/role-profiles.js';
import { SKILL_INDEX } from '../lib/ai/skill-lexicon.js';
import { cleanParserSkills, ruleProfile, yearsFromDates } from '../lib/resume/rule-profile.js';

const NOW = new Date('2026-11-23T00:00:00Z');
const AARAV = [
  'Aarav Mehta',
  'AI & Full-Stack Software Engineering Student',
  'Pune, India | aarav.mehta@example.com | github.com/aarav-example',
  'Summary',
  'Full Stack Engineer with 1 years of experience in SaaS.',
  'Skills: Python, JavaScript, TypeScript, React, Next.js, Node.js, FastAPI, REST APIs, PostgreSQL, pgvector,',
  'Docker, Git, LLM integration, Unit Testing',
  'Experience',
  'Software Engineering Intern, BrightLeaf Labs, Jun 2025 - Dec 2025',
  '• Built FastAPI endpoints for a document search product.',
  '• Shipped a Next.js dashboard with React hooks.',
  'Education: B.Tech Computer Science, Savitri Institute of Technology, 2022 - 2026, CGPA 8.7',
].join('\n');

describe('rule-based profile', () => {
  it('reads name, a real title, years and clean skills', () => {
    const profile = ruleProfile(AARAV, NOW);
    expect(profile.candidateName).toBe('Aarav Mehta');
    expect(profile.candidateTitle).toBe('AI & Full-Stack Software Engineering Student');
    expect(profile.yearsExperience).toBe(1);
    expect(profile.extractedSkills).toEqual(expect.arrayContaining(['Python', 'FastAPI', 'Docker', 'Large language models']));
    expect(profile.extractedSkills.join(' ')).not.toMatch(/India|2025|CGPA/);
  });

  it('counts employment date ranges once, skipping education', () => {
    const text = 'Engineer, Acme, Jan 2020 - Dec 2021\nLead, Beta, Jun 2021 - present\nB.Sc, Lakeview University, 2016 - 2019';
    // Jan 2020 to Nov 2026, overlap counted once = 82 months.
    expect(yearsFromDates(text, NOW)).toBe(6);
    expect(yearsFromDates('No dates here', NOW)).toBeNull();
  });

  it('drops the parser noise but keeps real and listed skills', () => {
    const noisy = ['India |', 'Final-year computer', 'Python', 'Jun 2025', 'CGPA 8.7', 'Savitri Institute', 'Docker deploys', 'pgvector'];
    expect(cleanParserSkills(noisy, AARAV)).toEqual(['Python', 'Docker', 'Vector search']);
  });

  it('treats a resume whose first line is a job title as having no name', () => {
    expect(ruleProfile('Backend Engineer\nSkills: Docker, Git', NOW).candidateName).toBeNull();
  });
});

describe('role profiles for short job descriptions', () => {
  it('picks the most specific role', () => {
    expect(roleProfileFor('Senior Backend Engineer').role).toBe('backend engineer');
    expect(roleProfileFor('software engineer').role).toBe('software engineer');
    expect(roleProfileFor('we need a chef')).toBeNull();
  });

  it('tops up a bare title with assumed skills and says so', () => {
    const { skills, assumedRole } = jobRequirements('software engineer');
    expect(assumedRole).toBe('software engineer');
    expect(skills.every((skill) => skill.assumed)).toBe(true);
    const result = analyzeCandidate({ role: '', jobDescription: 'software engineer', candidate: { parsedText: AARAV } }, {});
    expect(result.assumed_role).toBe('software engineer');
    expect(result.risk_flags[0]).toContain('typical software engineer skills were assumed');
    expect(buildRoleBrief({ role: '', jobDescription: 'software engineer' }).role_summary).toContain('typical for a software engineer');
  });

  it('keeps the job’s own skills when it names enough', () => {
    expect(jobRequirements('Required skills: SQL, Python, Tableau').assumedRole).toBeNull();
  });
});

describe('evidence rules', () => {
  const skill = (name) => SKILL_INDEX.find((entry) => entry.name === name);
  const lines = tagLines(AARAV.split('\n'));

  it('never counts a contact line as evidence', () => {
    expect(skillEvidence(skill('Git'), lines).status).toBe('unverified');
  });

  it('treats a skills list wrapped onto the next line as a list', () => {
    expect(skillEvidence(skill('Unit testing'), lines).status).toBe('unverified');
  });
});

describe('dashboard evaluation view', () => {
  const result = analyzeCandidate(
    { role: '', jobDescription: 'Required skills: FastAPI, React, Kubernetes', candidate: { parsedText: AARAV, name: 'Aarav Mehta' } },
    { similarity: 0.6, llmScore: 80 }
  );

  it('normalises the score breakdown and skill table', () => {
    const evaluation = normalizeEvaluation(result);
    expect(evaluation.breakdown).toEqual({ skillCoverage: 67, matcherSimilarity: 60, llmFit: 80 });
    expect(evaluation.skillMatrix.map((row) => [row.skill, row.status])).toEqual([
      ['FastAPI', 'demonstrated'], ['React', 'demonstrated'], ['Kubernetes', 'missing'],
    ]);
    expect(normalizeEvaluation({ fit_score: 50 }).breakdown).toBeNull();
  });

  it('renders the breakdown and the skill table with resume quotes', () => {
    const html = renderToStaticMarkup(createElement(CandidateEvaluation, { data: result }));
    expect(html).toContain('How the score was built');
    expect(html).toContain('Skill by skill');
    expect(html).toContain('Built FastAPI endpoints for a document search product.');
    expect(html).toContain('Missing');
  });

  it('keeps the chip layout for evaluators without a skill table', () => {
    const html = renderToStaticMarkup(createElement(CandidateEvaluation, {
      data: { fit_verdict: 'moderate', fit_score: 60, skill_gap_analysis: { demonstrated_skills: ['SQL'] } },
    }));
    expect(html).toContain('Matched skills');
    expect(html).not.toContain('Skill by skill');
  });
});
