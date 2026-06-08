# Tasks: 096 — Source Company Plugin: Dollar Shave Club

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.DOLLARSHAVECLUB = 'dollarshaveclub'` enum value under Phase 106
- [x] T02 — Scaffold the `@ever-jobs/source-company-dollarshaveclub` package
- [x] T03 — Register plugin in the four wiring files (alphabetical: `DiscordModule` < `DollarShaveClubModule` < `DoorDashModule` — `Dis` < `Dol` < `Doo`)
- [x] T04 — Unit tests with mocked HTTP fixture (≥ 8 cases) — locks for variant-2 URL pass-through, THREE-token internal-whitespace D-09 omission, D-10 omission, D-11 application with `'Legal '` → `'Legal'` trim
- [x] T05 — Doc updates + log entry
