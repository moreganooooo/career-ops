# Plan: 124 — Source Company Plugin: Contentful

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Contentful's careers board is hosted on Greenhouse at the
slug `contentful`. Mirror Checkr (Spec 123) byte-for-byte —
Checkr is the closest behavioural cousin (immediate
predecessor) sharing all five primary axes: D-04 variant 2 +
D-08 + D-09 case-symmetric + D-10 applied + D-11 omitted.

**Zero structural deviations** from Checkr — making this the
**twenty-seventh** Greenhouse-only company-direct plugin in
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
| `packages/plugins/source-company-contentful`            | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `CONTENTFUL = 'contentful'` (Phase 134).                 |
| `packages/plugins/index.ts`                             | import + register `ContentfulModule` in `ALL_SOURCE_MODULES`.   |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-contentful`.              |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `contentful` row as shipped.                               |
| `docs/index.md` / `docs/log.md`                         | run-#334 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Trailing-pad title may rotate off the wire.         | D-10 lock pinned via fixture; cross-regression covers cohort. |
