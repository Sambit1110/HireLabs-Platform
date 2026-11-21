import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import { clearAllResumes, requestParse, uploadResume } from '../lib/resume/service.js';

const USER = '11111111-1111-1111-1111-111111111111';

/** Minimal in-memory stand-in for the Supabase client surface used by the service. */
function fakeSupabase({ rows = [], objects = [], _failRemove = new Set(), failInsert = false } = {}) {
  const db = { rows: rows.map((row) => ({ ...row })), failDelete: false };
  const storage = { objects: new Set(objects), removeCalls: [] };

  const query = (table) => {
    const state = { filters: [], op: 'select', values: null };
    const builder = {
      select() { return builder; },
      eq(column, value) { state.filters.push((row) => row[column] === value); return builder; },
      in(column, values) { state.filters.push((row) => values.includes(row[column])); return builder; },
      order() { return builder; },
      delete() { state.op = 'delete'; return builder; },
      insert(values) { state.op = 'insert'; state.values = values; return builder; },
      single() { return builder; },
      then(resolve, reject) {
        try {
          if (state.op === 'insert') {
            if (failInsert) return resolve({ data: null, error: { message: 'insert failed' } });
            const row = { id: `row-${db.rows.length + 1}`, ...state.values };
            db.rows.push(row);
            return resolve({ data: row, error: null });
          }
          const matches = db.rows.filter((row) => state.filters.every((filter) => filter(row)));
          if (state.op === 'delete') {
            if (db.failDelete) return resolve({ data: null, error: { message: 'delete failed' } });
            db.rows = db.rows.filter((row) => !matches.includes(row));
          }
          return resolve({ data: matches, error: null });
        } catch (error) {
          return reject(error);
        }
      },
    };
    assert.equal(table, 'resumes');
    return builder;
  };

  return {
    db,
    storage,
    from: query,
    auth: { getSession: async () => ({ data: { session: { access_token: 'token-123' } } }) },
  };
}

function withStorage(client) {
  const { storage } = client;
  client.storage = {
    from: () => ({
      async upload(path) {
        storage.objects.add(path);
        return { error: null };
      },
      async remove(paths) {
        storage.removeCalls.push(paths);
        const removed = [];
        for (const path of paths) {
          if (client.failRemove?.has(path)) continue;
          if (storage.objects.delete(path)) removed.push({ name: path });
        }
        return { data: removed, error: null };
      },
      async list(prefix) {
        if (client.failList) return { data: null, error: { message: 'list failed' } };
        const data = [...storage.objects]
          .filter((path) => path.startsWith(`${prefix}/`))
          .map((path) => ({ name: path.slice(prefix.length + 1) }));
        return { data, error: null };
      },
    }),
  };
  client.objects = storage.objects;
  client.removeCalls = storage.removeCalls;
  return client;
}

const makeClient = (options) => {
  const client = withStorage(fakeSupabase(options));
  client.failRemove = options.failRemove ?? new Set();
  return client;
};

