// Concurrency check for the SQL in supabase/migrations on a REAL PostgreSQL
// server with real concurrent connections (claim races, stale-job retry,
// superseded-job writes, cross-user isolation, shared AI quota).
//
// Supabase-provided pieces (roles, auth.uid(), storage schema) are emulated;
// the repo migrations run unmodified. Needs two extra packages, not saved:
//   npm i --no-save embedded-postgres pg && node scripts/db-concurrency-check.mjs
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const dataDir = join(tmpdir(), `hl-pg-${process.pid}`);
const PORT = 56000 + Math.floor(Math.random() * 2000);
const server = new EmbeddedPostgres({ databaseDir: dataDir, user: 'postgres', password: 'local-test-only', port: PORT, persistent: false });

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const connect = async () => {
  const client = new pg.Client({ host: 'localhost', port: PORT, user: 'postgres', password: 'local-test-only', database: 'postgres' });
  client.on('error', (error) => console.error('pg client error:', error.message));
  await client.connect();
  return client;
};

await server.initialise();
await server.start();
const admin = await connect();
const version = (await admin.query('show server_version')).rows[0].server_version;
console.log(`Postgres server ${version} (separate process, TCP connections)\n`);

try {
  await admin.query(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language plpgsql as $$
      declare _parts text[]; begin select string_to_array(name, '/') into _parts; return _parts[1:array_length(_parts,1)-1]; end $$;
    grant usage on schema storage to anon, authenticated; grant all on storage.objects to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on functions to anon, authenticated;
  `);

  const migrations = ['001_create_resumes.sql', '002_resume_parsing.sql', '003_resume_processing_jobs.sql', '004_ai_quota_and_health.sql'];
  for (const file of migrations) await admin.query(readFileSync(`${REPO}/supabase/migrations/${file}`, 'utf8'));
  check('migrations 001-004 apply on a real Postgres server', true);
  for (const file of migrations.slice(2)) await admin.query(readFileSync(`${REPO}/supabase/migrations/${file}`, 'utf8'));
  check('migrations 003 and 004 are safe to re-run', true);

  const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  await admin.query(`insert into auth.users values ($1), ($2)`, [A, B]);

  const seed = async (user, status, startedAgo = null) => (await admin.query(
    `insert into public.resumes (user_id, file_name, file_path, file_type, file_size, processing_status, processing_started_at)
     values ($1::uuid, 'cv.pdf', $1::text || '/' || gen_random_uuid() || '.pdf', 'application/pdf', 100, $2,
             case when $3::int is null then null else now() - make_interval(secs => $3::int) end)
     returning id`, [user, status, startedAgo])).rows[0].id;

  // Mimics PostgREST: one transaction per request, role + JWT claim set locally.
  const asUser = async (client, user, sql, params = []) => {
    await client.query('begin');
    try {
      await client.query(`set local role authenticated`);
      await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [user]);
      const { rows } = await client.query(sql, params);
      await client.query('commit');
      return rows;
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  };
  const CLAIM = `select * from public.claim_resume_for_parsing(p_resume_id => $1, p_job_id => gen_random_uuid(), p_allow_retry => $2)`;

  const pool = await Promise.all(Array.from({ length: 25 }, connect));

  // ------------------------------------------------ (10) lock-level race, deterministic
  {
    const id = await seed(A, 'queued');
    const [c1, c2] = pool;
    await c1.query('begin');
    await c1.query('set local role authenticated');
    await c1.query(`select set_config('request.jwt.claim.sub', $1, true)`, [A]);
    const first = (await c1.query(CLAIM, [id, false])).rows; // holds the row lock, uncommitted

    const started = Date.now();
    const secondPromise = asUser(c2, A, CLAIM, [id, false]);   // must wait on the lock
    await sleep(400);
    await c1.query('commit');
    const second = await secondPromise;
    const waited = Date.now() - started;

    check('concurrent claim: A claims while B is in flight', first.length === 1);
    check('concurrent claim: B blocked on A\'s row lock, then was REJECTED', second.length === 0 && waited >= 350, `B waited ${waited}ms, got ${second.length} rows`);
  }

  // ------------------------------------------------ 25 simultaneous claims, one row
  {
    const id = await seed(A, 'queued');
    const outcomes = await Promise.all(pool.map((client) => asUser(client, A, CLAIM, [id, false])));
    const winners = outcomes.filter((rows) => rows.length === 1);
    check('25 simultaneous claims of one queued resume -> exactly 1 winner', winners.length === 1, `${winners.length} winner(s)`);
    const row = (await admin.query('select processing_attempts from public.resumes where id=$1', [id])).rows[0];
    check('attempt counter incremented exactly once', row.processing_attempts === 1);
  }

  // ------------------------------------------------ 25 simultaneous retries of a stale job
  {
    const id = await seed(A, 'processing', 600);
    const outcomes = await Promise.all(pool.map((client) => asUser(client, A, CLAIM, [id, true])));
    const winners = outcomes.filter((rows) => rows.length === 1);
    check('25 simultaneous explicit retries of a stale job -> exactly 1 winner', winners.length === 1, `${winners.length} winner(s)`);
  }

  // ------------------------------------------------ (11) stale job vs retry: only the owner can write
  {
    const id = await seed(A, 'queued');
    const jobOld = (await asUser(pool[0], A, CLAIM, [id, false]))[0].processing_job_id;
    await admin.query(`update public.resumes set processing_started_at = now() - interval '10 minutes' where id=$1`, [id]);
    const jobNew = (await asUser(pool[1], A, CLAIM, [id, true]))[0]?.processing_job_id;
    check('explicit retry takes over a stale job with a new job id', jobNew && jobNew !== jobOld);

    // The exact conditional write the parse route performs (finishJob).
    const FINISH = `update public.resumes set processing_status = $3, parsed_text = $4
                     where id = $1 and processing_job_id = $2 and processing_status = 'processing' returning id`;
    // Old and new job finish at the same moment.
    const [oldWrite, newWrite] = await Promise.all([
      asUser(pool[2], A, FINISH, [id, jobOld, 'completed', 'OLD RESULT']),
      asUser(pool[3], A, FINISH, [id, jobNew, 'completed', 'NEW RESULT']),
    ]);
    check('late result from the superseded job is rejected', oldWrite.length === 0);
    check('current job\'s result is written', newWrite.length === 1);
    const final = (await admin.query('select parsed_text, processing_status from public.resumes where id=$1', [id])).rows[0];
    check('stored result belongs to the current job only', final.parsed_text === 'NEW RESULT' && final.processing_status === 'completed');

    const again = await asUser(pool[4], A, FINISH, [id, jobNew, 'failed', 'X']);
    check('a finished job cannot write a second time', again.length === 0);
    check('completed resume cannot be re-claimed, even with retry', (await asUser(pool[5], A, CLAIM, [id, true])).length === 0);
  }

  // ------------------------------------------------ (3) cross-user under real server
  {
    const bId = await seed(B, 'queued');
    const rows = await Promise.all(pool.slice(0, 10).map((client) => asUser(client, A, CLAIM, [bId, true])));
    check('10 concurrent attempts by A to claim B\'s resume -> 0 succeed', rows.every((r) => r.length === 0));
    check('A cannot read B\'s row', (await asUser(pool[0], A, 'select id from public.resumes where id=$1', [bId])).length === 0);
    check('A cannot update B\'s row', (await asUser(pool[0], A, `update public.resumes set parsed_text='x' where id=$1 returning id`, [bId])).length === 0);
    check('A cannot delete B\'s row', (await asUser(pool[0], A, 'delete from public.resumes where id=$1 returning id', [bId])).length === 0);
  }

  // ------------------------------------------------ (15) shared quota under concurrency
  {
    await admin.query(`update public.api_quota_limits set user_daily_limit = 5, global_daily_limit = 8 where scope = 'ai'`);
    const QUOTA = `select * from public.consume_api_quota('ai')`;

    const aCalls = await Promise.all(pool.slice(0, 20).map((client) => asUser(client, A, QUOTA)));
    const aAllowed = aCalls.filter((r) => r[0].allowed).length;
    check('20 concurrent AI requests by user A -> exactly 5 allowed (user limit)', aAllowed === 5, `${aAllowed} allowed`);

    const bCalls = await Promise.all(pool.slice(0, 20).map((client) => asUser(client, B, QUOTA)));
    const bAllowed = bCalls.filter((r) => r[0].allowed).length;
    check('then 20 concurrent by user B -> exactly 3 allowed (global limit 8)', bAllowed === 3, `${bAllowed} allowed`);

    const global = (await admin.query(`select request_count from public.api_usage_counters where subject='global'`)).rows[0].request_count;
    // Only calls within a user's own limit reach the global counter: A 5 + B 5 = 10 (not 5 + 20).
    check('users over their own limit do not consume global quota', global === 5 + 5, `global counter ${global}`);

    let direct = 'allowed';
    try { await asUser(pool[0], A, `select * from public.api_usage_counters`); } catch (e) { direct = /permission denied/.test(e.message) ? 'denied' : e.message; }
    check('clients cannot read quota counters directly', direct === 'denied');
    let raise = 'allowed';
    try { await asUser(pool[0], A, `update public.api_quota_limits set user_daily_limit = 100000`); } catch (e) { raise = /permission denied/.test(e.message) ? 'denied' : e.message; }
    check('clients cannot raise quota limits', raise === 'denied');

    let anon = 'allowed';
    try {
      await pool[0].query('begin'); await pool[0].query('set local role anon');
      await pool[0].query(QUOTA);
    } catch (e) { anon = /permission denied/.test(e.message) ? 'denied' : e.message; } finally { await pool[0].query('rollback'); }
    check('anonymous callers cannot use the quota function', anon === 'denied');
  }

  // ------------------------------------------------ (4) health probe as anon
  {
    await pool[0].query('begin'); await pool[0].query('set local role anon');
    const status = (await pool[0].query('select public.hirelabs_schema_status() as s')).rows[0].s;
    await pool[0].query('commit');
    const allTrue = Object.entries(status).every(([k, v]) => k === 'version' || v === true);
    check('health probe (anon) reports schema v4 with every component present', status.version === 4 && allTrue, JSON.stringify(status));
  }

  await Promise.all(pool.map((client) => client.end()));
} finally {
  await admin.end();
  await server.stop();
  rmSync(dataDir, { recursive: true, force: true });
}

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
