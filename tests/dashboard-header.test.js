import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import DashboardHeader from '../components/dashboard/DashboardHeader';

describe('dashboard header', () => {
  it('links the HireLabs wordmark and a Home pill to the home page', () => {
    const html = renderToStaticMarkup(createElement(DashboardHeader, { current: 'overview' }));
    expect(html).toMatch(/<a[^>]*class="dashboard-brand"[^>]*href="\/"|<a[^>]*href="\/"[^>]*class="dashboard-brand"/);
    expect(html).toMatch(/href="\/"[^>]*class="dashboard-home"|class="dashboard-home"[^>]*href="\/"/);
    expect(html).toContain('aria-label="HireLabs home page"');
    expect(html).toContain('>Home<');
  });

  it('marks the current page and shows the account only when given', () => {
    const html = renderToStaticMarkup(createElement(DashboardHeader, { current: 'library', email: 'r@example.com', onLogout: () => {} }));
    expect(html).toMatch(/<a[^>]*(href="\/dashboard\/resumes"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/dashboard\/resumes")/);
    expect(html).toContain('r@example.com');
    expect(html).toContain('Log out');
    expect(renderToStaticMarkup(createElement(DashboardHeader, { current: 'results' }))).not.toContain('Log out');
  });
});
