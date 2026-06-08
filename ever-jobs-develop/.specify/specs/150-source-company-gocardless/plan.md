# Plan: 150 — Source Company Plugin: GoCardless

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

GoCardless's careers board is hosted on Greenhouse at the slug
`gocardless`. Mirror PagerDuty (Spec 117) byte-for-byte —
PagerDuty is the closest behavioural cousin sharing all five
primary axes: D-04 variant 2 + D-08 + D-09 PascalCase TWO-
cap case-asymmetric + D-10 applied + D-11 omitted.

**Zero structural deviations** from PagerDuty — making this
the **thirty-ninth** Greenhouse-only company-direct plugin in
run-history to ship as a clean re-spin.

**Notable D-09 sub-axis observation:** 7th cohort plugin with
TWO-cap PascalCase D-09. Caps-position pattern (0/2) matches
SoFi (Spec 102) and xAI (Spec 105 lowercase-first) exactly —
third cohort plugin with caps-at-0/2 sub-pattern.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-gocardless`            | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `GOCARDLESS = 'gocardless'` (Phase 160).                         |
| `packages/plugins/index.ts`                             | import + register `GocardlessModule` in `ALL_SOURCE_MODULES`.           |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-gocardless`.                      |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `gocardless` row as shipped.                                       |
| `docs/index.md` / `docs/log.md`                         | run-#360 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| GoCardless's PascalCase capitalisation may surprise downstream consumers expecting lowercase. | Pass-through is wire-faithful; cohort convention is to preserve `company_name` byte-for-byte. Downstream normalisation is out-of-scope. |
