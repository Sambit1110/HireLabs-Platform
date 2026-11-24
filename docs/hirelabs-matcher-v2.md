# hirelabs-matcher v2: the team's from-scratch matcher

hirelabs-matcher v2 turns a resume or a job description into a 384-number vector. **Rank
candidates** orders resumes by how close their vectors are to the job's. It replaces v1, which
was fine-tuned from the pretrained `BAAI/bge-small-en-v1.5`. v2 starts from random weights:
no pretrained model, no fine-tuning, no Gemini and no score labels.

## How it works

- **Tokenizer:** the team's own byte-pair tokenizer (2,048 tokens), trained on the training
  text, as in hirelabs-llm.
- **Encoder** ([encoder.py](../scripts/python/hirelabs_llm/encoder.py)): 4 transformer layers,
  4 heads, width 256, up to 256 tokens of text (`--max-len`). The token vectors are averaged and projected to
  384 numbers, then scaled to length 1. 3.85M parameters, 15 MB on disk.
- **Training** ([train_scratch_matcher.py](../scripts/python/train_scratch_matcher.py)):
  contrastive (InfoNCE). In each batch of 48, every job is pulled towards a resume with the same
  role and pushed away from the other resumes. Other same-role resumes in the batch are not
  treated as negatives. To stop it matching on titles alone, resume titles are removed 80% of
  the time. Text is also re-laid-out by rules (`augment.py`) half the time, and 30% of lines are
  dropped 40% of the time.
- **Checkpoint:** every 250 steps the model ranks the dev resumes. It is saved when the
  average of two MRRs improves: one with the full text, one with resume titles removed.

v2 keeps v1's 384 dimensions, so the database column and search function stay the same.

## Training data

Trained on `HireLabs-Data-plus`, made by
[import_external.py](../scripts/dataset/import_external.py). That is the team dataset plus two
public datasets of real resumes and job posts (see the [dataset card](dataset-card.md)):
831 training resumes and 1,140 jobs. 1,500 steps took 17 minutes on an Apple M5. The best
checkpoint was step 750.

```bash
python3 -I scripts/dataset/import_external.py --team /path/HireLabs-Data \
    --resumes UpdatedResumeDataSet.csv --jobs train-00000-of-00001.parquet --out /path/HireLabs-Data-plus
python3 scripts/python/train_scratch_matcher.py --data-dir /path/HireLabs-Data-plus
python3 scripts/python/evaluate_matchers.py --data-dir /path/HireLabs-Data-plus --split extdev \
    --model v2=models/hirelabs-matcher-v2 --model v1=models/hirelabs-matcher
```

## Results

Every job ranks all held-out resumes. A resume counts as relevant when its role equals the
job's. The views are the same as for hirelabs-llm: full text, resume titles removed, ~35% of
lines removed, and re-laid-out by rules. Numbers are MRR, with Recall@1 in brackets.

**Free-text resumes** (split `extdev`): 30 held-out real resumes from the public dataset,
323 jobs. Neither model trained on these resumes.

| View | v1 (fine-tuned BGE) | **v2 (from scratch)** | v2, team data only | Skill-overlap rule |
|---|---|---|---|---|
| Full text | 0.784 (67%) | **0.892 (82%)** | 0.261 (13%) | 0.135 (8%) |
| Titles removed | **0.347 (17%)** | 0.323 (13%) | 0.081 (0%) | 0.136 (8%) |
| ~35% of lines removed | 0.634 (43%) | **0.751 (70%)** | 0.225 (12%) | 0.133 (8%) |
| Re-laid-out | 0.787 (67%) | **0.864 (78%)** | 0.277 (12%) | 0.125 (7%) |

**Team template resumes** (split `dev`): 150 held-out resumes, 333 jobs.

| View | v1 (fine-tuned BGE) | **v2 (from scratch)** | v2, team data only | Skill-overlap rule |
|---|---|---|---|---|
| Full text | **0.997 (99.7%)** | 0.962 (95.5%) | 0.934 (92.5%) | 0.521 (31.5%) |
| Titles removed | 0.537 (34.5%) | **0.568 (36.9%)** | 0.488 (27.9%) | 0.521 (31.5%) |
| ~35% of lines removed | **0.905 (87.4%)** | 0.884 (85.0%) | 0.843 (79.9%) | 0.381 (22.5%) |
| Re-laid-out | **0.997 (99.7%)** | 0.954 (93.7%) | 0.935 (91.6%) | 0.341 (19.5%) |

What this shows:

- **On free text, v2 beats v1** in three of four views. With titles removed, v1 is slightly
  ahead on MRR (0.347 against 0.323), while v2 finds a same-role resume in the top 5 more often
  (69% against 57%).
- **On template resumes, v1 is a little ahead**, except with titles removed.
- **The extra data made the difference.** Trained on the team data alone, v2 fails on free
  text (MRR 0.261). Free-text resumes in training lifted it to 0.892.
- **Fair-comparison caveat.** v2 trained on other resumes from the same public dataset as the
  `extdev` test resumes, and v1 never saw that dataset. Part of v2's lead may come from that.
- **Similarity range.** v2 spreads scores wider than v1. Same-role pairs mostly score 0.7 to
  0.99, others -0.6 to 0.65. The fit score still maps 0.2–0.7 onto 0–100% (anything below 0
  counts as 0), and the dashboard clamps the shown percentage at 0.

Decision: v2 is live since 2026-11-24. It meets the "from scratch, no fine-tuning" rule, and it
does better on real free-text resumes, which is what recruiters upload.

## Serving and switching over

The model server ([main.py](../services/model-server/main.py)) loads the folder in
`MATCHER_MODEL`. A folder with `encoder.json` is loaded as v2; anything else as a
sentence-transformers model (v1). `/embed` then reports `model_used: "hirelabs-matcher-v2"` and
the `released_at` time from `encoder.json`.

Vectors from two different matchers cannot be compared, so stored resume vectors must be
redone after a switch. **Rank candidates** does this by itself
([reembed.js](../lib/resume/reembed.js)): before ranking, it re-embeds up to 200 of the
recruiter's resumes whose `embedded_at` is older than `released_at`. The first ranking after a
switch takes a few seconds longer. **Re-process all** still works too.

On the Hugging Face Space:

1. Add `"released_at": "<current time, ISO 8601>"` to the model's `encoder.json`.
2. Upload the folder to `models/hirelabs-matcher-v2` in the Space.
3. Set the Space variable `MATCHER_MODEL` to `/app/models/hirelabs-matcher-v2`.

**Going back to v1:** set `MATCHER_MODEL` to `/app/models/hirelabs-matcher`, then click
**Re-process all**. v1 does not report `released_at`, so the automatic re-embed does not run
for it.

## Limitations

- **"Relevant" means same role**, not a human judgment of fit. Near roles count as misses.
- **Only the first 256 tokens** of a document are read (about 100 words: the small vocabulary
  splits words into about 2.5 tokens each). A long resume's
  later jobs and projects are ignored. v1 read up to 512 tokens.
- **Small free-text test set:** 30 resumes. The numbers move by a few points between runs.
- **Public data of unknown origin.** Both public datasets are labelled Apache-2.0, but neither
  says where its text came from. See the dataset card.
