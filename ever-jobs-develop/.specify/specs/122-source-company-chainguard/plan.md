# Plan: 122 — Source Company Plugin: Chainguard

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Chainguard's careers board is hosted on Greenhouse at the
slug `chainguard`. Mirror Otter (Spec 116) byte-for-byte —
Otter is the closest behavioural cousin sharing all five
primary axes: D-04 variant 2 + D-08 + D-09 case-symmetric +
D-10 applied + D-11 omitted.

**Zero structural deviations** from Otter — making this the
**twenty-fifth** Greenhouse-only company-direct plugin in
run-history to ship as a clean re-spin.

**First-cohort D-10 sub-axis observation:** Chainguard's
padded titles include 6 trailing-pad + 1 leading-pad —
**first cohort observation of leading-pad title form**. The
plugin's existing `.trim()` strips pad bytes from both
directions transparently; recorded as observability lock in
the test fixture.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-chainguard`            | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `CHAINGUARD = 'chainguard'` (Phase 132).                 |
| `packages/plugins/index.ts`                             | import + register `ChainguardModule` in `ALL_SOURCE_MODULES`.  |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-chainguard`.              |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `chainguard` row as shipped.                               |
| `docs/index.md` / `docs/log.md`                         | run-#332 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Leading-pad title is a first-cohort observation; downstream consumers may expect strictly trailing pads. | `.trim()` is symmetric on both directions; test asserts byte-for-byte both sub-axes. |
