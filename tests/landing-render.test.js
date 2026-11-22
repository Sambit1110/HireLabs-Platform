import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles', 'landing.css'), 'utf8');

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||= 'sb_publishable_test';
});

describe('hero server HTML', () => {
  it('already contains the door, so it never appears after the finished hero', async () => {
    const { ThresholdHero } = await import('../components/landing/ThresholdHero.jsx');
    const html = renderToStaticMarkup(createElement(ThresholdHero, {}));
    expect(html).toContain('class="lp-door"');
  });

  it('marks the headline words for the CSS focus-in, not a post-hydration swap', async () => {
    const { ThresholdHero } = await import('../components/landing/ThresholdHero.jsx');
    const html = renderToStaticMarkup(createElement(ThresholdHero, {}));
    expect(html).toContain('lp-focus__word--intro');
  });

  it('plays the intro only for visitors who allow motion', () => {
    const noPreference = css.match(/@media \(prefers-reduced-motion: no-preference\)\s*{[\s\S]*?\n}/g) ?? [];
    expect(noPreference.join('\n')).toMatch(/\.lp-door\s*{[^}]*animation:/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*{[\s\S]*?\.lp-door\s*{[^}]*display:\s*none/);
  });
});

describe('mobile menu', () => {
  it('keeps the closed menu out of the tab order and the accessibility tree', async () => {
    const { LandingNav } = await import('../components/landing/LandingNav.jsx');
    const html = renderToStaticMarkup(createElement(LandingNav, {}));
    const panel = html.match(/<div[^>]*id="lp-mobile-nav"[^>]*>/)?.[0] ?? '';
    expect(panel).toMatch(/\sinert=""/);
  });
});

describe('landing page canvas and pop-up colours', () => {
  it('paints the page canvas oxblood so overscroll never shows cream', () => {
    expect(css).toMatch(/body:has\(\.lp\)[^{]*{[^}]*background(-color)?:\s*#2A0304/i);
  });

  it('keeps the submit pill light (white or warm cream, never olive) on hover', () => {
    const hover = css.match(/\.lp \.hl-auth-form \.hl-btn-primary:hover:not\(:disabled\)\s*{[^}]*}/)?.[0] ?? '';
    expect(hover).toMatch(/background:\s*var\(--(pill|cream)\)/);
    expect(hover).toMatch(/color:\s*var\(--oxblood-deep\)/);
  });

  it('keeps the close button burgundy on hover and pill-coloured on focus', () => {
    expect(css).toMatch(/\.lp \.hl-modal-close:hover\s*{[^}]*color:\s*var\(--cream\)/);
    expect(css).toMatch(/\.lp \.hl-modal-close:focus-visible[^{]*{[^}]*outline-color:\s*var\(--pill\)/);
  });

  it('never lets the decorative badge take taps meant for the hero buttons', () => {
    expect(css).toMatch(/\.lp-hero__badge\s*{[^}]*pointer-events:\s*none/);
    expect(css).toMatch(/@media \(max-width: 720px\) and \(max-height: 760px\)\s*{\s*\.lp-hero__badge\s*{\s*display:\s*none/);
  });
});

describe('word wheel server HTML', () => {
  const items = [
    { word: 'Skills', caption: 'Tools and abilities, matched by meaning.' },
    { word: 'Evidence', caption: 'Every claim linked to the line that shows it.' },
  ];

  it('reads as a sentence: a visible "We read for" heading names the section', async () => {
    const { WordWheel } = await import('../components/landing/WordWheel.jsx');
    const html = renderToStaticMarkup(createElement(WordWheel, { items }));
    const id = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(html).toMatch(new RegExp(`<h2[^>]*id="${id}"[^>]*>We read for</h2>`));
  });

  it('renders the drum in the server HTML, starting on the first word', async () => {
    const { WordWheel } = await import('../components/landing/WordWheel.jsx');
    const html = renderToStaticMarkup(createElement(WordWheel, { items }));
    expect(html).toContain('class="lp-wheel__drum"');
    expect(html).toContain('01 / 02');
  });

  it('keeps every word and its caption in a list for screen readers and phones', async () => {
    const { WordWheel } = await import('../components/landing/WordWheel.jsx');
    const html = renderToStaticMarkup(createElement(WordWheel, { items }));
    const list = html.match(/<ul class="lp-wheel__list">[\s\S]*?<\/ul>/)?.[0] ?? '';
    for (const { word, caption } of items) {
      expect(list).toContain(word);
      expect(list).toContain(caption);
    }
  });

  it('only makes the section tall and sticky where the drum runs, so the page never jumps after loading', () => {
    expect(css).not.toMatch(/\.lp-wheel\.is-spinning/);
    expect(css).not.toMatch(/rotateZ\(-18deg\)/);
    const drumMedia = css.match(/@media \(min-width: 768px\) and \(prefers-reduced-motion: no-preference\)\s*{[\s\S]*?\n}/)?.[0] ?? '';
    expect(drumMedia).toMatch(/\.lp-wheel\s*{[^}]*height:\s*\d+vh/);
  });
});

