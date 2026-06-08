# Plan: 139 — Source Company Plugin: Bloomreach

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Bloomreach's careers board is hosted on Greenhouse at the slug
`bloomreach`. Mirror Doximity (Spec 127) byte-for-byte —
Doximity is the closest behavioural cousin sharing all five
primary axes: D-04 variant 2 + D-08 + D-09 case-symmetric +
D-10 applied + D-11 omitted.

**Zero structural deviations** from Doximity — making this
the **thirty-fifth** Greenhouse-only company-direct plugin
in run-history to ship as a clean re-spin.

**First-cohort D-10 sub-axis observation:** 1 of 10 padded
titles carries a mojibake-double-encoded NBSP byte sequence
(`c3 82 c2 a0`). `.trim()` strips trailing NBSP (U+00A0 is
in JS `WhiteSpace`); residual `Â` (U+00C2) byte preserved
by-design — wire-faithful.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| `packages/plugins/source-company-bloomreach`            | **new package**.                                                    |
| `packages/models/src/enums/site.enum.ts`                | append `BLOOMREACH = 'bloomreach'` (Phase 149).                     |
| `packages/plugins/index.ts`                             | import + register `BloomreachModule` in `ALL_SOURCE_MODULES`.       |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-bloomreach`.                  |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                  |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `bloomreach` row as shipped.                                   |
| `docs/index.md` / `docs/log.md`                         | run-#349 entry.                                                     |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Mojibake `Â` residual byte after `.trim()` may surprise downstream consumers expecting clean ASCII titles. | Pass-through is wire-faithful; observability noted in test + docblock; downstream normalisation is out-of-scope. |
