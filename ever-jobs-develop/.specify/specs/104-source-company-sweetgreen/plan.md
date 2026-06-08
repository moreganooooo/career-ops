# Plan: 104 — Source Company Plugin: sweetgreen

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Mirror Fivetran (Spec 082) — same axes for D-08 and D-09
application status. **Three structural deviations** from
Fivetran:

1. **D-04 variant 29** — `careers.sweetgreen.com/jobs/<id>?gh_jid=<id>`
   (Fivetran variant 19 `www.fivetran.com/careers/job?gh_jid=<id>`).
   First cohort observation of variant 29 — careers-subdomain
   + bare brand-domain + `/jobs/<id>` path-id (no `/careers/`
   ancestor segment) + dual-id query.
2. **D-09 sub-axis** — sweetgreen's wire `' sweetgreen'`
   carries leading-whitespace pad; Fivetran's wire
   `'Fivetran '` carries trailing-whitespace pad. **First
   cohort observation of leading-whitespace under D-09.**
   Both apply `.trim()` to strip the pad.
3. **D-10 sub-axis** — sweetgreen applies D-10 with single-
   trailing-pad form (3/44 padded ~6.8 %); Fivetran omits
   D-10 (0/173 padded). Different application status.

D-11 omitted (clean department pass-through). D-08 entity-
decode-then-tag-strip shared with the cohort.

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                 | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-sweetgreen`            | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                | append `SWEETGREEN = 'sweetgreen'` under Phase 114. |
| `packages/plugins/index.ts`                             | import + append `SweetgreenModule` (alphabetical: between `StockXModule` and `TaskRabbitModule` — `Sto` < `Swe` < `Tas`). |
| `tsconfig.base.json`, `jest.config.js`                  | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md` | doc updates.                  |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — sweetgreen rebrand or capitalization-style change
  (e.g. official brand becomes "Sweetgreen" capitalized).
  Mitigation: byte-for-byte `companyName` assertion catches
  any wire change, including the leading-pad disappearing.
- **R-02** — Greenhouse normalises the leading-whitespace pad
  upstream. Mitigation: `.trim()` is idempotent on already-
  clean wire; the test asserts on the post-strip form so
  upstream normalisation surfaces as a fixture-mismatch test
  failure.
- **R-03** — Wire URL upgrade to canonical variant 2 or to a
  vanity-domain shape. Mitigation: fallback already uses
  canonical variant 2.
