# Sagnik — Matching Model + pgvector + Match API (`hirelabs-matcher`)

Read [00-shared-plan.md](00-shared-plan.md) first for the data formats and rules.

## Your goal

Train our own **embedding model** (a model that turns text into vectors), so that resumes and job descriptions that fit each other land close together. Store the vectors in Supabase with **pgvector**, and build the endpoint that **ranks a user's resumes for a job description**. This is the "semantic matching" the README promises but the code doesn't have yet.

## You receive / you deliver

- **From Pushpita:** `pairs/train.jsonl`, `pairs/dev.jsonl`, and the resume and job description texts.
- **To Arpan:** the trained model folder (Arpan loads it in the model service's `/embed`).
- **To Sambit:** the `POST /api/match` endpoint and its response format.
- **To Mayukh:** a script or function that ranks test resumes for a given job description.

## Steps

### Week 1 — data + "before" numbers
- [x] Label your 50 resumes in Label Studio (everyone does this).
- [x] Baseline: run the off-the-shelf **`BAAI/bge-small-en-v1.5`** (384 dimensions, small, fast) on the dev pairs. For each job description, rank the resumes and record:
  - **Recall@5:** % of job descriptions where a truly good resume is in the top 5.
  - **MRR:** how high the first good resume appears.
- [x] Agree with Mayukh on exactly how these metrics are computed, so your numbers match theirs.

### Week 2 — train
- [x] Use the `sentence-transformers` library on Colab or Kaggle.
- [x] Training data: (job description, good resume) pairs where `fit_score ≥ 75`. Add **hard negatives**: resumes from the same field with `fit_score < 50`.
- [x] Loss: `MultipleNegativesRankingLoss`. Start with 1–3 epochs and batch size 32.
- [x] Evaluate on dev with `InformationRetrievalEvaluator` and compare against the week-1 baseline.
- [x] Save the model as `hirelabs-matcher` to Drive or the Hugging Face Hub.

### Weeks 2–3 — database (migration `supabase/migrations/005_semantic_matching.sql`)
- [x] Enable `vector`; add an `embedding vector(384)` column and `embedded_at timestamptz` to `public.resumes`.
- [x] Create a `public.job_descriptions` table (`id`, `user_id`, `title`, `text`, `embedding vector(384)`, `created_at`) with **RLS policies in the same style as `001_create_resumes.sql`**.
- [x] Add an HNSW index on `resumes.embedding` using `vector_cosine_ops`.
- [x] Add the ranking function. Starting sketch (check it against the Supabase docs):

```sql
create or replace function public.match_resumes(query_embedding vector(384), match_count int default 10)
returns table (id uuid, file_name text, similarity float)
language sql stable security invoker
as $$
  select r.id, r.file_name, 1 - (r.embedding <=> query_embedding) as similarity
  from public.resumes r
  where r.user_id = auth.uid() and r.embedding is not null
  order by r.embedding <=> query_embedding
  limit match_count;
$$;
```

- [x] Update the README: it says 1536-dimension Gemini embeddings. Ours are **384**.

### Week 3 — API
- [x] **Embed on parse:** after `parse-resume` succeeds, call Arpan's `/embed` and save the vector. Set `processing_status` accordingly.
- [x] **`POST /api/match`:** body `{ "job_description": "..." }`. Use `authenticateRequest`, embed the job description, call `supabase.rpc('match_resumes', …)`, and return the ranked list in the shared `apiSuccess` format, with `model_used: "hirelabs-matcher"`.
- [x] Add a backfill script that embeds resumes uploaded before this change.

### Week 4 — integrate + report
- [x] Work with Sambit so the dashboard shows the real ranking.
- [x] Write report section 4: base model, training pairs, settings, before/after metrics, example rankings.

## What you show the teacher

1. **Top 5 resumes for the same job description, before vs after fine-tuning**, for 3 example jobs.
2. **Recall@5 and MRR**: base model vs `hirelabs-matcher` (your row in Mayukh's table).
3. Live demo: paste a job description, and the user's resumes get ranked by our model.

## Done when

- [x] `hirelabs-matcher` beats the base model on dev Recall@5.
- [x] Migration works on a fresh Supabase project. A user can't see another user's vectors (test this with 2 accounts).
- [x] `/api/match` returns a ranked list, and new uploads get embedded automatically.
- [x] Report section 4 is written.

## Watch out for

- **The vector size must match everywhere** (model, column, function): 384.
- Keep `security invoker` and the `auth.uid()` filter, or users could see each other's resumes.
- Use the same cleaned resume text for training and in the app (`lib/resume/text.js`).
- **Never train on `test/`.**
