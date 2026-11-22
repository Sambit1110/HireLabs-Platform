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

  it('keeps the white submit pill white on hover', () => {
    const hover = css.match(/\.lp \.hl-auth-form \.hl-btn-primary:hover:not\(:disabled\)\s*{[^}]*}/)?.[0] ?? '';
    expect(hover).toMatch(/background:\s*var\(--pill\)/);
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
