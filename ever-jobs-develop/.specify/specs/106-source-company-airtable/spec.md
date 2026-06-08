# Spec: 106 — Source Company Plugin: Airtable

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 106                                                                                                                                                                                            |
| Slug           | source-company-airtable                                                                                                                                                                        |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #316)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..105                                                                                                                                                                        |

## 1. Problem Statement

Run #315's Spec 105 closed end-to-end (xAI shipped — first
cohort observation of LOWERCASE-FIRST PascalCase D-09 wire
form; **sixth-fresh-sweep candidate pool fully exhausted**
with 16 plugins shipped across runs #300-#315).

Run #316 launches a **seventh fresh probe sweep** targeting
yet-untested large-employer candidate slugs. Run-316 probed
~60 candidate slugs and found **9 fresh non-empty live hits**
forming the new candidate pool:
- `airtable` (~27 roles — alphabetically first, run #316 ships)
- `amplitude` (~? large)
- `contentful` (~? large)
- `dialpad` (~? large)
- `disney` (~1 role — deferred-empty pool candidate)
- `okta` (~? very large)
- `pagerduty` (~? medium)
- `pendo` (~? small-medium)
- `pingidentity` (~? medium)

Plus 1 long-deferred empty (`hubspot` — empty meta.total ===
0; 30 bytes returned; eighteenth-or-greater consecutive empty
re-probe — HubSpot remains deferred).

Run #316 picks **airtable** — the alphabetically-first live
hit. Airtable, Inc. — operator of the **dominant low-code /
no-code spreadsheet-database platform pioneered around the
relational-database-with-spreadsheet-UI data model** (founded
by Howie Liu, Andrew Ofstad, and Emmett Nicholas in 2012 in
San Francisco; raised ~$1.4B+ across rounds at peak ~$11.7B
valuation in December 2021 led by D1 Capital Partners,
Greenoaks Capital, T. Rowe Price, Tiger Global, and Caffeinated
Capital; ships an extensible work-management database product
with embedded automation, AI, and developer extensions across
the productivity-database / collaborative-work-management
segment — alongside competitors Smartsheet, Notion, ClickUp,
monday.com, and Microsoft Lists — with a hybrid distributed
workforce concentrated across San Francisco (HQ), New York,
Austin, London, Sydney, and Remote across the United States,
the United Kingdom, and the European Union) — is published at
the bare `airtable` Greenhouse slug (the lowercase 8-byte
brand-stem; case-symmetric with the wire `company_name ===
'Airtable'` after casefold) and was confirmed live via run
#316's HTTP 200 probe.

## 2. Goals

- Ship a `source-company-airtable` plugin returning live
  `JobPostDto` rows for the public Airtable careers board.
- Match the structural and behavioural shape of the existing
  `source-company-adyen` plugin — Adyen is the closest cohort
  cousin via shared D-04 variant 2, D-08 entity-decode-then-
  tag-strip, D-09 omitted with case-symmetric bare-brand wire,
  D-10 trailing-pad applied, and D-11 fully-clean department
  pass-through.
- **Zero structural deviations** from Adyen — making this the
  **fourteenth** Greenhouse-only company-direct plugin in
  run-history to ship as a clean re-spin (after Coursera,
  Flexport, Glossier, Marqeta, New Relic, Scopely, Adyen,
  Bobbie, Cerebral, Misfits Market, Monzo, plus a corrected
  count for Typeform's near-miss and PlanetScale's near-miss).
- **Sub-axis observation:** Airtable's D-10 application
  introduces a **DUAL-pad sub-axis** — 1 of 27 wire titles
  carries leading + trailing pad bytes simultaneously
  (`' Account Executive, Strategic Accounts | DACH '`).
  **Third cohort observation of dual-pad on the title axis**
  (after New Relic's run-295 first-ever dual-pad and Scopely's
  run-297 second observation; Airtable lifts dual-pad to a
  recurring axis). Standard `String.prototype.trim()` strips
  both sides in a single call — implementation byte-identical
  to Adyen.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Airtable postings.
- Airtable product-API / database / automation / AI
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.AIRTABLE`** in
> the source registry, so that **a single `siteType:
> [Site.AIRTABLE]` request returns Airtable's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.AIRTABLE = 'airtable'` to the `Site` enum.                                              | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-airtable`.                                          | must     |
| FR-3  | `AirtableService.scrape(input)` returns a `JobResponseDto`; never throws.                         | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `airtable-`, `site === Site.AIRTABLE`, `companyName === 'Airtable'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers both single-trailing-pad and dual-pad sub-axes.         | must     |
| FR-14 | D-11 **omitted** — 0 of 27 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.AIRTABLE, name: 'Airtable', category: 'company' })
@Injectable()
export class AirtableService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts:
  - **D-04 variant-2 lock**: emitted `jobUrl` contains
    `job-boards.greenhouse.io/airtable/jobs/`; does NOT
    contain `airtable.com` (anti-substring lock).
  - **D-09 omission lock with case-symmetric bare-brand wire**:
    emitted `companyName === 'Airtable'` byte-for-byte
    (8 bytes); `'Airtable'.toLowerCase() === 'airtable'`
    (matches the slug).
  - **D-10 application lock with dual-pad sub-axis**: input
    title `' Account Executive, Strategic Accounts | DACH '`
    (1 leading + 1 trailing space) → emitted `'Account
    Executive, Strategic Accounts | DACH'` (byte-distinct +
    2-bytes-shorter; does NOT start or end with whitespace).
  - D-08 regression locks (entity-decode + tag-strip + brand
    substring presence).
  - D-11 pass-through behaviour: wire `departments[0].name`
    flows through byte-for-byte (e.g. `'Sales'`).
