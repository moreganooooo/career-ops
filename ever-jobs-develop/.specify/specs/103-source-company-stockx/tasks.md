# Tasks: 103 — Source Company Plugin: StockX

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.STOCKX = 'stockx'` enum value under Phase 113
- [x] T02 — Scaffold the `@ever-jobs/source-company-stockx` package
- [x] T03 — Register plugin in the four wiring files (alphabetical: `StitchfixModule` < `StockXModule` < `TaskRabbitModule`)
- [x] T04 — Unit tests with mocked HTTP fixture (≥ 8 cases) — locks for variant-2 URL pass-through, case-asymmetric mixed-case 6-byte wire `'StockX'`, D-11 trailing-pad sub-axis on `'Customer Service '`
- [x] T05 — Doc updates + log entry
