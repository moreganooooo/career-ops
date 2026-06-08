# Plan: 145 — Source Company Plugin: ExpressVPN

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

ExpressVPN's careers board is hosted on Greenhouse at the slug
`expressvpn`. Mirror PagerDuty (Spec 117) byte-for-byte —
PagerDuty is the closest behavioural cousin sharing four
primary axes: D-04 variant 2 + D-08 + D-10 applied + D-11
omitted.

**One structural deviation** from PagerDuty — D-09 sub-axis
(PagerDuty TWO-cap PascalCase caps 0/5 → ExpressVPN FOUR-cap
PascalCase caps 0/7/8/9 forming embedded 3-letter acronym
`VPN`). **First cohort observation of FOUR-cap PascalCase
D-09 sub-axis** — ninth PascalCase case-asymmetric plugin in
the cohort.

**Notable D-10 sub-axis observation:** 1 of 3 padded titles
carries mojibake-double-encoded NBSP (`c3 82 c2 a0` byte
sequence). **Second cohort observation of mojibake-NBSP D-10
trailing-pad sub-axis** after Bloomreach (Spec 139).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-expressvpn`            | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `EXPRESSVPN = 'expressvpn'` (Phase 155).                         |
| `packages/plugins/index.ts`                             | import + register `ExpressvpnModule` in `ALL_SOURCE_MODULES`.           |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-expressvpn`.                      |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `expressvpn` row as shipped.                                       |
| `docs/index.md` / `docs/log.md`                         | run-#355 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Mojibake `Â` residual byte after `.trim()` may surprise downstream consumers expecting clean ASCII titles. | Pass-through is wire-faithful; observability noted in test + docblock; downstream normalisation is out-of-scope (same posture as Bloomreach Spec 139). |
