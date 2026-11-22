import { describe, expect, it } from 'vitest';

import { THEMES, themeFor } from '../lib/landing/theme.js';
import { splitWords } from '../lib/landing/text.js';
import { wheelIndexAt, wordPose } from '../lib/landing/wheel.js';

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

describe('wheelIndexAt', () => {
  it('starts on the first word and ends on the last', () => {
    expect(wheelIndexAt(0, 8)).toBe(0);
    expect(wheelIndexAt(1, 8)).toBe(7);
  });

  it('settles on each word for a while before moving on', () => {
    // 3/7 of the way is exactly word 3; a little either side still shows word 3.
    expect(wheelIndexAt(3 / 7, 8)).toBe(3);
    expect(wheelIndexAt(3 / 7 + 0.02, 8)).toBe(3);
    expect(wheelIndexAt(3 / 7 - 0.02, 8)).toBeCloseTo(3, 5);
  });

  it('is half-way between two words at the half-way point', () => {
    expect(wheelIndexAt(3.5 / 7, 8)).toBeCloseTo(3.5, 5);
  });

  it('never goes backwards as you scroll down', () => {
    let previous = -1;
    for (let step = 0; step <= 200; step += 1) {
      const index = wheelIndexAt(step / 200, 8);
      expect(index).toBeGreaterThanOrEqual(previous);
      previous = index;
    }
  });

  it('clamps out-of-range scroll and handles tiny or invalid word counts', () => {
    expect(wheelIndexAt(-0.5, 8)).toBe(0);
    expect(wheelIndexAt(1.5, 8)).toBe(7);
    expect(wheelIndexAt(0.6, 1)).toBe(0);
    expect(wheelIndexAt(0.6, 0)).toBe(0);
    expect(wheelIndexAt(Number.NaN, 8)).toBe(0);
  });
});

describe('wordPose', () => {
  it('shows the current word upright, sharp and fully opaque', () => {
    expect(wordPose(0)).toEqual({ y: 0, rotateX: 0, opacity: 1, blur: 0 });
  });

  it('turns neighbours away symmetrically, dimmer and softer', () => {
    const above = wordPose(-1);
    const below = wordPose(1);
    expect(below.y).toBeGreaterThan(0);
    expect(above.y).toBeCloseTo(-below.y, 10);
    expect(below.rotateX).toBeLessThan(0);
    expect(above.rotateX).toBeCloseTo(-below.rotateX, 10);
    expect(below.opacity).toBeLessThan(0.6);
    expect(below.opacity).toBeGreaterThan(0);
    expect(below.blur).toBeGreaterThan(0);
  });

  it('hides words that have turned past the edge of the drum', () => {
    const far = wordPose(4);
    expect(far.opacity).toBe(0);
    expect(Math.abs(far.rotateX)).toBeLessThanOrEqual(90);
  });
});
