# Plan: 152 — Source Company Plugin: Alma

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Alma's careers board is hosted on Greenhouse at the slug
`alma`. Mirror Doximity (Spec 127) byte-for-byte — Doximity
is the closest behavioural cousin sharing all five primary
axes: D-04 variant 2 + D-08 + D-09 case-symmetric + D-10
applied + D-11 omitted.

**Zero structural deviations** from Doximity — making this
the **fortieth** Greenhouse-only company-direct plugin in
run-history to ship as a clean re-spin.

**Threshold milestone at this run:** 60-plugin variant-2
threshold crossed.

**Sweep launch:** Run #362 launches the **tenth fresh probe
sweep** — the run-345 ninth-sweep candidate pool was fully
exhausted at run #361 (GoFundMe). Probed ~150 candidate slugs
and found 22 fresh non-empty live hits. Alma is the
alphabetically-first.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-alma`                  | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `ALMA = 'alma'` (Phase 162).                                     |
| `packages/plugins/index.ts`                             | import + register `AlmaModule` in `ALL_SOURCE_MODULES`.                 |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-alma`.                            |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `alma` row as shipped.                                             |
| `docs/index.md` / `docs/log.md`                         | run-#362 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Slug collision with Alma group (insurance / banking) — `alma` is a generic name. | Greenhouse enforces tenant uniqueness on slug; plugin emits `listing.company_name` byte-for-byte. The probed tenant is the mental-health-tech Alma. |
