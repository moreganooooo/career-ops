# Tasks: 104 — Source Company Plugin: sweetgreen

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.SWEETGREEN = 'sweetgreen'` enum value under Phase 114
- [x] T02 — Scaffold the `@ever-jobs/source-company-sweetgreen` package
- [x] T03 — Register plugin in the four wiring files (alphabetical: `StockXModule` < `SweetgreenModule` < `TaskRabbitModule`)
- [x] T04 — Unit tests with mocked HTTP fixture (≥ 8 cases) — locks for variant-29 URL pass-through, D-09 leading-whitespace strip sub-axis, D-10 trailing-pad sub-axis
- [x] T05 — Doc updates + log entry
