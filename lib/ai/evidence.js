// The evaluator is asked to cite resume evidence. A model can still invent a
// quote, so every quoted passage is checked against the resume text before it
// reaches the dashboard. Items without quotation marks are summaries, not
// citations, and pass through unchanged.

const QUOTE = /["“”]([^"“”]+)["“”]/g;
const ELLIPSIS = /…|\.{3}/;
const EDGE_PUNCTUATION = /^[\s.,;:!?'"-]+|[\s.,;:!?'"-]+$/g;

/** Lower-cases and evens out quotes, dashes and whitespace so line breaks and typography never decide a match. */
export function normalizeForMatch(text) {
  return String(text)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[‐‑‒–—―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function quoteFound(quote, resume) {
  const parts = quote
    .split(ELLIPSIS)
    .map((part) => normalizeForMatch(part).replace(EDGE_PUNCTUATION, ''))
    .filter((part) => part.length >= 3);
  let from = 0;
  for (const part of parts) {
    const at = resume.indexOf(part, from);
    if (at === -1) return false;
    from = at + part.length;
  }
  return true;
}

/**
 * Splits evidence items into those whose every quoted passage appears in the
 * resume (in order, when shortened with an ellipsis) and those that do not.
 * @param {unknown} items
 * @param {string} resumeText
 * @returns {{ kept: string[], removed: string[] }}
 */
export function checkEvidence(items, resumeText) {
  const resume = normalizeForMatch(resumeText || '');
  const kept = [];
  const removed = [];
  for (const item of Array.isArray(items) ? items : []) {
    if (typeof item !== 'string') continue;
    const quotes = [...item.matchAll(QUOTE)].map((match) => match[1]);
    (quotes.every((quote) => quoteFound(quote, resume)) ? kept : removed).push(item);
  }
  return { kept, removed };
}
