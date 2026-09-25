# HireLabs

A resume parser and skill-based applicant tracking system built with the Next.js 16 App Router and Supabase (Auth, Postgres, private Storage). Gemini is used only for optional AI analysis.

What it does today:

- **Batch upload** of up to 20 PDF/DOCX resumes (5 MB each). Files go straight from the browser to a private Supabase Storage bucket.
- **Server-side parsing**: the API downloads each file from storage, extracts text (`pdf-parse`, `mammoth`), and pulls out name, title, years of experience and skills. Three resumes are processed in parallel; each result appears as soon as it is ready.
- **Transparent matching**: skills are matched as whole tokens against a curated catalog with exact aliases. `score = required skills found ÷ required skills`. It runs locally in the browser.
- **Optional AI analysis** (Gemini): a role brief and per-candidate deep dives.

HireLabs does **not** use embeddings, pgvector or vector search. Matching is deterministic skill matching.

## Project structure

```text
app/
  api/parse-resume/        POST { resumeId }: claim, download, parse, store
  api/ai-analyze/          POST role brief / candidate deep dive (Gemini)
  api/health/              Public health: config presence, DB + schema status (no secrets)
  auth/callback/           Email confirmation and password-recovery callback
  auth/update-password/    Set a new password after a recovery link
components/landing/        Marketing sections and the interactive workspace
hooks/
  useAuthSession.js        Cached Supabase session (no per-keystroke auth calls)
  useResumeProcessing.js   Batch queue, per-file state, retries, clearing
  useResumeMatching.js     Debounced, memoized local ranking
  useAiAnalysis.js         Independent per-candidate AI jobs
lib/
  resume/skills.js         Skill catalog and aliases
  resume/matching.js       Tokenizer, requirement extraction, scoring, ranking
  resume/profile.js        Rule-based profile extraction from text
  resume/parsing.js        File validation + PDF/DOCX text extraction (server)
  resume/batch.js          Bounded-concurrency runner, single-flight dedupe
  resume/service.js        Browser-side Supabase/API calls
  resume/validation.js     Shared file rules (type, extension, size)
  ai/analyze.js            Gemini prompts, schemas, request (server)
  server/auth.js           Bearer-token verification with Supabase
  server/rateLimit.js      Fixed-window limiter with a pluggable store
  server/guard.js          IP limit → auth (401/503) → per-user limit (429), body size (413)
  server/quota.js          Shared daily AI quota (Postgres RPC)
  server/aiConfig.js       Server-only Gemini settings + kill switch
  config.js                Browser-safe Supabase settings (publishable/anon fallback)
supabase/migrations/       Schema, RLS policies, claim function
tests/                     node:test suites
scripts/verify-production.mjs  Deployment verification (PASS / FAIL / SKIPPED)
```

## Local setup

1. **Create a Supabase project.** Under **Authentication → URL Configuration**, set the Site URL (`http://localhost:3000` locally) and add `http://localhost:3000/auth/callback` as a redirect URL.
2. **Run the migrations** in `supabase/migrations/` in filename order (SQL Editor, or `supabase db push`). `003` and `004` are required: the parse API calls `claim_resume_for_parsing` (003), the resume list selects its job columns, and the AI route and `/api/health` use `consume_api_quota` / `hirelabs_schema_status` (004). All migrations are additive; `003` and `004` are safe to re-run.
3. **Configure environment variables.** Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`) and, optionally, `GEMINI_API_KEY` / `GEMINI_MODEL`. The app never needs a service-role key.
4. **Start the dev server.**

   ```bash
   npm install
   npm run dev
   ```

Sign-in is email + password (with password reset). To test without SMTP, temporarily disable **Confirm email** under **Authentication → Providers → Email**, and re-enable it before deploying.

## Scripts

| Command         | Purpose                                   |
| --------------- | ----------------------------------------- |
| `npm run dev`   | Development server                        |
| `npm run build` | Production build                          |
| `npm run lint`  | ESLint (flat config, `eslint-config-next`) |
| `npm test`      | Unit tests (`node --test`)                 |
| `npm run verify:production -- --url https://YOUR-DOMAIN [--gemini] [--e2e]` | Checks a deployment; prints PASS / FAIL / SKIPPED, never secret values |

