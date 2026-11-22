import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles', 'landing.css'), 'utf8');

async function renderHero() {
  const { ThresholdHero } = await import('../components/landing/ThresholdHero.jsx');
  return renderToStaticMarkup(createElement(ThresholdHero, {}));
}

const mediaBlocks = (query) =>
  (css.match(new RegExp(`@media ${query.replace(/[()]/g, '\\$&')}\\s*{[\\s\\S]*?\\n}`, 'g')) ?? []).join('\n');

describe('paper rose hero', () => {
  it('shows the paper bouquet sharp on the right and bent through glass on the left', async () => {
    const html = await renderHero();
    expect(html).toMatch(/<img[^>]*class="lp-roses__sharp"[^>]*src="\/landing\/paper-bouquet\.svg"[^>]*alt=""/);
    expect(html).toMatch(/<img[^>]*class="lp-roses__glass"[^>]*src="\/landing\/paper-bouquet\.svg"[^>]*alt=""/);
    expect(html).toContain('id="lp-glassy"');
  });

  it('lays a wall of 20 glass bricks behind the text, hidden from screen readers', async () => {
    const html = await renderHero();
    expect(html.match(/class="lp-glass__brick"/g)).toHaveLength(20);
    expect(html).toMatch(/<div class="lp-roses" aria-hidden="true">/);
  });

  it('leaves the bouquet uncluttered: no spinning badge on top of it', async () => {
    const html = await renderHero();
    expect(html).not.toContain('lp-badge');
  });

  it('keeps the readability shade over the buttons', () => {
    expect(css).toMatch(/\.lp-roses__shade\s*{[^}]*ellipse 48% 54% at 24% 60%/);
  });

  it('measures the room left on the glass from the hero\'s own width', () => {
    expect(css).toMatch(/\.lp-hero\s*{[^}]*container-type:\s*inline-size/);
    expect(css).toMatch(/--lp-glass-room:\s*calc\(52cqw - var\(--lp-text-left\) - 32px\)/);
  });

  it('sizes the headline so its longest line ("people behind", 6.17em) fits inside the glass', () => {
    expect(css).toMatch(
      /\.lp \.lp-hero \.lp-hero__title\s*{[^}]*font-size:\s*min\(clamp\(46px, 7\.2vw, 104px\), calc\(var\(--lp-glass-room\) \/ 6\.5\)\)/
    );
  });

  it('keeps the label and description inside the glass too', () => {
    expect(css).toMatch(/\.lp-hero__lede\s*{[^}]*max-width:\s*min\(520px, var\(--lp-glass-room\)\)/);
    expect(css).toMatch(/\.lp-hero__eyebrow\s*{[^}]*max-width:\s*var\(--lp-glass-room\)/);
  });

  it('keeps the headline and drops the old ribbed texture and glow', async () => {
    const html = await renderHero();
    expect(html).toContain('aria-label="Find the people behind the resume."');
    expect(html).not.toContain('lp-hero__ribs');
    expect(html).not.toContain('lp-hero__glow');
  });
});

