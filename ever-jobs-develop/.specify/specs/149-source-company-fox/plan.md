# Plan: 149 — Source Company Plugin: Fox

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Fox Creek Veterinary Hospital - Wildwood's careers board is
hosted on Greenhouse at the slug `fox`. Mirror BEAM (Spec 136)
byte-for-byte — BEAM is the closest behavioural cousin
sharing all five primary axes: D-04 variant 2 + D-08 + D-09
slug-truncation asymmetric + D-10 omitted + D-11 omitted.

**Zero structural deviations** from BEAM — making this the
**thirty-eighth** Greenhouse-only company-direct plugin in
run-history to ship as a clean re-spin.

**Notable D-09 sub-axis observation:** Fox has the **NEW
largest slug-token-truncation factor in cohort to date** (5
tokens dropped beyond slug — `'Fox Creek Veterinary Hospital
- Wildwood'` 40 bytes / 6 tokens vs slug `fox` 3 bytes / 1
token; exceeding Founders Spec 148's prior record of 4 tokens
dropped).

**Threshold milestone at this run:** 30-plugin D-10-omission
threshold crossed.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-fox`                   | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `FOX = 'fox'` (Phase 159).                                       |
| `packages/plugins/index.ts`                             | import + register `FoxModule` in `ALL_SOURCE_MODULES`.                  |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-fox`.                             |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `fox` row as shipped.                                              |
| `docs/index.md` / `docs/log.md`                         | run-#359 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Slug `fox` is generic and may collide with future tenants. | Greenhouse enforces tenant uniqueness on slug; the slug is locked at registration time. The plugin is single-tenant and emits `listing.company_name` byte-for-byte, so the actual brand name flows through correctly. |
