# Tasks: 092 — Source Company Plugin: BILL (billcom)

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.BILLCOM = 'billcom'` enum value under Phase 102
- [x] T02 — Scaffold the `@ever-jobs/source-company-billcom` package
- [x] T03 — Register plugin in the four wiring files (alphabetical: `BenevityModule` < `BillcomModule` < `BitwardenModule`)
- [x] T04 — Unit tests with mocked HTTP fixture (≥ 8 cases) — locks for variant-24, slug-divergent uppercase 4-byte wire, leading-TAB D-10 sub-axis, trailing-pad D-11 sub-axis
- [x] T05 — Doc updates + log entry
