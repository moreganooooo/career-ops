# Spec: 094 — Source Company Plugin: Cerebral

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 094                                                                                                                                                                                            |
| Slug           | source-company-cerebral                                                                                                                                                                        |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #304)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..093                                                                                                                                                                        |

## 1. Problem Statement

Run #303's Spec 093 closed end-to-end (Bobbie shipped, ninth
zero-deviation clean re-spin). Run #304 picks up the **fifth**
live hit alphabetically from the sixth-fresh-sweep candidate
pool: **Cerebral** (6 roles confirmed at run-304 start).

Cerebral, Inc. — operator of the **dominant US-domestic
telehealth-mental-health platform pioneered around the
subscription-based virtual psychiatric / behavioural-health
data model** (founded by Kyle Robertson and Ho Anh in 2019 in
San Francisco; raised ~$462M across rounds at peak ~$4.8B
valuation in December 2021 led by SoftBank Vision Fund 2;
voluntarily exited the controlled-substance prescribing
segment in 2022 amid DEA scrutiny and pivoted to a non-
controlled-substance behavioural-health stack; ships a
subscription-first telepsychiatry / therapy / care-coordination
platform across the US-domestic mental-health segment —
alongside competitors Talkspace, BetterHelp, Lyra, Spring
Health, and Headspace Health — with a hybrid distributed
workforce concentrated across San Francisco (HQ), New York,
and Remote across the United States) — is published at the
bare `cerebral` Greenhouse slug (the lowercase brand name;
case-symmetric with the wire `company_name === 'Cerebral'`)
and was confirmed live via run #304's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/cerebral/jobs?content=true`
(6 open roles confirmed at run-304 start).

## 2. Goals

- Ship a `source-company-cerebral` plugin returning live
  `JobPostDto` rows for the public Cerebral careers board.
- Match the structural and behavioural shape of the existing
  `source-company-adyen` plugin — Adyen is the closest
  structural cousin because both share **all five primary axes**:
  D-04 wire-shape variant 2 (canonical Greenhouse host), D-08
  entity-decode-then-tag-strip, D-09 omitted with case-symmetric
  bare-brand wire, D-10 applied (trailing-pad form), and D-11
  fully-clean department pass-through. Cerebral carries **zero
  structural deviations** — making this the **tenth** Greenhouse-
  only company-direct plugin in run-history to ship as a clean
  re-spin.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Cerebral postings.
- Cerebral product-API / EHR / patient-portal integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.CEREBRAL`** in
> the source registry, so that **a single `siteType:
> [Site.CEREBRAL]` request returns Cerebral's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.CEREBRAL = 'cerebral'` to the `Site` enum.                                              | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-cerebral`.                                          | must     |
| FR-3  | `CerebralService.scrape(input)` returns a `JobResponseDto`; never throws.                         | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `cerebral-`, `site === Site.CEREBRAL`, `companyName === 'Cerebral'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **applied** — 1 of 6 wire titles padded (trailing-space form).                               | must     |
| FR-14 | D-11 **omitted** — 0 of 6 wire department names padded.                                           | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.CEREBRAL, name: 'Cerebral', category: 'company' })
@Injectable()
export class CerebralService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-through;
  D-09 case-symmetric lock; D-10 trailing-pad trim lock
  (`'Therapy Associate - Connecticut '` → `'Therapy Associate -
  Connecticut'`); D-08 entity-decode + tag-strip locks.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #304):** **Wire-shape variant 2** — canonical
  Greenhouse host. **Twenty-fourth** plugin in the cohort to use
  variant 2.
- **D-08 (run #304):** Decode-then-strip pipeline. **Fiftieth**
  cohort plugin to apply D-08.
- **D-09 (run #304):** **Omitted** — case-symmetric bare-brand
  wire `'Cerebral'` (8 bytes — fully clean; case-symmetric with
  the lowercase 8-byte slug `cerebral`). **Forty-third cohort
  plugin to omit D-09**.
- **D-10 (run #304):** **Applied** — 1 of 6 wire titles padded
  with trailing-ASCII-space form (`'Therapy Associate -
  Connecticut '` → ~16.7 % pad rate on a small page). Standard
  `String.prototype.trim()`. **Twenty-first cohort plugin to
  apply D-10**.
- **D-11 (run #304):** **Omitted** — 0 of 6 wire department
  names padded (`'Client Support'`, `'Medical Care'`,
  `'Behavioral Care'` — clean multi-token forms). **Thirty-
  eighth cohort plugin** with fully-clean department pass-
  through.
- **D-13 (run #304):** **Zero structural deviations** from the
  Adyen (Spec 090) template — making this the **tenth**
  Greenhouse-only company-direct plugin in run-history to ship
  as a clean re-spin (after Coursera, Flexport, Glossier,
  Marqeta, New Relic, Scopely, Adyen, Bobbie, plus a corrected
  re-count).

## 11. References

- `packages/plugins/source-company-adyen/src/adyen.service.ts` —
  zero-deviation template.
- `packages/plugins/source-company-bobbie/src/bobbie.service.ts` —
  immediate predecessor in run-history (run #303).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
