export const useLocalModels = () => process.env.USE_LOCAL_MODELS === 'true';

export async function callModelServer(endpoint, payload) {
  const base = process.env.MODEL_SERVER_URL || 'http://127.0.0.1:8000';
  const response = await fetch(new URL(endpoint, base), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error('Model service unavailable.');
  return {
    value: await response.json(),
    placeholder: response.headers.get('x-hirelabs-placeholder') === 'true',
  };
}

/**
 * Gemini may stand in for the team's models only when a key is set and
 * DISABLE_GEMINI_FALLBACK is not 'true'. With the switch on, resume data never
 * leaves the team's own services.
 */
export const geminiFallbackAllowed = () =>
  Boolean(process.env.GEMINI_API_KEY) && process.env.DISABLE_GEMINI_FALLBACK !== 'true';
