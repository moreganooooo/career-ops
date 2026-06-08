# Plan: 184 — Source Company Plugin: Acryl Data

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-22 |
| Last updated | 2026-05-22 |

## 1. Approach

Acryl Data's careers board is hosted on Greenhouse at the
slug `acryldata`. Mirror Acquia (Spec 182) byte-for-byte
with **one structural deviation** — the D-09 sub-axis:
case-symmetric bare-brand single-token PascalCase with slug
= lowercase-of-wire (`'Acquia'` → `acquia`) → **slug-not-
derived-from-wire-company_name sub-form** (wire
`'DataHub'`, slug `acryldata` derived from corporate name
`'Acryl Data'`).

**Notable cohort observations:**

- 83rd variant-2 plugin in the cohort.
- 131st D-09 omission.
- 44th D-10 omission.
- 111th cohort plugin with fully-clean department pass-
  through (D-11 omitted).
- 140th cohort plugin to apply D-08.
- 10th plugin in the eleventh fresh probe sweep.
- **First cohort observation of slug-not-derived-from-wire-
  company_name sub-form** — slug derives from corporate
  name; wire emits product-line brand.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 11-case test spec
  + 3-listing fixture; 4-file wirings; doc updates.
- Exit: 11 tests green; cross-regression sweep unchanged
  green; CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-acryldata`             | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `ACRYLDATA = 'acryldata'` (Phase 194).                            |
| `packages/plugins/index.ts`                             | import + register `AcryldataModule` in `ALL_SOURCE_MODULES`.             |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-acryldata`.                        |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `acryldata` row as shipped.                                         |
| `docs/COMPANY_SLUG_DIRECTORY.md`                        | add `Acryl Data` row in Greenhouse company-direct section.               |
| `docs/index.md` / `docs/log.md`                         | run-#394 entry.                                                          |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Slug-vs-wire mismatch may confuse downstream consumers expecting `slug === companyName.toLowerCase()`. | Test spec explicitly locks the mismatch — slug `acryldata` is documented as derived from the corporate name `'Acryl Data'`, not from the wire `'DataHub'` (product brand). Precedent: source-company-beam (slug `beam`, wire `'Bridge to Enter Advanced Mathematics (BEAM)'`). |
