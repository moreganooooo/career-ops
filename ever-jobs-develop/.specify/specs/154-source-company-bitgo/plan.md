# Plan: 154 — Source Company Plugin: BitGo

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

BitGo's careers board is hosted on Greenhouse at the slug
`bitgo`. Mirror PagerDuty (Spec 117) byte-for-byte —
PagerDuty is the closest behavioural cousin sharing all five
primary axes: D-04 variant 2 + D-08 + D-09 PascalCase TWO-
cap case-asymmetric + D-10 applied + D-11 omitted.

**Zero structural deviations** from PagerDuty — making this
the **forty-first** Greenhouse-only company-direct plugin in
run-history to ship as a clean re-spin.

**Notable D-09 sub-axis observation:** 8th cohort plugin with
TWO-cap PascalCase D-09. **NEW caps-at-0/3 sub-pattern** —
distinct from all prior TWO-cap PascalCase plugins.

**Notable D-10 sub-axis observations:** 2nd cohort triple-
trailing-space pad observation (after Formlabs); 6th cohort
leading-pad observation.

**Threshold milestone at this run:** 110-plugin D-08-
application threshold crossed.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-bitgo`                 | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `BITGO = 'bitgo'` (Phase 164).                                   |
| `packages/plugins/index.ts`                             | import + register `BitgoModule` in `ALL_SOURCE_MODULES`.                |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-bitgo`.                           |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `bitgo` row as shipped.                                            |
| `docs/index.md` / `docs/log.md`                         | run-#364 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| BitGo's PascalCase capitalisation may surprise downstream consumers expecting lowercase. | Pass-through is wire-faithful; cohort convention is to preserve `company_name` byte-for-byte. |
