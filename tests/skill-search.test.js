import { describe, expect, it } from 'vitest';

import { isEmptyQuery, matchResume, parseSkillQuery } from '../lib/resume/skill-search.js';

const RIYA = {
  candidate_name: 'Riya Kapoor', candidate_title: 'Data Analyst', file_name: 'riya.pdf', years_experience: 3,
  extracted_skills: ['SQL', 'Python', 'Tableau'],
  parsed_text: 'Riya Kapoor\nData Analyst\nBuilt weekly Tableau dashboards and SQL pipelines in Pandas.',
};
const AARAV = {
  candidate_name: 'Aarav Mehta', candidate_title: 'Student', file_name: 'aarav.pdf', years_experience: 1,
  extracted_skills: ['Python'],
  parsed_text: 'Aarav Mehta\nSkills: Python, TypeScript, JavaScriptWeb: HTML\nAdded a vector search pipeline with PostgreSQL + pgvector.',
};
const search = (query) => [RIYA, AARAV].filter((resume) => matchResume(resume, parseSkillQuery(query)).match).map((r) => r.candidate_name);

describe('skill search', () => {
  it('requires every skill in "A + B" and "A, B"', () => {
    expect(search('SQL + Python')).toEqual(['Riya Kapoor']);
    expect(search('python, typescript')).toEqual(['Aarav Mehta']);
    expect(search('Python')).toEqual(['Riya Kapoor', 'Aarav Mehta']);
  });

  it('understands aliases and searches the resume text, glued words included', () => {
    expect(search('postgres')).toEqual(['Aarav Mehta']);
    expect(search('js')).toEqual(['Aarav Mehta']);
    expect(search('pandas')).toEqual(['Riya Kapoor']);
  });

  it('filters by years of experience', () => {
    expect(search('Python, 3+ years')).toEqual(['Riya Kapoor']);
    expect(search('2 years')).toEqual(['Riya Kapoor']);
  });

  it('still finds people by name or title', () => {
    expect(search('aarav')).toEqual(['Aarav Mehta']);
    expect(search('data analyst')).toEqual(['Riya Kapoor']);
  });

  it('reports which skills matched, and treats an empty query as everything', () => {
    expect(matchResume(RIYA, parseSkillQuery('sql + tableau'))).toEqual({ match: true, matched: ['SQL', 'Tableau'] });
    expect(isEmptyQuery(parseSkillQuery('  '))).toBe(true);
    expect(search('')).toEqual(['Riya Kapoor', 'Aarav Mehta']);
  });

  it('keeps C++ whole and accepts SQL+Python without spaces', () => {
    expect(parseSkillQuery('C++, Java').terms.map((t) => t.label)).toEqual(['C++', 'Java']);
    expect(parseSkillQuery('SQL+Python').terms.map((t) => t.label)).toEqual(['SQL', 'Python']);
    expect(parseSkillQuery('Python, 3+ years')).toMatchObject({ minYears: 3 });
  });

  it('never matches inside a longer word', () => {
    expect(search('java')).toEqual([]);
  });
});
