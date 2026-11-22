# 3. Resume parser

> Draft by Pushpita. Add measured results after freezing the model and reviewing the evidence.

## What we train

The spaCy NER pipeline reads the same cleaned text as the application. Its training corpus has [labelled train resumes] and the development corpus has [labelled dev resumes]. Record the config, spaCy version, hardware and selected checkpoint [details].

## How we compare

Evaluate both pipelines on identical dev documents. Map baseline labels to the project vocabulary, then count exact spans with matching labels. Record per-label precision, recall, F1 and gold support from compare.py.

| Label | Gold support | HireLabs P / R / F1 | Downloaded P / R / F1 |
|---|---|---|---|
| NAME | [support] | [P / R / F1] | [P / R / F1] |
| TITLE | [support] | [P / R / F1] | [P / R / F1] |
| SKILL | [support] | [P / R / F1] | [P / R / F1] |
| YEARS_EXPERIENCE | [support] | [P / R / F1] | [P / R / F1] |
| DEGREE | [support] | [P / R / F1] | [P / R / F1] |
| COMPANY | [support] | [P / R / F1] | [P / R / F1] |

Frequent boundary errors [examples] and misclassified entities [examples] guide dev-only corrections. Report the strongest and weakest labels [findings]. Record the selected package version [version], handoff date [date] and serving verification [evidence]. Mayukh supplies final locked-test figures [reference].

## Four-label development experiment

On the eight development resumes in Pushpita's submitted batch, the four-label v0.3 parser and the earlier HireLabs v0.1 parser each recovered all 89 annotated spans with matching labels. This comparison measures performance on a small batch covering four entity types. NAME and COMPANY had no annotated examples in it. The downloaded-model comparison and Mayukh's locked-test evaluation remain pending.
