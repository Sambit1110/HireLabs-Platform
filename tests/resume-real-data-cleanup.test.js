/**
 * Regressions from real resumes on the live dashboard: the name stored as the job title, and
 * contact details, dates, degrees and sentence fragments stored as skills.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { callModelServerMock } = vi.hoisted(() => ({ callModelServerMock: vi.fn() }));

vi.mock('../lib/ai/model-server.js', () => ({
  callModelServer: callModelServerMock,
  useLocalModels: () => process.env.USE_LOCAL_MODELS === 'true',
}));
vi.mock('../lib/ai/local-llm.js', () => ({ evaluateLocally: vi.fn() }));

import { enrichResume } from '../lib/resume/profile-enrichment.js';
import { cleanParserSkills, ruleProfile } from '../lib/resume/rule-profile.js';
import { cleanSkills } from '../lib/resume/skill-hygiene.js';

const savedLocal = process.env.USE_LOCAL_MODELS;
beforeEach(() => {
  process.env.USE_LOCAL_MODELS = 'true';
  callModelServerMock.mockReset();
});
afterEach(() => {
  if (savedLocal === undefined) delete process.env.USE_LOCAL_MODELS;
  else process.env.USE_LOCAL_MODELS = savedLocal;
});

const parserReturns = (profile) =>
  callModelServerMock.mockResolvedValue({
    value: { candidateName: null, candidateTitle: null, extractedSkills: [], yearsExperience: null, ...profile },
    placeholder: false,
  });

// Strings the parser stored as skills on real resumes.
const JUNK_SKILLS = [
  '• github.com/SagnikAB • linkedin.com/in/sagnik-dam-b33bb3322',
  'Kolkata, India •',
  'India |',
  'contributing to the design',
  'Contributing to the design',
  'and creation of a',
  'Jun 2025',
  '-2018',
  'B.Tech Computer Science',
  'CGPA 8.7',
  'GPA: 3.8/4.0',
  'Express.jsTools & Platforms',
  'sagnik@example.com',
  '+91 98765 43210',
];
const REAL_SKILLS = ['C', 'C++', 'A/B testing', 'Node.js', 'REST APIs', 'Tableau'];

const RESUME = [
  'SAGNIK DAM | Kolkata, India | sagnik@example.com | +91 98765 43210',
  '• github.com/SagnikAB • linkedin.com/in/sagnik-dam-b33bb3322',
  'Experience',
  'Web Intern, Example Labs, Jun 2025 – Aug 2025',
  '• Contributing to the design and creation of a REST API in Node.js.',
  'Education',
  'B.Tech Computer Science, Example University, 2014-2018, CGPA 8.7',
  'Skills',
  'Languages: C, C++, JavaScriptWeb: Node.js, Express.jsTools & Platforms: Git, Tableau',
  'Skills: A/B testing, REST APIs, Internet of Things',
].join('\n');

describe('junk in extracted skills', () => {
  it('drops links, contacts, places, dates, fragments, degrees and glued headers from parser skills', () => {
    const skills = cleanParserSkills([...JUNK_SKILLS, ...REAL_SKILLS, 'Internet of Things'], RESUME);
    expect(skills).toEqual(expect.arrayContaining([...REAL_SKILLS, 'Internet of Things']));
    for (const junk of JUNK_SKILLS) expect(skills).not.toContain(junk);
    expect(skills.join(' | ')).not.toMatch(/github|linkedin|@|Kolkata|India|design|creation|2025|2018|B\.Tech|CGPA|GPA|Tools|Platforms|\+91/);
  });

  it('drops the same junk on the rules path, even with no skills section to vouch for items', () => {
    expect(cleanSkills(JUNK_SKILLS, '')).toEqual(['Node.js']);
  });

  it('keeps short and punctuated real skills', () => {
    expect(cleanSkills(REAL_SKILLS, '')).toEqual(expect.arrayContaining(REAL_SKILLS));
    expect(cleanSkills(['A/B Testing'], '')).toEqual(['A/B testing']);
  });
});

describe('name stored as the job title', () => {
  it('reads the name from a top line shared with contact details', () => {
    expect(ruleProfile(RESUME).candidateName).toBe('SAGNIK DAM');
  });

  it('moves a name-like title into the empty name field', async () => {
    parserReturns({ candidateTitle: 'HRITTIMA SEN', extractedSkills: ['Python'] });
    const result = await enrichResume('Objective\nLooking for roles in analytics.\nSkills: Python, SQL');
    expect(result.value.candidateName).toBe('HRITTIMA SEN');
    expect(result.value.candidateTitle).toBeNull();
  });

  it('prefers the name on the top line over the title, and drops the title', async () => {
    parserReturns({ candidateTitle: 'SAGNIK DAM', extractedSkills: ['C++'] });
    const result = await enrichResume(RESUME);
    expect(result.value.candidateName).toBe('SAGNIK DAM');
    expect(result.value.candidateTitle).not.toBe('SAGNIK DAM');
  });

  it('drops a title that is not a job even when it differs from the name', async () => {
    parserReturns({ candidateName: 'Riya Kapoor', candidateTitle: 'Curriculum Vitae', extractedSkills: ['SQL'] });
    const result = await enrichResume('Riya Kapoor\nCurriculum Vitae\nSkills: SQL, Tableau');
    expect(result.value.candidateName).toBe('Riya Kapoor');
    expect(result.value.candidateTitle).toBeNull();
  });

  it('drops a title that is the name in different spacing or case', async () => {
    parserReturns({ candidateName: 'Riya Kapoor', candidateTitle: 'RIYA  KAPOOR.', extractedSkills: ['SQL'] });
    const result = await enrichResume('Riya Kapoor\nSkills: SQL, Tableau');
    expect(result.value.candidateTitle).toBeNull();
  });

  it('keeps a real job title from the parser', async () => {
    parserReturns({ candidateName: 'Riya Kapoor', candidateTitle: 'Data Analyst', extractedSkills: ['SQL'] });
    const result = await enrichResume('Riya Kapoor\nData Analyst\nSkills: SQL, Tableau');
    expect(result.value.candidateTitle).toBe('Data Analyst');
  });
});
