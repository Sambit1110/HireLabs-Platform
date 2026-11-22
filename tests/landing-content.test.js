import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const landingDir = path.join(root, 'components', 'landing');
const pagePath = path.join(root, 'app', 'page.jsx');

function landingSources() {
  const files = fs
    .readdirSync(landingDir)
    .filter((name) => /\.(jsx?|tsx?)$/.test(name))
    .map((name) => path.join(landingDir, name));
  return [...files, pagePath].map((file) => ({ file, text: fs.readFileSync(file, 'utf8') }));
}

describe('landing page content guard', () => {
  it('never mentions the reference sites, testimonials, pricing or prices', () => {
    const banned = /jamie|windell|liminal|testimonial|pricing|\$\d/i;
    const offenders = landingSources()
      .filter(({ text }) => banned.test(text))
      .map(({ file, text }) => `${path.relative(root, file)}: "${text.match(banned)[0]}"`);
    expect(offenders).toEqual([]);
  });

  it('keeps the sign-in protections in the landing page', () => {
    const page = fs.readFileSync(pagePath, 'utf8');
    expect(page).toContain("params.get('auth') !== 'signin'");
    expect(page).toContain('safeRedirectPath(');
    expect(page).toContain('friendlyAuthError(');
  });

  it('only uses section themes that have colours', async () => {
    const { THEMES } = await import('../lib/landing/theme.js');
    const used = new Set();
    for (const { text } of landingSources()) {
      for (const match of text.matchAll(/data-lp-theme="([^"]+)"/g)) used.add(match[1]);
      for (const match of text.matchAll(/theme = '([^']+)'/g)) used.add(match[1]);
    }
    expect(used.size).toBeGreaterThan(0);
    expect([...used].filter((name) => !(name in THEMES))).toEqual([]);
  });
});
