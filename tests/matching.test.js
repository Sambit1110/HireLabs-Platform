import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import {
  canonicalSkill,
  extractRequirements,
  extractSkills,
  normalizeTokens,
  rankCandidates,
  scoreCandidate,
} from '../lib/resume/matching.js';

const score = (candidate, role, jobDescription = '') =>
  scoreCandidate(candidate, extractRequirements(role, jobDescription));

describe('matching', () => {
  it('scores an exact match at 100%', () => {
    const result = score({ skills: ['React', 'PostgreSQL'] }, '', 'We need React and PostgreSQL.');
    assert.equal(result.score, 100);
    assert.deepEqual(result.matched, ['React', 'PostgreSQL']);
    assert.deepEqual(result.missing, []);
    assert.equal(result.total, 2);
  });

  it('gives 0% when nothing overlaps (no base score or floor)', () => {
    const result = score(
      { skills: [], text: 'I worked as a cook at a restaurant in town. I am good on my feet.' },
      'Engineer',
      'Kubernetes, Terraform, JavaScript, Rust, PostgreSQL, pgvector, Gemini, React, Supabase, embeddings'
    );
    assert.equal(result.score, 0);
    assert.deepEqual(result.matched, []);
    assert.equal(result.total, 10);
  });

  it('ignores case differences', () => {
    const result = score({ text: 'expert in REACT and postgresql' }, '', 'react, PostgreSQL');
    assert.equal(result.score, 100);
  });

  it('ignores punctuation and formatting differences', () => {
    assert.deepEqual(extractSkills('Skills: (React), CI/CD; scikit-learn. Node.js!'), [
      'React', 'Node.js', 'CI/CD', 'scikit-learn',
    ]);
    const result = score({ text: 'Built CI/CD pipelines, "React" apps.' }, '', 'Need react + ci/cd');
    assert.equal(result.score, 100);
  });

  it('never treats short generic words as skills', () => {
    const requirements = extractRequirements('', 'as or us at in to on');
    assert.equal(requirements.type, 'none');
    assert.deepEqual(requirements.items, []);

    const result = score({ text: 'as or us at in' }, '', 'Terraform and Rust');
    assert.equal(result.score, 0);
    assert.deepEqual(result.missing, ['Rust', 'Terraform']);
  });

  it('resolves JS to JavaScript', () => {
    assert.equal(canonicalSkill('js'), 'JavaScript');
    assert.equal(score({ text: 'Strong JS developer' }, '', 'JavaScript required').score, 100);
    assert.equal(score({ skills: ['JavaScript'] }, '', 'Looking for JS experience').score, 100);
  });

  it('resolves Node to Node.js', () => {
    assert.equal(canonicalSkill('node'), 'Node.js');
    assert.equal(canonicalSkill('NodeJS'), 'Node.js');
    assert.equal(score({ text: 'APIs in Node and Express.js' }, '', 'Node.js backend').score, 100);
  });

  it('does not match partial substrings', () => {
    // Java inside JavaScript, React inside Reactive, Go inside Good, Rust inside Trust.
    assert.equal(score({ text: 'JavaScript expert' }, '', 'Java developer').score, 0);
    assert.equal(score({ text: 'reactive programming' }, '', 'React').score, 0);
    assert.equal(score({ text: 'Good communicator, trusted by the team' }, '', 'Go and Rust').score, 0);
    assert.equal(score({ text: 'typescript' }, '', 'TypeScript').score, 100);
  });

  it('only trusts ambiguous words with their proper capitalization', () => {
    assert.deepEqual(extractSkills('I like to go running'), []);
    assert.deepEqual(extractSkills('Services written in Go'), ['Go']);
    assert.deepEqual(extractSkills('a swift response'), []);
  });

  it('handles an empty resume', () => {
    const result = score({ skills: [], text: '' }, 'Backend', 'Python, Django, PostgreSQL');
    assert.equal(result.score, 0);
    assert.equal(result.total, 3);
    assert.deepEqual(result.missing, ['Python', 'Django', 'PostgreSQL']);
  });

  it('handles empty requirements', () => {
    const result = score({ skills: ['React'] }, '', '');
    assert.deepEqual(result, { score: 0, matched: [], missing: [], total: 0, requirementType: 'none' });
  });

  it('falls back to keywords for roles without catalog skills', () => {
    const requirements = extractRequirements('Line cook', 'Knife skills, food safety and plating.');
    assert.equal(requirements.type, 'keywords');
    assert.ok(requirements.items.includes('knife'));
    assert.ok(!requirements.items.includes('and'));

    const result = scoreCandidate({ text: 'Food safety certified. Plating for 200 covers.' }, requirements);
    assert.ok(result.score > 0 && result.score < 100);
  });

  it('keeps + and # inside tokens', () => {
    assert.deepEqual(normalizeTokens('C++, C# and Node.js.'), ['c++', 'c#', 'and', 'node.js']);
    assert.deepEqual(extractSkills('C++ and C#'), ['C++', 'C#']);
  });

  it('ranks candidates, keeps pending profiles last, and does not mutate input', () => {
    const candidates = [
      { id: 'a', skills: ['React'], profileReady: true },
      { id: 'pending', skills: [], profileReady: false, processingStatus: 'processing' },
      { id: 'b', skills: ['React', 'PostgreSQL'], profileReady: true },
    ];
    const snapshot = JSON.stringify(candidates);

    const { requirements, results } = rankCandidates(candidates, { role: '', jobDescription: 'React, PostgreSQL' });

    assert.equal(requirements.items.length, 2);
    assert.deepEqual(results.map((candidate) => [candidate.id, candidate.score]), [['b', 100], ['a', 50], ['pending', null]]);
    assert.equal(JSON.stringify(candidates), snapshot);
  });

  it('evaluates only the selected candidate in specific mode', () => {
    const { results } = rankCandidates(
      [{ id: 'a', skills: ['React'] }, { id: 'b', skills: [] }],
      { jobDescription: 'React', mode: 'specific', selectedId: 'b' }
    );
    assert.deepEqual(results.map((candidate) => candidate.id), ['b']);
    assert.equal(results[0].score, 0);
  });
});
