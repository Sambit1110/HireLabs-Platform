import { describe, expect, it } from 'vitest';

import { cleanSkills, normalizeJoins, splitJoined } from '../lib/resume/skill-hygiene.js';
import { cleanParserSkills, ruleProfile } from '../lib/resume/rule-profile.js';

// Laid out like a two-column PDF after text extraction: contact line with bullets, glued words.
const TWO_COLUMN = [
  'Sagnik Dam',
  'Software Developer',
  'Kolkata, India • sagnik@example.com • github.com/SagnikAB • linkedin.com/in/sagnik-dam-b33bb3322',
  'Summary',
  'CS student interested in backend systems, web security, and practical AI, learning new technologies.',
  'Experience',
  'Backend Intern, Example Labs, 2024 – Present',
  '• Built REST APIs in Node.js and Express.js backed by PostgreSQL.',
  'Skills',
  'Languages: Python, Java, C, C++, JavaScriptWeb: HTML, CSS, Node.js, Express.jsTools & Platforms: Git, Docker, Linux',
].join('\n');

// What the screenshot showed as "Skills".
const NOISY = [
  'Kolkata', 'India •', '• github.com/SagnikAB • linkedin.com/in/sagnik-dam-b33bb3322', 'web security',
  'and practical AI', 'learning new technologies', '2024 – Present', 'Python', 'Java', 'C', 'C++',
  'JavaScriptWeb', 'HTML', 'CSS', 'Node.js', 'Express.jsTools &',
];

describe('glued words', () => {
  it('splits a known skill from the word glued to it', () => {
    expect(splitJoined('JavaScriptWeb')).toBe('JavaScript Web');
    expect(splitJoined('Express.jsTools')).toBe('Express.js Tools');
  });

  it('leaves real skill names whole', () => {
    for (const name of ['JavaScript', 'PostgreSQL', 'TypeScript', 'GitHub', 'FastAPI', 'Javadoc']) {
      expect(splitJoined(name)).toBe(name);
    }
    expect(normalizeJoins('I use JavaScript daily')).toBe('I use JavaScript daily');
  });
});

describe('cleaning noisy skill lists', () => {
  it('turns the screenshot list into real skills only', () => {
    const skills = cleanParserSkills(NOISY, TWO_COLUMN);
    expect(skills).toEqual(expect.arrayContaining(['Python', 'Java', 'C', 'C++', 'JavaScript', 'HTML', 'CSS', 'Node.js']));
    const joined = skills.join(' | ');
    expect(joined).not.toMatch(/Kolkata|India|github|linkedin|2024|Present|practical|learning|•|Tools|Web\b/);
  });

  it('builds a clean profile from the two-column text alone', () => {
    const profile = ruleProfile(TWO_COLUMN, new Date('2026-11-24'));
    expect(profile.candidateName).toBe('Sagnik Dam');
    expect(profile.candidateTitle).toBe('Software Developer');
    expect(profile.extractedSkills).toEqual(expect.arrayContaining(['Python', 'Java', 'Git', 'Docker', 'Linux', 'Node.js', 'PostgreSQL', 'REST APIs']));
    expect(profile.extractedSkills.join(' | ')).not.toMatch(/Kolkata|India|github|linkedin|Present|Tools|Platforms|Languages/);
  });

  it('splits phrases that name several skills and drops prose and labels', () => {
    const text = 'Skills: Python, Docker';
    expect(cleanSkills(['Node.js and Python backends', 'Web', 'Frameworks & Libraries', 'with React', 'learning new technologies'], text))
      .toEqual(['Python', 'Node.js']);
  });

  it('keeps unknown tools listed in a skills section, but not unknown parser guesses', () => {
    const text = 'Skills: Terraform, Kafka, Python';
    expect(cleanSkills(['Terraform', 'Kafka', 'Gizmo'], text, { requireKnown: true })).toEqual(['Terraform', 'Kafka']);
  });
});
