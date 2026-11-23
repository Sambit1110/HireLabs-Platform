import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { callModelServerMock, evaluateLocallyMock } = vi.hoisted(() => ({
  callModelServerMock: vi.fn(),
  evaluateLocallyMock: vi.fn(),
}));

vi.mock('../lib/ai/model-server.js', () => ({
  callModelServer: callModelServerMock,
  useLocalModels: () => process.env.USE_LOCAL_MODELS === 'true',
}));

vi.mock('../lib/ai/local-llm.js', () => ({
  evaluateLocally: evaluateLocallyMock,
}));

import { enrichResume } from '../lib/resume/profile-enrichment.js';

const ENV_KEYS = ['USE_LOCAL_MODELS', 'OLLAMA_URL', 'OLLAMA_KEY'];
const savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
const completeProfile = {
  candidateName: 'Jordan Lee',
  candidateTitle: 'Backend Engineer',
  extractedSkills: ['Node.js', 'PostgreSQL'],
  yearsExperience: 6,
};

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
  callModelServerMock.mockReset();
  evaluateLocallyMock.mockReset();
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe('resume profile enrichment', () => {
  it('uses configured Ollama when the HireLabs parser is disabled', async () => {
    process.env.OLLAMA_URL = 'https://models.example.test/api/generate';
    evaluateLocallyMock.mockResolvedValue(completeProfile);

    const result = await enrichResume('Jordan Lee\nBackend Engineer\n6 years of experience');

    expect(result).toEqual({
      value: completeProfile,
      modelUsed: 'ollama-profile-extractor',
      error: null,
    });
    expect(callModelServerMock).not.toHaveBeenCalled();
    const [messages, schema, options] = evaluateLocallyMock.mock.calls[0];
    expect(messages[1].content).toContain('Jordan Lee');
    expect(schema.required).toContain('extractedSkills');
    expect(options.timeoutMs).toBe(20_000);
  });

  it('uses Ollama to fill fields missing from the HireLabs parser', async () => {
    process.env.USE_LOCAL_MODELS = 'true';
    process.env.OLLAMA_URL = 'https://models.example.test/api/generate';
    callModelServerMock.mockResolvedValue({
      value: {
        candidateName: 'Jordan Lee',
        candidateTitle: null,
        extractedSkills: [],
        yearsExperience: null,
      },
      placeholder: false,
    });
    evaluateLocallyMock.mockResolvedValue(completeProfile);

    const result = await enrichResume('Jordan Lee\nBackend Engineer\nNode.js, PostgreSQL\n6 years of experience');

    expect(result.value).toEqual(completeProfile);
    expect(result.modelUsed).toBe('ollama-profile-extractor');
    expect(result.error).toBeNull();
  });

  it('does not contact Ollama when no parser or Ollama endpoint is configured', async () => {
    const result = await enrichResume('Resume text');

    expect(result.value).toBeNull();
    expect(result.error).toContain('configure the HireLabs parser or OLLAMA_URL');
    expect(evaluateLocallyMock).not.toHaveBeenCalled();
  });
});

describe('profile clean-up', () => {
  it('replaces a title that is really the name with the line under it', async () => {
    process.env.USE_LOCAL_MODELS = 'true';
    callModelServerMock.mockResolvedValue({
      value: { candidateName: null, candidateTitle: 'Riya Kapoor', extractedSkills: ['SQL'], yearsExperience: 3 },
      placeholder: false,
    });
    const result = await enrichResume('Riya Kapoor\nData Analyst\nSkills: SQL, Python, Tableau\nData Analyst with 3 years of experience in Retail.');
    expect(result.value.candidateName).toBe('Riya Kapoor');
    expect(result.value.candidateTitle).toBe('Data Analyst');
    expect(result.error).toBeNull();
  });
});
