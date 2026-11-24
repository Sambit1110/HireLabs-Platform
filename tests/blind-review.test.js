import { describe, expect, it } from 'vitest';

import {
  blindAliases,
  blindSkills,
  blindTitle,
  candidateDisplayName,
  identityNames,
  looksLikeJobTitle,
  nameTokens,
  redactDeep,
  redactIdentity,
} from '../lib/resume/blind-review.js';

const resumes = [
  { id: 'c', created_at: '2026-11-03T10:00:00Z', candidate_name: 'Mei Chen', file_name: 'mei.pdf' },
  { id: 'a', created_at: '2026-11-01T10:00:00Z', candidate_name: 'Priya Raman', file_name: 'priya_raman_cv.pdf' },
  { id: 'b', created_at: '2026-11-01T10:00:00Z', candidate_name: null, file_name: 'daniel-okafor.docx' },
];

describe('blindAliases', () => {
  it('numbers candidates by upload order, oldest first, ties broken by id', () => {
    const aliases = blindAliases(resumes);
    expect(aliases.get('a')).toBe('Candidate 1');
    expect(aliases.get('b')).toBe('Candidate 2');
    expect(aliases.get('c')).toBe('Candidate 3');
  });

  it('keeps old numbers when a newer resume is uploaded', () => {
    const before = blindAliases(resumes);
    const after = blindAliases([...resumes, { id: 'z', created_at: '2026-11-20T00:00:00Z' }]);
    for (const id of ['a', 'b', 'c']) expect(after.get(id)).toBe(before.get(id));
    expect(after.get('z')).toBe('Candidate 4');
  });

  it('does not depend on the order it is given', () => {
    const forward = blindAliases(resumes);
    const reversed = blindAliases([...resumes].reverse());
    expect([...reversed.entries()].sort()).toEqual([...forward.entries()].sort());
  });

  it('copes with missing or broken dates and empty input', () => {
    const aliases = blindAliases([{ id: 'x', created_at: 'not a date' }, { id: 'y' }, { id: 'w', created_at: '2026-01-01' }]);
    expect(new Set(aliases.values()).size).toBe(3);
    expect(aliases.get('w')).toBe('Candidate 1');
    expect(blindAliases([]).size).toBe(0);
    expect(blindAliases(null).size).toBe(0);
  });

  it('skips rows without an id', () => {
    expect(blindAliases([{ created_at: '2026-01-01' }, { id: 'q' }]).get('q')).toBe('Candidate 1');
  });
});

describe('candidateDisplayName', () => {
  const aliases = blindAliases(resumes);

  it('shows the real name, then the file name without extension, when blind review is off', () => {
    expect(candidateDisplayName(resumes[1], { blind: false, aliases })).toBe('Priya Raman');
    expect(candidateDisplayName(resumes[2], { blind: false, aliases })).toBe('daniel-okafor');
  });

  it('shows only the alias when blind review is on', () => {
    expect(candidateDisplayName(resumes[1], { blind: true, aliases })).toBe('Candidate 1');
    expect(candidateDisplayName(resumes[2], { blind: true, aliases })).toBe('Candidate 2');
  });

  it('never falls back to the name or file name in blind review, even without an alias', () => {
    const label = candidateDisplayName({ id: 'unknown', candidate_name: 'Secret Person', file_name: 'secret.pdf' }, { blind: true, aliases });
    expect(label).toBe('Hidden candidate');
    expect(candidateDisplayName(null, { blind: true, aliases })).toBe('Hidden candidate');
  });

  it('uses a fallback label when there is nothing to show', () => {
    expect(candidateDisplayName({ id: 'n', candidate_name: '  ', file_name: '' }, { blind: false, aliases })).toBe('Unnamed resume');
  });
});

describe('nameTokens', () => {
  it('splits a name into words and drops honorifics and single letters', () => {
    expect(nameTokens('Dr. Priya  K. Raman')).toEqual(['Priya', 'Raman']);
    expect(nameTokens("Seán O'Brien-Murphy")).toEqual(['Seán', "O'Brien-Murphy", "O'Brien", 'Murphy']);
    expect(nameTokens(null)).toEqual([]);
    expect(nameTokens('   ')).toEqual([]);
  });
});

