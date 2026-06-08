# Tasks: 098 — Source Company Plugin: Misfits Market

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.MISFITSMARKET = 'misfitsmarket'` enum value under Phase 108
- [x] T02 — Scaffold the `@ever-jobs/source-company-misfitsmarket` package
- [x] T03 — Register plugin in the four wiring files (alphabetical: `MercuryModule` < `MisfitsMarketModule` < `MixpanelModule`)
- [x] T04 — Unit tests with mocked HTTP fixture (≥ 8 cases) — locks for variant-2 URL pass-through, two-token internal-whitespace wire `'Misfits Market'`, D-10 trailing-pad sub-axis
- [x] T05 — Doc updates + log entry
