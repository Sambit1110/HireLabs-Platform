import { AuthUnavailableError, ConfigurationError, authenticateRequest } from './auth.js';
import { checkRateLimits } from './rateLimit.js';

export function jsonError(status, error, headers) {
  return Response.json({ error }, { status, headers });
}

/**
 * Reads a JSON body without buffering more than `maxBytes`.
 * Rejects early on Content-Length and again while streaming (chunked bodies).
 * @returns {Promise<{ data: any } | { response: Response }>}
 */
export async function readJsonBody(request, maxBytes) {
  const tooLarge = () => ({ response: jsonError(413, 'Request body is too large.') });

  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) return tooLarge();
  if (!request.body) return { data: null };

  const reader = request.body.getReader();
  const chunks = [];
  let received = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel().catch(() => {});
      return tooLarge();
    }
    chunks.push(value);
  }

  try {
    return { data: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
  } catch {
    return { data: null };
  }
}

function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

function tooManyRequests(rejection) {
  return jsonError(429, 'Too many requests. Please wait a moment and try again.', {
    'Retry-After': String(rejection.retryAfterSeconds),
  });
}

/**
 * Shared entry check for protected API routes:
 *   1. per-IP limit (cheap, runs before any auth call, also throttles bad tokens)
 *   2. Supabase token verification -> 401
 *   3. per-user limits -> 429
 *
 * @returns {Promise<{ response: Response } | { user: object, supabase: object }>}
 */
export async function guardRequest(request, { ipLimiters = [], userLimiters = [] }) {
  const ipRejection = await checkRateLimits(ipLimiters, clientIp(request));
  if (ipRejection) return { response: tooManyRequests(ipRejection) };

  let auth;
  try {
    auth = await authenticateRequest(request);
  } catch (error) {
    console.error('Authentication check failed:', error?.message);
    if (error instanceof ConfigurationError) {
      return { response: jsonError(503, 'Sign-in is not configured on this deployment.') };
    }
    if (error instanceof AuthUnavailableError) {
      return { response: jsonError(503, 'The authentication service is temporarily unavailable. Please try again.') };
    }
    return { response: jsonError(500, 'Unable to verify your session.') };
  }
  if (!auth) return { response: jsonError(401, 'Unauthorized') };

  const userRejection = await checkRateLimits(userLimiters, auth.user.id);
  if (userRejection) return { response: tooManyRequests(userRejection) };

  return auth;
}
