# Plan: 117 — Source Company Plugin: PagerDuty

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

PagerDuty's careers board is hosted on Greenhouse at the slug
`pagerduty`. Mirror LaunchDarkly (Spec 114) byte-for-byte —
LaunchDarkly is the closest behavioural cousin sharing all
five primary axes: D-04 variant 2 + D-08 + D-09 TWO-cap
PascalCase + D-10 applied + D-11 omitted.

**Zero structural deviations** from LaunchDarkly — making this
the **twenty-first** Greenhouse-only company-direct plugin in
run-history to ship as a clean re-spin.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-pagerduty`             | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `PAGERDUTY = 'pagerduty'` (Phase 127).                   |
| `packages/plugins/index.ts`                             | import + register `PagerdutyModule` in `ALL_SOURCE_MODULES`.    |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-pagerduty`.               |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `pagerduty` row as shipped.                                |
| `docs/index.md` / `docs/log.md`                         | run-#327 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| TWO-cap PascalCase wire form may surprise downstream consumers (slug `pagerduty` vs wire `'PagerDuty'`). | Pinned in fixture + asserted byte-for-byte. |
| Trailing-pad title may rotate off the wire.         | D-10 lock pinned via fixture; cross-regression covers cohort. |
