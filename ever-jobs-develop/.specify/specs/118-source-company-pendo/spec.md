# Spec: 118 — Source Company Plugin: Pendo

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 118                                                                                                                                                                                            |
| Slug           | source-company-pendo                                                                                                                                                                           |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #328)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..117                                                                                                                                                                        |

## 1. Problem Statement

Run #327's Spec 117 closed end-to-end (PagerDuty shipped — 21st
clean re-spin off LaunchDarkly; 5th TWO-cap PascalCase D-09).
Run #328 picks up the **thirteenth** live hit alphabetically
from the seventh-fresh-sweep candidate pool: **Pendo** (18
visible roles confirmed at run-328 start — exact match with
the run-316 estimate of ~18 keys; **lowest probe-counter-
inflation factor (1×)** observed in the seventh-sweep).

Pendo, Inc. (Pendo.io) — operator of the **dominant product-
analytics + in-app guidance platform pioneered around the
product-led-growth-as-a-service data model** (founded by Todd
Olson, Eric Boduch, Erik Troan, and Rahul Jain in 2013 in
Raleigh, North Carolina; raised ~$356M across rounds at peak
~$2.6B valuation in October 2021 led by Thoma Bravo and
Sapphire Ventures; ships Pendo Product Analytics (Insights),
Guides + Onboarding (in-app walkthroughs), Feedback (in-app
voting / NPS), Roadmaps, and Mobile / Replay across the
product-analytics / in-app-guidance / digital-adoption-
platform segment — alongside competitors Amplitude, Mixpanel,
Heap, Gainsight PX (formerly Aptrinsic), WalkMe, Whatfix, and
LogRocket — with a hybrid distributed workforce concentrated
across Raleigh (HQ), New York, Tel Aviv, San Francisco,
London, Tokyo, and Remote across the United States, Israel,
the United Kingdom, the European Union, and Japan) — is
published at the bare `pendo` Greenhouse slug (case-symmetric
with the wire `company_name === 'Pendo'` after casefold).

## 2. Goals

- Ship a `source-company-pendo` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-coursera` plugin — Coursera is the closest
  cohort cousin via shared D-04 variant 2 + D-08 + D-09 case-
  symmetric + D-10 omitted + D-11 omitted axes.
- **Zero structural deviations** from Coursera.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Pendo postings.
- Pendo product-API / Insights / Guides / Feedback /
  Roadmaps integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.PENDO`** in the
> source registry, so that **a single `siteType: [Site.PENDO]`
> request returns Pendo's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.PENDO = 'pendo'` to the `Site` enum.                                                    | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-pendo`.                                             | must     |
| FR-3  | `PendoService.scrape(input)` returns a `JobResponseDto`; never throws.                            | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `pendo-`, `site === Site.PENDO`, `companyName === 'Pendo'`.   | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).                                        | must     |
| FR-13 | D-10 **omitted** — title emitted byte-for-byte (0 of 18 wire titles padded).                      | must     |
| FR-14 | D-11 **omitted** — 0 of 18 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.PENDO, name: 'Pendo', category: 'company' })
@Injectable()
export class PendoService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Pendo'` lock; D-10 wire-title
  byte-for-byte pass-through (no trim) lock; D-11 clean dept
  pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #328):** Wire-shape variant 2. **Thirty-eighth**
  plugin in the cohort to use variant 2.
- **D-08 (run #328):** Decode-then-strip pipeline. **Seventy-
  fourth** cohort plugin to apply D-08.
- **D-09 (run #328):** **Omitted** — case-symmetric bare-brand
  wire `'Pendo'` (5 bytes). **Sixty-fifth cohort plugin to
  omit D-09**.
- **D-10 (run #328):** **Omitted** — 0 of 18 wire titles
  padded; the plugin emits `listing.title` byte-for-byte
  without a `.trim()`. **Twenty-second cohort plugin to omit
  D-10**.
- **D-11 (run #328):** **Omitted** — 0 of 18 wire department
  names padded across 7 unique department names (`'Brand
  Marketing'`, `'Commercial'`, `'Engineering Operations'`,
  `'Enterprise'`, `'Field Marketing'`, `'Finance'`, `'Product
  Marketing'` — clean multi-token forms with internal
  whitespace). **Fifty-ninth cohort plugin** with fully-clean
  department pass-through.
- **D-13 (run #328):** **Zero structural deviations** from the
  Coursera (Spec 068) template — making this the **twenty-
  second** Greenhouse-only company-direct plugin in run-history
  to ship as a clean re-spin.

## 11. References

- `packages/plugins/source-company-coursera/src/coursera.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin).
- `packages/plugins/source-company-pagerduty/src/pagerduty.service.ts` —
  immediate predecessor (run #327).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
