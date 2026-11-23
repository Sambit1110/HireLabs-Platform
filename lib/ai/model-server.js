export const useLocalModels = () => process.env.USE_LOCAL_MODELS === 'true';

/**
 * The shared secret the model server checks when it is reachable from outside
 * (see docs/hosting-models.md). Server-only: never give it a NEXT_PUBLIC_ name.
 */
export function modelAuthHeaders() {
  const token = process.env.MODEL_API_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function callModelServer(endpoint, payload) {
  const base = process.env.MODEL_SERVER_URL || 'http://127.0.0.1:8000';
  const response = await fetch(new URL(endpoint, base), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...modelAuthHeaders() },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error('Model service unavailable.');
  return {
    value: await response.json(),
    placeholder: response.headers.get('x-hirelabs-placeholder') === 'true',
  };
}

export async function callModelServerFile(endpoint, bytes, contentType) {
  const base = process.env.MODEL_SERVER_URL || 'http://127.0.0.1:8000';
  const response = await fetch(new URL(endpoint, base), {
    method: 'POST',
    headers: { 'Content-Type': contentType, ...modelAuthHeaders() },
    body: bytes,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error('Model service unavailable.');
  return response.json();
}

