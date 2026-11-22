import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles', 'landing.css'), 'utf8');

async function renderHow() {
  const { HowItWorks } = await import('../components/landing/HowItWorks.jsx');
  return renderToStaticMarkup(createElement(HowItWorks));
}

function cards(html) {
  return html.match(/<li class="lp-card lp-how__card[^"]*"[\s\S]*?<\/li>(?=<li class="lp-card|<\/ol>)/g) ?? [];
}

describe('how it works cards', () => {
  it('renders four cards, each with a button that turns it over', async () => {
    const list = cards(await renderHow());
    expect(list).toHaveLength(4);
    for (const card of list) {
      const toggle = card.match(/<button[^>]*class="lp-how__toggle"[^>]*aria-expanded="false"[^>]*>/)?.[0];
      expect(toggle).toBeTruthy();
      const backId = toggle.match(/aria-controls="([^"]+)"/)?.[1];
      expect(card).toContain(`id="${backId}"`);
    }
  });

  it('keeps the back of each card out of reach until it is turned over', async () => {
    for (const card of cards(await renderHow())) {
      expect(card).toMatch(/<div[^>]*class="lp-how__face lp-how__back"[^>]*inert=""/);
      expect(card).not.toMatch(/<div[^>]*class="lp-how__face lp-how__front"[^>]*inert=""/);
    }
  });

  it('labels every back as sample data and shows that step working', async () => {
    const list = cards(await renderHow());
    const expected = [
      ['Staff ML Engineer', '7 years'],
      ['Alex Mercer', '64'],
      ['Spark', 'vector search service'],
      ['Score unchanged', 'Sam Lee'],
    ];
    list.forEach((card, index) => {
      const back = card.slice(card.indexOf('lp-how__back'));
      expect(back).toContain('Sample data');
      for (const text of expected[index]) expect(back).toContain(text);
    });
  });

  it('says matched and missing skills in words, not only with symbols', async () => {
    const explain = cards(await renderHow())[2];
    expect(explain).toMatch(/Matched:\s*<\/span>\s*Python/);
    expect(explain).toMatch(/Missing:\s*<\/span>\s*Spark/);
  });
});

describe('how it works card styles', () => {
  const block = (query) =>
    (css.match(new RegExp(`@media ${query.replace(/[()]/g, '\\$&')}\\s*{[\\s\\S]*?\\n}`, 'g')) ?? []).join('\n');

  it('spins the card over only for visitors who allow motion', () => {
    expect(block('(prefers-reduced-motion: no-preference)')).toMatch(
      /\.lp-how__card\.is-flipped \.lp-how__inner\s*{[^}]*rotateY\(180deg\)/
    );
  });

  it('swaps sides without spinning under reduced motion', () => {
    const reduce = block('(prefers-reduced-motion: reduce)');
    expect(reduce).toMatch(/\.lp-how__card\.is-flipped \.lp-how__back\s*{[^}]*visibility:\s*visible/);
    expect(reduce).not.toMatch(/rotateY/);
  });

  it('tilts and lights up cards only for mouse users who allow motion', () => {
    expect(block('(hover: hover) and (prefers-reduced-motion: no-preference)')).toMatch(
      /\.lp-how__card[^{]*{[^}]*rotateX\(var\(--rx/
    );
  });
});
