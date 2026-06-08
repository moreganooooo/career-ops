# Plan: 157 — Source Company Plugin: Indigo

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Indigo's careers board is hosted on Greenhouse at the slug
`indigo`. Mirror Lookout (Spec 083) byte-for-byte — Lookout
is the closest behavioural cousin sharing four primary axes:
D-08 + D-09 case-symmetric + D-10 omitted + D-11 omitted.

**One structural deviation** from Lookout — D-04 sub-axis
(variant 20 → variant 2 canonical Greenhouse host).

**Threshold milestone at this run:** 90-plugin D-11-omission
threshold crossed.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-indigo`                | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `INDIGO = 'indigo'` (Phase 167).                                 |
| `packages/plugins/index.ts`                             | import + register `IndigoModule` in `ALL_SOURCE_MODULES`.               |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-indigo`.                          |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `indigo` row as shipped.                                           |
| `docs/index.md` / `docs/log.md`                         | run-#367 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Slug `indigo` is generic and may collide with future tenants. | Greenhouse enforces tenant uniqueness on slug; the slug is locked at registration time. |
