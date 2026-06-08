# Tasks: 095 — Source Company Plugin: Coalition

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.COALITION = 'coalition'` enum value under Phase 105
- [x] T02 — Scaffold the `@ever-jobs/source-company-coalition` package
- [x] T03 — Register plugin in the four wiring files (alphabetical: `CloudflareModule` < `CoalitionModule` < `CoinbaseModule` — `Clo` < `Coa` < `Coi`)
- [x] T04 — Unit tests with mocked HTTP fixture (≥ 8 cases) — locks for variant-25 URL pass-through, legal-suffix-strip D-09 sub-axis, multi-byte-leading-pad D-10 sub-axis
- [x] T05 — Doc updates + log entry
