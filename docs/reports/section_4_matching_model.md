# Section 4: Semantic Matching Model (`hirelabs-matcher`) & Vector Infrastructure

**Author:** Sagnik Dam (database, match API and first training scripts)  
**Training and evaluation on the team dataset (Nov 23):** Sambit Biswas, with AI coding assistance (Claude Code)  
**Role:** Matching Model, pgvector Database Infrastructure, and Match API  
**Project:** HireLabs ATS Platform  

---

## 1. Executive Summary & Objective

In early prototypes, HireLabs relied on keyword-based matching or generic off-the-shelf LLM prompts for candidate ranking. This approach presented three fundamental limitations:
1. **Vocabulary Mismatch:** Candidates expressing equivalent skills with alternative wording (e.g., "distributed systems" vs. "high-throughput microservices", or "dense retrieval" vs. "vector search") were penalized.
2. **Computational Latency & Cost:** Calling a general-purpose LLM to compare every candidate resume against a job description incurred $O(N)$ API round-trips, taking tens of seconds and risking quota exhaustion.
3. **Lack of In-House Ownership:** The system possessed no proprietary domain intelligence tuned specifically for technical recruitment.

To solve this, we designed, trained, and integrated **`hirelabs-matcher`**—a specialized **384-dimensional dense semantic embedding model** fine-tuned on contrastive resume-job description pairs with hard negative mining. Embeddings are indexed using **pgvector HNSW** in PostgreSQL, and served via an authenticated, user-scoped API (`POST /api/match`).

---

## 2. Model Architecture & Selection

### 2.1 Base Model Selection
We selected **`BAAI/bge-small-en-v1.5`** as our foundation encoder over alternative candidates (e.g., `all-MiniLM-L6-v2`, `text-embedding-ada-002`, and `gemini-embedding-001`):

| Model | Dimensions | Parameter Count | Embedding Size / Row | Inference Speed (CPU) | Rationale |
|---|---|---|---|---|---|
| **`BAAI/bge-small-en-v1.5` (Selected)** | **384** | **33.4M** | **~1.5 KB** | **< 15 ms / doc** | Top-tier MTEB retrieval performance, compact footprint, fast CPU inference for edge/serverless. |
| `all-MiniLM-L6-v2` | 384 | 22.7M | ~1.5 KB | ~12 ms / doc | Lower retrieval accuracy on complex technical job descriptions. |
| `text-embedding-ada-002` | 1536 | Closed API | ~6.0 KB | 180–400 ms (Network) | Vendor lock-in, recurring operational cost, 4x larger index footprint in pgvector. |
| `text-embedding-004` (Gemini) | 768 / 1536 | Closed API | ~3–6 KB | 200–500 ms (Network) | Requires external API keys, cannot be self-hosted or audited locally. |

By fixing our embedding dimension to **384**, we achieve a 4x reduction in PostgreSQL vector storage and index memory compared to 1536-dimensional proprietary embeddings, while maintaining sub-millisecond approximate nearest neighbor searches via HNSW.

---

## 3. Dataset & Training Method

### 3.1 Data used
Training and evaluation use the team dataset (`HireLabs-Data/`, kept out of git) and the shared pair format:
```json
{"pair_id": "p_train_j_0001_r_0492", "resume_id": "r_0492", "jd_id": "j_0001", "fit_score": 83, "fit_verdict": "strong", "label_source": "gemini_checked"}
```

| | Train | Dev |
|---|---:|---:|
| Labelled resume–job pairs | 24 | 24 |
| Job descriptions covered | 5 | 5 (the same 5) |
| Strong pairs (fit ≥ 75) | 13 | 9 |
| Weak pairs (fit < 50) | 10 | 10 |
| Resumes in the split (all are candidates at evaluation) | 700 | 150 |

Splits are by resume (`splits.json`): no resume appears in both train and dev, and the locked test split is never read. Every labelled pair has `label_source: gemini_checked`, meaning a person reviewed a score that Gemini first proposed (see 5.2).

### 3.2 Training examples
- **Positive:** (job description, resume) with verdict `strong`.
- **Hard negative:** a resume the reviewers marked `weak` for the same job.
- Each strong resume is paired with each weak resume of its job, giving **26 (job, good resume, weak resume) examples**.

