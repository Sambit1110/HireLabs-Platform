#!/usr/bin/env node
/**
 * HireLabs production verification. Prints PASS / FAIL / SKIPPED per check and
 * never prints secret values. Exit code 1 if any check FAILs.
 *
 *   node --env-file=.env.local scripts/verify-production.mjs \
 *     --url https://your-app.vercel.app [--e2e]
 *
 * --e2e     runs a two-account end-to-end test against the deployment. Needs
 *           two existing *test* accounts in the Supabase project:
 *             VERIFY_A_EMAIL, VERIFY_A_PASSWORD, VERIFY_B_EMAIL, VERIFY_B_PASSWORD
 *           It uploads one small generated PDF for account A and deletes it again.
 */
import { createClient } from '@supabase/supabase-js';

import { makePdf } from '../tests/helpers/fixtures.js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const results = [];
const report = (status, name, detail = '') => {
  results.push(status);
  console.log(`${status.padEnd(8)} ${name}${detail ? ` — ${detail}` : ''}`);
};
const present = (name) => Boolean(process.env[name]);

// ------------------------------------------------------------------ 1. environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const deploymentUrl = (option('url') || process.env.HIRELABS_URL || '').replace(/\/$/, '');

console.log('Environment (presence only):');
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'USE_LOCAL_MODELS', 'OLLAMA_MODEL', 'AI_FEATURES_ENABLED']) {
  console.log(`  ${name} = ${present(name) ? 'PRESENT' : 'MISSING'}`);
}
// Secrets exposed to the browser bundle are always a failure.
for (const name of ['NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY']) {
  if (present(name)) report('FAIL', `${name} must never be public`, 'remove it and rotate the key');
}
console.log('');

report(supabaseUrl && supabaseKey ? 'PASS' : 'FAIL', 'Supabase URL + publishable/anon key configured');

// ------------------------------------------------------------------ 2. deployment health
if (!deploymentUrl) {
  report('SKIPPED', 'Deployment /api/health', 'pass --url or set HIRELABS_URL');
} else {
  try {
    const response = await fetch(`${deploymentUrl}/api/health`, { signal: AbortSignal.timeout(15000) });
    const health = await response.json();
    const ok = health.application === 'ok' && health.supabase_configured && health.database === 'connected' && health.schema_version === 'verified';
    report(ok ? 'PASS' : 'FAIL', 'Deployment /api/health',
      `status=${health.status} database=${health.database} schema=${health.schema_version}${health.schema_missing ? ` missing=${health.schema_missing.join(',')}` : ''} local_models=${health.local_models_enabled} evaluator=${health.evaluator_model}`);
  } catch (error) {
    report('FAIL', 'Deployment /api/health', `unreachable (${error.name})`);
  }
}

// ------------------------------------------------------------------ 3. Supabase direct
let anon;
if (supabaseUrl && supabaseKey) {
  anon = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await anon.rpc('hirelabs_schema_status');
  if (error) {
    report('FAIL', 'Supabase schema (migrations 003 + 004)', error.code === 'PGRST202' ? 'hirelabs_schema_status() missing: apply migration 004' : `error code ${error.code ?? 'unknown'}`);
  } else {
    const missing = Object.entries(data).filter(([key, value]) => key !== 'version' && value !== true).map(([key]) => key);
    report(missing.length ? 'FAIL' : 'PASS', 'Supabase schema (migrations 003 + 004)', missing.length ? `missing: ${missing.join(', ')}` : `version ${data.version}`);
  }
} else {
  report('SKIPPED', 'Supabase schema', 'credentials unavailable');
}

// ------------------------------------------------------------------ 4. two-account E2E (opt-in)
const accounts = ['VERIFY_A_EMAIL', 'VERIFY_A_PASSWORD', 'VERIFY_B_EMAIL', 'VERIFY_B_PASSWORD'];
if (!flag('e2e')) {
  report('SKIPPED', 'Two-account end-to-end', 'pass --e2e (needs two test accounts)');
} else if (!deploymentUrl || !anon || !accounts.every(present)) {
  report('SKIPPED', 'Two-account end-to-end', `needs --url, Supabase config and ${accounts.join(', ')}`);
} else {
  await runE2E();
}

async function signIn(prefix) {
  const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email: process.env[`${prefix}_EMAIL`],
    password: process.env[`${prefix}_PASSWORD`],
  });
  if (error) throw new Error(`${prefix} sign-in failed (${error.code ?? error.status ?? 'error'})`);
  return { client, user: data.user, token: data.session.access_token };
}