- Plus standard cohort cases: `resultsWanted=1` cap, searchTerm
  filter on title, searchTerm filter on department, HTTP 500 →
  empty, empty `data.jobs` → empty.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #316):** **Wire-shape variant 2 — canonical
  Greenhouse host** `https://job-boards.greenhouse.io/airtable/jobs/<id>`.
  **Thirty-first** plugin in the cohort to use variant 2.
- **D-08 (run #316):** Decode-then-strip pipeline. **Sixty-
  second** cohort plugin to apply D-08.
- **D-09 (run #316):** **Omitted** — wire `company_name ===
  'Airtable'` byte-for-byte (8 bytes; case-symmetric with the
  lowercase 8-byte slug `airtable` after casefold).
  **Fifty-fourth cohort plugin to omit D-09**.
- **D-10 (run #316):** **APPLIED with dual-pad sub-axis
  observation.** 1 of 27 wire titles in the run-316 probe
  carries leading + trailing ASCII-space padding
  (`' Account Executive, Strategic Accounts | DACH '`).
  **Third cohort observation of dual-pad on the title axis**
  (after New Relic's run-295 first-ever and Scopely's
  run-297 second; Airtable lifts dual-pad to a recurring
  axis). Standard `String.prototype.trim()` strips both
  sides. **Thirtieth cohort plugin to apply D-10**.
- **D-11 (run #316):** **Omitted** — 0 of 27 wire department
  names padded across 11 unique department names (`'Sales'`,
  `'Customer Support'`, `'Data'`, `'Demand Generation'`,
  `'Customer Success & Services'`, `'Design'`, `'Engineering'`,
  `'Solutions Consulting'`, `'Marketing'`, plus 2 others —
  clean single-token / multi-token forms with internal
  whitespace and ampersands). **Forty-seventh cohort plugin**
  with fully-clean department pass-through.
- **D-13 (run #316):** **Zero structural deviations** from
  the Adyen (Spec 090) template — making this the
  **fourteenth** Greenhouse-only company-direct plugin in
  run-history to ship as a clean re-spin (after Coursera off
  Chime at run #278, Flexport off Faire at run #280, Glossier
  off Flexport at run #282, Marqeta off Calendly at run #294,
  New Relic off Maven Clinic at run #295, Scopely off Marqeta
  at run #297, Adyen off Marqeta at run #300, Bobbie off
  Coursera at run #303, Cerebral off Adyen at run #304,
  Misfits Market off New Relic at run #308, Monzo off Adyen
  at run #309, plus a corrected count). The dual-pad sub-axis
  observation is a sub-axis observation under D-10, not a
  structural deviation.

## 11. References

- `packages/plugins/source-company-adyen/src/adyen.service.ts` —
  zero-deviation template (variant 2 + D-10 trailing-pad
  applied).
- `packages/plugins/source-company-xai/src/xai.service.ts` —
  immediate predecessor in run-history (run #315, sixth-
  sweep last plugin).
- `packages/plugins/source-company-newrelic/src/newrelic.service.ts` —
  first-cohort dual-pad sub-axis reference.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
