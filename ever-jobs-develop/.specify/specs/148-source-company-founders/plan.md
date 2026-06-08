# Plan: 148 — Source Company Plugin: Founders

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Founders Green Animal Hospital's careers board is hosted on
Greenhouse at the slug `founders`. Mirror BEAM (Spec 136)
byte-for-byte — BEAM is the closest behavioural cousin
sharing four primary axes: D-08 + D-09 slug-truncation
asymmetric + D-10 omitted + D-11 omitted.

**One structural deviation** from BEAM — D-04 sub-axis
(variant 2 → variant 10 legacy hosted-board apex; seventh
variant-10 plugin in the cohort).

**Notable D-09 sub-axis observation:** third cohort observation
of slug-truncation form. Founders has the **largest slug-
token-truncation factor in cohort to date** (4 tokens dropped
beyond slug — `'Founders Green Animal Hospital'` 30 bytes vs
slug `founders` 8 bytes).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-founders`              | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `FOUNDERS = 'founders'` (Phase 158).                             |
| `packages/plugins/index.ts`                             | import + register `FoundersModule` in `ALL_SOURCE_MODULES`.             |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-founders`.                        |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `founders` row as shipped.                                         |
| `docs/index.md` / `docs/log.md`                         | run-#358 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Slug `founders` is generic and may collide with future tenants. | Greenhouse enforces tenant uniqueness on slug; the slug is locked at registration time. The plugin is single-tenant and emits `listing.company_name` byte-for-byte, so the actual brand name flows through correctly. |
