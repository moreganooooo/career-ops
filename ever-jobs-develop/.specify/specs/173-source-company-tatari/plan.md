# Plan: 173 — Source Company Plugin: Tatari

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-10 |
| Last updated | 2026-05-10 |

## 1. Approach

Tatari's careers board is hosted on Greenhouse at the slug
`tatari`. Mirror SimpliSafe (Spec 171) byte-for-byte —
SimpliSafe is the closest behavioural cousin sharing four
primary axes: D-04 variant 2 + D-08 + D-10 applied (trailing-
pad form) + D-11 omitted.

**One structural deviation** — D-09 sub-axis: TWO-cap
PascalCase case-asymmetric `'SimpliSafe'` (caps at 0/6) →
case-symmetric bare-brand `'Tatari'`. The trim semantics
are unchanged (`.trim()` over the wire `company_name` is a
safe no-op for both). **Fifty-first near-clean re-spin** in
run history.

**Notable cohort observations:**

- 74th variant-2 plugin in the cohort.
- 120th cohort plugin to omit D-09.
- 79th cohort plugin to apply D-10 (trailing-pad form, all
  three padded titles share the same wire-title text — a
  rare repeated-title pad pattern within a single board).
- 103rd cohort plugin with fully-clean department pass-
  through.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-tatari`                | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `TATARI = 'tatari'` (Phase 183).                                 |
| `packages/plugins/index.ts`                             | import + register `TatariModule` in `ALL_SOURCE_MODULES`.               |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-tatari`.                          |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `tatari` row as shipped.                                           |
| `docs/index.md` / `docs/log.md`                         | run-#383 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Tatari's small board (~52 visible roles) may rotate quickly. | Probe is point-in-time; per-run probe pulls the live wire — variance is expected. The fixture pin is byte-for-byte against the run-383 probe sample. |
| Repeated-title pad pattern (3 listings sharing the same wire-title `'Data Science Analyst '`) is statistically unusual. | Behaviour is wire-faithful; trim semantics flatten the pattern symmetrically across all three. Recorded as a sub-observation under D-10. |