describe('clearAllResumes', () => {
  const rows = [
    { id: 'a', user_id: USER, file_name: 'a.pdf', file_path: `${USER}/a.pdf` },
    { id: 'b', user_id: USER, file_name: 'b.pdf', file_path: `${USER}/b.pdf` },
    { id: 'c', user_id: USER, file_name: 'c.pdf', file_path: `${USER}/c.pdf` },
    { id: 'other', user_id: 'someone-else', file_name: 'x.pdf', file_path: 'someone-else/x.pdf' },
  ];

  it('deletes rows only after their files are gone and reports partial failures', async () => {
    const client = makeClient({
      rows,
      objects: [`${USER}/a.pdf`, `${USER}/b.pdf`, `${USER}/c.pdf`, 'someone-else/x.pdf'],
      failRemove: new Set([`${USER}/b.pdf`]),
    });

    const result = await clearAllResumes(client, USER);

    assert.deepEqual(result.deletedIds.sort(), ['a', 'c']);
    assert.deepEqual(result.failed, [{ id: 'b', file_name: 'b.pdf' }]);
    // Row b is kept because its file still exists: no orphaned references.
    assert.deepEqual(client.db.rows.map((row) => row.id).sort(), ['b', 'other']);
    assert.ok(client.objects.has(`${USER}/b.pdf`));
    // Another user's data is never touched.
    assert.ok(client.objects.has('someone-else/x.pdf'));
    assert.ok(client.removeCalls.flat().every((path) => path.startsWith(`${USER}/`)));
  });

  it('keeps rows when the DB delete fails after storage succeeded, and finishes on retry', async () => {
    const client = makeClient({ rows, objects: [`${USER}/a.pdf`, `${USER}/b.pdf`, `${USER}/c.pdf`] });
    client.db.failDelete = true;

    const first = await clearAllResumes(client, USER);
    assert.deepEqual(first.deletedIds, []);
    assert.equal(first.failed.length, 3, 'every row is reported, none silently dropped');
    assert.equal(client.objects.size, 0, 'files were removed');

    client.db.failDelete = false;
    const second = await clearAllResumes(client, USER);
    assert.deepEqual(second.deletedIds.sort(), ['a', 'b', 'c']);
    assert.deepEqual(second.failed, []);
    assert.deepEqual(client.db.rows.map((row) => row.id), ['other']);
  });

  it('falls back to the removal result when storage listing fails', async () => {
    const client = makeClient({
      rows,
      objects: [`${USER}/a.pdf`, `${USER}/b.pdf`, `${USER}/c.pdf`],
      failRemove: new Set([`${USER}/c.pdf`]),
    });
    client.failList = true;

    const result = await clearAllResumes(client, USER);
    assert.deepEqual(result.deletedIds.sort(), ['a', 'b']);
    assert.deepEqual(result.failed, [{ id: 'c', file_name: 'c.pdf' }]);
  });

  it('is idempotent: rows whose files are already missing are cleaned up on retry', async () => {
    const client = makeClient({ rows, objects: [] });
    const result = await clearAllResumes(client, USER);
    assert.deepEqual(result.deletedIds.sort(), ['a', 'b', 'c']);
    assert.deepEqual(result.failed, []);

    const again = await clearAllResumes(client, USER);
    assert.deepEqual(again, { deletedIds: [], failed: [] });
  });
});

describe('uploadResume', () => {
  const file = (name, type = 'application/pdf', size = 1000) => ({ name, type, size });

  it('stores the file under the user folder and records a queued row', async () => {
    const client = makeClient({});
    const row = await uploadResume(client, USER, file('cv.pdf'));

    assert.equal(row.processing_status, 'queued');
    assert.ok(row.file_path.startsWith(`${USER}/`));
    assert.equal(row.file_type, 'application/pdf');
    assert.ok(client.objects.has(row.file_path));
  });

  it('removes the uploaded file when the row cannot be saved', async () => {
    const client = makeClient({ failInsert: true });
    await assert.rejects(uploadResume(client, USER, file('cv.pdf')), /could not be saved/);
    assert.equal(client.objects.size, 0);
  });

  it('rejects invalid files before uploading', async () => {
    const client = makeClient({});
    await assert.rejects(uploadResume(client, USER, file('cv.exe', 'application/x-msdownload')), /Only PDF and DOCX/);
    assert.equal(client.objects.size, 0);
  });
});

describe('requestParse', () => {
  it('sends only the resume id with the bearer token', async () => {
    const client = makeClient({});
    let sent;
    const fetchImpl = async (url, init) => {
      sent = { url, init };
      return new Response(JSON.stringify({ resume: { id: 'r1', processing_status: 'completed' } }), { status: 200 });
    };

    const outcome = await requestParse(client, 'r1', { fetchImpl });

    assert.equal(sent.url, '/api/parse-resume');
    assert.equal(sent.init.headers.Authorization, 'Bearer token-123');
    assert.deepEqual(JSON.parse(sent.init.body), { resumeId: 'r1', retry: false });
    assert.equal(outcome.resume.processing_status, 'completed');
    assert.equal(outcome.error, null);
  });

  it('returns the failed row and message for a parse failure without throwing', async () => {
    const client = makeClient({});
    const fetchImpl = async () => new Response(
      JSON.stringify({ error: 'No readable text was found.', resume: { id: 'r1', processing_status: 'failed' } }),
      { status: 422 }
    );

    const outcome = await requestParse(client, 'r1', { fetchImpl });
    assert.equal(outcome.status, 422);
    assert.equal(outcome.resume.processing_status, 'failed');
    assert.match(outcome.error, /No readable text/);
  });

  it('backs off and retries on 429 before giving up', async () => {
    const client = makeClient({});
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return calls < 2
        ? new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: { 'Retry-After': '0' } })
        : new Response(JSON.stringify({ resume: { id: 'r1', processing_status: 'completed' } }), { status: 200 });
    };

    const outcome = await requestParse(client, 'r1', { fetchImpl });
    assert.equal(calls, 2);
    assert.equal(outcome.resume.processing_status, 'completed');
  });
});
