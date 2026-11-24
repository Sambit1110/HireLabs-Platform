# Recruiter feedback: human labels from real use

Every candidate evaluation ends with **"Was this score right?"**: Agree / Disagree, an optional
own score (0–100) and a note. Each answer is a human judgement of one (resume, job) evaluation,
which is exactly the label the dataset lacks (all 48 reviewed pairs are `gemini_checked`).

## Set up (once)

Run [supabase/migrations/007_evaluation_feedback.sql](../supabase/migrations/007_evaluation_feedback.sql)
in the Supabase SQL editor. It creates `evaluation_feedback` with row-level security: each
recruiter reads and writes only their own rows. Until it is run, the feedback box says so instead
of failing.

## What is stored

One row per recruiter, resume and job (giving feedback again updates it): the job description
and its SHA-256, the model and what it said (`model_score`, `model_verdict`), the recruiter's
`agrees`, `human_score`, `human_verdict` (derived from the score with the dataset bands: strong
75–100, moderate 50–74, weak 0–49) and an optional note.

## Where it shows

- **Model results** shows a "Recruiter feedback" summary for the signed-in recruiter: how often
  they agreed, how often the verdicts match, and the Spearman correlation and mean difference
  between their scores and the model's (from 3 scores up).
- `GET /api/feedback` returns the same summary; `POST /api/feedback` saves a judgement.

## Export as human labels

```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  node scripts/evaluator/export_feedback.mjs /path/private/feedback.jsonl
```

Writes one JSON line per judgement (`label_source: "human"`, with the resume text and job) and
`feedback.summary.json` with the agreement figures for the report. The file contains resume text:
keep it private, never in git. The service-role key reads everyone's feedback and must never be a
`NEXT_PUBLIC_` variable.
