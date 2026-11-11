# Phase 2 Frontend

## Dashboard architecture

`/dashboard` and `/dashboard/resumes` render the shared client-side `DashboardApp`. It validates the Supabase session on entry, listens for sign-out, redirects unauthenticated visitors to `/`, and loads rows scoped to the current user. This is navigation UX; API authorization is enforced separately on the server.

## Route structure and authentication UX

- `/dashboard`: welcome, signed-in email, real total/parsed/pending/failed counts, recent uploads, upload action, and library navigation.
- `/dashboard/resumes`: all resume records, refresh, processing retry, and confirmed deletion.
- Successful password sign-in and immediate signup redirect to `/dashboard`. Email confirmation callbacks default there. Password reset continues to use the existing callback and update-password routes.
- Logout signs out through Supabase and returns to `/`.

## Upload integration and UI states

`ResumeUpload.tsx` validates PDF/DOCX and the 5 MB limit, uploads each file to `<user_id>/<uuid>.<extension>` in the private `resumes` bucket, creates its row, then sends an authenticated parse request. Storage objects are removed if row insertion fails. Per-file upload/processing messages and results are shown; failed rows remain available for retry.

The library shows only existing columns: candidate name/title, original filename, type, size, creation date, processing status, skills, experience, and parser limitation. Loading, empty, parsed, pending, failed, errors, refresh, and deletion confirmation are represented. No score/tips fields are queried.

The authenticated dashboard retains both protected AI modes in `AIAnalysisPanel`: role brief and candidate review. It sends the existing `role`, `jobDescription`, and candidate `{ name, title, skills, parsedText, yearsExperience }` schema with a bearer token. Candidate review only offers parsed resumes and labels the output as decision support for human review.

## API integration

Browser requests to parsing and deletion include the current Supabase access token as a Bearer token. The marketing preview uses labeled fictional examples only and does not access real resumes or claim semantic matching. AI features requiring protected APIs are behind sign-in in the dashboard experience.

## Testing

`tests/resume-utils.test.js` covers file validation, text cleaning, AI JSON parsing, and response envelopes. `tests/auth.test.js` uses deterministic mocked Supabase Auth responses; `tests/resume-security.test.js` verifies user-scoped deletion lookup. `npm run check` runs lint, typecheck, and Vitest.

## Files created and modified

Created `components/dashboard/DashboardApp.tsx`, `components/dashboard/AIAnalysisPanel.tsx`, `app/dashboard/page.tsx`, `tests/resume-utils.test.js`, `tests/auth.test.js`, and `vitest.config.js`. Modified `app/dashboard/resumes/page.tsx`, `app/page.jsx`, `app/auth/callback/page.jsx`, `components/resume/ResumeUpload.tsx`, `components/landing/InteractiveDemo.jsx`, `app/layout.jsx`, `index.css`, `eslint.config.mjs`, `components/ui/Tabs.jsx`, `package.json`, and `package-lock.json`.
