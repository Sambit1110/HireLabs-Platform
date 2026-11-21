# HireLabs

An AI-assisted resume workspace built with the Next.js App Router and Supabase (Auth, Postgres, Storage). Recruiters upload PDF/DOCX resumes into a private storage bucket, HireLabs parses them, and the dashboard ranks candidates against a job description and explains each evaluation. Resume files and profile data are scoped to the signed-in user through row-level security.

## Status

| Area | State |
|---|---|
| Auth, upload, private storage, resume library | Built |
| Resume parsing | Built. A downloaded spaCy model (`en_Resume_Parser_pipeline`) runs first, with Gemini as the fallback. Our own trained parser (`hirelabs-parser`) is in progress. |
| Candidate evaluation | Built on Gemini. Our fine-tuned evaluator (`hirelabs-evaluator`) is in progress and will become the primary model. |
| Semantic matching | Dashboard UI built. The `/api/match` endpoint, pgvector migration and `hirelabs-matcher` model are in progress (see [`docs/api/MATCH_CONTRACT.md`](docs/api/MATCH_CONTRACT.md)). |
| Model results page | Built. It shows real numbers once the evaluation script writes `public/model-results.json` (see [`docs/results/RESULTS_FORMAT.md`](docs/results/RESULTS_FORMAT.md)). |

## Dashboard features

- **Model badge:** every AI result shows which model answered: green "Our model" for `hirelabs-*` models, grey "Gemini fallback" otherwise.
- **Explained evaluations:** fit score and verdict, matched vs missing skills, quoted resume evidence, risk flags and interview questions. "Insufficient evidence" is never turned into a score.
- **Rank candidates for a job:** paste a job description to rank your parsed resumes, then use **Explain score** to open the full evaluation.
- **Model results** (`/dashboard/results`): keyword baseline vs Gemini vs our models on a held-out test set, plus the fairness check.
- In development (`npm run dev`), **Preview sample** buttons show clearly labelled fictional data, so the UI can be built and demoed before the models are ready. They are hidden in production builds.

## Project Structure

```text
app/                           App Router pages, API routes and auth flow
  api/parse-resume/            PDF/DOCX extraction + profile enrichment
  api/ai-analyze/              Role briefs and candidate evaluations
  api/resumes/[resumeId]/      Resume delete (storage object + row)
  dashboard/                   Overview, resume library (/resumes), model results (/results)
components/
  dashboard/                   Dashboard, AI analysis, ranking, evaluation view, model badge, results
  landing/                     Public marketing sections
  layout/, resume/, ui/        Navbar/footer, upload component, reusable primitives
lib/
  ai/                          AI JSON parsing, model badge info, evaluation normalization
  eval/                        Model results file validation and formatting
  fixtures/                    Clearly labelled SAMPLE data for development previews
  resume/, supabase/, api/     Resume validation/text, Supabase clients and auth, API envelope
scripts/python/                spaCy resume parser runner
supabase/migrations/           Database schema and RLS policies
docs/                          API contracts, results format, demo script, report drafts
legacy/                        Original static prototype (reference only)
```

The original static prototype (`index.html`, `signup.html`, `app.js`, `style.css`, `supabase.js`) lives in [`legacy/`](legacy/README.md) for reference only.

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

5. **Check your changes** before opening a pull request:

   ```bash
   npm run check
   ```

### Resume trained-model setup

The resume parser uses the included spaCy transformer/NER wheel as the primary extraction model. Gemini remains a fallback for environments where the Python model cannot run.

```bash
uv venv --python 3.11 .venv
uv pip install --python .venv/Scripts/python.exe -r scripts/python/requirements.txt
```

Set `RESUME_PYTHON_PATH` when your Python executable is outside `.venv/Scripts/python.exe`. The model package is stored in `models/`.

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

> The API routes declare `maxDuration = 60`, so resume processing can run for up to 60 seconds. Vercel can't run the Python parser or a local LLM server, so a deployment there uses the Gemini fallback. For the demo, run everything locally.

## Security and Operational Notes

- The migration enables RLS on every application table and restricts storage paths to `<auth-user-id>/...`.
- The planned `match_resumes` function must filter by `auth.uid()`, so users can't see each other's resumes (see `docs/api/MATCH_CONTRACT.md`).
- Explanations are instructed to rely on supplied evidence, flag gaps, and avoid protected characteristics. Treat AI scoring as decision support — retain human review and audit logs.
- The planned embedding column must match the embedding model's dimension count (384 for the `bge-small` family). Changing models requires a new column and index migration.

## AI copilot configuration

HireLabs includes optional Gemini-powered recruiting features in the Candidate matching workspace:

- AI role brief: turns a job description into must-have skills, nice-to-have skills, screening signals, and interview focus.
- AI candidate deep dive: summarizes candidate fit, strengths, gaps, evidence signals, risk flags, and generates tailored interview questions.

Keep the Gemini key server-side. Add `GEMINI_API_KEY` to your local `.env.local` and to the Vercel project Environment Variables. The client never receives the key.

The app calls Gemini through `@google/genai` (`models.generateContent`) and defaults to `gemini-3.5-flash` for analysis and `gemini-3.7-flash` for resume parsing; set `GEMINI_MODEL` to override both.
