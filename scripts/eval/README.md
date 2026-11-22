# HireLabs evaluation runner

The runner evaluates only an explicit prepared dataset root. Its default mode
is development and it runs deterministic keyword baselines. It does not
discover data, contact a model service, call Gemini, install packages, or emit
per-person data in reports.

## Commands

From the repository root, after preparing the shared data layout:

```powershell
python scripts/eval/run_all.py --dataset-root data/eval --split dev --output results/development-results.json --reports-dir results/development-report
```

An adapter factory and private response cache can be opted into explicitly:

```powershell
python scripts/eval/run_all.py --dataset-root data/eval --split dev --output results/development-results.json --reports-dir results/development-report --adapter-factory my_project.eval_adapters:build_adapters --cache-dir .private-eval-cache
```

The factory must return a mapping keyed by the documented identifiers, such
as `spacy_parser`, `hirelabs_matcher`, or `hirelabs_evaluator`. The runner calls
only adapters returned by that explicit factory. It caches predictions and
their original call durations; cache hits retain the original duration. Cache
and report directories must be separate, and cache data must remain private.

Train data can be selected explicitly with `--split train`. The default split
is `dev`. Development mode cannot write dashboard output. The runner requires
all files and references for the selected split; it never falls back to
`data/samples` or silently skips invalid rows.

This phase's runner accepts only `train` and `dev`. It cannot read the locked
test split or write `results/results.json` or anything under `public/`.

## Data layout and offsets

Train and development files:

```text
raw/resumes/*.txt
raw/jds/*.txt
parser/train.jsonl, parser/dev.jsonl
pairs/train.jsonl, pairs/dev.jsonl
splits.json
```

For train and dev runs, `raw/resumes/` must contain exactly the union of IDs
assigned to those two non-test splits. Parser annotations and matching pairs
are still loaded only from the selected split. Test resumes remain isolated
under `test/raw/resumes/`, which must contain exactly the test IDs. Every
required parser and pair JSONL file must contain at least one record; empty
files fail validation instead of producing an all-null report.

Test files are `test/parser_test.jsonl`, `test/pairs_test.jsonl`, and
`test/raw/resumes/*.txt`; job descriptions remain under `raw/jds/`.
`load_dataset(root, split)` takes an explicit root and has no automatic
discovery. `load_dataset(root, "test", allow_test=True)` is mandatory for
locked data. Validation errors contain paths, line numbers, and field names,
never input text. Strict JSON rejects duplicate keys and non-finite numbers.

Do not clean parser annotation text before exact-span scoring. Parser offsets
refer to the original JSONL text after JSON decoding. The keyword parser emits
offsets against that exact text. Only the `SKILL` label has a deterministic
catalog baseline; other labels can be absent from baseline predictions.

## Metrics

- Parser identity is `(document_id, start, end, label)`. Counts are exact,
  duplicate spans are rejected, and overall scores are micro-aggregated over
  all labels. Undefined ratios are `null`; defined zero-overlap F1 is `0`.
- Matching uses explicit human and `gemini_checked` judgments with
  `fit_score >= 75` as relevant. Category labels are excluded. Conventional
  Recall@5 divides relevant retrieved in the first five by all judged
  relevant candidates per query. MRR uses the first relevant rank. Both and
  the separate binary `success_at_5` are macro-averaged over queries with at
  least one judged relevant item. Queries without qrels or relevant items
  are counted and excluded. Ranking candidates outside the judged universe
  are errors, not negatives.
- Evaluator verdict accuracy and fit-score MAE use schema-valid outputs with
  the corresponding human or human-checked gold label; weak category labels
  are excluded. Strict valid-JSON percentage is based only on the original
  raw response string, parsed with duplicate-key and non-finite-number
  rejection, and requires a top-level JSON object. It does not require that
  object to pass the evaluator output schema; schema validation separately
  gates verdict accuracy and fit-score MAE. Parsed Python dictionaries can
  contribute to those schema-based metrics, but never to valid-JSON
  percentage. Every eligible gold pair is in the JSON-validity denominator.
  Missing and invalid outputs count invalid. Average
  latency uses finite, non-negative timings for known gold pairs, including
  failed outputs. `fit_score: null` is allowed only with
  `fit_verdict: "insufficient_evidence"` and does not enter MAE. Empty
  denominators are `null`.

## Model integrations and cache

Adapters implement task-specific `predict(inputs)` contracts documented by
`ParserAdapter`, `MatcherAdapter`, and `EvaluatorAdapter`. `CallableAdapter`
supports injected implementations and mocks. Current exact-span Gemini,
Gemini embeddings, HireLabs evaluator, and guaranteed HireLabs matcher
adapters are unavailable: existing app interfaces do not provide the
required compatible response contract or cannot be selected without starting
services. Their status is reported by the runner. No model is silently
substituted. Gemini parser profile extraction is not scored as spans.

- `spacy_parser` / `gemini_parser`: `predict({document_id, text})` returns a
  list of `{start, end, label}` spans measured in the original `text`.
- `gemini_embeddings` / `hirelabs_matcher`:
  `predict({query_id, job_description, candidates})` returns an ordered list
  of candidate IDs. Candidates contain only explicitly judged IDs for that
  query; returning an unjudged ID is rejected.
- `gemini_evaluator` / `hirelabs_evaluator`:
  `predict({pair_id, resume_text, job_description})` should return the original
  raw candidate evaluator JSON string. A parsed object remains usable for
  schema-valid verdict/score metrics but cannot count toward strict valid-JSON
  percentage. The runner measures each uncached call duration and validates
  schema fields independently from strict raw-JSON syntax.

An adapter may expose `name`, `model_id`, and `status()` in addition to
`predict()`. A false `status().available` leaves its system values `null`.

`ResponseCache` is activated with `--cache-dir` and is used for every explicitly
injected adapter call. Cache keys are SHA-256 digests over task,
adapter, model, and input; cache filenames do not contain input text. Cache
files may contain model responses and must stay in a private local directory.
No cache is created unless `--cache-dir` is provided.

## Outputs and dependencies

The canonical artifact stores numeric aggregates, fixed metadata, split
counts, a manifest digest when loaded, runner/Python version, and evaluation
configuration. It excludes resume text, job text, identifiers, model outputs,
and secrets. Configured adapter model IDs are recorded as restricted safe
version labels. Missing measurements are JSON `null`. Writes stage and fsync
each JSON file before atomic replacement; two output files are not a single
filesystem transaction. The report directory receives a comparison table,
exactly three chart groups (parser, matching, evaluator), aggregate error
counts, and a report-ready evaluation section. System kinds distinguish the
baseline, Gemini, and HireLabs entries; unavailable values remain `null`.
Error analysis describes the keyword baseline only. Per-example error details
are intentionally not published because they could contain personal
information.

The evaluation package uses only the Python standard library; see
`requirements.txt`.

Runner-produced task results and aggregate evaluation runs carry in-process
split and manifest-digest provenance. Test artifact creation and dashboard
projection require those results to match the exact loader-created test
dataset object and verify each task result. This prevents ordinary accidental
mix-ups, including attaching dev metrics to a test dataset with matching
counts. This is an application-level safeguard, not cryptographic proof or
protection against a malicious caller able to alter Python process state.

Tests:

```powershell
python -m unittest discover -s scripts/eval/tests -v
```
