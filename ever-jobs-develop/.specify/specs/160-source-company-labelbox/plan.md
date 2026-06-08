# Plan: 160 — Source Company Plugin: Labelbox

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Labelbox's careers board is hosted on Greenhouse at the slug
`labelbox`. Mirror Indigo (Spec 157) byte-for-byte — Indigo is
the closest behavioural cousin sharing all five primary axes:
D-04 variant 2 + D-08 + D-09 case-symmetric + D-10 omitted +
D-11 omitted.

**Zero structural deviations** from Indigo — making this the
**forty-third** Greenhouse-only company-direct plugin in
run-history to ship as a clean re-spin.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-labelbox`              | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `LABELBOX = 'labelbox'` (Phase 170).                             |
| `packages/plugins/index.ts`                             | import + register `LabelboxModule` in `ALL_SOURCE_MODULES`.             |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-labelbox`.                        |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `labelbox` row as shipped.                                         |
| `docs/index.md` / `docs/log.md`                         | run-#370 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Low-volume sample (10 listings) — D-10/D-11 verdicts provisional. | Defensive `.trim()` on title + dept emits — safe no-op on clean wire, robust to future pad introductions. |
