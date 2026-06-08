# Plan: 136 — Source Company Plugin: BEAM

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

BEAM's careers board is hosted on Greenhouse at the slug
`beam`. Mirror Branch (Spec 121) — Branch is the closest
behavioural cousin sharing D-04 variant 2 + D-08 + D-10
omitted + D-11 omitted.

**One structural deviation** from Branch:

1. **D-09 first-cohort slug-acronym-expansion asymmetric
   wire form** — slug `beam` (4 bytes; the acronym only) vs
   wire `'Bridge to Enter Advanced Mathematics (BEAM)'` (43
   bytes; full org name + acronym in parens). Distinct from
   Oscar's slug-extra-word asymmetry (Spec 133 — slug `oscar`
   vs wire `'Oscar Health'` where wire just appended one
   word). BEAM's wire fully expands the acronym AND retains
   it in parens. **Second cohort observation of slug-
   truncation D-09 sub-axis**.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-beam`                  | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `BEAM = 'beam'` (Phase 146).                              |
| `packages/plugins/index.ts`                             | import + register `BeamModule` in `ALL_SOURCE_MODULES`.         |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-beam`.                    |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `beam` row as shipped.                                     |
| `docs/index.md` / `docs/log.md`                         | run-#346 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| 43-byte wire vs 4-byte slug is dramatic D-09 asymmetry — downstream consumers may expect slug-matching wire. | Wire pinned byte-for-byte in fixture; `companyName` field carries full string. |
