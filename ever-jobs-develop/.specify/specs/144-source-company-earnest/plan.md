# Plan: 144 — Source Company Plugin: Earnest

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Earnest's careers board is hosted on Greenhouse at the slug
`earnest`. Mirror Melio (Spec 130) byte-for-byte — Melio is
the closest behavioural cousin sharing four primary axes:
D-08 + D-09 case-symmetric + D-10 applied + D-11 applied
(trailing-pad form).

**One structural deviation** from Melio — D-04 sub-axis
(variant 2 canonical Greenhouse host → variant 39 third-
party careers-proxy host `app.careerpuck.com/job-board/<slug>/job/<id>?gh_jid=<id>`
— first cohort observation; **first cohort observation of
third-party careers-proxy host as a wire-shape variant**;
**42nd distinct wire-shape variant**).

**Threshold milestone at this run:** 100-plugin D-08-
application threshold crossed.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| `packages/plugins/source-company-earnest`               | **new package**.                                                    |
| `packages/models/src/enums/site.enum.ts`                | append `EARNEST = 'earnest'` (Phase 154).                           |
| `packages/plugins/index.ts`                             | import + register `EarnestModule` in `ALL_SOURCE_MODULES`.          |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-earnest`.                     |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                  |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `earnest` row as shipped.                                      |
| `docs/index.md` / `docs/log.md`                         | run-#354 entry.                                                     |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Wire `absolute_url` may flip from variant-39 third-party host to canonical Greenhouse subdomain mid-quarter without notice. | Plugin emits `listing.absolute_url` byte-for-byte; the **fallback** `jobUrl` constructor defaults to the canonical Greenhouse variant-2 form rather than reconstructing the third-party-host shape. |
