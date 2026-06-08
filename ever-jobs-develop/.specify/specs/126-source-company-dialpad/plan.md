# Plan: 126 — Source Company Plugin: Dialpad

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Dialpad's careers board is hosted on Greenhouse at the slug
`dialpad`. Mirror Branch (Spec 121) byte-for-byte — Branch
is the closest behavioural cousin sharing all five primary
axes: D-04 variant 2 + D-08 + D-09 case-symmetric + D-10
omitted + D-11 omitted.

**Zero structural deviations** from Branch — making this the
**twenty-eighth** Greenhouse-only company-direct plugin in
run-history to ship as a clean re-spin.

**First-cohort D-11 sub-axis observation:** Dialpad's 33
unique dept names follow `<numeric_code> - <name>` convention
with **hyphen separator** (`'120 - Product Operations'`).
Distinct from Constant Contact's space-only separator
(`'100 Engineering'`). Pass-through is byte-for-byte, so no
axis change required.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-dialpad`               | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `DIALPAD = 'dialpad'` (Phase 136).                       |
| `packages/plugins/index.ts`                             | import + register `DialpadModule` in `ALL_SOURCE_MODULES`.      |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-dialpad`.                 |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `dialpad` row as shipped.                                  |
| `docs/index.md` / `docs/log.md`                         | run-#336 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Numeric-prefix-with-hyphen dept naming convention may surprise downstream consumers expecting clean names. | D-11 pass-through pins byte-for-byte; test asserts the format explicitly. |
