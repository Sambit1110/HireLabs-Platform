import { describe, expect, it, vi } from 'vitest';

import { processUploads } from '../lib/resume/bulk-upload.js';
import { parseResumeWithRetry } from '../lib/resume/service.js';

const supabase = { auth: { getSession: async () => ({ data: { session: { access_token: 'token' } } }) } };
const json = (body, init = {}) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init });

describe('processUploads', () => {
  it('uploads and parses every file, two at a time, each settling on its own', async () => {
    const items = ['a', 'b', 'bad-upload', 'd', 'bad-parse'].map((name) => ({ key: name, file: { name }, resumeId: null }));
    const state = {};
    let inFlight = 0;
    let maxInFlight = 0;
    const onUpdate = (key, patch) => { state[key] = { ...state[key], ...patch }; };

    await processUploads(items, {
      upload: async (file) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        if (file.name === 'bad-upload') throw new Error('The file could not be uploaded to storage.');
        return { id: `id-${file.name}` };
      },
      parse: async (id) => (id === 'id-bad-parse' ? { ok: false, message: 'PDF could not be read.' } : { ok: true, message: 'Uploaded and processed.' }),
      onUpdate,
    });

    expect(maxInFlight).toBe(2);
    expect(state.a).toMatchObject({ stage: 'done', resumeId: 'id-a' });
    expect(state.d.stage).toBe('done');
    expect(state['bad-upload']).toMatchObject({ stage: 'failed', message: 'The file could not be uploaded to storage.' });
    expect(state['bad-parse']).toMatchObject({ stage: 'failed', message: 'PDF could not be read.', resumeId: 'id-bad-parse' });
  });

  it('retries only the processing step for a file that is already stored', async () => {
    const upload = vi.fn();
    const parse = vi.fn(async () => ({ ok: true, message: 'ok' }));
    await processUploads([{ key: 'x', file: { name: 'x.pdf' }, resumeId: 'id-x' }], { upload, parse, onUpdate: () => {} });
    expect(upload).not.toHaveBeenCalled();
    expect(parse).toHaveBeenCalledWith('id-x');
  });
});

describe('parseResumeWithRetry', () => {
  it('waits out the per-minute limit, then succeeds', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(json({ success: false, error: { message: 'Try again shortly.' } }, { status: 429, headers: { 'Retry-After': '7' } }))
      .mockResolvedValueOnce(json({ success: true, data: { id: 'r1', parser_error: null } }));
    const sleepImpl = vi.fn(async () => {});
    const result = await parseResumeWithRetry(supabase, 'r1', { fetchImpl, sleepImpl });
    expect(sleepImpl).toHaveBeenCalledWith(7000);
    expect(result).toEqual({ ok: true, data: { id: 'r1', parser_error: null }, message: 'Uploaded and processed.' });
  });

  it('reports the server message on failure, and network errors without throwing', async () => {
    const failed = await parseResumeWithRetry(supabase, 'r1', {
      fetchImpl: async () => json({ success: false, error: { message: 'The PDF could not be read.' } }, { status: 422 }),
    });
    expect(failed).toMatchObject({ ok: false, message: 'The PDF could not be read.' });
    const offline = await parseResumeWithRetry(supabase, 'r1', { fetchImpl: async () => { throw new TypeError('fetch failed'); } });
    expect(offline.ok).toBe(false);
  });

  it('gives up after a few waits instead of looping forever', async () => {
    const fetchImpl = vi.fn(async () => json({ success: false, error: { message: 'Try again shortly.' } }, { status: 429, headers: { 'Retry-After': '1' } }));
    const result = await parseResumeWithRetry(supabase, 'r1', { fetchImpl, sleepImpl: async () => {}, maxWaits: 3 });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(result).toMatchObject({ ok: false, message: 'Try again shortly.' });
  });
});

describe('upload box', () => {
  it('renders the drop zone, multi-file picker and limits', async () => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { default: ResumeUpload } = await import('../components/resume/ResumeUpload');
    const html = renderToStaticMarkup(createElement(ResumeUpload));
    expect(html).toContain('Drag resumes here');
    expect(html).toContain('multiple');
    expect(html).toContain('up to 50 files');
    expect(html).toContain('Upload and process');
  });
});
