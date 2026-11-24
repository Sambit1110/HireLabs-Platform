import { describe, expect, it } from 'vitest';

import { activeSection, dashboardSections } from '../lib/dashboard/sections.js';

const ids = (sections) => sections.map((section) => section.id);

describe('dashboardSections', () => {
  it('follows the overview order once resumes are parsed (ranking first)', () => {
    expect(ids(dashboardSections({ library: false, rankFirst: true, showCompare: false })))
      .toEqual(['rank', 'analysis', 'upload', 'candidates', 'resumes']);
  });

  it('puts upload first before anything is parsed', () => {
    expect(ids(dashboardSections({ library: false, rankFirst: false, showCompare: false })))
      .toEqual(['upload', 'candidates', 'rank', 'analysis', 'resumes']);
  });

  it('adds the comparison only while it is on the page, right after candidate management', () => {
    expect(ids(dashboardSections({ library: false, rankFirst: true, showCompare: true })))
      .toEqual(['rank', 'analysis', 'upload', 'candidates', 'compare', 'resumes']);
  });

  it('names the resume list after the page', () => {
    const last = (library) => dashboardSections({ library, rankFirst: false, showCompare: false }).at(-1);
    expect(last(true)).toEqual({ id: 'resumes', label: 'All resumes' });
    expect(last(false)).toEqual({ id: 'resumes', label: 'Recent uploads' });
  });

  it('never repeats an id', () => {
    for (const library of [true, false]) for (const rankFirst of [true, false]) for (const showCompare of [true, false]) {
      const list = ids(dashboardSections({ library, rankFirst, showCompare }));
      expect(new Set(list).size).toBe(list.length);
    }
  });
});

describe('activeSection', () => {
  const at = (...tops) => tops.map((top, index) => ({ id: `s${index}`, top }));

  it('is the last section whose top passed the line', () => {
    expect(activeSection(at(-900, -200, 130, 900), 130, false)).toBe('s2');
    expect(activeSection(at(-900, -200, 400, 900), 130, false)).toBe('s1');
  });

  it('is none above the first section', () => {
    expect(activeSection(at(300, 900), 130, false)).toBe(null);
  });

  it('is the last section at the bottom of the page, even when it is short', () => {
    expect(activeSection(at(-900, -200, 400, 600), 130, true)).toBe('s3');
  });

  it('tolerates sub-pixel positions after a smooth scroll lands', () => {
    expect(activeSection(at(-500, 130.6), 130, false)).toBe('s1');
  });

  it('skips sections that are not on the page', () => {
    expect(activeSection([{ id: 'a', top: -50 }, { id: 'b', top: Number.NaN }, { id: 'c', top: 100 }], 130, false)).toBe('c');
    expect(activeSection([], 130, false)).toBe(null);
    expect(activeSection(null, 130, true)).toBe(null);
  });
});
