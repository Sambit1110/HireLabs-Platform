import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles', 'landing.css'), 'utf8');

async function render() {
  const { Principles } = await import('../components/landing/Principles.jsx');
  return renderToStaticMarkup(createElement(Principles));
}

describe('principles section', () => {
  it('backs each principle with a short proof line', async () => {
    const html = await render();
    const items = html.match(/<li class="lp-principles__item">[\s\S]*?<\/li>/g) ?? [];
    expect(items).toHaveLength(3);
    const proofs = [
      'Scores rank candidates; nobody is rejected automatically.',
      'Matched skills, missing skills and quotes from the resume.',
      'Resumes stay in private storage, and row-level security means each account only ever sees its own candidates.',
    ];
    items.forEach((item, index) => {
      expect(item).toMatch(/<h3[^>]*class="lp-focus lp-principles__line"/);
      expect(item).toContain(`<p class="lp-principles__proof">${proofs[index]}</p>`);
    });
    expect(html).not.toContain('lp-principles__note');
  });

  it('decorates with paper resume pages instead of blank slabs', async () => {
    const html = await render();
    expect(html).not.toContain('lp-slab');
    expect(html.match(/class="lp-sheet"/g)).toHaveLength(5);
  });

  it('keeps every page at the outer edges, clear of the centred text', async () => {
    const html = await render();
    const lefts = [...html.matchAll(/class="lp-sheet"[^>]*style="[^"]*left:(-?[\d.]+)%/g)].map((match) => Number(match[1]));
    expect(lefts).toHaveLength(5);
    for (const left of lefts) expect(left < 15 || left > 83).toBe(true);
  });
});

describe('principles on narrow screens', () => {
  it('drops the decorative pages where there is no clear space beside the text', () => {
    expect(css).toMatch(/@media \(max-width: 900px\)\s*{\s*\.lp-sheet\s*{\s*display:\s*none/);
  });
});

describe('menu bar over light sections', () => {
  it('records which section colour is active on the page', () => {
    const source = fs.readFileSync(path.join(root, 'components', 'landing', 'ScrollBackground.jsx'), 'utf8');
    expect(source).toMatch(/root\.dataset\.lpActive\s*=/);
  });

  it('turns the scrolled menu bar light, with dark text and a dark pill, over the ivory band', () => {
    expect(css).toMatch(/\.lp\[data-lp-active='cream'\] \.lp-nav\.is-scrolled\s*{[^}]*background:\s*rgba\(243, 233, 223/);
    expect(css).toMatch(/\.lp\[data-lp-active='cream'\] \.lp-nav\.is-scrolled\s*{[^}]*color:\s*#3A0506/);
    expect(css).toMatch(/\.lp\[data-lp-active='cream'\] \.lp-nav \.lp-pill--primary\s*{[^}]*background:\s*#3A0506/);
  });
});
