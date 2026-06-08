# Plan: 171 — Source Company Plugin: SimpliSafe

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-09 |
| Last updated | 2026-05-09 |

## 1. Approach

SimpliSafe's careers board is hosted on Greenhouse at the
slug `simplisafe`. Mirror GoCardless (Spec 150) byte-for-byte
— GoCardless is the closest behavioural cousin sharing all
five primary axes: D-04 variant 2 + D-08 + D-09 PascalCase
TWO-cap case-asymmetric + D-10 applied (trailing-pad form) +
D-11 omitted.

**One structural deviation** — D-09 sub-axis: caps-at-0/2
(GoCardless `GoCardless`) → caps-at-0/6 (SimpliSafe
`SimpliSafe`). The TWO-cap PascalCase shape is preserved; only
the byte index of the second capital shifts. **Fiftieth near-
clean re-spin** in run history.

**Notable D-09 sub-axis observation:** 8th cohort plugin with
TWO-cap PascalCase D-09. Caps-position pattern (0/6) matches
LaunchDarkly (Spec 102) and ComplyAdvantage (Spec 141)
exactly — third cohort plugin with caps-at-0/6 sub-pattern.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-simplisafe`            | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `SIMPLISAFE = 'simplisafe'` (Phase 181).                         |
| `packages/plugins/index.ts`                             | import + register `SimplisafeModule` in `ALL_SOURCE_MODULES`.           |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-simplisafe`.                      |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `simplisafe` row as shipped.                                       |
| `docs/index.md` / `docs/log.md`                         | run-#381 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| SimpliSafe's PascalCase capitalisation may surprise downstream consumers expecting lowercase. | Pass-through is wire-faithful; cohort convention is to preserve `company_name` byte-for-byte. Downstream normalisation is out-of-scope. |
| Caps-at-0/6 sub-pattern overlaps with two prior plugins (LaunchDarkly, ComplyAdvantage). | Recorded as a third cohort observation; no behavioural divergence from prior caps-at-0/6 plugins (trim semantics are unchanged). |
