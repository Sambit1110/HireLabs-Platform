import { parseAIJson } from './parse-json';

export const evaluatorModel = process.env.OLLAMA_MODEL || 'hirelabs-evaluator';

const DEFAULT_CONTEXT = 16_384;
// Room kept for the JSON answer, which the prompt shares the context with.
const OUTPUT_RESERVE = 2_048;
// Conservative: English averages about 4 characters per token, and skill lists,
// numbers and punctuation run denser, so this overestimates rather than under.
const CHARS_PER_TOKEN = 3.5;

/** The context window requested from Ollama; OLLAMA_NUM_CTX overrides it to match the Modelfile. */
export function evaluatorContextSize() {
  const value = Number.parseInt(process.env.OLLAMA_NUM_CTX ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_CONTEXT;
}

/** A rough token count for the messages, without needing the model's tokenizer. */
export function estimateTokens(messages) {
  const chars = messages.reduce((total, message) => total + String(message.content ?? '').length, 0);
  return Math.ceil(chars / CHARS_PER_TOKEN);
}

/** `input` is the chat messages (system + user) or, for older callers, one prompt string. */
export async function evaluateLocally(input, schema) {
  const messages = Array.isArray(input) ? input : [{ role: 'user', content: input }];
  const numCtx = evaluatorContextSize();
  // Ollama silently cuts a prompt that does not fit, which can drop the rules or
  // part of the resume while still returning a confident score. Refuse instead.
  if (estimateTokens(messages) > numCtx - OUTPUT_RESERVE) {
    throw new Error('Prompt does not fit the local evaluator context.');
  }
  const url = new URL('/api/chat', process.env.OLLAMA_URL || 'http://127.0.0.1:11434');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: evaluatorModel,
      messages,
      stream: false,
      format: schema,
      options: { temperature: 0, seed: 42, num_ctx: numCtx },
    }),
    signal: AbortSignal.timeout(35_000),
  });
  if (!response.ok) throw new Error('Local evaluator unavailable.');
  return parseAIJson((await response.json()).message.content);
}
