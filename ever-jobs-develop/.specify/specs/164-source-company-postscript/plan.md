# Plan: 164 — Source Company Plugin: Postscript

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Postscript's careers board is hosted on Greenhouse at the
slug `postscript`. Mirror Alma (Spec 152) byte-for-byte —
Alma is the closest behavioural cousin sharing all five
primary axes: D-04 variant 2 + D-08 + D-09 case-symmetric +
D-10 trailing-pad applied + D-11 omitted.

**Zero structural deviations** from Alma — making this the
**forty-sixth** Greenhouse-only company-direct plugin in
run-history to ship as a clean re-spin.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged
  green; CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-postscript`            | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `POSTSCRIPT = 'postscript'` (Phase 174).                         |
| `packages/plugins/index.ts`                             | import + register `PostscriptModule` in `ALL_SOURCE_MODULES`.           |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-postscript`.                      |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `postscript` row as shipped.                                       |
| `docs/index.md` / `docs/log.md`                         | run-#374 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Low-volume sample (9 listings) — D-10 verdict provisional. | `.trim()` byte-count agnostic; safe on observed pad and clean wire alike. |
