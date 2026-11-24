# hirelabs-llm: the team's from-scratch language model

hirelabs-llm is a small GPT language model (2.02 million parameters) that the team builds
and trains itself. It scores how well a resume fits a job.

- **From scratch.** The tokenizer and the model are written in this repo
  ([scripts/python/hirelabs_llm](../scripts/python/hirelabs_llm)). Weights start random.
  Nothing pretrained is downloaded, and nothing is fine-tuned.
- **No labels.** Training uses only the raw resume and job text. No Gemini output and no
  human scores go in, so the `gemini_checked` labels play no part.
- **Free.** It trains in about 5 minutes on a Mac (Apple GPU) and runs on a CPU.

## How it works

1. **Tokenizer.** A byte-level BPE tokenizer ([tokenizer.py](../scripts/python/hirelabs_llm/tokenizer.py))
   is trained on the training text. The text is so repetitive that it stops after 734 merges,
   which gives a 994-token vocabulary (256 bytes, 734 merges, 4 special tokens).
2. **Model.** A decoder-only transformer ([model.py](../scripts/python/hirelabs_llm/model.py)):
   4 layers, 4 attention heads, 192-wide, 256-token context.
3. **Training text** ([corpus.py](../scripts/python/hirelabs_llm/corpus.py)). Every resume and
   job starts with a role title (24 roles). The model learns to predict the next token in three
   kinds of sequences:
   - a job followed by a resume **with the same role**
   - a resume on its own
   - a job on its own

   Half the time a resume's title lines are removed, so the model has to connect jobs and
   resumes through skills and experience, not by copying the title. Half the time, random lines
   of the job or resume are dropped too, so the model copes with shorter text. The same-role relation
   comes from the documents' own titles. Nobody labelled it.
4. **Scoring** ([score.py](../scripts/python/hirelabs_llm/score.py)). The match score is how
   much reading the job makes the model expect this resume:

   ```
   pmi = average over resume tokens of [ log p(token | job, earlier resume) - log p(token | earlier resume) ]
   ```

   Above 0, the job makes the resume more likely: the candidate looks like what people in that
   role write. A logistic curve fitted after training turns pmi into 0-100 (same-role train pairs
   = 1, other-role = 0). The curve only changes the number shown, never the ranking.
   `missingSkills` is a plain text check, not the model: required skills in the job's
   "Required skills:" line that the resume never mentions.

The model is also a normal text generator: `Scorer.write_resume(job)` writes the kind of resume
it expects for a job. Training prints one example at the end.

## Train and evaluate

```bash
python3 -m venv .venv && .venv/bin/pip install torch
.venv/bin/python scripts/python/train_llm.py --data-dir /path/to/HireLabs-Data
.venv/bin/python scripts/python/evaluate_llm.py --model models/hirelabs-llm --data-dir /path/to/HireLabs-Data --output llm-dev.json
```

Training writes `models/hirelabs-llm/` (`model.pt`, `tokenizer.json`, `calibration.json`,
`training-log.json`). `models/` is git-ignored: the model saw private resumes, so never commit it.
Training uses the 700 train-split resumes and the 300 shared jobs. The 150 dev resumes are held
out. On a Kaggle or Colab GPU, add `--device cuda`.

Unit tests: `python3 -m unittest discover -s scripts/python/tests -t scripts/python`.

## Results (dev split, held-out resumes)

### v3 (live since 2026-11-24): trained with real free-text resumes and jobs

v3 trained on `HireLabs-Data-plus`: the team data plus two public datasets of real resumes and
job posts (831 training resumes, 1,140 jobs; see the [dataset card](dataset-card.md) and
[import_external.py](../scripts/dataset/import_external.py)). 2.22M parameters, 11 minutes on
an Apple M5, best dev loss 0.702. MRR, with Recall@1 in brackets:

| View | Free-text resumes (`extdev`): v2 | **v3** | Rule | Template resumes (`dev`): v2 | **v3** | Rule |
|---|---|---|---|---|---|---|
| Full text | 0.182 (3%) | **0.417 (23%)** | 0.138 | 0.931 (92%) | **0.999 (99.7%)** | 0.535 |
| Titles removed | **0.246 (2%)** | 0.182 (3%) | 0.147 | 0.516 (31%) | **0.554 (35%)** | 0.508 |
| ~35% of lines removed | **0.179 (1%)** | 0.158 (1%) | 0.138 | **0.854 (79%)** | 0.797 (69%) | 0.400 |
| Re-laid-out | 0.084 (0%) | **0.544 (41%)** | 0.149 | 0.921 (90%) | **0.997 (99%)** | 0.359 |

