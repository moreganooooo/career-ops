# Tasks: 099 — Source Company Plugin: Monzo

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.MONZO = 'monzo'` enum value under Phase 109
- [x] T02 — Scaffold the `@ever-jobs/source-company-monzo` package
- [x] T03 — Register plugin in the four wiring files (alphabetical: `MixpanelModule` < `MonzoModule` < `MotorolaModule`)
- [x] T04 — Unit tests with mocked HTTP fixture (≥ 8 cases) — locks for variant-2 URL pass-through, case-symmetric bare-brand wire `'Monzo'`, D-10 trailing-pad sub-axis
- [x] T05 — Doc updates + log entry
