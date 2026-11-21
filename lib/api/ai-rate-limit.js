import { apiError } from './response';

const windowMs = 60_000;
const limit = 20;
const requests = new Map();
let sweepAt = 0;

export function checkAIRateLimit(userId) {
  const now = Date.now();
  if (now >= sweepAt) {
    for (const [id, entry] of requests) {
      if (entry.until <= now) requests.delete(id);
    }
    sweepAt = now + windowMs;
  }

  let entry = requests.get(userId);
  if (!entry || entry.until <= now) {
    entry = { count: 0, until: now + windowMs };
    requests.set(userId, entry);
  }
  if (entry.count >= limit) {
    const response = apiError('RATE_LIMITED', 'Try again shortly.', 429);
    response.headers.set('Retry-After', String(Math.ceil((entry.until - now) / 1000)));
    return response;
  }
  entry.count += 1;
  return null;
}