### 3.3 Loss and settings
- **Loss:** `MultipleNegativesRankingLoss` (MNRL), the cross-entropy over similarities that rewards ranking the good resume above the others.
- **One example per step.** With only 5 job descriptions, a larger batch would mostly contain the same job, and MNRL would treat that job's other good resumes as wrong answers. Each step therefore compares one good resume with its hard negative. The script uses in-batch negatives automatically once there are at least twice as many job descriptions as the batch size (`scripts/python/train_matcher.py`).
- **Settings:** learning rate 2×10⁻⁵ (AdamW, 10% linear warm-up), 3 epochs, 384-dimensional output with L2 normalization, so cosine similarity equals the dot product.
- **Hardware:** a MacBook (Apple MPS). Training takes under 10 seconds.
- **Saved model:** `hirelabs-matcher/` with `training_run.json` (base model, settings, SHA-256 of every input file). The automatic model card is turned off because it would copy resume text into the model folder.

---

## 4. Quantitative Results

### 4.1 How it is measured (`scripts/python/evaluate_matcher.py`)
The test copies how the app ranks:
- For each of the 5 dev job descriptions, the model ranks **all 150 dev resumes**, not just the judged ones.
- A resume counts as relevant when the dev labels mark it `strong` for that job (9 relevant pairs). Unjudged resumes count as not relevant, which can only lower the scores.
- Texts are embedded exactly as the model server's `/embed` receives them, with no query prefix.

Metrics:
- **Recall@k:** share of job descriptions with a relevant resume in the top k.
- **MRR:** mean of 1 ÷ the rank of the first relevant resume.
- **Score agreement:** for each job, the Spearman correlation between the model's similarity and the human fit score over its judged dev resumes (about 5 per job), then averaged.

### 4.2 Dev results

| Model | Recall@5 | Recall@10 | MRR | Score agreement (Spearman) |
|---|---:|---:|---:|---:|
| `BAAI/bge-small-en-v1.5` (no fine-tuning) | 100% | 100% | 0.633 | 0.825 |
| **`hirelabs-matcher` (delivered model)** | **100%** | **100%** | **0.767** | **0.784** |
| `hirelabs-matcher`, range over 5 training runs | 100% | 100% | 0.767–0.900 | 0.784–0.804 |

Rank of the first relevant resume (out of 150), per job description:

| Job | j_0001 | j_0002 | j_0003 | j_0004 | j_0005 |
|---|---:|---:|---:|---:|---:|
| Base model | 3 | 1 | 3 | 2 | 1 |
| hirelabs-matcher | 3 | 1 | **1** | 2 | 1 |

### 4.3 What the numbers show
- **First relevant resume ranks higher:** MRR rose from 0.633 to 0.767 in the delivered model, and to between 0.767 and 0.900 across all five runs. Every run beat the base model on MRR.
- **Recall@5 can't separate them:** both models already put a relevant resume in the top 5 for all 5 jobs.
- **Agreement with human scores dipped slightly:** 0.825 for the base model vs 0.78–0.80 after fine-tuning. Training only teaches strong vs weak, so it can blur the order among middling resumes.
- **Runs vary:** results differ between runs because GPU training on the Mac isn't deterministic. The table reports the range, not the best run.

With 5 job descriptions, one job moving changes MRR by up to 0.13, so these are indicative numbers, not a measured improvement. The final comparison on the locked test set is Mayukh's.

---

## 5. Limitations

### 5.1 Too little labelled data
- **Small set:** 24 training pairs over 5 job descriptions. The training loss falls close to zero, so the model mostly memorizes these examples.
- **Untested on new jobs:** dev uses the same 5 job descriptions as training, so the results don't show how it handles job descriptions it hasn't seen.
- **More data is ready:** the dataset already holds 850 resumes and 300 job descriptions, plus 1,500 candidate pairs per split waiting for labels.

### 5.2 Labels started from Gemini
- **Where the labels came from:** each labelled pair is `gemini_checked`. Gemini proposed a score, and a team member reviewed and kept or corrected it.
- **Conflict with the project rule:** the project now uses no Gemini at all, so this model is **interim**.
- **The replacement:** blind human labels, where reviewers score pairs without seeing a proposal. Retrain on those with the same scripts, and record `label_source: human`.

