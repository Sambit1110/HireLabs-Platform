import { apiError, apiSuccess } from '@/lib/api/response';
import { authenticateRequest } from '@/lib/supabase/server-auth';
import { checkAIRateLimit } from '@/lib/api/ai-rate-limit';
import { callModelServer, useLocalModels } from '@/lib/ai/model-server';

export async function POST(request) {
  const auth = await authenticateRequest(request);
  if (auth.response) return auth.response;
  const limited = checkAIRateLimit(auth.user.id);
  if (limited) return limited;

  let texts;
  try {
    const raw = await request.text();
    if (raw.length > 400000) return apiError('REQUEST_TOO_LARGE', 'Embedding request too large.', 413);
    texts = JSON.parse(raw)?.texts;
  } catch {
    return apiError('INVALID_JSON', 'Invalid JSON request body.', 400);
  }
  if (!Array.isArray(texts) || texts.length < 1 || texts.length > 16 ||
      texts.some((item) => typeof item !== 'string' || !item.trim() || item.length > 50000)) {
    return apiError('INVALID_INPUT', 'Provide 1 to 16 nonempty texts of up to 50000 characters.', 400);
  }
  if (!useLocalModels()) return apiError('MATCHER_UNAVAILABLE', 'Local matcher is disabled.', 503);
  try {
    const { value, placeholder } = await callModelServer('/embed', { texts });
    if (value.dim !== 384 || !Array.isArray(value.vectors) || value.vectors.length !== texts.length ||
        value.vectors.some((vector) => !Array.isArray(vector) || vector.length !== 384 ||
          vector.some((number) => !Number.isFinite(number)))) {
      return apiError('INVALID_MODEL_RESPONSE', 'Invalid matcher output.', 502);
    }
    return apiSuccess({ ...value, model_used: placeholder ? 'matcher-placeholder' : (value.model_used || 'hirelabs-matcher') });
  } catch {
    return apiError('MATCHER_UNAVAILABLE', 'Local matcher is unavailable.', 503);
  }
}
