# Plan: 101 — Source Company Plugin: PlanetScale

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Mirror Bobbie (Spec 093) — same axes for D-04, D-08, D-10,
D-11. **One structural deviation** from Bobbie:

1. **D-09 sub-axis** — PlanetScale's wire `'PlanetScale'` is
   case-asymmetric PascalCase with internal capital (same
   byte-count as the lowercase 11-byte slug `planetscale` but
   byte-distinct via case at byte index 6 — `'S'` vs `'s'`);
   Bobbie's wire `'Bobbie'` is case-symmetric. Same case-only-
   asymmetric same-byte-count shape as DataCamp / HelloFresh /
   N26.

D-10 omitted (clean wire titles). D-11 omitted (clean dept
pass-through). D-08 entity-decode-then-tag-strip shared with
the cohort.

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                 | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-planetscale`           | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                | append `PLANETSCALE = 'planetscale'` under Phase 111. |
| `packages/plugins/index.ts`                             | import + append `PlanetScaleModule` (alphabetical: between `PelotonModule` and `PostmanModule` — `Pel` < `Pla` < `Pos`). |
| `tsconfig.base.json`, `jest.config.js`                  | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md` | doc updates.                  |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — PlanetScale rebrand. Mitigation: byte-for-byte
  `companyName` assertion catches any wire change.
- **R-02** — Wire URL upgrade to a brand-domain variant.
  Mitigation: fallback already uses canonical variant 2.
