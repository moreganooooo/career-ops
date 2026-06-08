# Tasks: 105 — Source Company Plugin: xAI

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.XAI = 'xai'` enum value under Phase 115
- [x] T02 — Scaffold the `@ever-jobs/source-company-xai` package
- [x] T03 — Register plugin in the four wiring files (alphabetical: `WebflowModule` < `XaiModule` < `ZendeskModule`)
- [x] T04 — Unit tests with mocked HTTP fixture (≥ 8 cases) — locks for variant-2 URL pass-through, lowercase-first case-asymmetric 3-byte wire `'xAI'`, D-10 trailing-pad sub-axis
- [x] T05 — Doc updates + log entry
