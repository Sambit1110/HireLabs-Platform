/**
 * Split a headline into words for word-by-word animation.
 * Punctuation stays attached to its word; extra whitespace is ignored.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function splitWords(text) {
  return typeof text === 'string' ? text.split(/\s+/).filter(Boolean) : [];
}
