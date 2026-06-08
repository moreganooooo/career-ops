# Plan: 102 — Source Company Plugin: SoFi

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Mirror Epic Games (Spec 069) — closest cohort cousin via shared
bare-brand-domain + `/careers/<job-collection>/<id>` + dual-id
query wire-shape pattern. **Three structural deviations** from
Epic Games:

1. **D-04 variant 28** — `sofi.com/careers/job/<id>?gh_jid=<id>`
   (Epic Games variant 13 PLURAL `epicgames.com/careers/jobs/<id>?gh_jid=<id>`).
   First cohort observation of variant 28's singular-`/job/`-
   with-path-id form.
2. **D-09 sub-axis** — SoFi's wire `'SoFi'` is case-asymmetric
   mixed-case 4-byte (internal capital `F` at byte index 2);
   Epic Games' wire `'Epic Games'` is multi-token bare-brand
   10-byte with internal whitespace. Different sub-axis under
   the D-09-omitted axis.
3. **D-10 sub-axis** — SoFi applies D-10 with mixed pad forms
   including the **first cohort observation of trailing-TAB
   pad-byte** (2 of 204 wire titles); Epic Games applied
   D-10 with single-trailing-space pad only. Sister to BILL's
   run-302 first-ever leading-TAB observation; SoFi lifts the
   TAB-pad-byte sub-axis from a one-off to a recurring axis.

D-11 omitted (clean department pass-through). D-08 entity-
decode-then-tag-strip shared with the cohort.

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                 | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-sofi`                  | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                | append `SOFI = 'sofi'` under Phase 112. |
| `packages/plugins/index.ts`                             | import + append `SoFiModule` (alphabetical: between `SnowflakeModule` and `SquarespaceModule` — `Sno` < `SoF` < `Squ`). |
| `tsconfig.base.json`, `jest.config.js`                  | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md` | doc updates.                  |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — SoFi rebrand or legal-entity rename. Mitigation:
  byte-for-byte `companyName` assertion catches any wire change.
- **R-02** — Wire URL upgrade to canonical variant 2 or to a
  different path-collection (e.g. `/careers/jobs/` plural).
  Mitigation: fallback uses canonical variant 2; the byte-for-
  byte test asserts the wire form so any upgrade surfaces as
  a fixture-mismatch test failure.
- **R-03** — Greenhouse normalises trailing-TAB pad bytes
  upstream. Mitigation: standard `.trim()` is idempotent on
  already-clean wire; fixture preserves the observed form for
  regression observability.
