/**
 * Describe which model produced an AI result, for the dashboard badge.
 *
 * API routes report the model as `model_used` (preferred, e.g.
 * "hirelabs-evaluator" or "gemini-fallback") or, for older responses,
 * `model` (e.g. "gemini-3.5-flash").
 *
 * @typedef {'ours' | 'fallback' | 'unknown'} ModelKind
 * @typedef {{ id: string | null, kind: ModelKind, label: string }} ModelInfo
 */

const OUR_MODEL_PREFIX = 'hirelabs-';

function cleanString(value) {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, 100)
    : null;
}

/**
 * @param {unknown} data The `data` object of an API success response.
 * @returns {ModelInfo}
 */
export function describeModel(data) {
  const record =
    data && typeof data === 'object' && !Array.isArray(data)
      ? /** @type {Record<string, unknown>} */ (data)
      : {};

  const id = cleanString(record.model_used) || cleanString(record.model);

  if (!id) {
    return { id: null, kind: 'unknown', label: 'Model not reported' };
  }

  const lower = id.toLowerCase();

  if (lower.startsWith(OUR_MODEL_PREFIX)) {
    return { id, kind: 'ours', label: 'Our model' };
  }

  if (lower.startsWith('gemini')) {
    return { id, kind: 'fallback', label: 'Gemini fallback' };
  }

  return { id, kind: 'unknown', label: id };
}