`extdev` is 30 held-out real resumes against 323 jobs; `dev` is the 150 team resumes against
333 jobs (the team's jobs plus public jobs whose title maps to a team role). Random ranking
gets about 0.14.

- On free text with titles, v3 is more than twice as good as v2. Without titles or with lines
  removed, both are close to chance on free text: the LLM still leans on the role title.
- The website sends full text, so v3 replaced v2. v2 is kept as `models/hirelabs-llm-v2` for
  rollback.
- hirelabs-matcher v2 ([hirelabs-matcher-v2.md](hirelabs-matcher-v2.md)) does far better on
  free text (MRR 0.892). That is one reason the fit score gives the matcher 30% and the LLM 15%.

### v2

**v2**, trained with rule-based layout variety (`--relayout-prob 0.5`,
see `augment.py`): 4,000 steps, 8.4 minutes on an Apple M5, best dev loss 0.296. Each of the 300
jobs ranks all 150 dev resumes. A resume counts as relevant when its role equals the job's.

| View | Method | MRR | Recall@1 | Recall@5 |
|---|---|---|---|---|
| Full text | **hirelabs-llm v2** | **1.000** | **100%** | **100%** |
| | v1 (template only) | 0.998 | 99.7% | 100% |
| | Required-skill overlap (rule) | 0.577 | 36.3% | 90.3% |
| | Random | 0.157 | 5.3% | 21.7% |
| Title lines removed | **hirelabs-llm v2** | **0.532** | **32.0%** | **86.3%** |
| | v1 | 0.508 | 30.7% | 86.3% |
| | Required-skill overlap (rule) | 0.573 | 35.0% | 92.0% |
| ~35% of lines removed | **hirelabs-llm v2** | **0.891** | **84.7%** | **93.0%** |
| | v1 | 0.874 | 81.0% | 94.3% |
| | Required-skill overlap (rule) | 0.396 | 22.0% | 60.7% |
| Re-laid-out text | **hirelabs-llm v2** | **1.000** | **100%** | **100%** |
| | v1 | 0.234 | 14.3% | 28.7% |
| | Required-skill overlap (rule) | 0.367 | 19.0% | 58.0% |

What this shows:

- With the full text, the model almost always ranks a same-role resume first. Much of that
  comes from recognising the role title.
- With the titles removed, it has to match on skills alone: far better than chance, slightly
  behind a plain skill-overlap rule.
- v1 fell apart when the layout changed (re-laid-out MRR 0.234); v2 does not. That view uses
  the same rules as v2's training, so it flatters v2.
- On three free-text sample resumes against three jobs, v2 is no better than v1. Real
  free-text resumes still need real, varied training data. See Limitations.
- Scores cluster near 0 or 100, because the score curve is fitted to a yes/no question
  (same role or not). That is one reason the fit score gives the LLM only 15%.

Reproduce: `evaluate_llm.py` as above. The numbers change a little from run to run.

## Serving

The model server ([services/model-server/main.py](../services/model-server/main.py)) loads the
model from `HIRELABS_LLM_DIR` (default `models/hirelabs-llm`) and adds:

- `POST /match` with `{"job": "...", "resume": "..."}` returns
  `{"score": 0-100, "verdict": "strong|moderate|weak", "pmi": ..., "missingSkills": [...], "model_used": "hirelabs-llm"}`.
  It needs the same bearer token as the other routes.
- `/health` gains `llm_ready`.

The model is about 8 MB and answers in well under a second on a CPU.

### On the website

**Rank candidates** (`/api/match`) still orders resumes by hirelabs-matcher similarity. With
`USE_LOCAL_MODELS=true`, the route then asks `/match` about the top 20 resumes (4 at a time)
and adds `llm_fit: { score, verdict, missing_skills }` to each. The dashboard shows it as
"hirelabs-llm fit" with the missing skills, marked experimental. The LLM score never reorders
the list. If the model server or model is missing, or a request fails, the remaining resumes
get `llm_fit: null` and ranking carries on normally.

### Explain score and role briefs (hirelabs-explainer)

**Explain score** and **Generate role brief** (`/api/ai-analyze`) are answered by
hirelabs-explainer ([lib/ai/own-analysis.js](../lib/ai/own-analysis.js)) by default. It uses
the team's own models and transparent rules, with no external, fine-tuned or Ollama model,
so it works without anyone's laptop:

- **Skills the job asks for** come from its "Required/Preferred skills" lines, or from the
  skill list in [skill-lexicon.js](../lib/ai/skill-lexicon.js) found in the job text.
- **Evidence per skill:** a use in a work or project line is *demonstrated* and quoted word
  for word, a mention only in a skills list is *unverified*, a related term (PostgreSQL for
  SQL) is *partial*, and no mention is *missing*. Quotes still pass the usual evidence check.
- **Fit score:** skill coverage 55%, hirelabs-matcher similarity 30% and hirelabs-llm fit
  15%, re-weighted over whichever signals the model server returns. The LLM gets the least
  weight because it learned from template resumes. Strong disagreement between the skill
  check and the LLM appears as a risk flag.
- **Role brief:** seniority, must-have and nice-to-have skills, duties, screening signals and
  interview focus, read from the job text alone.

The text is built from templates, so it is plainer than an LLM's, but every claim comes
from the resume. `EVALUATOR_PROVIDER=ollama` switches back to the Ollama evaluator at
`OLLAMA_URL`. The bias check's explicit `local` provider always uses Ollama.

## Hosting on a Hugging Face Space (needs PRO)

This replaces the laptop + ngrok setup. Since November 2026, Hugging Face runs Docker Spaces on
CPU basic (2 vCPU, 16 GB RAM) only for **PRO** accounts (about $9/month). Free accounts can
host only static pages, which cannot run this server. Without PRO, keep the laptop setup in
[hosting-models.md](hosting-models.md).

1. With a PRO account, sign in on your computer: create a **Write** access token
   (huggingface.co → Settings → Access Tokens), then run `hf auth login` (from
   `pip install huggingface_hub`) and paste it.
2. Build the Space folder. Add the parser wheel as a second argument so `/parse` works too:

   ```bash
   scripts/build_hf_space.sh ../hirelabs-space path/to/en_hirelabs_parser-0.1.0-py3-none-any.whl
   ```

3. Create a **private** Docker Space, set the parser's name and upload the folder:

   ```bash
   hf repo create <your-name>/hirelabs-models --repo-type space --space-sdk docker --private
   hf upload <your-name>/hirelabs-models ../hirelabs-space . --repo-type space
   ```

   Then, in the Space's **Settings → Variables and secrets**, add the variable
   `HIRELABS_PARSER_MODEL` = `en_hirelabs_parser`.
4. In the same settings, add the secret `MODEL_API_TOKEN`. Use **the value already in Vercel**:
   the evaluator calls to Ollama on the hosting machine reuse it.
5. The Space builds itself, which takes several minutes. Then `/health` on the Space URL
   (`https://<your-name>-hirelabs-models.hf.space`) should report the models as ready.
6. In Vercel, set `MODEL_SERVER_URL` to the Space URL. Add `HF_SPACE_TOKEN`: a separate
   **Read** access token, never the Write one. Mark it as a secret and redeploy. Leave
   `OLLAMA_URL` pointing at the hosting machine.

Things to know:

- A Space **sleeps after a while with no visits** (the idle time is in the Space's settings). The
  first request after that takes a minute or two. Open `/health` before a demo.
- **Ollama does not run on the Space**, so `/api/chat` answers 503 there. Explain score and
  role briefs don't need it any more (hirelabs-explainer), and profile gaps are filled by rules.
  `OLLAMA_URL` is only used with `EVALUATOR_PROVIDER=ollama` and by the bias check, so it can
  be removed from Vercel.
- **Private Space and tokens.** A private Space only accepts requests carrying a Hugging Face
  token (`Authorization: Bearer hf_...`). That header is then taken, so the server also accepts
  its own token as `X-HireLabs-Token: <MODEL_API_TOKEN>`. When `HF_SPACE_TOKEN` is set, the site
  sends both: the Hugging Face token in `Authorization`, the team token in `X-HireLabs-Token`.
  Don't make the Space public instead: anyone could then download the model, and it was trained
  on the team's resumes.

## Limitations

- **Still weak on free text without titles.** v3 added about 130 real free-text resumes and
  840 real job posts, which helped most when titles are present. With titles removed it is near
  chance on free text. More real, varied resumes (for example consented team resumes) would
  help most. The pairing step reads the role from each document's first line, so new text
  needs a role title there, or a change to `corpus.py`.
- **"Relevant" means same role.** The evaluation counts a resume as a match only when its role
  equals the job's. That is not a human judgment of fit, and near roles (BI Analyst vs Data
  Analyst) count as misses.
- **The 0-100 number is not the team rubric.** It estimates "same role" probability. Checking it
  against human scores needs the blind review sheets filled in by people.
- **Other models.** hirelabs-matcher v2 is from scratch too
  ([hirelabs-matcher-v2.md](hirelabs-matcher-v2.md)); v1, fine-tuned from
  `BAAI/bge-small-en-v1.5`, is kept only for rollback. The optional Ollama evaluator
  (`EVALUATOR_PROVIDER=ollama`) and the bias check's `local` provider are not the team's own
  models.
