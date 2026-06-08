# Plan: 147 — Source Company Plugin: Formlabs

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Formlabs's careers board is hosted on Greenhouse at the slug
`formlabs`. Mirror Doximity (Spec 127) byte-for-byte —
Doximity is the closest behavioural cousin sharing four
primary axes: D-08 + D-09 case-symmetric + D-10 applied +
D-11 omitted.

**One structural deviation** from Doximity — D-04 sub-axis
(variant 2 canonical Greenhouse host → variant 40
`careers.formlabs.com/job/<id>/apply/?gh_jid=<id>` first
cohort observation; careers-subdomain + `/job/<id>/apply/`
action-leaf + dual-id; **43rd distinct wire-shape variant**).

**Notable D-10 sub-axis observations:** 1 of 13 padded titles
carries TRIPLE-trailing-space pad (first cohort observation —
distinct from Justworks's double-pad). Plus 1 leading-pad
title (fourth cohort leading-pad observation).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-formlabs`              | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `FORMLABS = 'formlabs'` (Phase 157).                             |
| `packages/plugins/index.ts`                             | import + register `FormlabsModule` in `ALL_SOURCE_MODULES`.             |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-formlabs`.                        |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `formlabs` row as shipped.                                         |
| `docs/index.md` / `docs/log.md`                         | run-#357 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Wire `absolute_url` may flip from variant-40 careers-subdomain to canonical Greenhouse subdomain mid-quarter without notice. | Plugin emits `listing.absolute_url` byte-for-byte; the **fallback** `jobUrl` constructor defaults to the canonical Greenhouse variant-2 form rather than reconstructing the careers-subdomain shape. |
