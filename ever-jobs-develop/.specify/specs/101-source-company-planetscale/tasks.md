# Tasks: 101 — Source Company Plugin: PlanetScale

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.PLANETSCALE = 'planetscale'` enum value under Phase 111
- [x] T02 — Scaffold the `@ever-jobs/source-company-planetscale` package
- [x] T03 — Register plugin in the four wiring files (alphabetical: `PelotonModule` < `PlanetScaleModule` < `PostmanModule`)
- [x] T04 — Unit tests with mocked HTTP fixture (≥ 8 cases) — locks for variant-2 URL pass-through, case-asymmetric PascalCase internal-capital wire `'PlanetScale'`, D-10/D-11 both omitted
- [x] T05 — Doc updates + log entry
