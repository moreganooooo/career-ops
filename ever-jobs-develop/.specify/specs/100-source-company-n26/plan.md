# Plan: 100 — Source Company Plugin: N26

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Mirror HelloFresh (Spec 097) — closest cohort cousin via shared
locale-prefix + path-id + dual-id query wire-shape pattern.
**Two structural deviations** from HelloFresh:

1. **D-04 variant 27** — `n26.com/en-eu/careers/positions/<id>?gh_jid=<id>`
   (HelloFresh variant 26 `careers.hellofresh.com/global/en/job/<id>?gh_jid=<id>`).
   First cohort observation of variant 27.
2. **D-09 sub-axis** — N26's wire `'N26'` is case-asymmetric
   3-byte all-caps; HelloFresh's wire `'HelloFresh'` is
   PascalCase 10-byte. Both case-only-asymmetric same-byte-count
   per their respective slugs but with different lengths and
   case patterns.

D-10 applied with mixed trailing-pad form (single + multi-byte
trailing — second cohort observation of multi-byte trailing
after Scopely's run-297 first-ever observation). D-11 omitted
(clean department pass-through).

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                 | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-n26`                   | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                | append `N26 = 'n26'` under Phase 110.   |
| `packages/plugins/index.ts`                             | import + append `N26Module` (alphabetical: between `MotorolaModule` and `NbcuniversalModule` — `Mot` < `N26` < `Nbc`). |
| `tsconfig.base.json`, `jest.config.js`                  | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md` | doc updates.                  |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — N26 rebrand or legal-entity rename. Mitigation:
  byte-for-byte `companyName` assertion catches any wire change.
- **R-02** — Wire URL upgrade to canonical variant 2 or to a
  different locale-prefix shape (e.g. `/de-eu/` for German).
  Mitigation: fallback uses canonical variant 2; the byte-for-
  byte test asserts the wire form so any upgrade surfaces as a
  fixture-mismatch test failure.
