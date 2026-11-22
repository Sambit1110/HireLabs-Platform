import { describe, expect, it } from 'vitest';

import { THEMES, themeFor } from '../lib/landing/theme.js';
import { splitWords } from '../lib/landing/text.js';
import { wheelPositions } from '../lib/landing/wheel.js';

describe('themeFor', () => {
  it('returns the lavender band with dark text', () => {
    expect(themeFor('lavender')).toEqual({ bg: '#BCBBFF', fg: '#0F0F0F' });
  });

  it('falls back to ink for unknown names', () => {
    expect(themeFor('nope')).toEqual(THEMES.ink);
    expect(themeFor(undefined)).toEqual(THEMES.ink);
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

describe('palettes', () => {
  it('gives burgundy sections cream text on oxblood', async () => {
    const { themeFor: pick, paletteFromSearch } = await import('../lib/landing/theme.js');
    expect(pick('ink', 'burgundy')).toEqual({ bg: '#2A0304', fg: '#F3E9DF' });
    expect(pick('lavender', 'burgundy')).toEqual({ bg: '#F3E9DF', fg: '#3A0506' });
    expect(pick('ink', 'nope')).toEqual({ bg: '#0F0F0F', fg: '#BCBBFF' });
    expect(paletteFromSearch('?theme=burgundy')).toBe('burgundy');
    expect(paletteFromSearch('?theme=hacker')).toBe('lavender');
    expect(paletteFromSearch('')).toBe('lavender');
  });
});
