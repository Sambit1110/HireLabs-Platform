# HireLabs — Team Assignment (Phases 1–6)

No individual contributor names are recorded in the repository, so role placeholders are used. Replace placeholders with actual names as teams are formed.

| Role                   | Scope                                                                |
| ---------------------- | -------------------------------------------------------------------- |
| **Frontend Developer** | Pages, components, UX, styling, dashboard UI                         |
| **Backend Developer**  | API routes, Supabase integration, auth guards, RLS-aware data access |
| **Database Engineer**  | Migrations, pgvector schema, indexes, RPCs, policy reviews           |
| **AI/ML Engineer**     | Gemini prompts/schema design, embeddings, matching quality           |
| **QA Engineer**        | Test infrastructure, lint/typecheck gates, release verification      |

Baseline established in Phase 1 (all roles): `npm run lint` (0 errors), `npm run typecheck` (`tsc --noEmit` clean), `npm run build` succeed. Do not merge changes that break any of the three. See `docs/project-analysis/PROJECT_AUDIT.md` for the issue register referenced below (I-x IDs).

Phase 2 implementation notes and actual contracts: [`docs/phase-2/FRONTEND.md`](phase-2/FRONTEND.md) and [`docs/phase-2/BACKEND.md`](phase-2/BACKEND.md). Lint, typecheck, all 13 Vitest tests, and the production build pass. The supplied snapshot has no `.git` metadata, so git status/diff are unavailable. No live Supabase integration was run.

## Phase 1 — Architecture audit & foundation ✅ COMPLETED

- Full audit, issue register, `PROJECT_AUDIT.md`, lint toolchain repair, pdf-parse import fix (I-1/I-2/I-3/I-10).
- Owner: QA Engineer (verification) + all roles (review).

## Phase 2 — Core application shell & persistence

- **Frontend Developer:** real `/dashboard` route (replace the redirect stub, I-7); render `ResumeUpload`; resume list + delete UI; neutralise the fabricated scores in `InteractiveDemo` (I-8, I-9).
- **Backend Developer:** server-side Supabase auth guard for both API routes (I-4); shared API response/error envelope; persist parse results to `resumes` and advance `processing_status` (I-6); resume delete endpoint (DB row + storage object).
- **Database Engineer:** review migration 002 usage; storage UPDATE-policy decision (I-14); no schema redesign.
- **QA Engineer:** introduce Vitest; cover `validateResume`, text cleaner, ai-analyze `parseJson`; CI-style lint/typecheck/test script.
- Gate: end-to-end upload → parse → persisted row demonstrable with a local Supabase project.

## Phase 3 — Semantic matching infrastructure

- **AI/ML Engineer:** embedding generation service (model + 1536 dims confirmed with DB), backfill strategy for existing resumes.
- **Database Engineer:** migration 003 — `create extension vector`, embedding column, ivfflat index, `match_resumes` RPC enforcing `auth.uid()` (I-5).
- **Backend Developer:** embed-on-parse hook, match endpoint wiring the RPC.
- **Frontend Developer:** job-description input UI consuming real (not mock) results.
- **QA Engineer:** contract tests for match endpoint with seeded fixtures (deterministic fake embeddings in tests only).

## Phase 4 — Candidate evaluation & ranking UI

- **Frontend Developer:** ranked candidate list, fit verdicts, detail view consuming `ai-analyze mode=candidate`.
- **AI/ML Engineer:** evidence-first prompt tuning, gap/risk-flag quality review; keep "decision support, human review" framing.
- **Backend Developer:** caching/limits on AI routes; job description persistence.
- **QA Engineer:** golden-output smoke tests, accessibility pass on new screens.

## Phase 5 — Analytics & workflow

- **Frontend Developer:** pipeline analytics views, status tracking.
- **Backend Developer:** audit logging (who viewed/ranked what), bulk ingestion queue design with `processing_status` state machine (README §deploy notes).
- **Database Engineer:** audit-log table + RLS; index tuning from real query plans.
- **QA Engineer:** load-test bulk parsing path, regression suite expansion.

## Phase 6 — Hardening & release

- **Backend Developer:** rate limiting on AI endpoints, CSP/security headers, secret rotation runbook.
- **Database Engineer:** backup/restore verification, policy review with least privilege.
- **Frontend Developer:** performance pass (lazy-load Three.js `VectorField`, bundle budget), final lint-warning cleanup (I-12).
- **QA Engineer:** full regression, penetration checklist (RLS cross-tenant tests), release sign-off.
