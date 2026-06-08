# Plan: 169 — Source Company Plugin: Sezzle

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-05 |
| Last updated | 2026-05-05 |

## 1. Approach

Sezzle's careers board is hosted on Greenhouse at the slug
`sezzle`. Mirror Instabase (Spec 158) byte-for-byte —
Instabase is the closest behavioural cousin sharing four
primary axes: D-04 variant 2 + D-08 + D-09 case-symmetric +
D-10 applied (mixed-pad form) + D-11 applied. The fifth
axis (D-11) deviates by sub-axis only: Instabase observed a
trailing-pad-only D-11 form, whereas Sezzle observes a
**mixed form** (3 both-end + 1 leading-only + 1 trailing-
only of 11 unique departments), with three NEW first-cohort
sub-observations (D-11 both-end pad, D-11 leading-only pad,
multi-character 2-char leading whitespace pad).

**One structural deviation** from Instabase — making this
the **forty-eighth near-clean re-spin** in run-history. The
wire-implementation is byte-for-byte identical at the
`.trim()` boundary because `.trim()` is symmetric over both
ends and over multi-character whitespace runs.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-sezzle`                | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `SEZZLE = 'sezzle'` (Phase 179).                                 |
| `packages/plugins/index.ts`                             | import + register `SezzleModule` between `ScopelyModule` and `SoFiModule`. |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-sezzle`.                          |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `sezzle` row as shipped.                                           |
| `docs/COMPANY_SLUG_DIRECTORY.md`                        | add `Sezzle / sezzle / BNPL Payments / Fintech` row.                    |
| `docs/index.md` / `docs/log.md`                         | run-#379 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| `'  EX-Executive '` wire dept name carries 2-character leading whitespace — first cohort observation. | Plugin emits `listing.departments[0].name.trim()` byte-for-byte; `.trim()` is symmetric over multi-character whitespace runs, so the trimmed output collapses identically to the 1-character leading-pad sub-axis. |
| `'DS-Data Science'` and `'DS-Risk & Fraud'` share the same `'DS-'` prefix — internal collision risk in downstream consumers parsing prefix-as-domain. | Plugin emits trimmed wire `name` byte-for-byte; downstream rendering / parsing semantics out-of-scope. |
| Department-name cardinality (11 unique) is below the highest-cardinality cohort (Samsara at 44 unique) but above the median. | Probe-only mitigation; the plugin pipeline is N-invariant. |
