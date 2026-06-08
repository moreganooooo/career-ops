# Plan: 097 — Source Company Plugin: HelloFresh

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Mirror BILL (Spec 092) — share D-10 application + slug-vs-domain
divergence axes. **Three structural deviations** from BILL: D-04
wire-shape variant 26 (vs 24); D-09 case-asymmetric PascalCase
wire (vs all-caps); D-11 medium-pad-rate trailing-pad (vs high
~39.1 %).

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                 | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-hellofresh`            | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                | append `HELLOFRESH = 'hellofresh'`.     |
| `packages/plugins/index.ts`                             | import + append `HelloFreshModule`.     |
| `tsconfig.base.json`, `jest.config.js`                  | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md` | doc updates.        |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — HelloFresh expands locale path beyond `/global/en/`.
  Mitigation: byte-for-byte `jobUrl` assertion catches any wire
  change; fallback already uses canonical Greenhouse variant-2.
- **R-02** — HelloFresh adds further departments with new pad-
  byte forms. Mitigation: D-11 trim is `String.prototype.trim()`
  which handles arbitrary whitespace runs.
