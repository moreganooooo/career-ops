# Plan: 138 — Source Company Plugin: Blend

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Blend's careers board is hosted on Greenhouse at the slug
`blend`. Mirror Doximity (Spec 127) byte-for-byte — Doximity
is the closest behavioural cousin sharing all five primary
axes: D-04 variant 2 + D-08 + D-09 case-symmetric + D-10
applied + D-11 omitted.

**Zero structural deviations** from Doximity — making this
the **thirty-fourth** Greenhouse-only company-direct plugin
in run-history to ship as a clean re-spin.

**First-cohort D-11 sub-axis observation:** all 4 of Blend's
unique dept names follow `<dept-name>- Blend Labs` company-
suffix convention. Pass-through is byte-for-byte.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-blend`                 | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `BLEND = 'blend'` (Phase 148).                           |
| `packages/plugins/index.ts`                             | import + register `BlendModule` in `ALL_SOURCE_MODULES`.        |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-blend`.                   |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `blend` row as shipped.                                    |
| `docs/index.md` / `docs/log.md`                         | run-#348 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Company-suffix dept naming convention is novel; downstream consumers may want to strip the suffix. | Pass-through is byte-for-byte; observability noted in test. |
