import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toPgVector } from '../lib/resume/embedding.js';
import { databaseErrorCode } from '../lib/resume/processing-errors.js';

const RESUME_ID = '11111111-1111-4111-8111-111111111111';
const VECTOR = Array.from({ length: 384 }, (_, i) => (i % 7) / 10);
let updates;
let embeddingSaveError;
let embedImpl;

function updateBuilder(fields) {
  updates.push(fields);
  const isEmbeddingSave = 'embedding' in fields;
  const result = isEmbeddingSave && embeddingSaveError
    ? { data: null, error: embeddingSaveError }
    : { data: { id: RESUME_ID, processing_status: fields.processing_status ?? 'parsed', embedded_at: null }, error: null };
  const builder = {
    eq: () => builder,
    select: () => builder,
    single: async () => result,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

const supabase = {
  from: () => ({
    select: () => ({
      eq: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: RESUME_ID, user_id: 'u1', file_name: 'cv.docx', file_path: 'u1/cv.docx', file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', processing_status: 'uploaded' },
            error: null,
          }),
        }),
      }),
    }),
    update: updateBuilder,
  }),
  storage: {
    from: () => ({
      download: async () => ({ data: new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3])]), error: null }),
    }),
  },
};

vi.mock('@/lib/supabase/server-auth', () => ({
  authenticateRequest: vi.fn(async () => ({ supabase, user: { id: 'u1' } })),
}));
vi.mock('@/lib/api/ai-rate-limit', () => ({ checkAIRateLimit: () => null }));
vi.mock('mammoth', () => ({ default: { extractRawText: async () => ({ value: 'Data Analyst\nSkills: SQL, Python' }) } }));
vi.mock('@/lib/resume/profile-enrichment', () => ({
  enrichResume: async () => ({
    value: { candidateName: 'Riya', candidateTitle: 'Data Analyst', extractedSkills: ['SQL'], yearsExperience: 3 },
    modelUsed: 'hirelabs-parser',
    error: null,
  }),
}));
vi.mock('@/lib/resume/embedding', async (importOriginal) => ({
  ...(await importOriginal()),
  embedText: (...args) => embedImpl(...args),
}));

async function upload() {
  const { POST } = await import('../app/api/parse-resume/route.js');
  const response = await POST(new Request('http://localhost/api/parse-resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer t' },
    body: JSON.stringify({ resumeId: RESUME_ID }),
  }));
  return { status: response.status, json: await response.json() };
}

beforeEach(() => {
  updates = [];
  embeddingSaveError = null;
  embedImpl = async () => ({ vector: VECTOR, dim: 384, model_used: 'hirelabs-matcher' });
});

describe('POST /api/parse-resume saving', () => {
  it('saves the profile and the embedding (pgvector text format) in one database write', async () => {
    const { status, json } = await upload();
    expect(status).toBe(200);
    expect(json.data.processing_status).toBe('parsed');
    expect(json.data.embedded_at).toEqual(expect.any(String));

    const saves = updates.filter((fields) => fields.processing_status === 'parsed');
    expect(saves).toHaveLength(1);
    expect(saves[0].embedding).toBe(toPgVector(VECTOR));
    expect(saves[0].embedded_at).toBe(json.data.embedded_at);
    expect(updates.filter((fields) => 'embedding' in fields)).toHaveLength(1);
  });

  it('keeps the resume parsed when saving the embedding fails', async () => {
    embeddingSaveError = { code: '22P02', message: 'invalid input syntax for type vector' };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { status, json } = await upload();
    expect(status).toBe(200);
    expect(json.data.processing_status).toBe('parsed');
    expect(json.data.embedded_at).toBeNull();
    expect(updates.some((fields) => fields.processing_status === 'failed')).toBe(false);
    // The profile is saved again without the embedding.
    const retry = updates.filter((fields) => fields.processing_status === 'parsed').at(-1);
    expect(retry).not.toHaveProperty('embedding');
    expect(warn).toHaveBeenCalledWith('Saving the resume embedding failed:', { dbCode: '22P02' });
    warn.mockRestore();
  });

  it('keeps the resume parsed when the matcher is unreachable', async () => {
    embedImpl = async () => { throw new Error('Embedding service returned HTTP 503'); };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { status, json } = await upload();
    expect(status).toBe(200);
    expect(json.data.processing_status).toBe('parsed');
    expect(updates.some((fields) => 'embedding' in fields)).toBe(false);
    warn.mockRestore();
  });
});

describe('helpers', () => {
  it('formats only finite 384-d vectors for pgvector', () => {
    expect(toPgVector([0.5, -1, 2e-7].concat(Array(381).fill(0)))).toMatch(/^\[0\.5,-1,2e-7,0,/);
    expect(toPgVector([1, 2, 3])).toBeNull();
    expect(toPgVector(Array(384).fill(Number.NaN))).toBeNull();
    expect(toPgVector(null)).toBeNull();
  });

  it('extracts only database error codes, never messages', () => {
    expect(databaseErrorCode({ code: '22P02', message: 'resume text' })).toBe('22P02');
    expect(databaseErrorCode({ code: 'PGRST116' })).toBe('PGRST116');
    expect(databaseErrorCode({ code: 'ECONNREFUSED' })).toBeNull();
    expect(databaseErrorCode(new Error('x'))).toBeNull();
  });
});