TypeScript: `typescript` is aliased to `@typescript/typescript6` so tooling that needs the TypeScript API (typescript-eslint, Next's type check) keeps working, and the TypeScript 7 compiler is installed as `@typescript/native`.

## Architecture

### Resume processing

```text
browser ── upload ──> Supabase Storage (resumes/<uid>/<uuid>.pdf)
        ── insert ──> resumes row (status: queued)
        ── POST /api/parse-resume { resumeId } ──> server
                                                   ├─ claim_resume_for_parsing()  queued → processing (atomic)
                                                   ├─ download file from Storage (as the user)
                                                   ├─ validate magic bytes / type / size, extract text
                                                   └─ update row → completed | failed
```

- No file bytes pass through the function body, so Vercel's request-size limit does not apply.
- States: `queued → processing → completed | failed`. On page load only `queued` rows are processed automatically. `failed` rows wait for an explicit **Retry**. A `processing` row older than 5 minutes shows as stalled and can be retried.
- **Duplicate protection:** the claim is one atomic `UPDATE … WHERE status IN (…)`, so two tabs cannot both parse the same resume. The completion write is conditioned on the job id (`processing_job_id`), so a superseded job cannot overwrite a newer result. In one tab, a single-flight map also collapses duplicate calls.
- **Batches:** each file gets a stable job id and its own state (`queued/uploading/processing/completed/failed`). A bounded pool (3 at a time) runs upload + parse per file; results are applied by id in completion order. A failure only marks that file.

### Matching

`lib/resume/matching.js`: requirements are the catalog skills found in the role and job description. If there are none, it falls back to meaningful keywords (4+ letters, not stop words). A candidate's evidence is their extracted skills plus catalog skills found in the resume text. Everything is compared as normalized whole tokens, so `java` ≠ `javascript` and `go` ≠ `good`. There is no base score or floor, so zero overlap scores 0%.

### Security

- Both API routes require `Authorization: Bearer <supabase access token>`. The token is verified with `supabase.auth.getUser()`, and all data access runs through a client carrying that token, so **RLS** applies. User IDs are never taken from the request body.
- The parse route also checks that the storage path starts with the caller's user id. The AI route loads uploaded resume text from the caller's own row instead of trusting client-sent text.
- **Burst limits** (per server instance, in memory): parse 30/min and 300/h per user, AI 10/min per user, plus per-IP limits → `429` with `Retry-After`.
- **Daily AI quota** (shared across all instances, in Postgres, migration 004): 50 requests per user per day and 1,000 per day for the whole app by default. Change them with `update public.api_quota_limits set user_daily_limit = …, global_daily_limit = … where scope = 'ai';`. Clients cannot read or raise the limits. If the quota function is unavailable, AI requests fail closed (503).
- **Kill switch:** `AI_FEATURES_ENABLED=false` disables every AI call immediately.
- **Request bodies** are capped (4 KB parse, 64 KB AI → `413`); prompts are clipped per field, Gemini output is capped with `max_output_tokens` and sanitized to the response schema before reaching the browser.
- Also set a budget / quota cap for the Gemini API key in Google Cloud: application limits cannot protect a leaked key.
- The storage bucket enforces the 5 MB limit and the PDF/DOCX MIME types (migration 003).

### Privacy

When a user runs an AI feature, the role, job description and the selected candidate profile (including parsed resume text for uploaded resumes) are sent to the configured AI provider (Google Gemini). Requests are sent with `store: false` so the interaction is not kept for later retrieval via the Interactions API. HireLabs does not store AI results. Treat AI output as decision support and keep a human in the loop.

## Deploying (Vercel)

Order matters: the code expects migrations 003 and 004.

1. **Apply migrations 001–004** to the production Supabase project (SQL Editor or `supabase db push`).
2. In Vercel, add the variables from `.env.example` to **Production** (production Supabase URL + publishable key; `GEMINI_API_KEY`, `GEMINI_MODEL`). Keep `GEMINI_API_KEY` server-only. `NEXT_PUBLIC_*` values are inlined at build time, so **redeploy** after changing them.
3. In Supabase → Authentication → URL Configuration, set the **Site URL** to the production domain and add `https://YOUR-DOMAIN/auth/callback**` to the redirect URLs (the password-reset link adds `?next=/auth/update-password`).
4. Deploy, then verify:

   ```bash
   curl https://YOUR-DOMAIN/api/health
   node --env-file=.env.local scripts/verify-production.mjs --url https://YOUR-DOMAIN --gemini --e2e
   ```

   `/api/health` must report `"status":"ok"` and `"schema_version":"verified"`. `--e2e` needs two dedicated test accounts (`VERIFY_A_EMAIL/PASSWORD`, `VERIFY_B_EMAIL/PASSWORD`) and checks sign-in, upload, server-side parsing, and database / Storage / API isolation between the two accounts.

Route handlers set `maxDuration = 60` for parsing and AI calls.
