# HireLabs

An AI-powered resume parser and semantic applicant tracking system built with Next.js App Router, Supabase (Auth, Postgres, Storage), Gemini embeddings, and pgvector. Candidate files remain in a private Supabase Storage bucket; vectors and profile data are scoped to the signed-in user through row-level security.

## Project Structure

```text
app/                           App Router pages and auth flow
  auth/callback/               Supabase magic-link / OAuth callback
  dashboard/resumes/           Authenticated resume management view
components/
  landing/                     Public marketing and interactive demo sections
  layout/                      Navbar and footer
  resume/                      Resume upload component
  ui/                          Reusable primitives (Badge, Button, Modal, Tabs, etc.)
lib/
  resume/validation.ts         File-type and size validation
  supabase/client.ts           Browser Supabase client singleton
supabase/migrations/           Database schema and RLS policies
```

The root `index.html`, `signup.html`, `app.js`, `style.css`, and `supabase.js` are retained as the original static prototype. See [`legacy/README.md`](legacy/README.md) for details. New work should go into the Next.js implementation.

## Local Setup

1. **Create a Supabase project.** Under **Authentication → URL Configuration**, set the Site URL to your current environment (`http://localhost:3000` locally, your production domain otherwise) and add `http://localhost:3000/auth/callback` as a redirect URL. Enable email magic links.

2. **Run the migration.** Open the Supabase SQL Editor and execute the file in [`supabase/migrations/`](supabase/migrations/) in filename order. Alternatively, link the Supabase CLI and run `supabase db push`.

3. **Configure environment variables.** Copy `.env.example` to `.env.local` and fill in your project URL, anon key, and a Gemini API key. `SUPABASE_SERVICE_ROLE_KEY` is reserved for future privileged background jobs and must never be exposed to the browser.

4. **Start the dev server.**

   ```bash
   npm install
   npm run dev
   ```

   Sign in with a magic link, upload a PDF or DOCX, then submit a job description to test the full flow.

### Development Without Outbound Email

The login screen supports both magic-link and email/password sign-in. To create a local account without configuring SMTP:

1. Go to **Supabase → Authentication → Providers → Email** and temporarily disable **Confirm email**.
2. Use **Create an account** with a password of at least eight characters.
3. Re-enable confirmation and configure a transactional email provider before deploying to production.

Add `http://localhost:3000/reset-password` and `https://YOUR-DOMAIN/reset-password` to Supabase Auth redirect URLs to support password resets.

## Deploying with GitHub and Vercel

1. Push your repository to GitHub:

   ```bash
   git add .
   git commit -m "Deploy HireLabs"
   git push -u origin main
   ```

2. In Vercel, select **Add New → Project**, import the repository, and use the default Next.js framework preset.

3. Add every variable from `.env.example` under **Project → Settings → Environment Variables**. Use production Supabase credentials. Never add secrets with a `NEXT_PUBLIC_` prefix unless they are intentionally browser-safe.

4. Set the Supabase Site URL to `https://YOUR-VERCEL-DOMAIN` and add `https://YOUR-VERCEL-DOMAIN/auth/callback` to redirect URLs, then deploy. Subsequent pushes trigger Vercel preview and production deployments automatically.

> `vercel.json` allows the resume-processing function to run for up to 60 seconds. For large-scale ingestion, move processing to a queue/worker while keeping the `resumes.processing_status` state machine.

## Security and Operational Notes

- The migration enables RLS on every application table and restricts storage paths to `<auth-user-id>/...`.
- The match RPC filters by `auth.uid()` even when invoked directly, preventing cross-team vectors from appearing in results.
- Explanations are instructed to rely on supplied evidence, flag gaps, and avoid protected characteristics. Treat AI scoring as decision support — retain human review and audit logs.
- Gemini Embedding 2 is requested at 1536 dimensions, matching the database column. Changing the embedding model or dimension count requires a corresponding vector column and index migration.