describe('paper rose hero styles', () => {
  it('bends the roses behind the glass with the refraction filter', () => {
    expect(css).toMatch(/\.lp-roses__glass\s*{[^}]*filter:\s*url\(#lp-glassy\)/);
  });

  it('blooms only the roses in, keeping the glass wall solid from the first frame', () => {
    const motion = mediaBlocks('(prefers-reduced-motion: no-preference)');
    expect(motion).toMatch(/\.lp-roses__sharp,\s*\.lp-roses__glass\s*{[^}]*animation:\s*lp-roses-in/);
    expect(motion).not.toMatch(/\.lp-roses\s*{[^}]*animation/);
  });

  it('puts the whole phone screen behind glass, with the text on top', () => {
    const phone = mediaBlocks('(max-width: 720px)');
    expect(phone).toMatch(/\.lp-roses__sharp\s*{[^}]*display:\s*none/);
    expect(phone).toMatch(/\.lp-glass\s*{[^}]*width:\s*100%/);
  });

  it('lets the label, description and buttons rise in after the glass opens', () => {
    const motion = mediaBlocks('(prefers-reduced-motion: no-preference)');
    for (const part of ['eyebrow', 'lede', 'actions']) {
      expect(motion).toMatch(new RegExp(`\\.lp-hero__${part}\\s*{[^}]*animation:\\s*lp-rise`));
    }
    expect(motion).toMatch(/\.lp-hero--no-intro \.lp-hero__eyebrow,[\s\S]*?animation:\s*none/);
  });

  it('skips the brick curtain on phones, where the whole hero is already glass', () => {
    expect(mediaBlocks('(max-width: 720px)')).toMatch(/\.lp-curtain__bricks\s*{[^}]*display:\s*none/);
  });

  it('drops a flurry of resume pages through the intro', async () => {
    const html = await renderHero();
    const pages = html.match(/<span class="lp-page" style="[^"]*"/g) ?? [];
    expect(pages).toHaveLength(12);
    for (const page of pages) expect(page).toMatch(/--x:\d+;--d:[\d.]+;--dur:[\d.]+;--r:-?\d+deg;--s:[\d.]+;--sway:-?\d+px/);
    expect(mediaBlocks('(prefers-reduced-motion: no-preference)')).toMatch(/\.lp-page\s*{[^}]*animation:\s*lp-page-fall/);
  });

  it('keeps the page flurry light on phones', () => {
    expect(mediaBlocks('(max-width: 720px)')).toMatch(/\.lp-page:nth-child\(n \+ 8\)\s*{[^}]*display:\s*none/);
  });

  it('picks one resume out of the falling pile and marks it the best match, with no hand', async () => {
    const html = await renderHero();
    expect(html).toMatch(
      /<div class="lp-pick"><div class="lp-pick__lift"><div class="lp-pick__page"><span class="lp-pick__badge">✓ Best match<\/span><\/div><\/div><\/div>/
    );
    expect(html).not.toContain('lp-catch');
    expect(html).not.toMatch(/fingers|thumb/);
  });

  it('times the pick, then opens the glass and brings in the text', () => {
    const motion = mediaBlocks('(prefers-reduced-motion: no-preference)');
    expect(motion).toMatch(/\.lp-pick__page\s*{[^}]*animation:\s*lp-pick-fall/);
    expect(motion).toMatch(/\.lp-pick__lift\s*{[^}]*animation:\s*lp-pick-lift/);
    expect(motion).toMatch(/\.lp-pick__page::after\s*{[^}]*animation:\s*lp-pick-glow/);
    expect(motion).toMatch(/\.lp-pick__badge\s*{[^}]*animation:\s*lp-badge-pop/);
    expect(motion).toMatch(/\.lp-pick\s*{[^}]*animation:\s*lp-pick-out/);
    expect(motion).toMatch(/\.lp-curtain__brick\s*{[^}]*calc\(2\.1s \+ var\(--d, 0\) \* 0\.07s\)/);
    expect(motion).toMatch(/\.lp-focus__word--intro\s*{[^}]*calc\(2\.4s \+ var\(--i, 0\) \* 0\.06s\)/);
  });

  it('sends a ring of light out from the picked resume', () => {
    expect(mediaBlocks('(prefers-reduced-motion: no-preference)')).toMatch(/\.lp-pick__lift::before\s*{[^}]*animation:\s*lp-pick-ripple/);
  });

  it('dims the rest of the pile once one resume is picked', () => {
    expect(mediaBlocks('(prefers-reduced-motion: no-preference)')).toMatch(/\.lp-curtain__pages\s*{[^}]*animation:\s*lp-pile-dim/);
  });

  it('scales the picked resume down on phones', () => {
    expect(mediaBlocks('(max-width: 720px)')).toMatch(/\.lp-pick\s*{[^}]*scale:\s*0\.8/);
  });
});