### 5.3 What the qualitative tables in earlier drafts showed
Earlier drafts of this section reported 100% Recall@5 and an MRR of 1.0, and showed rankings of 5 fictional sample resumes. Those came from ranking 5 sample documents, not from the dev set. They are replaced by the results above.

## 6. Database Architecture & Multi-Tenant Security

### 6.1 Database Migration (`supabase/migrations/005_semantic_matching.sql`)
1. **Extension & Column:**
   - Enabled `vector` extension in PostgreSQL.
   - Added `embedding vector(384)` and `embedded_at timestamptz` to `public.resumes`.
2. **Indexing:**
   - Built an **HNSW (Hierarchical Navigable Small World)** index on `resumes.embedding` using `vector_cosine_ops` for sub-linear search time:
   ```sql
   create index if not exists resumes_embedding_hnsw_idx
     on public.resumes using hnsw (embedding vector_cosine_ops);
   ```
3. **Job Descriptions Table with RLS:**
   - Created `public.job_descriptions` (`id`, `user_id`, `title`, `text`, `embedding`, `created_at`).
   - Enabled strict Row-Level Security (RLS) policies matching `001_create_resumes.sql` (`select`, `insert`, `update`, `delete` locked to `auth.uid() = user_id`).
4. **Ranking Function (`match_resumes` RPC):**
   ```sql
   create or replace function public.match_resumes(query_embedding vector(384), match_count int default 10)
   returns table (id uuid, file_name text, similarity float)
   language sql stable security invoker
   set search_path = public
   as $$
     select r.id, r.file_name, 1 - (r.embedding <=> query_embedding) as similarity
     from public.resumes r
     where r.user_id = auth.uid() and r.embedding is not null
     order by r.embedding <=> query_embedding
     limit match_count;
   $$;
   ```

### 6.2 Strict Tenant Isolation Verification
Cross-tenant privacy is enforced at two distinct layers:
1. `where r.user_id = auth.uid()` ensures that even if an attacker attempts to supply arbitrary vector queries or RPC arguments, Postgres returns only rows owned by the authenticated caller.
2. `security invoker` forces the query to execute with caller-level privileges, honoring all Postgres RLS policies and preventing privilege escalation.

---

## 7. Application & API Integration

1. **Embed on Parse (`app/api/parse-resume/route.js`):**
   When a user uploads a resume, text extraction and profile normalization run. Immediately following, `embedText(text)` generates the 384-d vector and updates `public.resumes` with `embedding` and `embedded_at`.
2. **Semantic Match Endpoint (`POST /api/match`):**
   - Body: `{ "job_description": "...", "title": "...", "match_count": 10 }`
   - Authenticates caller session via `authenticateRequest`.
   - Embeds job description via `hirelabs-matcher`.
   - Executes `match_resumes` RPC and joins profile metadata (`candidate_name`, `candidate_title`, `extracted_skills`, `years_experience`).
   - Returns standard envelope:
     ```json
     {
       "success": true,
       "data": {
         "matches": [...],
         "model_used": "hirelabs-matcher",
         "dim": 384,
         "count": 5
       }
     }
     ```
3. **Embeddings Backfill Script (`scripts/backfill-embeddings.mjs`):**
   Scans existing resumes with missing embeddings and backfills them in batches via the embedding service.

---

## 8. Summary of Team Hand-offs

- **To Arpan (Model Serving):** `scripts/python/embed_service.py` exposing FastAPI `POST http://localhost:8000/embed` returning `{"vectors": [...], "dim": 384, "model_used": "hirelabs-matcher"}`.
- **To Sambit (Frontend & UI):** Production-ready `POST /api/match` returning ranked candidates with similarity percentages and full candidate profiles ready for the dashboard.
- **To Mayukh (Evaluation & Benchmarks):** `scripts/python/rank_resumes.py`, `scripts/python/evaluate_baseline.py`, and `scripts/python/evaluate_matcher.py` (dev protocol in 4.1) for evaluating the locked test set.
- **To the model host:** the trained `hirelabs-matcher/` folder (private, not in git). Unzip it to `models/hirelabs-matcher` beside the model server, or set `MATCHER_MODEL` to its path; `/health` then reports `matcher_ready: true`.

---
*Report section by Sagnik Dam; sections 3–5 updated on Nov 23 with training and evaluation on the team dataset.*
