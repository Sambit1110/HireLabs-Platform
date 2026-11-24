/**
 * HireLabs Embedding Client
 *
 * Connects to the hirelabs-matcher model service (Arpan's service) at
 * POST http://localhost:8000/embed to generate 384-dimensional dense vectors
 * for resume texts and job descriptions.
 */

import { modelAuthHeaders } from '../ai/model-server';

const DEFAULT_EMBED_SERVICE_URL = 'http://localhost:8000/embed';
const EXPECTED_DIMENSION = 384;

/**
 * Generate a deterministic pseudo-embedding for testing or offline development
 * when the Python model service is not running.
 *
 * @param {string} text
 * @param {number} dim
 * @returns {number[]}
 */
export function createDeterministicEmbedding(text, dim = EXPECTED_DIMENSION) {
  const normalized = String(text || '').toLowerCase();
  const vector = new Array(dim).fill(0);

  if (!normalized) {
    return vector;
  }

  // Simple hashing across dimensions
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    const idx = (code * 31 + i * 17) % dim;
    vector[idx] += 1.0 / (1.0 + (i % 10));
  }

  // L2 normalize
  let sumSq = 0;
  for (let i = 0; i < dim; i++) {
    sumSq += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSq) || 1.0;
  for (let i = 0; i < dim; i++) {
    vector[i] = Number((vector[i] / norm).toFixed(6));
  }

  return vector;
}

/**
 * Embed an array of texts using the hirelabs-matcher model service.
 *
 * @param {string[]} texts
 * @param {object} [options]
 * @param {string} [options.serviceUrl]
 * @param {number} [options.timeoutMs]
 * @returns {Promise<{ vectors: number[][], dim: number, model_used: string }>}
 */
export async function embedTexts(texts, { serviceUrl, timeoutMs = 15000 } = {}) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return { vectors: [], dim: EXPECTED_DIMENSION, model_used: 'hirelabs-matcher' };
  }

  const modelServer = process.env.MODEL_SERVER_URL?.replace(/\/$/, '');
  const endpoint = serviceUrl || process.env.EMBED_SERVICE_URL
    || (modelServer ? `${modelServer}/embed` : DEFAULT_EMBED_SERVICE_URL);

  // If mock mode is explicitly forced (useful in unit test fixtures)
  if (process.env.EMBED_MOCK === 'true') {
    return {
      vectors: texts.map((t) => createDeterministicEmbedding(t, EXPECTED_DIMENSION)),
      dim: EXPECTED_DIMENSION,
      model_used: 'hirelabs-matcher-fixture',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...modelAuthHeaders() },
      body: JSON.stringify({ texts }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Embedding service returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.vectors)) {
      throw new Error('Invalid embedding response: missing vectors array');
    }

    const dim = data.dim ?? data.vectors[0]?.length;
    if (dim !== EXPECTED_DIMENSION || data.vectors.length !== texts.length ||
        data.vectors.some((v) => !Array.isArray(v) || v.length !== dim || !v.every(Number.isFinite))) {
      throw new Error('Invalid embedding response: expected one finite 384-dimensional vector per text.');
    }

    return {
      vectors: data.vectors,
      dim,
      model_used: data.model_used || 'hirelabs-matcher',
      // When the server's matcher went live (v2 and later): older stored vectors need re-embedding.
      released_at: typeof data.released_at === 'string' ? data.released_at : null,
    };
  } catch (err) {
    // If the local Python service is unreachable and we are in development/test,
    // gracefully fall back to deterministic embedding so the ATS workflow remains testable.
    if (
      process.env.NODE_ENV !== 'production' &&
      (err.name === 'AbortError' || err.code === 'ECONNREFUSED' || err.message?.includes('fetch failed'))
    ) {
      console.warn(
        `[hirelabs-matcher] Embed service at ${endpoint} unreachable (${err.message}). Using local deterministic embedding fallback.`
      );
      return {
        vectors: texts.map((t) => createDeterministicEmbedding(t, EXPECTED_DIMENSION)),
        dim: EXPECTED_DIMENSION,
        model_used: 'hirelabs-matcher-fallback',
      };
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Embed a single text string.
 *
 * @param {string} text
 * @param {object} [options]
 * @returns {Promise<{ vector: number[], dim: number, model_used: string }>}
 */
export async function embedText(text, options = {}) {
  const { vectors, dim, model_used, released_at = null } = await embedTexts([text], options);
  return {
    vector: vectors[0] || createDeterministicEmbedding(text, EXPECTED_DIMENSION),
    dim,
    model_used,
    released_at,
  };
}

/**
 * A 384-d vector in pgvector's text format ("[0.1,0.2,...]"), the form a vector column
 * always accepts through Supabase/PostgREST. Returns null for anything else.
 */
export function toPgVector(vector) {
  if (!Array.isArray(vector) || vector.length !== EXPECTED_DIMENSION || !vector.every(Number.isFinite)) {
    return null;
  }
  return `[${vector.join(',')}]`;
}
