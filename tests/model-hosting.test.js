import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { callModelServer, modelAuthHeaders } from '../lib/ai/model-server.js';
import { evaluateLocally, evaluatorTimeoutMs } from '../lib/ai/local-llm.js';
import { embedTexts } from '../lib/resume/embedding.js';

const KEYS = ['MODEL_API_TOKEN', 'MODEL_SERVER_URL', 'OLLAMA_URL', 'EMBED_SERVICE_URL', 'EMBED_MOCK', 'OLLAMA_TIMEOUT_MS'];
const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
const realFetch = globalThis.fetch;
const TOKEN = 't'.repeat(40);

const reply = (body) => vi.fn(async () => new Response(JSON.stringify(body), {
  status: 200, headers: { 'content-type': 'application/json' },
}));
const vector = () => Array.from({ length: 384 }, () => 0.01);
const sentAuth = (call) => new globalThis.Headers(call[1].headers).get('authorization');

beforeEach(() => {
  for (const key of KEYS) delete process.env[key];
});
afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  globalThis.fetch = realFetch;
});

describe('model hosting token', () => {
  it('adds no header without a token and a bearer header with one', () => {
    expect(modelAuthHeaders()).toEqual({});
    process.env.MODEL_API_TOKEN = TOKEN;
    expect(modelAuthHeaders()).toEqual({ Authorization: `Bearer ${TOKEN}` });
  });

  it('sends the token to the parser, the evaluator and the matcher', async () => {
    process.env.MODEL_API_TOKEN = TOKEN;
    process.env.MODEL_SERVER_URL = 'https://models.example.test';
    process.env.OLLAMA_URL = 'https://models.example.test';

    globalThis.fetch = reply({ candidateName: 'A' });
    await callModelServer('/parse', { text: 'x' });
    expect(sentAuth(globalThis.fetch.mock.calls[0])).toBe(`Bearer ${TOKEN}`);

    globalThis.fetch = reply({ message: { content: '{}' } });
    await evaluateLocally('prompt', {});
    expect(String(globalThis.fetch.mock.calls[0][0])).toBe('https://models.example.test/api/chat');
    expect(sentAuth(globalThis.fetch.mock.calls[0])).toBe(`Bearer ${TOKEN}`);

    globalThis.fetch = reply({ vectors: [vector()], dim: 384 });
    await embedTexts(['Python']);
    expect(String(globalThis.fetch.mock.calls[0][0])).toBe('https://models.example.test/embed');
    expect(sentAuth(globalThis.fetch.mock.calls[0])).toBe(`Bearer ${TOKEN}`);
  });

  it('lets EMBED_SERVICE_URL override the model server address', async () => {
    process.env.MODEL_SERVER_URL = 'https://models.example.test';
    process.env.EMBED_SERVICE_URL = 'http://127.0.0.1:9000/embed';
    globalThis.fetch = reply({ vectors: [vector()], dim: 384 });
    await embedTexts(['Python']);
    expect(String(globalThis.fetch.mock.calls[0][0])).toBe('http://127.0.0.1:9000/embed');
  });
});

describe('evaluator timeout', () => {
  it('defaults to 35 s and stays below the 60 s route limit', () => {
    expect(evaluatorTimeoutMs()).toBe(35_000);
    process.env.OLLAMA_TIMEOUT_MS = '50000';
    expect(evaluatorTimeoutMs()).toBe(50_000);
    process.env.OLLAMA_TIMEOUT_MS = '120000';
    expect(evaluatorTimeoutMs()).toBe(55_000);
  });
});
