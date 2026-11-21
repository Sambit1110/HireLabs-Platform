# 2. Dataset

> Draft by Pushpita. Fill the bracketed fields from the dataset card and signed review records.

## Where the examples came from

The selected resume and job corpora are [sources and versions]. Their licenses and consent basis are [details]. After exclusions and cleaning, the frozen cohort contains [resumes] resumes and [jobs] job descriptions, covering [languages and occupations].

## How we keep evaluation independent

The preparation script applies the app's cleaner, removes exact duplicates and assigns each resume to one split. The frozen manifest yields [train], [dev] and [test] resumes. Mayukh controls the test folder. Shared jobs allow comparison on unseen resumes for familiar roles.

## Who supplied the labels

Annotators use the same span boundaries and label definitions. Independent annotations on [documents] give exact-span agreement of [overall F1]. The reviewed pair counts are [human], [Gemini checked] and [category]. Human checking of Gemini proposals supplies a knowledge-distillation target. Report reviewer corrections [examples], missing fields [details] and coverage limitations [details].
