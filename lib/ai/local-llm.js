import { parseAIJson } from './parse-json';

export const evaluatorModel = process.env.OLLAMA_MODEL || 'hirelabs-evaluator';

export async function evaluateLocally(prompt, schema) {
  const url = new URL('/api/chat', process.env.OLLAMA_URL || 'http://127.0.0.1:11434');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: evaluatorModel,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      format: schema,
      options: { temperature: 0, seed: 42 },
    }),
    signal: AbortSignal.timeout(35_000),
  });
  if (!response.ok) throw new Error('Local evaluator unavailable.');
  return parseAIJson((await response.json()).message.content);
}
