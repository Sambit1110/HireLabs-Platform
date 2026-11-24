import { describe, expect, it, vi } from 'vitest';
import { fetchWithNetworkRetry, NETWORK_ERROR_MESSAGE } from '../lib/api/fetch-retry.js';

const ok = { ok: true, status: 200 };
const noWait = { delayMs: 0 };

describe('fetchWithNetworkRetry', () => {
  it('retries once when the browser could not reach the server', async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(ok);
    await expect(fetchWithNetworkRetry('/api/x', {}, { fetchImpl, ...noWait })).resolves.toBe(ok);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('replaces "Failed to fetch" with an explanation when the retry fails too', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchWithNetworkRetry('/api/x', {}, { fetchImpl, ...noWait })).rejects.toThrow(NETWORK_ERROR_MESSAGE);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry HTTP error responses: the server answered', async () => {
    const failed = { ok: false, status: 500 };
    const fetchImpl = vi.fn().mockResolvedValue(failed);
    await expect(fetchWithNetworkRetry('/api/x', {}, { fetchImpl, ...noWait })).resolves.toBe(failed);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not retry a cancelled request', async () => {
    const controller = new AbortController();
    controller.abort();
    const abort = Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });
    const fetchImpl = vi.fn().mockRejectedValue(abort);
    await expect(fetchWithNetworkRetry('/api/x', { signal: controller.signal }, { fetchImpl, ...noWait })).rejects.toBe(abort);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