async function api(path, token, body) {
  const response = await fetch(`${deploymentUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

async function runE2E() {
  let a;
  let b;
  try {
    [a, b] = await Promise.all([signIn('VERIFY_A'), signIn('VERIFY_B')]);
    report('PASS', 'Supabase Auth: both test accounts signed in');
  } catch (error) {
    report('FAIL', 'Supabase Auth sign-in', error.message);
    return;
  }

  const path = `${a.user.id}/verify-${Date.now()}.pdf`;
  let resumeId;
  try {
    const pdf = makePdf(['Verify Candidate', 'Software Engineer', '5 years of experience with React and PostgreSQL.', 'Production verification resume.']);
    const upload = await a.client.storage.from('resumes').upload(path, new Blob([pdf], { type: 'application/pdf' }), { contentType: 'application/pdf' });
    report(upload.error ? 'FAIL' : 'PASS', 'Storage: A uploads into own folder', upload.error ? upload.error.message : '');
    if (upload.error) return;

    const insert = await a.client.from('resumes').insert({
      user_id: a.user.id, file_name: 'verify.pdf', file_path: path, file_type: 'application/pdf', file_size: pdf.length, processing_status: 'queued',
    }).select('id').single();
    report(insert.error ? 'FAIL' : 'PASS', 'Database: A creates own resume row', insert.error ? insert.error.code : '');
    if (insert.error) return;
    resumeId = insert.data.id;

    // B must not be able to touch A's data.
    const bRead = await b.client.from('resumes').select('id').eq('id', resumeId);
    report(bRead.data?.length === 0 ? 'PASS' : 'FAIL', 'RLS: B cannot read A\'s row');
    const bUpdate = await b.client.from('resumes').update({ parsed_text: 'x' }).eq('id', resumeId).select('id');
    report(bUpdate.data?.length === 0 || bUpdate.error ? 'PASS' : 'FAIL', 'RLS: B cannot update A\'s row');
    const bClaim = await b.client.rpc('claim_resume_for_parsing', { p_resume_id: resumeId, p_job_id: crypto.randomUUID(), p_allow_retry: true });
    report((bClaim.data ?? []).length === 0 ? 'PASS' : 'FAIL', 'RLS: B cannot claim A\'s parse job');
    const bParse = await api('/api/parse-resume', b.token, { resumeId });
    report(bParse.status === 404 ? 'PASS' : 'FAIL', 'API: B cannot parse A\'s resume', `HTTP ${bParse.status}`);
    const bDownload = await b.client.storage.from('resumes').download(path);
    report(bDownload.error ? 'PASS' : 'FAIL', 'Storage RLS: B cannot download A\'s file');
    const bList = await b.client.storage.from('resumes').list(a.user.id);
    report((bList.data ?? []).length === 0 ? 'PASS' : 'FAIL', 'Storage RLS: B cannot list A\'s folder');
    const bUploadInto = await b.client.storage.from('resumes').upload(`${a.user.id}/intrusion.pdf`, new Blob([pdf], { type: 'application/pdf' }), { contentType: 'application/pdf' });
    report(bUploadInto.error ? 'PASS' : 'FAIL', 'Storage RLS: B cannot upload into A\'s folder');
    await b.client.storage.from('resumes').remove([path]);
    const stillThere = await a.client.storage.from('resumes').download(path);
    report(stillThere.error ? 'FAIL' : 'PASS', 'Storage RLS: B cannot delete A\'s file');
    const bDelete = await b.client.from('resumes').delete().eq('id', resumeId).select('id');
    report((bDelete.data ?? []).length === 0 ? 'PASS' : 'FAIL', 'RLS: B cannot delete A\'s row');

    const unauth = await api('/api/parse-resume', null, { resumeId });
    report(unauth.status === 401 ? 'PASS' : 'FAIL', 'API: request without a token is rejected', `HTTP ${unauth.status}`);

    // A parses own resume through the deployed API (server downloads from Storage).
    const parse = await api('/api/parse-resume', a.token, { resumeId });
    const parsed = parse.body.resume;
    report(parse.status === 200 && parsed?.processing_status === 'completed' ? 'PASS' : 'FAIL', 'API: A parses own PDF (server-side download + parse)',
      `HTTP ${parse.status}${parsed ? ` skills=${(parsed.extracted_skills || []).join('/')}` : ''}`);
    const again = await api('/api/parse-resume', a.token, { resumeId });
    report(again.body.alreadyProcessed === true ? 'PASS' : 'FAIL', 'Completed resume is not parsed twice');

    if (process.env.USE_LOCAL_MODELS !== 'true') {
      report('SKIPPED', 'AI through the deployment', 'local models off; check /api/health local_models_enabled');
    } else {
      const role = await api('/api/ai-analyze', a.token, { mode: 'role', role: 'Backend Engineer', jobDescription: 'Python, PostgreSQL, AWS.' });
      report(role.status === 200 && role.body.result?.role_summary ? 'PASS' : 'FAIL', 'AI role brief through the deployment', `HTTP ${role.status}`);
      const candidate = await api('/api/ai-analyze', a.token, { mode: 'candidate', role: 'Backend Engineer', jobDescription: 'Python, PostgreSQL, AWS.', candidate: { resumeId } });
      report(candidate.status === 200 && candidate.body.result?.fit_verdict ? 'PASS' : 'FAIL', 'AI candidate analysis through the deployment', `HTTP ${candidate.status}`);
    }
  } finally {
    // Clean up A's verification data.
    await a.client.storage.from('resumes').remove([path]);
    if (resumeId) await a.client.from('resumes').delete().eq('id', resumeId);
  }
}

// ------------------------------------------------------------------ summary
const count = (status) => results.filter((value) => value === status).length;
console.log(`\n${count('PASS')} passed, ${count('FAIL')} failed, ${count('SKIPPED')} skipped (skipped = NOT tested, not "working")`);
process.exit(count('FAIL') ? 1 : 0);
