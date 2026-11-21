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
