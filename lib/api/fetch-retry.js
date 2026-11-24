export const NETWORK_ERROR_MESSAGE =
  "Couldn't reach HireLabs. Check your internet connection, or pause any ad or privacy blocker for this site, then try again.";

function isAbort(error, signal) {
  return signal?.aborted || (error && typeof error === 'object' && error.name === 'AbortError');
}

/**
 * fetch() that retries once when the browser could not reach the server at all (fetch
 * rejects with a TypeError such as "Failed to fetch": a dropped connection, a network
 * switch, a blocking extension). HTTP error responses are returned as usual, and a
 * cancelled request is never retried. Use only for requests that are safe to send twice.
 */
export async function fetchWithNetworkRetry(url, init = {}, { fetchImpl = globalThis.fetch, delayMs = 800 } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fetchImpl(url, init);
    } catch (error) {
      if (isAbort(error, init.signal) || !(error instanceof TypeError)) throw error;
      if (attempt >= 1) throw new Error(NETWORK_ERROR_MESSAGE, { cause: error });
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (init.signal?.aborted) throw error;
    }
  }
}
