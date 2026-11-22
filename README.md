# HireLabs

An AI-assisted resume workspace built with the Next.js App Router, Supabase (Auth, Postgres, Storage), custom fine-tuned `hirelabs-matcher` embeddings (384d), and pgvector. Recruiters upload PDF/DOCX resumes into a private storage bucket, HireLabs parses them, and the dashboard ranks candidates against a job description and explains each evaluation. Resume files, embeddings, and profile data are scoped to the signed-in user through row-level security.

## Status

| Area | State |
|---|---|
| Auth, upload, private storage, resume library | Built |
| Resume parsing | Built. A downloaded spaCy model (`en_Resume_Parser_pipeline`) is served by the model server. Our own trained parser (`hirelabs-parser`) is in progress. If the parser is unavailable, the resume text is saved without profile fields. There is no external fallback. |
| Candidate evaluation and role brief | Run only on our fine-tuned evaluator (`hirelabs-evaluator`) through Ollama. Fine-tuning is in progress. If Ollama is down, the API returns 503. |
| Semantic matching | Built. The `/api/match` endpoint, pgvector HNSW migration (`supabase/migrations/005_semantic_matching.sql`), and `hirelabs-matcher` model (384d fine-tuned from `BAAI/bge-small-en-v1.5`) are implemented (see [`docs/api/MATCH_CONTRACT.md`](docs/api/MATCH_CONTRACT.md)). |
| Model results page | Built. It shows real numbers once the evaluation script writes `public/model-results.json` (see [`docs/results/RESULTS_FORMAT.md`](docs/results/RESULTS_FORMAT.md)). |

## Dashboard features

- **Model badge:** every AI result shows which model answered: green "Our model" for `hirelabs-*` models, amber for an offline placeholder.
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

