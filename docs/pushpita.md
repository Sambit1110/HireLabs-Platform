# Dataset and parser handoff

Record each approved data source, version, license, consent basis for resume text, language, occupation coverage and exclusions. Record actual split sizes, counts by label and label source after review. Targets are 1,000 resumes, 300 job descriptions and 300 annotated resumes. Remove alternate versions of the same resume before preparation.

    node scripts/dataset/prepare.mjs /path/resumes /path/jobs /private/HireLabs-Data

Freeze the split manifest. Put test resumes and reviewed test pairs only in the restricted folder. Verify Drive permissions before sharing training files. Only Mayukh runs final evaluation.

## Annotation guide

Create a Label Studio text NER project using scripts/dataset/labels.xml. Import train and dev tasks separately and restrict the test project. Assign 50 documents per person across all splits. Calibrate on five shared training resumes for 20 minutes. Optionally double-label 20 training documents and compute exact labeled-span F1 before adjudication.

| Label | Select |
|---|---|
| NAME | Candidate's full name without honorifics |
| TITLE | Explicit role title including seniority |
| SKILL | Each named tool, language or technique separately, including punctuation in C++ |
| YEARS_EXPERIENCE | Explicit duration of professional experience, excluding dates |
| DEGREE | Qualification and field, excluding institution |
| COMPANY | Explicit employer name, excluding location |

Exclude surrounding whitespace and separators. Annotate repeated mentions. Resolve disagreements before exporting one annotation per task. Capture the annotation UI using a consented or fictional example.

Choose roughly five resumes per job from similar and different fields. Use the shared plan's score bands and mark insufficient evidence where appropriate. Record gemini_checked only after a human reviews the proposal. Use globally unique pair IDs and review every test pair. Keep reviewer signoffs private.

    python scripts/dataset/pairs.py /private/HireLabs-Data train reviewed-train.jsonl

Repeat for dev and for test in the restricted workspace.

## Train and evaluate on development data

Install spaCy in the parser environment. Set D to the private data directory.

    D=/private/HireLabs-Data
    python scripts/dataset/annotations.py "$D" train train-export.json
    python scripts/dataset/annotations.py "$D" dev dev-export.json
    python -m spacy init config "$D/config.cfg" --lang en --pipeline ner --optimize efficiency
    python -m spacy train "$D/config.cfg" --paths.train "$D/parser/train.spacy" --paths.dev "$D/parser/dev.spacy" --output "$D/hirelabs-parser"
    python scripts/dataset/compare.py "$D" "$D/hirelabs-parser/model-best" /path/to/downloaded/model > "$D/dev-comparison.csv"
    mkdir -p "$D/packages"
    python -m spacy package "$D/hirelabs-parser/model-best" "$D/packages" --name hirelabs_parser --build wheel

For GPU training generate a compatible transformer config with --optimize accuracy --gpu and train with --gpu-id 0. Verify baseline label mappings. Record precision, recall, F1 and support per label for both models on the same dev set. Inspect errors by label.

Give the wheel to Arpan privately. Set HIRELABS_PARSER_MODEL=en_hirelabs_parser after installing it. Collection, training, results and package handoff await reviewed data.

## End-to-end runbook

Run from the repo root with npm ci, Python and spaCy installed. Use the shared private Drive for inputs, outputs and model artifacts.

1. Download the source versions recorded in the dataset card. Check licenses, consent, and permission to send text to a hosted service. Extract one approved UTF-8 text file per document and remove alternate versions of the same resume.
2. Run prepare.mjs once as shown above. Keep splits.json with this frozen release. Lock the test directory on Drive and verify access from a teammate account. Mayukh manages restricted test processing; train and tune only with train/dev.
3. Install Label Studio in a separate environment and import labels.xml. Run the calibration session and annotation protocol above. Keep the two independent calibration exports separate until agreement is measured. Export one adjudicated annotation per task for conversion.
4. Measure exact-span agreement before adjudication, then convert final exports using the frozen split names:

       python scripts/dataset/agreement.py annotator-a.json annotator-b.json
       python scripts/dataset/annotations.py "$D" train train-export.json
       python scripts/dataset/annotations.py "$D" dev dev-export.json

5. Generate a review sheet. Select a private output folder per split. The sampler uses keyword-set overlap with fixed-seed ties; high and low overlap approximate same-field and different-field resumes. Reviewers should check that assumption. A live run sends only the current resume and job text. Use dry-run for a human-only review or whenever hosted processing is not approved.

       S=train
       O="$D/reviews/$S"
       node scripts/dataset/propose_pairs.mjs "$D" "$S" "$O" --dry-run
       node scripts/dataset/propose_pairs.mjs "$D" "$S" "$O"

   Supply GEMINI_API_KEY privately for the live command; GEMINI_MODEL defaults to gemini-3.5-flash. Keep the per-answer cache alongside the sheet. Reuse that folder to resume a stopped run, running one proposer at a time.
6. Copy the chosen CSV to reviewed.csv in the same folder. Retain every row and proposal column. Inspect the source texts, enter the final reviewer_score and reviewer_verdict and sign reviewer_name. Use insufficient_evidence for inadequate evidence. Return one complete sheet per split.

       node scripts/dataset/review_to_jsonl.mjs "$S" "$O/reviewed.csv" "$O/reviewed.jsonl"
       python scripts/dataset/pairs.py "$D" "$S" "$O/reviewed.jsonl"

   Repeat for dev. Mayukh uses S=test and O="$D/test/review" inside the restricted workspace and converts the test Label Studio export there. Use the dry-run sheet for independent human-only test scoring. Keep test data out of prompt examples, training and tuning.
7. Train using train.spacy and dev.spacy, compare on dev with compare.py and package model-best using the commands above. Give Arpan the wheel privately and record its version and HIRELABS_PARSER_MODEL setting.
8. Populate the dataset card and report drafts using measured counts and dev results. Missing source files produce null in the stats output; leave those entries pending. Only Mayukh runs the second command and provides the approved aggregates.

       python scripts/dataset/stats.py "$D"
       python scripts/dataset/stats.py "$D" --include-test
