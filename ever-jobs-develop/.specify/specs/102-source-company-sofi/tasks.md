# Tasks: 102 — Source Company Plugin: SoFi

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.SOFI = 'sofi'` enum value under Phase 112
- [x] T02 — Scaffold the `@ever-jobs/source-company-sofi` package
- [x] T03 — Register plugin in the four wiring files (alphabetical: `SnowflakeModule` < `SoFiModule` < `SquarespaceModule`)
- [x] T04 — Unit tests with mocked HTTP fixture (≥ 8 cases) — locks for variant-28 URL pass-through, case-asymmetric mixed-case 4-byte wire `'SoFi'`, D-10 trailing-TAB sub-axis
- [x] T05 — Doc updates + log entry
