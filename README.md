# PrepGenius

Production-oriented AI resume parser and semantic applicant tracking system. It uses Next.js App Router, Supabase Auth/Postgres/Storage, Gemini embeddings, and pgvector. Resume files stay in a private Supabase Storage bucket; vectors and candidate profiles are scoped to the signed-in HR user through RLS.

## Project structure

```text
app/                         App Router pages and authenticated API routes
  api/resumes/process/       upload → extract → LLM normalize → embed
  api/match/                 job embedding → pgvector rank → explanation
components/                  dashboard, upload and match UI (shadcn-ready)
lib/                         Supabase clients, OpenAI and parsing modules
supabase/migrations/         database, pgvector, RLS and Storage policies
```

## Local setup

1. Create a Supabase project. In **Authentication → URL Configuration**, set the Site URL to the app you are currently using (`http://localhost:3000` locally, or your Vercel URL in production) and add `http://localhost:3000/auth/callback` as a redirect URL. Enable email magic links.
2. Open the Supabase SQL Editor and run [`supabase/migrations/20260728000000_prepgenius.sql`](supabase/migrations/20260728000000_prepgenius.sql). Alternatively, link the Supabase CLI and run `supabase db push`.
3. Copy `.env.example` to `.env.local` and fill in the project URL, anon key, and a Gemini API key. `SUPABASE_SERVICE_ROLE_KEY` is reserved for future privileged background jobs and must never be exposed to the browser.
4. Run `npm install`, then `npm run dev`. Sign in using a magic link, upload a PDF or DOCX, then submit a job description.

### Development without outbound email

The login screen also supports email/password sign-in. To create a local-development account without configuring SMTP, open **Supabase → Authentication → Providers → Email** and temporarily disable **Confirm email**, then use **Create development account** with a password of at least eight characters. Re-enable confirmation and use a transactional email provider before production.

Add `http://localhost:3000/reset-password` and `https://YOUR-VERCEL-DOMAIN/reset-password` to Supabase Auth redirect URLs to support password resets.

Apply every file in `supabase/migrations/` in filename order. The second migration creates a profile row automatically for password, OAuth, and magic-link users.

## Deployment with GitHub and Vercel

1. Create a GitHub repository, then run `git add .`, `git commit -m "Build PrepGenius"`, and `git push -u origin main`.
2. In Vercel, choose **Add New → Project**, import the repository, and use the default Next.js framework preset.
3. Add every variable from `.env.example` under **Project → Settings → Environment Variables**. Use the production Supabase URL and keys. Do not add secrets with the `NEXT_PUBLIC_` prefix unless they are intentionally browser-safe.
4. Set the Supabase Site URL to `https://YOUR-VERCEL-DOMAIN`, add `https://YOUR-VERCEL-DOMAIN/auth/callback` to Supabase Auth redirect URLs, then deploy. Git pushes now trigger Vercel preview/production deployments automatically.

`vercel.json` permits the resume-processing function to run for up to 60 seconds. For large-scale ingestion, move processing to a queue/worker and keep the same `resumes.processing_status` state machine.

## Security and operational notes

- The migration enables RLS for every application table and limits storage paths to `<auth-user-id>/…`.
- The match RPC filters by `auth.uid()` even when directly invoked, preventing cross-team vectors from appearing in results.
- Explanations are explicitly instructed to rely on supplied evidence, flag gaps, and avoid protected characteristics. Treat AI scoring as decision support; retain human review and audit logs.
- Gemini Embedding 2 is requested at 1536 dimensions, matching the database column. If you change embedding model/dimensions, migrate the vector columns and index together.
