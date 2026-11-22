import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  BOUQUET,
  buildBouquetSvg,
  outerPetalPath,
  rosePetals,
  shadeFor,
  wrapPetalPath,
} from '../lib/landing/paperRose.js';

const root = path.resolve(import.meta.dirname, '..');

describe('rosePetals', () => {
  it('builds a rose the way one grows: guard petals, a cup, then a spiral', () => {
    const petals = rosePetals(7);
    expect(petals).toHaveLength(32);
    expect(petals.slice(0, 16).every((petal) => petal.shape === 'outer' && petal.roll)).toBe(true);
    expect(petals.slice(16).every((petal) => petal.shape === 'wrap' && !petal.roll)).toBe(true);
  });

  it('raises the centre into a cone above the open outer petals', () => {
    const petals = rosePetals(7);
    expect(petals[0].lift).toBe(0);
    expect(petals.at(-1).lift).toBeGreaterThan(petals[0].lift + 15);
  });

  it('keeps outer petals taller than wide and wraps the spiral petals wide', () => {
    const petals = rosePetals(7);
    expect(petals[0].h).toBeGreaterThan(petals[0].w);
    expect(petals.at(-1).w).toBeGreaterThan(petals.at(-1).h);
  });

  it('is the same rose every time for the same seed, and a different one for another', () => {
    expect(rosePetals(3)).toEqual(rosePetals(3));
    expect(rosePetals(3)).not.toEqual(rosePetals(4));
  });
});

describe('petal shapes and light', () => {
  it('draws closed petal outlines from the base', () => {
    for (const d of [outerPetalPath(40, 90), wrapPetalPath(30, 20)]) {
      expect(d.startsWith('M 0 0')).toBe(true);
      expect(d.endsWith('Z')).toBe(true);
    }
  });

  it('lights petals from the upper left', () => {
    expect(shadeFor(315)).toBeCloseTo(0, 5);
    expect(shadeFor(135)).toBeCloseTo(0.34, 5);
  });
});

describe('paper bouquet image', () => {
  it('is a 1180 x 700 picture of seven roses', () => {
    const svg = buildBouquetSvg();
    expect(svg).toContain('viewBox="0 0 1180 700"');
    expect(svg.match(/class="rose"/g)).toHaveLength(BOUQUET.roses.length);
    expect(BOUQUET.roses).toHaveLength(7);
  });

  it('matches the committed file, so the image never drifts from the code', () => {
    const committed = fs.readFileSync(path.join(root, 'public', 'landing', 'paper-bouquet.svg'), 'utf8');
    expect(committed).toBe(buildBouquetSvg());
  });
});
