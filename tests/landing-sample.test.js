import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SAMPLE_CANDIDATES, SAMPLE_ROLES, rankFor } from '../lib/landing/sample.js';

const root = path.resolve(import.meta.dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles', 'landing.css'), 'utf8');

describe('rankFor', () => {
  it('orders the sample candidates best match first for each role', () => {
    expect(rankFor('fullstack').map((entry) => entry.name)).toEqual(['Alex Mercer', 'Elena Rostova', 'Sarah Lin']);
    expect(rankFor('ml').map((entry) => entry.name)).toEqual(['Sarah Lin', 'Alex Mercer', 'Elena Rostova']);
    expect(rankFor('cloud').map((entry) => entry.name)).toEqual(['Elena Rostova', 'Alex Mercer', 'Sarah Lin']);
  });

  it('gives each entry a 0-100 score, its rank and a reason', () => {
    rankFor('ml').forEach((entry, index) => {
      expect(entry.rank).toBe(index + 1);
      expect(entry.score).toBeGreaterThanOrEqual(0);
      expect(entry.score).toBeLessThanOrEqual(100);
      expect(entry.reason.length).toBeGreaterThan(10);
    });
  });

  it('only marks skills the candidate actually lists as matched', () => {
    for (const role of SAMPLE_ROLES) {
      for (const entry of rankFor(role.id)) {
        for (const skill of entry.matched) expect(entry.skills).toContain(skill);
      }
    }
  });

  it('returns the profiles unranked for an unknown role', () => {
    const entries = rankFor('astronaut');
    expect(entries.map((entry) => entry.name)).toEqual(SAMPLE_CANDIDATES.map((candidate) => candidate.name));
    for (const entry of entries) {
      expect(entry.score).toBeNull();
      expect(entry.matched).toEqual([]);
    }
  });
});

describe('sample preview server HTML', () => {
  async function render() {
    const { SamplePreview } = await import('../components/landing/SamplePreview.jsx');
    return renderToStaticMarkup(createElement(SamplePreview));
  }

  it('offers a role picker made of real radio buttons, first role chosen', async () => {
    const html = await render();
    const radios = html.match(/<input[^>]*type="radio"[^>]*>/g) ?? [];
    expect(radios).toHaveLength(SAMPLE_ROLES.length);
    expect(radios[0]).toMatch(/checked=""/);
    expect(html).toMatch(/<fieldset[^>]*class="lp-sample__roles"[\s\S]*?<legend[^>]*>Rank them for<\/legend>/);
  });

  it('shows the cards ranked for the first role, with scores', async () => {
    const html = await render();
    const names = [...html.matchAll(/class="lp-sample__name">([^<]+)</g)].map((match) => match[1]);
    expect(names).toEqual(['Alex Mercer', 'Elena Rostova', 'Sarah Lin']);
    expect(html).toContain('class="lp-sample__score"');
  });

  it('says matched skills in words and announces the ranking', async () => {
    const html = await render();
    expect(html).toMatch(/class="lp-sample__skill is-match"[^>]*><span class="lp-sr-only">Matched: <\/span>React/);
    expect(html).toMatch(/aria-live="polite"[^>]*>Ranked for Full-stack lead: Alex Mercer 92, Elena Rostova 58, Sarah Lin 41\.</);
  });

  it('gives the sample cards the same hover tilt as the how-it-works cards', () => {
    const hoverMotion = (css.match(/@media \(hover: hover\) and \(prefers-reduced-motion: no-preference\)\s*{[\s\S]*?\n}/g) ?? []).join('\n');
    expect(hoverMotion).toMatch(/\.lp-sample__card[^{]*{[^}]*rotateX\(var\(--rx/);
  });
});
