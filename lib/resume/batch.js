/**
 * Bounded-concurrency batch runner.
 *
 * Items are pulled from a shared queue by at most `concurrency` workers, so a
 * slow item never blocks the others and the number of in-flight tasks never
 * exceeds the limit. Every item settles independently: a rejection is recorded
 * for that item only and the rest of the batch keeps running.
 *
 * @template T, R
 * @param {T[]} items
 * @param {(item: T, index: number) => Promise<R>} worker
 * @param {{ concurrency?: number, onSettled?: (outcome: PromiseSettledResult<R>, item: T, index: number) => void }} [options]
 * @returns {Promise<PromiseSettledResult<R>[]>} outcomes in input order
 */
export async function runWithConcurrency(items, worker, { concurrency = 3, onSettled } = {}) {
  const list = Array.from(items ?? []);
  const outcomes = new Array(list.length);
  const limit = Math.max(1, Math.min(Math.floor(concurrency) || 1, list.length || 1));
  let next = 0;

  const drain = async () => {
    while (next < list.length) {
      const index = next;
      next += 1;

      let outcome;
      try {
        outcome = { status: 'fulfilled', value: await worker(list[index], index) };
      } catch (reason) {
        outcome = { status: 'rejected', reason };
      }

      outcomes[index] = outcome;
      try {
        onSettled?.(outcome, list[index], index);
      } catch (error) {
        console.error('Batch onSettled callback failed:', error);
      }
    }
  };

  await Promise.allSettled(Array.from({ length: limit }, drain));
  return outcomes;
}

/**
 * Collapses concurrent calls for the same key into one in-flight promise.
 * Used so the same resume is never parsed twice at once from this tab.
 */
export function createSingleFlight() {
  const inFlight = new Map();

  return {
    run(key, task) {
      if (inFlight.has(key)) return inFlight.get(key);
      const promise = Promise.resolve()
        .then(task)
        .finally(() => inFlight.delete(key));
      inFlight.set(key, promise);
      return promise;
    },
    has: (key) => inFlight.has(key),
  };
}