1. **Create a Supabase project.** Under **Authentication → URL Configuration**, set the Site URL to your current environment (`http://localhost:3000` locally, your production domain otherwise) and add `http://localhost:3000/auth/callback` (plus `https://YOUR-DOMAIN/auth/callback` in production) as redirect URLs. Then apply the recommended settings in [Authentication](#authentication).

2. **Run the migrations.** Open the Supabase SQL Editor and execute **every** file in [`supabase/migrations/`](supabase/migrations/) in filename order (`001` … `006`). Alternatively, link the Supabase CLI and run `supabase db push`. `005` (pgvector, `job_descriptions`, `match_resumes`) is required for **Rank candidates**, and `006` must follow `003`, or every successful parse is rejected by the status check. `GET /api/health` reports which parts of the schema are present.

3. **Configure environment variables.** Copy `.env.example` to `.env.local` and fill in your project URL and anon key. No external AI key is needed: every model runs on the team's own services (see [Run everything locally](#run-everything-locally)). `SUPABASE_SERVICE_ROLE_KEY` is reserved for future privileged background jobs and must never be exposed to the browser.

4. **Start the dev server.**

   ```bash
   npm install
   npm run dev
   ```

   Create an account or sign in with email and password, upload a PDF or DOCX, then submit a job description to test the full flow.

5. **Start the matching service** (needed for **Rank candidates**). It serves `POST /embed` with the `hirelabs-matcher` model:

   ```bash
   python3 -m venv .venv-matcher
   .venv-matcher/bin/pip install -r scripts/python/requirements-matcher.txt
   .venv-matcher/bin/python scripts/python/embed_service.py
   ```

   It listens on `http://localhost:8000` (change with `PORT`) and loads the fine-tuned model from `models/hirelabs-matcher` (change with `MATCHER_MODEL_PATH`). If that folder is missing, it falls back to the base `BAAI/bge-small-en-v1.5` and reports `bge-small-en-v1.5-baseline`. Point the app at it with `EMBED_SERVICE_URL` (default `http://localhost:8000/embed`).

   If the service isn't running in development, the app silently switches to hash-based placeholder vectors (`hirelabs-matcher-fallback`) so the flow stays clickable. The dashboard labels those results **"Offline placeholder, not a real model"** and warns that the scores are meaningless. Never demo with the placeholder. In production the request fails instead.

6. **Check your changes** before opening a pull request:

   ```bash
   npm run check
   ```
### Run everything locally

1. Configure Supabase as described above. For a local Supabase instance, start Docker, run `supabase init` if `supabase/config.toml` is absent, then run `supabase start` and `supabase migration up --local`. Use the URL and public key from `supabase status` in `.env.local`.
2. Run `npm ci`. Set `USE_LOCAL_MODELS=true` in `.env.local`.
3. Run `python -m venv .venv`. Activate with `.venv\Scripts\Activate.ps1` in PowerShell or `source .venv/bin/activate` on macOS/Linux. Install dependencies with `python -m pip install -r services/model-server/requirements.txt` and install the team's parser wheel with `python -m pip install <wheel-path>`. Set `PARSER_MODEL` to its spaCy package name if it differs from `hirelabs_parser` and set `MATCHER_MODEL` to the local SentenceTransformer model directory. Start FastAPI and check its readiness.

   ```sh
   python -m uvicorn main:app --app-dir services/model-server --host 127.0.0.1 --port 8000
   curl http://127.0.0.1:8000/health
   ```

4. Start Ollama with `ollama serve` if needed. In the directory containing the team's evaluator GGUF and Modelfile, run `ollama create hirelabs-evaluator -f Modelfile`. The Modelfile must reference the GGUF and use the team's training template. The app requests a 16384-token context (`OLLAMA_NUM_CTX`) and refuses any prompt that would not fit, because Ollama would otherwise cut it silently.
5. Run `npm run dev`. Upload a resume to verify `data.model_used=hirelabs-parser`. Run candidate analysis to verify `data.model_used=hirelabs-evaluator`. Run the role brief to verify it also reports `hirelabs-evaluator`. Stop Ollama and the analysis returns 503 `LOCAL_EVALUATOR_UNAVAILABLE`. Stop FastAPI and parsing saves the text without profile fields. Candidate analysis drops any evidence quote that is not in the resume text and reports the count as `evidence_removed`. The authenticated `POST /api/embeddings` accepts `{"texts":["example"]}` and returns 384-dimensional vectors.

For interface development, set `MODEL_PLACEHOLDERS=true` in the Python service environment and `EVALUATOR_PLACEHOLDER=true` in `.env.local`. Responses identify placeholders explicitly. Disable these options for the live demo. Keep both model services bound to loopback for local use.

### Run the fairness audit

Use 20 authorized dev resumes. Mayukh controls the locked test set. Create a private JSONL manifest with fields `id`, `split`, `role`, `jobDescription`, `candidate`, and `variants`. Candidate fields follow the analysis API and include `name`, `parsedText`, and optional `title`, `skills`, and `yearsExperience`. Each variant has a distinct `name` and an optional `gender_terms` object mapping exact, case-sensitive terms to replacements. Review each edit to preserve job evidence. Use resumes cleared for both providers.

Set `USE_LOCAL_MODELS=true` and `ENABLE_BIAS_CHECK=true` in the local Next.js environment and restart it. Set `HIRELABS_ACCESS_TOKEN` in your shell to a current Supabase access token for the test user. If using a different Ollama model name, also set `BIAS_EXPECTED_LOCAL_MODEL` to that name.

```sh
python scripts/eval/bias_check.py path/to/private-cases.jsonl --output fairness-results.json
```

The script writes aggregate metrics. Keep the manifest and weights outside Git. See [report sections 6 and 8](docs/model-serving-and-fairness.md).

### Development Without Outbound Email

The login screen uses email and password. To create a local account without configuring SMTP:

1. Go to **Supabase → Authentication → Providers → Email** and temporarily disable **Confirm email**.
2. Use **Create an account** with a password of at least eight characters.
3. Re-enable confirmation and configure a transactional email provider before deploying to production.

Password reset emails link to `/auth/callback?next=/auth/update-password`, so the `/auth/callback` redirect URLs above are all that's needed.

## Authentication

- **Sessions live in cookies** (`@supabase/ssr`), not localStorage. `proxy.js` (Next.js 16's replacement for middleware) refreshes the session on each page request and redirects signed-out visitors from `/dashboard` and `/dashboard/resumes` to the sign-in dialog, then back to the page they wanted. `/dashboard/results` stays public.
- **API routes** still verify the bearer token on the server (`lib/supabase/server-auth.js`), and row-level security protects the data. The proxy check is a convenience layer, not the only protection.
- **Redirects after sign-in** only go to same-site paths (`lib/auth/redirect.js`).
- **Error messages** are mapped to plain language, and sign-up and password reset never reveal whether an email is registered (`lib/auth/messages.js`).
- **Passwords** need at least 8 characters with letters and numbers, at most 72, and must not contain the email name (`lib/auth/password.js`).

Recommended Supabase dashboard settings (enforced on the server, so they can't be bypassed):

| Where | Setting |
|---|---|
| Authentication → Providers → Email | **Confirm email**: on. **Minimum password length**: 8. **Password requirements**: letters and digits. |
| Authentication → Attack Protection | **Leaked password protection**: on (if your plan includes it). Optionally enable **CAPTCHA** (hCaptcha or Turnstile); the sign-in form needs a CAPTCHA widget added before you turn this on. |
| Authentication → Rate Limits | Keep the defaults, or lower the sign-in/sign-up limits for the demo. |
| Authentication → URL Configuration | Site URL set to your real domain; redirect URLs limited to your own `/auth/callback` URLs. |
| Authentication → Emails → SMTP | Use your own SMTP provider before real users sign up (the built-in sender is heavily rate limited). |

Existing users are signed out once after this change, because sessions moved from localStorage to cookies.

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

> The API routes declare `maxDuration = 60`, so resume processing can run for up to 60 seconds. Vercel can't run the Python model server or Ollama. A Vercel deployment reaches them on a team machine through a Cloudflare tunnel protected by a shared token (`MODEL_API_TOKEN`). See [Hosting the team's models](docs/hosting-models.md) and `scripts/host-models.sh`. Without hosting, AI features return 503.

## Security and Operational Notes

- The migration enables RLS on every application table and restricts storage paths to `<auth-user-id>/...`.
- The planned `match_resumes` function must filter by `auth.uid()`, so users can't see each other's resumes (see `docs/api/MATCH_CONTRACT.md`).
- Explanations are instructed to rely on supplied evidence, flag gaps, and avoid protected characteristics. Treat AI scoring as decision support — retain human review and audit logs.
- Semantic matching uses our fine-tuned `hirelabs-matcher` embedding model (384 dimensions, fine-tuned from `BAAI/bge-small-en-v1.5`), stored with pgvector and indexed via HNSW. Changing the embedding model or dimension count requires a corresponding vector column and index migration.

## AI copilot configuration

The Candidate matching workspace has two AI features, both answered by the team's own evaluator (`hirelabs-evaluator` in Ollama):

- AI role brief: turns a job description into must-have skills, nice-to-have skills, screening signals, and interview focus.
- AI candidate deep dive: summarizes candidate fit, strengths, gaps, evidence signals, risk flags, and generates tailored interview questions.

No external AI provider is called. Set `OLLAMA_URL`, `OLLAMA_MODEL` and `OLLAMA_NUM_CTX` (default 16384, which should match the Modelfile) to point the app at the evaluator.
