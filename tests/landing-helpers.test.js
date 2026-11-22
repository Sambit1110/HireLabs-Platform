import { describe, expect, it } from 'vitest';

import { THEMES, themeFor } from '../lib/landing/theme.js';
import { splitWords } from '../lib/landing/text.js';
import { wheelPositions } from '../lib/landing/wheel.js';

describe('themeFor', () => {
  it('returns the cream band with dark oxblood text', () => {
    expect(themeFor('cream')).toEqual({ bg: '#F3E9DF', fg: '#3A0506' });
  });

  it('gives the deep and mid sections cream text on oxblood', () => {
    expect(themeFor('deep')).toEqual({ bg: '#2A0304', fg: '#F3E9DF' });
    expect(themeFor('mid')).toEqual({ bg: '#4A0608', fg: '#F3E9DF' });
  });

  it('falls back to deep for unknown names', () => {
    expect(themeFor('nope')).toEqual(THEMES.deep);
    expect(themeFor(undefined)).toEqual(THEMES.deep);
    expect(themeFor('toString')).toEqual(THEMES.deep);
  });
});

describe('splitWords', () => {
  it('keeps punctuation attached to its word', () => {
    expect(splitWords('Find the people behind the resume.')).toEqual([
      'Find', 'the', 'people', 'behind', 'the', 'resume.',
    ]);
  });

  it('splits on any whitespace and drops empties', () => {
    expect(splitWords('  a\n b ')).toEqual(['a', 'b']);
    expect(splitWords('')).toEqual([]);
  });
});

describe('wheelPositions', () => {
  it('spaces words evenly around the wheel', () => {
    const positions = wheelPositions(8);
    expect(positions).toHaveLength(8);
    expect(positions[0].angle).toBe(0);
    expect(positions[2].angle).toBe(90);
  });

  it('returns nothing for zero or negative counts', () => {
    expect(wheelPositions(0)).toEqual([]);
    expect(wheelPositions(-3)).toEqual([]);
  });
});
