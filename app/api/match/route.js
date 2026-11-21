import { apiError, apiSuccess } from '@/lib/api/response';
import { authenticateRequest } from '@/lib/supabase/server-auth';
import { cleanResumeText } from '@/lib/resume/text';
import { embedText } from '@/lib/resume/embedding';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_JD_LENGTH = 30000;
const DEFAULT_MATCH_COUNT = 10;
const MAX_MATCH_COUNT = 100;

/**
 * POST /api/match
 *
 * Ranks candidate resumes against a job description using 384-dimensional
 * dense semantic embeddings (hirelabs-matcher) and pgvector cosine distance.
 *
 * Body:
 * {
 *   "job_description": "...",
 *   "title": "Senior Backend Engineer (optional)",
 *   "match_count": 10
 * }
 *
 * Response (apiSuccess envelope):
 * {
 *   "success": true,
 *   "data": {
 *     "matches": [
 *       {
 *         "id": "uuid",
 *         "file_name": "resume.pdf",
 *         "similarity": 0.892,
 *         "candidate_name": "Priya Raman",
 *         "candidate_title": "Senior Backend Engineer",
 *         "years_experience": 7,
 *         "extracted_skills": ["Node.js", "PostgreSQL", ...]
 *       }
 *     ],
 *     "model_used": "hirelabs-matcher",
 *     "dim": 384,
 *     "count": 1
 *   }
 * }
 */
export async function POST(request) {
  const auth = await authenticateRequest(request);
  if (auth.response) {
    return auth.response;
  }

  let body;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 50000) {
      return apiError('INVALID_REQUEST', 'Request body exceeds maximum size.', 413);
    }
    body = JSON.parse(rawBody);
  } catch {
    return apiError('INVALID_JSON', 'Invalid JSON request body.', 400);
  }

  const rawJd = body?.job_description || body?.jobDescription || body?.text;
  if (typeof rawJd !== 'string' || !rawJd.trim()) {
    return apiError('INVALID_REQUEST', 'A non-empty job_description is required.', 400);
  }

  const jdText = cleanResumeText(rawJd, MAX_JD_LENGTH);
  if (!jdText) {
    return apiError('INVALID_REQUEST', 'Job description contains no readable text.', 400);
  }

  const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 200) : null;
  const matchCount = Math.min(
    Math.max(1, Number.isInteger(body?.match_count) ? body.match_count : DEFAULT_MATCH_COUNT),
    MAX_MATCH_COUNT
  );

  try {
    // 1. Generate 384-d dense embedding via hirelabs-matcher
    const { vector, dim, model_used } = await embedText(jdText);

    if (!Array.isArray(vector) || vector.length !== 384) {
      throw new Error(`Invalid embedding vector dimension: expected 384, got ${vector?.length}`);
    }

    // 2. Persist job description in public.job_descriptions (scoped to user via RLS)
    try {
      await auth.supabase.from('job_descriptions').insert({
        user_id: auth.user.id,
        title: title || 'Job Description',
        text: jdText,
        embedding: vector,
      });
    } catch (saveJdErr) {
      // Non-fatal if table migration hasn't run yet in dev
      console.warn('Could not persist job description:', saveJdErr.message);
    }

    // 3. Call pgvector match_resumes RPC
    const { data: rawMatches, error: rpcError } = await auth.supabase.rpc('match_resumes', {
      query_embedding: vector,
      match_count: matchCount,
    });

    if (rpcError) {
      console.error('match_resumes RPC failed:', rpcError);
      throw rpcError;
    }

    const matchesList = Array.isArray(rawMatches) ? rawMatches : [];

    // 4. Enrich matched resumes with profile fields if matches were found
    let enrichedMatches = matchesList;
    if (matchesList.length > 0) {
      const matchIds = matchesList.map((m) => m.id);
      const { data: resumeProfiles, error: profileErr } = await auth.supabase
        .from('resumes')
        .select('id, candidate_name, candidate_title, years_experience, extracted_skills, profile_completeness')
        .in('id', matchIds)
        .eq('user_id', auth.user.id);

      if (!profileErr && Array.isArray(resumeProfiles)) {
        const profileMap = new Map(resumeProfiles.map((p) => [p.id, p]));
        enrichedMatches = matchesList.map((m) => {
          const profile = profileMap.get(m.id) || {};
          return {
            id: m.id,
            file_name: m.file_name,
            similarity: Number(Number(m.similarity || 0).toFixed(4)),
            candidate_name: profile.candidate_name || null,
            candidate_title: profile.candidate_title || null,
            years_experience: profile.years_experience ?? null,
            extracted_skills: profile.extracted_skills || [],
            profile_completeness: profile.profile_completeness || 0,
          };
        });
      }
    }

    return apiSuccess({
      matches: enrichedMatches,
      model_used: model_used || 'hirelabs-matcher',
      dim,
      count: enrichedMatches.length,
    });
  } catch (error) {
    console.error('Match endpoint error:', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
    });

    return apiError('MATCH_FAILED', 'Failed to match candidate resumes. Please retry.', 500);
  }
}