describe('redactIdentity', () => {
  const opts = { names: ['Priya Raman'], alias: 'Candidate 1' };

  it('replaces the full name and each part of it with the alias', () => {
    expect(redactIdentity('Priya Raman, Backend Engineer, with 7 years of experience.', opts))
      .toBe('Candidate 1, Backend Engineer, with 7 years of experience.');
    expect(redactIdentity("Raman's work at Stripe. PRIYA led it.", opts))
      .toBe("Candidate 1's work at Stripe. Candidate 1 led it.");
  });

  it('only replaces whole words', () => {
    expect(redactIdentity('Ramanujan and priyanka', opts)).toBe('Ramanujan and priyanka');
  });

  it('handles names with accents and regex characters', () => {
    expect(redactIdentity('José Núñez (lead)', { names: ['José Núñez'], alias: 'C' })).toBe('C (lead)');
    expect(redactIdentity('A+ by Jo.n', { names: ['Jo.n'], alias: 'C' })).toBe('A+ by C');
    expect(redactIdentity('Jon and Joan', { names: ['Jo.n'], alias: 'C' })).toBe('Jon and Joan');
  });

  it('removes emails, links and phone numbers', () => {
    const text = 'Contact priya.raman@example.co.uk or +91 98765 43210, (415) 555-0132. '
      + 'See https://priya.dev/work, www.priya.io and linkedin.com/in/priya-raman or github.com/praman.';
    const out = redactIdentity(text, { names: [], alias: 'C' });
    expect(out).not.toMatch(/example|98765|555|priya|praman|https|www/i);
    expect(out).toContain('[email]');
    expect(out).toContain('[phone]');
    expect(out).toContain('[link]');
  });

  it('keeps years, date ranges and ordinary numbers', () => {
    const text = 'Engineer 2018 - 2020, 2021-2024; 5+ years; 12,000 users; 99.95% uptime; 2016 2017 2018 2019.';
    expect(redactIdentity(text, { names: [], alias: 'C' })).toBe(text);
  });

  it('leaves non-strings alone', () => {
    expect(redactIdentity(42, opts)).toBe(42);
    expect(redactIdentity(null, opts)).toBe(null);
  });
});

describe('redactDeep', () => {
  it('redacts every string in nested objects and arrays without changing the input', () => {
    const data = {
      summary: 'Priya Raman, Backend Engineer.',
      fit_score: 82,
      strengths: ['Go: "Priya built the API"', 'Email priya@x.io'],
      nested: { quote: 'call 415 555 0132', ok: true, none: null },
    };
    const copy = JSON.parse(JSON.stringify(data));
    const out = redactDeep(data, { names: ['Priya Raman'], alias: 'Candidate 1' });
    expect(data).toEqual(copy);
    expect(out).toEqual({
      summary: 'Candidate 1, Backend Engineer.',
      fit_score: 82,
      strengths: ['Go: "Candidate 1 built the API"', 'Email [email]'],
      nested: { quote: 'call [phone]', ok: true, none: null },
    });
  });
});

describe('looksLikeJobTitle', () => {
  it('accepts job titles and rejects names', () => {
    for (const title of ['Backend Engineer', 'Senior Data Analyst', 'Full-Stack Developer', 'CTO', 'ML intern', 'Account Executive']) {
      expect(looksLikeJobTitle(title)).toBe(true);
    }
    for (const title of ['SAGNIK DAM', 'Riya Kapoor', 'HRITTIMA SEN', '', null]) {
      expect(looksLikeJobTitle(title)).toBe(false);
    }
  });
});

describe('identityNames and blindTitle', () => {
  it('treats a title that is really a name as part of the identity', () => {
    // Seen in real data: no name extracted, and the name stored as the title.
    const resume = { candidate_name: null, candidate_title: 'SAGNIK DAM' };
    expect(identityNames(resume)).toEqual(['SAGNIK DAM']);
    expect(blindTitle(resume, 'Candidate 4')).toBe(null);
    expect(redactIdentity('Sagnik built a URL scanner', { names: identityNames(resume), alias: 'Candidate 4' }))
      .toBe('Candidate 4 built a URL scanner');
  });

  it('reads naturally when the explainer had no name but the title was the name', () => {
    const names = identityNames({ candidate_name: null, candidate_title: 'SAGNIK DAM' });
    expect(redactIdentity('The candidate, SAGNIK DAM. The resume shows evidence', { names, alias: 'Candidate 10' }))
      .toBe('Candidate 10. The resume shows evidence');
    expect(redactIdentity('The candidate, Candidate 100 here', { names: [], alias: 'Candidate 10' }))
      .toBe('The candidate, Candidate 100 here');
  });

  it('does not repeat a title equal to the name', () => {
    expect(identityNames({ candidate_name: 'Riya Kapoor', candidate_title: 'Riya Kapoor' })).toEqual(['Riya Kapoor']);
  });

  it('keeps a real job title, with any name taken out', () => {
    expect(identityNames({ candidate_name: 'Riya Kapoor', candidate_title: 'Data Analyst' })).toEqual(['Riya Kapoor']);
    expect(blindTitle({ candidate_name: 'Riya Kapoor', candidate_title: 'Data Analyst' }, 'C')).toBe('Data Analyst');
    expect(blindTitle({ candidate_name: 'Riya Kapoor', candidate_title: 'Riya Kapoor, Data Analyst' }, 'C')).toBe('C, Data Analyst');
    expect(blindTitle({ candidate_name: 'X Y' }, 'C')).toBe(null);
  });
});

describe('blindSkills', () => {
  it('drops skills that carry links, emails, phone numbers or the name', () => {
    // Real parser output for one resume.
    const skills = [
      'Kolkata, India •',
      '• github.com/SagnikAB • linkedin.com/in/sagnik-dam-b33bb3322',
      'Python',
      'sagnik@example.com',
      'Sagnik Dam portfolio',
      'Node.js',
      '+91 98765 43210',
      '',
      7,
    ];
    expect(blindSkills(skills, { candidate_name: null, candidate_title: 'SAGNIK DAM' }))
      .toEqual(['Kolkata, India •', 'Python', 'Node.js']);
    expect(blindSkills(null, {})).toEqual([]);
  });
});
