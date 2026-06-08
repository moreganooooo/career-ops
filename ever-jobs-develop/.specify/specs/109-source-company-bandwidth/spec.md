# Spec: 109 — Source Company Plugin: Bandwidth

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 109                                                                                                                                                                                            |
| Slug           | source-company-bandwidth                                                                                                                                                                       |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #319)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..108                                                                                                                                                                        |

## 1. Problem Statement

Run #318's Spec 108 closed end-to-end (AssemblyAI shipped —
first cohort PascalCase three-cap D-09 wire form). Run #319
picks up the **fourth** live hit alphabetically from the
seventh-fresh-sweep candidate pool: **Bandwidth** (45 visible
roles confirmed at run-319 start via direct HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/bandwidth/jobs?content=true`).

Bandwidth Inc. — operator of the **dominant US-domestic CPaaS
(communications-platform-as-a-service) platform pioneered
around the carrier-grade voice / messaging / 911 / programmable
phone-number data model** (founded by David Morken in 1999 in
Raleigh, NC; took its name from "bandwidth.com"; public on the
NASDAQ since November 2017 IPO under ticker `BAND` at a
$408M initial valuation; market-cap settled in the $0.5-1.5B
band as of 2026; ships Voice / Messaging / Emergency 911 /
Phone Numbers / Insights API products built on its own
nationwide IP-voice network across the CPaaS / programmable-
communications segment — alongside competitors Twilio, Vonage,
Sinch, Plivo, and Telnyx — with a hybrid distributed workforce
concentrated across Raleigh (HQ), Denver, San Diego, Rochester,
Brussels, Stockholm, and Remote across the United States and
the European Union) — is published at the bare `bandwidth`
Greenhouse slug (case-symmetric with the wire `company_name
=== 'Bandwidth'` after casefold) and was confirmed live via
run #319's HTTP 200 probe.

## 2. Goals

- Ship a `source-company-bandwidth` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-adyen` plugin — Adyen is the closest cohort
  cousin via shared D-04 variant 2, D-08, D-09 case-symmetric,
  D-10 trailing-pad, and D-11 fully-clean.
- **Zero structural deviations** from Adyen — making this the
  **sixteenth** Greenhouse-only company-direct plugin in run-
  history to ship as a clean re-spin (after Coursera, Flexport,
  Glossier, Marqeta, New Relic, Scopely, Adyen, Bobbie,
  Cerebral, Misfits Market, Monzo, Airtable, Contentful (when
  shipped), plus corrected counts).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Bandwidth postings.
- Bandwidth product-API / voice / messaging / 911 integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.BANDWIDTH`** in
> the source registry, so that **a single `siteType:
> [Site.BANDWIDTH]` request returns Bandwidth's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.BANDWIDTH = 'bandwidth'` to the `Site` enum.                                            | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-bandwidth`.                                         | must     |
| FR-3  | `BandwidthService.scrape(input)` returns a `JobResponseDto`; never throws.                        | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `bandwidth-`, `site === Site.BANDWIDTH`, `companyName === 'Bandwidth'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (10 of 45 padded ~22.2 %).    | must     |
| FR-14 | D-11 **omitted** — 0 of 45 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.BANDWIDTH, name: 'Bandwidth', category: 'company' })
@Injectable()
export class BandwidthService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-through,
  D-09 case-symmetric `'Bandwidth'` lock, D-10 trailing-pad
  trim lock, D-11 clean pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #319):** **Wire-shape variant 2.** **Thirty-fourth**
  plugin in the cohort to use variant 2.
- **D-08 (run #319):** Decode-then-strip pipeline. **Sixty-
  fifth** cohort plugin to apply D-08.
- **D-09 (run #319):** **Omitted** — case-symmetric bare-brand
  wire `'Bandwidth'` (9 bytes; matches the lowercase 9-byte
  slug after casefold). **Fifty-sixth cohort plugin to omit
  D-09**.
- **D-10 (run #319):** **APPLIED with trailing-pad form.** 10
  of 45 wire titles padded (~22.2 %; all trailing-only).
  **Thirty-third cohort plugin to apply D-10**.
- **D-11 (run #319):** **Omitted** — 0 of 45 wire department
  names padded across 14 unique department names. **Fiftieth
  cohort plugin** with fully-clean department pass-through —
  the cohort crosses the 50-plugin D-11-omission threshold at
  this run.
- **D-13 (run #319):** **Zero structural deviations** from
  the Adyen (Spec 090) template — making this the **sixteenth**
  Greenhouse-only company-direct plugin in run-history to ship
  as a clean re-spin.

## 11. References

- `packages/plugins/source-company-adyen/src/adyen.service.ts` —
  zero-deviation template.
- `packages/plugins/source-company-assemblyai/src/assemblyai.service.ts` —
  immediate predecessor (run #318).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
