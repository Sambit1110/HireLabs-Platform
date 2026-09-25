import { RESUME_COLUMNS } from './columns.js';
import { contentTypeFor, fileExtension, validateResumeFile } from './validation.js';

/** Browser-side resume operations. Every call is scoped by RLS to the signed-in user. */

const BUCKET = 'resumes';
const CHUNK = 100;
const MAX_RATE_LIMIT_RETRIES = 2;
const MAX_RATE_LIMIT_WAIT_MS = 15_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function chunks(list, size = CHUNK) {
  const out = [];
  for (let index = 0; index < list.length; index += size) out.push(list.slice(index, index + size));
  return out;
}

export async function getAccessToken(supabase) {
  // Reads the cached session (refreshing it only if expired); no request per call otherwise.
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function listResumes(supabase, userId) {
  const { data, error } = await supabase
    .from('resumes')
    .select(RESUME_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Your saved resumes could not be loaded.', { cause: error });
  return data ?? [];
}

export async function fetchResume(supabase, resumeId) {
  const { data, error } = await supabase
    .from('resumes')
    .select(RESUME_COLUMNS)
    .eq('id', resumeId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Uploads a file to private storage and records it as a queued resume. */
export async function uploadResume(supabase, userId, file) {
  const invalid = validateResumeFile(file);
  if (invalid) throw new Error(invalid);

  const filePath = `${userId}/${crypto.randomUUID()}.${fileExtension(file.name)}`;
  const contentType = contentTypeFor(file.name);

  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { contentType, upsert: false });

  if (storageError) {
    throw new Error('The file could not be uploaded to storage.', { cause: storageError });
  }

  const { data, error: dbError } = await supabase
    .from('resumes')
    .insert({
      user_id: userId,
      file_name: file.name,
      file_path: filePath,
      file_type: contentType,
      file_size: file.size,
      processing_status: 'queued',
    })
    .select(RESUME_COLUMNS)
    .single();

  if (dbError) {
    // Keep storage and the table consistent: no file without a row.
    const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([filePath]);
    if (cleanupError) console.error('Orphaned upload could not be removed:', filePath, cleanupError);
    throw new Error('The resume record could not be saved.', { cause: dbError });
  }

  return data;
}

async function postJson(supabase, url, body, { fetchImpl = fetch } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    const token = await getAccessToken(supabase);
    if (!token) {
      const error = new Error('Please sign in again to continue.');
      error.status = 401;
      throw error;
    }

    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));

    if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      const header = response.headers.get('Retry-After');
      const seconds = header === null ? 2 : Number(header);
      await sleep(Number.isFinite(seconds) ? Math.min(Math.max(seconds, 0) * 1000, MAX_RATE_LIMIT_WAIT_MS) : 2000);
      continue;
    }

    return { status: response.status, ok: response.ok, payload };
  }
}

/**
 * Asks the server to parse a stored resume. Never throws for parse outcomes:
 * returns the authoritative row (when the server has one) and any error.
 * @returns {Promise<{ resume: object | null, error: string | null, status: number }>}
 */
export async function requestParse(supabase, resumeId, { retry = false, fetchImpl } = {}) {
  const { status, ok, payload } = await postJson(
    supabase,
    '/api/parse-resume',
    { resumeId, retry },
    { fetchImpl }
  );

  return {
    status,
    resume: payload.resume ?? null,
    error: ok ? null : payload.error || 'Resume parsing failed.',
  };
}

/** Polls a row until it leaves 'processing' (used when another tab owns the job). */
export async function waitForProcessing(supabase, resumeId, { intervalMs = 3000, timeoutMs = 120_000, isCancelled = () => false } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && !isCancelled()) {
    await sleep(intervalMs);
    const row = await fetchResume(supabase, resumeId);
    if (!row || row.processing_status !== 'processing') return row;
  }
  return null;
}

export async function requestAiAnalysis(supabase, body, { fetchImpl } = {}) {
  const { ok, payload } = await postJson(supabase, '/api/ai-analyze', body, { fetchImpl });
  if (!ok) throw new Error(payload.error || 'AI analysis failed.');
  return payload.result;
}

async function listStoredPaths(supabase, userId) {
  const paths = new Set();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(BUCKET).list(userId, { limit: 1000, offset });
    if (error) throw error;
    for (const object of data ?? []) paths.add(`${userId}/${object.name}`);
    if (!data || data.length < 1000) return paths;
  }
}

/**
 * Deletes all of the user's resumes, keeping storage and rows consistent.
 *
 * Files are removed first; a row is deleted only once its file is confirmed
 * gone (including files that were already missing), so a partial failure
 * leaves retryable rows rather than rows pointing at deleted files.
 * Safe to run again after a partial failure.
 *
 * @returns {Promise<{ deletedIds: string[], failed: { id: string, file_name: string }[] }>}
 */
export async function clearAllResumes(supabase, userId) {
  const { data: rows, error } = await supabase
    .from('resumes')
    .select('id, file_name, file_path')
    .eq('user_id', userId);

  if (error) throw new Error('Your resumes could not be loaded for deletion.', { cause: error });
  if (!rows?.length) return { deletedIds: [], failed: [] };

  const ownPaths = rows.map((row) => row.file_path).filter((path) => path?.startsWith(`${userId}/`));
  const removedPaths = new Set();

  for (const batch of chunks(ownPaths)) {
    const { data, error: removeError } = await supabase.storage.from(BUCKET).remove(batch);
    if (removeError) console.error('Storage removal failed for a batch:', removeError);
    for (const object of data ?? []) removedPaths.add(object.name);
  }

  let fileIsGone;
  try {
    const remaining = await listStoredPaths(supabase, userId);
    fileIsGone = (path) => !remaining.has(path);
  } catch (listError) {
    console.error('Could not verify storage state; trusting removal results:', listError);
    fileIsGone = (path) => removedPaths.has(path);
  }

  const deletable = rows.filter((row) => !row.file_path?.startsWith(`${userId}/`) || fileIsGone(row.file_path));
  const deletedIds = [];

  for (const batch of chunks(deletable)) {
    const ids = batch.map((row) => row.id);
    const { error: deleteError } = await supabase.from('resumes').delete().in('id', ids).eq('user_id', userId);
    if (deleteError) console.error('Resume rows could not be deleted:', deleteError);
    else deletedIds.push(...ids);
  }

  const deleted = new Set(deletedIds);
  return {
    deletedIds,
    failed: rows.filter((row) => !deleted.has(row.id)).map(({ id, file_name }) => ({ id, file_name })),
  };
}
