/**
 * Where users may be sent after signing in, and which pages need a session.
 */

export const DEFAULT_AFTER_LOGIN = '/dashboard';

// Dashboard pages that require a signed-in user. /dashboard/results is
// intentionally public so evaluation results can be shown without an account.
const PUBLIC_DASHBOARD_PATHS = new Set(['/dashboard/results']);

/**
 * Return a same-site path that is safe to redirect to, or the fallback.
 *
 * Rejects absolute URLs, protocol-relative URLs (`//evil.com`), backslash
 * tricks (`/\evil.com`, which browsers treat as `//evil.com`), and control
 * characters.
 *
 * @param {unknown} value
 * @param {string} [fallback]
 * @returns {string}
 */
export function safeRedirectPath(value, fallback = DEFAULT_AFTER_LOGIN) {
  if (typeof value !== 'string') return fallback;

  const candidate = value.trim();

  if (
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('\\') ||
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u001F\u007F]/.test(candidate) ||
    candidate.length > 2048
  ) {
    return fallback;
  }

  try {
    const base = 'https://hirelabs.invalid';
    const url = new URL(candidate, base);

    if (url.origin !== base) return fallback;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Whether a path needs a signed-in user.
 *
 * /auth/update-password is not listed: it checks for the recovery session
 * itself, and guarding it here could bounce users mid-reset.
 *
 * @param {string} pathname
 * @returns {boolean}
 */
export function isProtectedPath(pathname) {
  if (typeof pathname !== 'string') return false;

  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  if (PUBLIC_DASHBOARD_PATHS.has(path)) return false;

  return path === '/dashboard' || path.startsWith('/dashboard/');
}
