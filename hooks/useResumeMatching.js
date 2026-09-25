'use client';

import { useEffect, useMemo, useState } from 'react';

import { rankCandidates } from '@/lib/resume/matching';

export function useDebouncedValue(value, delayMs = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Local, deterministic ranking. Typing is debounced and the ranking is
 * memoized; it re-runs when inputs or candidate profiles change and never
 * touches the network.
 *
 * @returns {{ requirements: object, results: object[] } | null} null until `enabled`
 */
export function useResumeMatching({ enabled, candidates, role, jobDescription, mode, selectedId }) {
  const debouncedRole = useDebouncedValue(role);
  const debouncedDescription = useDebouncedValue(jobDescription);

  return useMemo(
    () => (enabled
      ? rankCandidates(candidates, { role: debouncedRole, jobDescription: debouncedDescription, mode, selectedId })
      : null),
    [enabled, candidates, debouncedRole, debouncedDescription, mode, selectedId]
  );
}
