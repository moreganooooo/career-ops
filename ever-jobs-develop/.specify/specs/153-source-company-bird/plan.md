# Plan: 153 — Source Company Plugin: Bird

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Bird's careers board is hosted on Greenhouse at the slug
`bird`. Mirror Doximity (Spec 127) byte-for-byte — Doximity
is the closest behavioural cousin sharing four primary axes:
D-08 + D-09 case-symmetric + D-10 applied + D-11 omitted.

**One structural deviation** from Doximity — D-04 sub-axis
(variant 2 → variant 41 `www.bird.co/careers?gh_jid=<id>`
first cohort observation; **44th distinct wire-shape variant**;
**first cohort observation of `.co` TLD on a vanity-domain**).

**Threshold milestone at this run:** 100-plugin D-09-omission
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
| `packages/plugins/source-company-bird`                  | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `BIRD = 'bird'` (Phase 163).                                     |
| `packages/plugins/index.ts`                             | import + register `BirdModule` in `ALL_SOURCE_MODULES`.                 |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-bird`.                            |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `bird` row as shipped.                                             |
| `docs/index.md` / `docs/log.md`                         | run-#363 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Wire `absolute_url` may flip from variant-41 careers-list-page form to canonical Greenhouse subdomain mid-quarter without notice. | Plugin emits `listing.absolute_url` byte-for-byte; the **fallback** `jobUrl` constructor defaults to the canonical Greenhouse variant-2 form rather than reconstructing the `.co` careers-list-page shape. |
