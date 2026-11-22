import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const landingCss = read('styles/landing.css');
const appCss = read('index.css');

/** All declarations for one exact selector list, joined. */
function rulesFor(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...css.matchAll(new RegExp(`(?:^|\\n|})\\s*${escaped}\\s*{([^}]*)}`, 'g'))].map((match) => match[1]).join('\n');
}

describe('landing pill buttons', () => {
  it('are defined once, with no older override layer fighting them', () => {
    expect(landingCss).not.toMatch(/\.lp \.lp-pill\b/);
    expect(landingCss).not.toMatch(/lp-pill--(mint|pill)\b/);
  });

  it('respond to hover, press, keyboard focus and being disabled', () => {
    expect(rulesFor(landingCss, '.lp-pill:hover')).toMatch(/transform:\s*translateY\(-2px\)/);
    expect(rulesFor(landingCss, '.lp-pill:active')).toMatch(/scale\(0\.97\)/);
    expect(rulesFor(landingCss, '.lp-pill:focus-visible')).toMatch(/outline:\s*2px solid/);
    expect(landingCss).toMatch(/\.lp-pill:disabled[^{]*{[^}]*cursor:\s*not-allowed/);
  });

  it('nudge their arrow forward on hover', () => {
    expect(rulesFor(landingCss, '.lp-pill:hover .lp-pill__arrow')).toMatch(/translateX\(4px\)/);
  });

  it('render a decorative arrow when asked, instead of a typed "→"', async () => {
    const { PillButton } = await import('../components/landing/PillButton.jsx');
    const html = renderToStaticMarkup(createElement(PillButton, { arrow: true }, 'Get started'));
    expect(html).toMatch(/class="lp-pill lp-pill--primary"/);
    expect(html).toMatch(/Get started<span class="lp-pill__arrow" aria-hidden="true">→<\/span>/);
    for (const file of ['components/landing/ThresholdHero.jsx', 'components/landing/ClosingCta.jsx']) {
      expect(read(file)).not.toMatch(/<PillButton[^>]*>[^<]*→/);
    }
  });
});

describe('sign-in pop-up buttons', () => {
  it('give the white submit button the same lift, press and halo as the landing pills', () => {
    const hover = rulesFor(landingCss, '.lp .hl-auth-form .hl-btn-primary:hover:not(:disabled)');
    expect(hover).toMatch(/translateY\(-2px\)/);
    expect(rulesFor(landingCss, '.lp .hl-auth-form .hl-btn-primary:active:not(:disabled)')).toMatch(/scale\(0\.97\)/);
  });
});

describe('dashboard buttons', () => {
  const group = '.dashboard-logout,\n.dashboard-secondary,\n.dashboard-danger';

  it('show hover, press and disabled states', () => {
    expect(appCss).toMatch(/\.dashboard-secondary:hover:not\(:disabled\)/);
    expect(appCss).toMatch(/\.dashboard-secondary:active:not\(:disabled\)[^{]*{[^}]*translateY\(1px\)/);
    expect(appCss).toMatch(/\.dashboard-secondary:disabled[^{]*{[^}]*cursor:\s*not-allowed/);
    expect(appCss).toMatch(/\.dashboard-danger:hover:not\(:disabled\)/);
    expect(rulesFor(appCss, group)).toMatch(/min-height:\s*38px/);
  });

  it('dim the upload button while it cannot be used', () => {
    expect(appCss).toMatch(/\.dashboard-shell \.btn-primary:disabled[^{]*{[^}]*cursor:\s*not-allowed/);
  });
});

describe('update password page buttons', () => {
  it('use styled classes instead of bare inline styles', () => {
    const page = read('app/auth/update-password/page.jsx');
    expect(page).toContain('className="auth-submit"');
    expect(page).toContain('className="auth-reveal"');
    expect(appCss).toMatch(/\.auth-submit:hover:not\(:disabled\)/);
    expect(appCss).toMatch(/\.auth-submit:disabled[^{]*{[^}]*cursor:\s*not-allowed/);
    expect(appCss).toMatch(/\.auth-submit:focus-visible/);
  });
});
