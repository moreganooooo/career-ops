# Plan: 118 — Source Company Plugin: Pendo

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Pendo's careers board is hosted on Greenhouse at the slug
`pendo`. Mirror Coursera (Spec 068) byte-for-byte — Coursera
is the closest behavioural cousin sharing all five primary
axes: D-04 variant 2 + D-08 + D-09 case-symmetric + D-10
omitted + D-11 omitted.

**Zero structural deviations** from Coursera — making this the
**twenty-second** Greenhouse-only company-direct plugin in
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
| `packages/plugins/source-company-pendo`                 | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `PENDO = 'pendo'` (Phase 128).                           |
| `packages/plugins/index.ts`                             | import + register `PendoModule` in `ALL_SOURCE_MODULES`.        |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-pendo`.                   |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `pendo` row as shipped.                                    |
| `docs/index.md` / `docs/log.md`                         | run-#328 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| D-10 omission may misalign if Pendo upstream starts padding titles. | D-10 omission is a no-op pass-through; if pads appear, downstream consumers see them; cross-regression catches diff in unit tests. |
