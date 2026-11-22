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

  it('keeps the readability shade over the buttons and the description inside the glass', () => {
    expect(css).toMatch(/\.lp-roses__shade\s*{[^}]*ellipse 48% 54% at 24% 60%/);
    expect(css).toMatch(/\.lp-hero__lede\s*{[^}]*max-width:\s*min\(520px, 42vw\)/);
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

  it('lets the bouquet bloom in after the door, only when motion is allowed', () => {
    expect(mediaBlocks('(prefers-reduced-motion: no-preference)')).toMatch(/\.lp-roses\s*{[^}]*animation:\s*lp-roses-in/);
  });

  it('puts the whole phone screen behind glass, with the text on top', () => {
    const phone = mediaBlocks('(max-width: 720px)');
    expect(phone).toMatch(/\.lp-roses__sharp\s*{[^}]*display:\s*none/);
    expect(phone).toMatch(/\.lp-glass\s*{[^}]*width:\s*100%/);
  });
});
