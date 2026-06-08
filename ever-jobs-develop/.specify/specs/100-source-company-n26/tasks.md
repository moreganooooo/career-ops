# Tasks: 100 — Source Company Plugin: N26

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.N26 = 'n26'` enum value under Phase 110
- [x] T02 — Scaffold the `@ever-jobs/source-company-n26` package
- [x] T03 — Register plugin in the four wiring files (alphabetical: `MotorolaModule` < `N26Module` < `NbcuniversalModule`)
- [x] T04 — Unit tests with mocked HTTP fixture (≥ 8 cases) — locks for variant-27 URL pass-through, case-asymmetric 3-byte wire `'N26'`, D-10 multi-byte trailing pad sub-axis
- [x] T05 — Doc updates + log entry
