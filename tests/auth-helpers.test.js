import { describe, expect, it } from 'vitest';

import { isProtectedPath, safeRedirectPath } from '../lib/auth/redirect.js';
import {
  RESET_SENT_MESSAGE,
  SIGNUP_CHECK_EMAIL_MESSAGE,
  friendlyAuthError,
} from '../lib/auth/messages.js';
import { validatePassword } from '../lib/auth/password.js';

describe('safeRedirectPath', () => {
  it('keeps same-site paths with query and hash', () => {
    expect(safeRedirectPath('/dashboard/resumes?x=1#top')).toBe('/dashboard/resumes?x=1#top');
    expect(safeRedirectPath('/auth/update-password')).toBe('/auth/update-password');
  });

  it('rejects anything that could leave the site', () => {
    for (const value of [
      'https://evil.com',
      '//evil.com',
      '/\\evil.com',
      '\\\\evil.com',
      'javascript:alert(1)',
      '/dash\nboard',
      'dashboard',
      '',
      null,
      42,
    ]) {
      expect(safeRedirectPath(value)).toBe('/dashboard');
    }
  });

  it('uses the given fallback', () => {
    expect(safeRedirectPath('//evil.com', '/')).toBe('/');
  });
});

describe('isProtectedPath', () => {
  it('protects the dashboard', () => {
    expect(isProtectedPath('/dashboard')).toBe(true);
    expect(isProtectedPath('/dashboard/')).toBe(true);
    expect(isProtectedPath('/dashboard/resumes')).toBe(true);
  });

  it('leaves public pages open', () => {
    expect(isProtectedPath('/')).toBe(false);
    expect(isProtectedPath('/dashboard/results')).toBe(false);
    expect(isProtectedPath('/auth/callback')).toBe(false);
    expect(isProtectedPath('/auth/update-password')).toBe(false);
    expect(isProtectedPath('/dashboardx')).toBe(false);
  });
});

describe('friendlyAuthError', () => {
  it('maps known Supabase codes', () => {
    expect(friendlyAuthError({ code: 'invalid_credentials' }, 'signin')).toMatch(/not correct/);
    expect(friendlyAuthError({ code: 'weak_password' }, 'signup')).toMatch(/too weak/);
  });

  it('never reveals that an account exists', () => {
    expect(friendlyAuthError({ code: 'user_already_exists' }, 'signup')).toBe(
      SIGNUP_CHECK_EMAIL_MESSAGE
    );
    expect(friendlyAuthError({ code: 'user_not_found' }, 'reset')).toBe(RESET_SENT_MESSAGE);
  });

  it('handles rate limits and unknown errors without leaking raw text', () => {
    expect(friendlyAuthError({ status: 429, message: 'raw' }, 'signin')).toMatch(/Too many/);
    expect(friendlyAuthError(new Error('database exploded'), 'update')).toBe(
      'Unable to update your password right now. Please try again.'
    );
  });
});

describe('validatePassword', () => {
  it('accepts a reasonable password', () => {
    expect(validatePassword('blue-river-42', 'sam@example.com')).toBeNull();
  });

  it('rejects weak passwords with a clear reason', () => {
    expect(validatePassword('short1')).toMatch(/at least 8/);
    expect(validatePassword('onlyletters')).toMatch(/letters and numbers/);
    expect(validatePassword('12345678')).toMatch(/letters and numbers/);
    expect(validatePassword(' padded123 ')).toMatch(/spaces/);
    expect(validatePassword('sambiswas99', 'sambiswas@example.com')).toMatch(/email name/);
    expect(validatePassword('a1'.repeat(40))).toMatch(/at most 72/);
  });
});
