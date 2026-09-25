/**
 * Fixed-window rate limiting.
 *
 * The default MemoryRateLimitStore keeps counters in the memory of one server
 * instance. On Vercel each warm function instance has its own memory, so the
 * effective limit is per instance and resets on cold start: good enough to
 * stop runaway loops and casual abuse, not a hard global quota.
 *
 * For a global limit, implement the same `increment(key, windowMs, now)`
 * contract on a shared store (e.g. Redis INCR + PEXPIRE, or a Postgres
 * table) and pass it as `store`.
 */

export class MemoryRateLimitStore {
  constructor({ maxKeys = 10000 } = {}) {
    this.maxKeys = maxKeys;
    this.windows = new Map();
  }

  /** @returns {Promise<{ count: number, resetAt: number }>} */
  async increment(key, windowMs, now = Date.now()) {
    let entry = this.windows.get(key);

    if (!entry || entry.resetAt <= now) {
      if (!entry && this.windows.size >= this.maxKeys) this.prune(now);
      entry = { count: 0, resetAt: now + windowMs };
      this.windows.set(key, entry);
    }

    entry.count += 1;
    return { count: entry.count, resetAt: entry.resetAt };
  }

  prune(now) {
    for (const [key, entry] of this.windows) {
      if (entry.resetAt <= now) this.windows.delete(key);
    }
    // Still full of live windows: drop the oldest insertions.
    while (this.windows.size >= this.maxKeys) {
      this.windows.delete(this.windows.keys().next().value);
    }
  }
}

/**
 * @param {{ name: string, limit: number, windowMs: number, store?: { increment: Function } }} options
 */
export function createRateLimiter({ name, limit, windowMs, store = new MemoryRateLimitStore() }) {
  return {
    name,
    limit,
    windowMs,
    /** @returns {Promise<{ allowed: boolean, remaining: number, retryAfterSeconds: number }>} */
    async check(identifier, now = Date.now()) {
      const { count, resetAt } = await store.increment(`${name}:${identifier}`, windowMs, now);
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      };
    },
  };
}

/** Checks limiters in order; returns the first rejection, or null when all allow the request. */
export async function checkRateLimits(limiters, identifier, now = Date.now()) {
  for (const limiter of limiters) {
    const result = await limiter.check(identifier, now);
    if (!result.allowed) return { ...result, limiter: limiter.name };
  }
  return null;
}
