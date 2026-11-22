import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CANDIDATE_PROMPT_VERSION,
  CANDIDATE_SYSTEM_PROMPT,
  buildCandidateMessages,
  buildCandidatePrompt,
  buildCandidateUserMessage,
  candidateSchema,
  validateAnalysis,
} from '../lib/ai/candidate-prompt.js';

const root = path.resolve(import.meta.dirname, '..');
const body = {
  mode: 'candidate',
  role: 'Data Analyst',
  jobDescription: 'Data Analyst\nRequired skills: SQL, Tableau',
  candidate: { parsedText: 'Analyst with 3 years of SQL reporting.', name: null, title: null, skills: null, yearsExperience: null },
};

describe('shared candidate prompt', () => {
  it('splits the prompt into a fixed system message and a per-pair user message', () => {
    const [system, user] = buildCandidateMessages(body);
    expect(system).toEqual({ role: 'system', content: CANDIDATE_SYSTEM_PROMPT });
    expect(user.role).toBe('user');
    expect(user.content).toBe(buildCandidateUserMessage(body));
    expect(CANDIDATE_SYSTEM_PROMPT).not.toContain('SQL reporting');
    expect(user.content).toMatch(/TARGET ROLE:\nData Analyst/);
    expect(user.content).toMatch(/RESUME TEXT:\nAnalyst with 3 years of SQL reporting\./);
    expect(user.content).toMatch(/Name:\nNot provided/);
    expect(user.content).toMatch(/Years of experience:\nUnknown/);
  });

  it('gives Gemini the same text as one prompt', () => {
    expect(buildCandidatePrompt(body)).toBe(`${CANDIDATE_SYSTEM_PROMPT}\n\n${buildCandidateUserMessage(body)}`);
  });

  it('states the score bands with proper dashes', () => {
    expect(CANDIDATE_SYSTEM_PROMPT).toContain('strong for 75–100, moderate for 50–74, and weak for 0–49');
    expect(CANDIDATE_SYSTEM_PROMPT).not.toMatch(/\d\?\d/);
    expect(CANDIDATE_PROMPT_VERSION).toMatch(/^candidate-v\d+$/);
  });

  it('accepts only results whose score falls in the verdict band', () => {
    const base = Object.fromEntries(candidateSchema.required.map((key) => [key, []]));
    const result = {
      ...base,
      candidate_summary: '', relevant_experience_summary: '', recommendation: '', confidence: 60,
      skill_gap_analysis: { demonstrated_skills: [], partially_demonstrated_skills: [], missing_required_skills: [], missing_preferred_skills: [], unverified_skills: [], skill_gap_summary: '' },
      recruiter_insights: { strongest_alignment: [], areas_for_verification: [], suggested_interview_focus: [], overall_assessment: '' },
    };
    expect(validateAnalysis({ ...result, fit_score: 80, fit_verdict: 'strong' }, candidateSchema, 'candidate')).toBe(true);
    expect(validateAnalysis({ ...result, fit_score: 74, fit_verdict: 'strong' }, candidateSchema, 'candidate')).toBe(false);
    expect(validateAnalysis({ ...result, fit_score: 10, fit_verdict: 'insufficient_evidence' }, candidateSchema, 'candidate')).toBe(true);
  });

  it('is the one place the app builds the candidate prompt and the local evaluator call', () => {
    const route = fs.readFileSync(path.join(root, 'app/api/ai-analyze/route.js'), 'utf8');
    expect(route).toContain("from '@/lib/ai/candidate-prompt'");
    expect(route).not.toMatch(/const candidateSchema\s*=/);
    expect(route).not.toMatch(/function buildCandidatePrompt/);
    expect(route).toMatch(/evaluateLocally\(\s*buildCandidateMessages\(body\)/);
  });
});

describe('local evaluator client', () => {
  it('sends the system and user messages as given', async () => {
    const { evaluateLocally } = await import('../lib/ai/local-llm.js');
    let sent;
    globalThis.fetch = async (_url, init) => {
      sent = JSON.parse(init.body);
      return { ok: true, json: async () => ({ message: { content: '{"ok":true}' } }) };
    };
    await evaluateLocally(buildCandidateMessages(body), candidateSchema);
    expect(sent.messages.map((message) => message.role)).toEqual(['system', 'user']);
    await evaluateLocally('plain prompt', candidateSchema);
    expect(sent.messages).toEqual([{ role: 'user', content: 'plain prompt' }]);
  });
});
