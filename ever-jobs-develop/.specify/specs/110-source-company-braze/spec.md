# Spec: 110 — Source Company Plugin: Braze

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 110                                                                                                                                                                                            |
| Slug           | source-company-braze                                                                                                                                                                           |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #320)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..109                                                                                                                                                                        |

## 1. Problem Statement

Run #319's Spec 109 closed end-to-end (Bandwidth shipped —
sixteenth zero-deviation clean re-spin; 50-plugin D-11-omission
threshold). Run #320 picks up the **fifth** live hit
alphabetically from the seventh-fresh-sweep candidate pool:
**Braze** (207 visible roles confirmed at run-320 start via
direct HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/braze/jobs?content=true`).

Braze, Inc. — operator of the **dominant customer-engagement
platform pioneered around the cross-channel marketing-
automation / behavioral-segmentation / lifecycle-messaging
data model** (founded by Bill Magnuson, Mark Ghermezian, and
Jon Hyman in 2011 in New York; took its name from the
flame-and-spark imagery of "blazing" a path through customer
data; public on the NASDAQ since November 2021 IPO under
ticker `BRZE` at a $7B initial valuation; market-cap settled
in the $3-7B band as of 2026; ships email, push, SMS,
in-app, web messaging, Canvas Flow journey orchestration, and
the Catalogs / Currents / Recommend AI products across the
customer-engagement / marketing-automation segment —
alongside competitors Iterable, Klaviyo, Salesforce Marketing
Cloud, Adobe Campaign, MoEngage, and Mailchimp — with a
hybrid distributed workforce concentrated across New York
(HQ), San Francisco, Chicago, Austin, London, Berlin, Tokyo,
Singapore, Sydney, and Remote across the United States, the
United Kingdom, Germany, Japan, Singapore, and Australia) —
is published at the bare `braze` Greenhouse slug
(case-symmetric with the wire `company_name === 'Braze'`
after casefold) and was confirmed live via run #320's HTTP
200 probe.

## 2. Goals

- Ship a `source-company-braze` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-flexport` plugin — Flexport is the closest
  cohort cousin via shared D-04 variant 10 (legacy hosted-
  board apex `boards.greenhouse.io/<slug>/jobs/<id>?gh_jid=<id>`),
  D-08, D-09 case-symmetric, D-10 trailing-pad, and D-11
  fully-clean.
- **Zero structural deviations** from Flexport — making this
  the **seventeenth** Greenhouse-only company-direct plugin
  in run-history to ship as a clean re-spin (after Coursera,
  Flexport, Glossier, Marqeta, New Relic, Scopely, Adyen,
  Bobbie, Cerebral, Misfits Market, Monzo, Airtable,
  Bandwidth, plus corrected counts).
- **Sub-axis observation:** Braze's D-10 application carries
  a single leading-space pad listing
  (`' Forward Deployed Data Scientist, AI Deployment'`) plus
  two trailing-pad listings — same mixed-pad pattern as
  Coalition's run-#305 D-10 application and Amplitude's
  run-#317 mixed-pad application. Standard
  `String.prototype.trim()` strips both sub-axes.
- **Fourth cohort plugin to use wire-shape variant 10**
  (after Chime / Faire / Flexport).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Braze postings.
- Braze product-API / Canvas / Currents / Recommend
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.BRAZE`** in
> the source registry, so that **a single `siteType:
> [Site.BRAZE]` request returns Braze's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.BRAZE = 'braze'` to the `Site` enum.                                                    | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-braze`.                                             | must     |
| FR-3  | `BrazeService.scrape(input)` returns a `JobResponseDto`; never throws.                            | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `braze-`, `site === Site.BRAZE`, `companyName === 'Braze'`.   | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 10 — legacy hosted-board apex). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers trailing + leading sub-axes (3 of 207 padded ~1.4 %).    | must     |
| FR-14 | D-11 **omitted** — 0 of 207 wire department names padded.                                         | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.BRAZE, name: 'Braze', category: 'company' })
@Injectable()
export class BrazeService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-10 URL pass-through
  (legacy hosted-board apex `boards.greenhouse.io/braze/jobs/<id>?gh_jid=<id>`),
  D-09 case-symmetric `'Braze'` lock, D-10 trailing-pad trim
  lock, D-11 clean pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #320):** **Wire-shape variant 10** — legacy
  hosted-board apex `https://boards.greenhouse.io/braze/jobs/<id>?gh_jid=<id>`.
  **Fourth** plugin in the cohort to use variant 10 (after
  Chime / Faire / Flexport).
- **D-08 (run #320):** Decode-then-strip pipeline. **Sixty-
  sixth** cohort plugin to apply D-08.
- **D-09 (run #320):** **Omitted** — case-symmetric bare-brand
  wire `'Braze'` (5 bytes). **Fifty-seventh cohort plugin to
  omit D-09**.
- **D-10 (run #320):** **APPLIED with mixed trailing + leading
  pad form.** 3 of 207 wire titles padded (~1.4 %): 2
  trailing-only + 1 leading-only. Same mixed-pad sub-axis
  pattern as Coalition's run-#305 and Amplitude's run-#317
  observations. Standard `String.prototype.trim()` strips
  both. **Thirty-fourth cohort plugin to apply D-10**.
- **D-11 (run #320):** **Omitted** — 0 of 207 wire department
  names padded across 11 unique department names.
  **Fifty-first cohort plugin** with fully-clean department
  pass-through.
- **D-13 (run #320):** **Zero structural deviations** from
  the Flexport (Spec 070) template — making this the
  **seventeenth** Greenhouse-only company-direct plugin in
  run-history to ship as a clean re-spin.

## 11. References

- `packages/plugins/source-company-flexport/src/flexport.service.ts` —
  zero-deviation template (variant 10).
- `packages/plugins/source-company-bandwidth/src/bandwidth.service.ts` —
  immediate predecessor (run #319).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
