import { describe, expect, it } from 'vitest';

import { shouldAnimate } from '../lib/landing/motion-prefs.js';

describe('shouldAnimate', () => {
  it('animates only when reduced motion is known to be off', () => {
    expect(shouldAnimate(false)).toBe(true);
  });

  it('never animates for visitors who asked for reduced motion', () => {
    expect(shouldAnimate(true)).toBe(false);
  });

  it('does not animate before the preference is known (avoids a flash of blur)', () => {
    expect(shouldAnimate(null)).toBe(false);
    expect(shouldAnimate(undefined)).toBe(false);
  });
});
