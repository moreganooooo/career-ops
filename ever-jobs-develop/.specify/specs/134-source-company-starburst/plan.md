# Plan: 134 — Source Company Plugin: Starburst

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Starburst's careers board is hosted on Greenhouse at the slug
`starburst`. Mirror Doximity (Spec 127) byte-for-byte —
Doximity is the closest behavioural cousin (recent zero-
deviation match) sharing all five primary axes: D-04 variant
2 + D-08 + D-09 case-symmetric + D-10 applied + D-11 omitted.

**Zero structural deviations** from Doximity — making this
the **thirty-second** Greenhouse-only company-direct plugin
in run-history to ship as a clean re-spin. **Run #344 closes
out the eighth fresh probe sweep** — Starburst is the 15th
and last candidate.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-starburst`             | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `STARBURST = 'starburst'` (Phase 144).                   |
| `packages/plugins/index.ts`                             | import + register `StarburstModule` in `ALL_SOURCE_MODULES`.    |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-starburst`.               |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `starburst` row as shipped.                                |
| `docs/index.md` / `docs/log.md`                         | run-#344 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Trailing-pad title may rotate off the wire.         | D-10 lock pinned via fixture; cross-regression covers cohort. |
| Eighth-sweep close-out — ninth-sweep launch needs new candidate batch. | Run #345 will launch the ninth fresh probe sweep. |
