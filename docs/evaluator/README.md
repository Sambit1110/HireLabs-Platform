# Evaluator training data (Hrittima's assignment)

This builds two things for the evaluator LLM (`hirelabs-evaluator`):

- a **reviewed training set** that GPT-6 #1 trains on
- a **fixed development set** that GPT-6 #2 scores

Pushpita supplies the labelled pairs and source texts. Mayukh keeps the locked test set; these scripts never read `test/` and refuse test resumes.

**Privacy:** resume text, generated targets and every output below stay in the team's private `HireLabs-Data/` folder. The repository holds only code, docs and the synthetic example. See the [prompt specification](prompt-spec.md) for the exact model input and output.

## Steps

All commands take the path to `HireLabs-Data/` and write into `HireLabs-Data/evaluator/` (files are private, mode 600).

### 1. Prepare

```bash
node scripts/evaluator/prepare.mjs /path/to/HireLabs-Data
```

- **Joins** `pairs/train.jsonl` and `pairs/dev.jsonl` to `raw/resumes/<resume_id>.txt` and `raw/jds/<jd_id>.txt`. It keeps the pair ID, split, label source and gold labels.
- **Holds back and lists in `issues.json`** for Pushpita, before anything is released:
  - missing texts
  - repeated pair IDs
  - the same pair with conflicting labels, and repeated identical pairs
  - invalid labels
  - resumes from another split
  - locked test resumes
  - resumes used in both train and dev
- **Writes:**
  - `train.joined.jsonl`
  - `dev.inputs.jsonl`: pair ID and model messages, with no labels
  - `dev.gold.jsonl`: labels plus a `fixed_20` flag
  - `dev.fixed20.json`: the 20 fixed dev IDs, with the verdict spread, thin-evidence IDs and any shortfall
  - `summary.json`: counts by split, verdict and label source, plus `data_version`, a hash of the pairs and splits
- **Without labelled pairs** it checks the candidate review CSVs in `reviews/` instead.

### 2. Generate (training pairs only)

```bash
GEMINI_API_KEY=… node scripts/evaluator/generate_targets.mjs /path/to/HireLabs-Data [--limit 50]
```

- **Generation:** uses the app's own prompt and schema through the team's approved Gemini access (`GEMINI_MODEL`, default `gemini-3.5-flash`, temperature 0).
- **Storage:** each answer is appended to `targets.raw.jsonl` as soon as it arrives, keyed by pair ID, with the model and prompt version.
- **Resuming:** an interrupted run continues by pair ID. Re-running skips pairs that already have a target, and retries failed pairs.
- **Scope:** dev and test pairs are never sent; the script refuses any non-training pair.

### 3. Build

```bash
node scripts/evaluator/build_training.mjs /path/to/HireLabs-Data [--reviews review-queue.csv]
```

- **Gold labels:** replaces each target's `fit_score` and `fit_verdict` with Pushpita's label.
- **Quarantine** for review (`quarantine.jsonl`):
  - a sharp disagreement between Gemini and the label: verdicts two bands apart, a score gap of 30 or more, or an `insufficient_evidence` mismatch
  - schema errors
  - targets with warnings (a missing skill that isn't explained, or a recommendation that isn't for human review)
- **Review queue:** on the first run it writes `review-queue.csv` for Hrittima, with at least 100 targets. Conflicts and flagged targets come first. It includes the job title, a resume excerpt, the flags and the full target, plus blank `reviewer_name`, `decision` (`accept` / `correct` / `reject`), `corrected_target_json` and `notes`. The queue is never overwritten.
- **Reviews:** human checks count only when a person has filled `reviewer_name` and `decision`. A correction keeps the gold score and verdict.
- **Writes:**
  - `training.jsonl`: one `{"id", "messages": [system, user, assistant]}` per accepted pair. IDs and provenance stay outside the messages.
  - `provenance.jsonl`: IDs, split, label source, gold and generated labels, status, flags, reviewer, model, prompt version and data version
  - `counts.json`: counts by status, verdict and label source; human-review totals; shortfall against 1,000

### Recreating the data

Run the three steps again on the same `HireLabs-Data/` and the same repository revision. Prepare and build are deterministic. Generation reuses `targets.raw.jsonl`, so only missing pairs call Gemini.

## Handoff

**To GPT-6 #1 (trainer):**
- `evaluator/training.jsonl` and the [prompt specification](prompt-spec.md) with the repository revision
- `data_version` (`summary.json`)
- counts by split, verdict and label source (`summary.json`, `counts.json`)

**To GPT-6 #2 (evaluator):**
- `evaluator/dev.inputs.jsonl`, `evaluator/dev.gold.jsonl` and `evaluator/dev.fixed20.json`
- the same prompt specification and revision
- the report section 5 account below

**Acceptance:**
- The trainer can load a record from `training.jsonl`.
- The evaluator can recover the dev labels by pair ID from `dev.gold.jsonl`.
- `modelInput(jd_text, resume_text)` reproduces the same messages for the same source pair. Tests check all three.

## Status (2026-11-23)

- **Done:**
  - the shared prompt specification
  - the synthetic example
  - the join, checks, dev package, generation, quarantine, review queue and training-file tools
  - tests with synthetic data
- **Run on Pushpita's handoff copy:**
  - 1,500 train and 1,500 dev **candidate** pairs, all structurally clean: no missing texts, wrong splits, locked test resumes, duplicates or train/dev resume overlap
  - All 300 job descriptions appear in both splits (by design: only resumes are split)
- **Shortfall: no labelled pairs exist yet.** The candidate pairs have no proposed or reviewed scores (0 / 3,000), and `pairs/train.jsonl` and `pairs/dev.jsonl` have not been produced. So right now:
  - training examples: **0** of the 1,000–2,000 target
  - fixed dev IDs: **0** of 20
  - review queue: **0** of at least 100
  - human-reviewed targets: **0**
  - Hrittima's 50 Label Studio annotations are tracked separately in Label Studio.
- **Next:**
  1. Pushpita produces the labelled `pairs/*.jsonl` with `scripts/dataset/pairs.py`.
  2. Run prepare, generate and build.
  3. Hrittima reviews the queue.
  4. Re-run build and hand off.

## Report section 5: how the targets were made (draft for GPT-6 #2)

- **Distillation:** training targets are a knowledge distillation from Gemini (`gemini-3.5-flash`, temperature 0), using the same prompt and schema the app uses.
- **Gold scores:** every target's score and verdict are replaced with the team's label (human, Gemini-proposed and human-checked, or category).
- **Quarantine:** targets that disagreed sharply with the label, failed the schema, left a missing skill unexplained, or did not hand the decision to a person were held back.
- **Human review:** Hrittima reviewed **[N]** targets and accepted **[A]**, corrected **[C]** and rejected **[R]** (fill in from `counts.json`).
- **Dev set:** labels were kept out of all model inputs. The 20 fixed dev pairs were chosen deterministically to span every verdict and include thin-evidence cases.
