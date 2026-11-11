# Phase 2 Backend

## Authentication and Supabase client

`authenticateRequest` reads `Authorization: Bearer <access_token>`, verifies it through Supabase Auth `getUser(token)`, and creates an anon-key Supabase client carrying the same bearer header. The verified user ID is the only identity used for row queries. No service-role key is used or exposed.

## Response format

Protected routes use `{ success: true, data }` and `{ success: false, error: { code, message } }` through `lib/api/response.js`. Internal errors are logged server-side and generic client messages are returned.

## Parsing and persistence

`POST /api/parse-resume` accepts `{ "resumeId": "<uuid>" }`. It queries by both ID and verified owner, reads `file_path` from the database, downloads from the private bucket using the user-scoped client, validates file kind and size, extracts PDF/DOCX text, optionally enriches with Gemini, and persists only migration 002 fields. Status follows `uploaded → processing → parsed`; extraction/persistence failures set `failed`, while missing/unavailable Gemini preserves text and records a human-readable `parser_error` with status `parsed`.

## Resume deletion

`DELETE /api/resumes/[resumeId]` awaits the Next dynamic `params`, verifies owner-scoped lookup, removes the Storage object, then deletes the row. Storage failure preserves the row. A database deletion failure after object removal returns an explicit partial-failure message.

## RLS and Storage security

Migrations 001 and 002 are reused unchanged. Table RLS, the private bucket, and user-folder policies remain in force. Database and Storage calls use the authenticated JWT. The intentionally absent Storage UPDATE policy remains absent. No Phase 3 schema or live migration was introduced.

## Testing and limitations

Deterministic auth tests mock `getUser`, and a deletion security test verifies lookup is scoped to the authenticated user and Storage is untouched when no owned row exists. Utility tests cover text normalization, JSON parsing, file checks, and response envelopes. `npm run check` passes and the production build succeeds. The installed Next 16.3.3 Route Handler and App Router guides were reviewed, including async dynamic `params`. No production credentials or live Supabase/Gemini integration was exercised; no end-to-end Supabase flow was run.

## Phase 3 handover

Phase 2 persists resume text and extracted skills, plus candidate name/title, years of experience, profile completeness, parser error, and status. These are the usable source fields for later embedding generation. Phase 2 does not create or expose embeddings, similarity scores, rankings, jobs, or matching RPCs. Phase 3 must first choose and document a Gemini embedding model/dimension pair, add a reviewed migration for the vector extension/column/index and owner-enforcing match RPC, then backfill and embed newly parsed text. Matching must remain scoped to `auth.uid()` and the user-specific records; the private Storage bucket is not a matching interface.

## Files created and modified

Created `lib/api/response.js`, `lib/supabase/server-auth.js`, `lib/resume/text.js`, `lib/ai/parse-json.js`, and `app/api/resumes/[resumeId]/route.js`. Modified `app/api/parse-resume/route.js`, `app/api/ai-analyze/route.js`, `lib/resume/validation.ts`, and `package.json`.
