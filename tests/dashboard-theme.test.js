import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const dashboardCss = () => read('styles/dashboard.css');

function luminance(hex) {
  const [r, g, b] = hex
    .replace('#', '')
    .match(/.{2}/g)
    .map((pair) => parseInt(pair, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('dashboard theme', () => {
  it('loads its own stylesheet for every dashboard page', () => {
    expect(read('app/dashboard/layout.tsx')).toContain("import '@/styles/dashboard.css'");
  });

  it('uses the landing palette and fonts: oxblood, cream text, serif headings', () => {
    const css = dashboardCss();
    expect(css).toMatch(/--d-bg:\s*#2A0304/);
    expect(css).toMatch(/--d-text:\s*#F3E9DF/);
    expect(css).toMatch(/\.dashboard-shell\s*{[^}]*font-family:\s*var\(--lp-font-body\)/);
    expect(css).toMatch(/\.dashboard-heading h1[^{]*{[^}]*font-family:\s*var\(--lp-font-display\)/);
  });

  it('keeps text readable on the dark panels', () => {
    expect(contrast('#F3E9DF', '#2A0304')).toBeGreaterThanOrEqual(7);
    expect(contrast('#F3E9DF', '#3A0507')).toBeGreaterThanOrEqual(7);
    // Muted text is cream at 68% over a card: about #B8A09A on #3A0507.
    expect(contrast('#B8A09A', '#3A0507')).toBeGreaterThanOrEqual(4.5);
  });

  it('removes the old light-grey dashboard rules from the global stylesheet', () => {
    const globalCss = read('index.css');
    expect(globalCss).not.toMatch(/\.dashboard-shell\s*{\s*min-height:\s*100vh;\s*background:\s*#f7f6f3/);
    expect(globalCss).not.toMatch(/\.eval-panel\s*{/);
    expect(globalCss).not.toMatch(/\.ranking__item\s*{/);
  });

  it('themes the controls the browser would otherwise draw in grey and white', () => {
    const css = dashboardCss();
    expect(css).toMatch(/::file-selector-button/);
    expect(css).toMatch(/\.dashboard-search\s*{/);
    expect(css).toMatch(/\.dashboard-select\s*{/);
    expect(css).toMatch(/\.dashboard-select option[^{]*{/);
    expect(css).toMatch(/--border:\s*rgba\(243, 233, 223/);
  });

  it('moves the hard-coded grey borders out of the components', () => {
    const app = read('components/dashboard/DashboardApp.tsx');
    expect(app).not.toContain('#888');
    expect(app).toContain('className="dashboard-search"');
    expect(app).toContain('className="dashboard-select"');
    expect(app).toContain('className="compare-table"');
  });
});
