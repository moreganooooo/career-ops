# Plan: 121 — Source Company Plugin: Branch

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Branch's careers board is hosted on Greenhouse at the slug
`branch`. Mirror Pendo (Spec 118) byte-for-byte — Pendo is
the closest behavioural cousin sharing all five primary axes:
D-04 variant 2 + D-08 + D-09 case-symmetric + D-10 omitted +
D-11 omitted.

**Zero structural deviations** from Pendo — making this the
**twenty-fourth** Greenhouse-only company-direct plugin in
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
| `packages/plugins/source-company-branch`                | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `BRANCH = 'branch'` (Phase 131).                         |
| `packages/plugins/index.ts`                             | import + register `BranchModule` in `ALL_SOURCE_MODULES`.       |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-branch`.                  |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `branch` row as shipped.                                   |
| `docs/index.md` / `docs/log.md`                         | run-#331 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Slug-vs-brand asymmetry (`branch` matches several companies) is a metadata note, not a wire shape. | Recorded as observability note in spec § 1; no axis change. |
