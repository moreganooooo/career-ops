# Spec: 104 — Source Company Plugin: sweetgreen

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 104                                                                                                                                                                                            |
| Slug           | source-company-sweetgreen                                                                                                                                                                      |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #314)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..103                                                                                                                                                                        |

## 1. Problem Statement

Run #313's Spec 103 closed end-to-end (StockX shipped — seventh
D-11 application). Run #314 picks up the **fifteenth** live
hit alphabetically from the sixth-fresh-sweep candidate pool:
**sweetgreen** (44 visible roles confirmed at run-314 start
via direct HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/sweetgreen/jobs?content=true`;
the run-300 sixth-sweep estimate of ~132 keys was probe-counter-
inflated by ~3× via dept/office IDs).

sweetgreen, Inc. — operator of the **dominant US-domestic
fast-casual healthy-bowl restaurant chain pioneered around the
plant-forward / locally-sourced / made-to-order data model**
(founded by Nicolas Jammet, Jonathan Neman, and Nathaniel Ru
in 2007 in Washington, DC; raised ~$478M+ across rounds, went
public via traditional IPO on the NYSE in November 2021 under
ticker `SG` at a $3B initial valuation; market-cap settled in
the $0.5-2.5B band as of 2026; ships salads, warm bowls,
plates, beverages, and sides via 250+ restaurant locations and
a digital ordering platform across the fast-casual segment —
alongside competitors Cava, Chipotle, Tender Greens, Just
Salad, and Mendocino Farms — with a hybrid distributed
workforce concentrated across Los Angeles (HQ as of 2024 HQ
relocation from New York), Washington DC, Boston, Chicago,
Denver, plus 250+ restaurant locations across the United
States, and Remote across the corporate-support functions) —
is published at the bare `sweetgreen` Greenhouse slug (the
lowercase 10-byte brand-stem; the brand intentionally uses
lowercase styling — the wire `company_name === ' sweetgreen'`
carries a **leading ASCII-space pad byte** in front of the
brand-stem, so the post-trim form `'sweetgreen'` is byte-
symmetric with the slug) and was confirmed live via run #314's
HTTP 200 probe.

The run-314 probe revealed **two novel cohort observations**:

1. **D-04 wire-shape variant 29 — careers-subdomain on bare
   brand-domain + `/jobs/<id>` path-id + dual-id query —
   first cohort observation.** sweetgreen's `absolute_url`
   shape `https://careers.sweetgreen.com/jobs/<id>?gh_jid=<id>`
   combines four sub-axes: (a) `careers.`-subdomain on bare
   brand-domain (same shape as variant 8 Toast and variant
   21 Peloton, but on bare brand-domain; same as variant 26
   HelloFresh's careers-subdomain on bare brand-domain); (b)
   **direct `/jobs/<id>` path** with no `/careers/` ancestor
   segment — first cohort observation of `/jobs/`-as-root-
   path on a careers-subdomain (variant 26 HelloFresh has
   `/global/en/job/<id>`; variant 13 Epic Games has
   `epicgames.com/careers/jobs/<id>` with `/careers/` ancestor
   on the apex domain); (c) plural `/jobs/` collection name
   (same as variant 13 Epic Games' `/careers/jobs/<id>`); (d)
   dual-id (path + query) `?gh_jid=<id>` — listing ID
   repeated in path AND query (same dual-id form as variants
   13/26/28). **Thirty-second distinct wire-shape variant**
   in the company-direct cohort.

2. **D-09 APPLIED with first-cohort-observation LEADING-
   whitespace sub-axis.** Wire `company_name === ' sweetgreen'`
   byte-for-byte (11 bytes — single leading ASCII-space pad
   + 10-byte lowercase brand-stem); 100 % of run-314 listings
   carry the leading-space wire form. The plugin applies
   `.trim()` to `listing.company_name` before emit so the
   emitted `companyName` is the 10-byte `'sweetgreen'`
   (byte-symmetric with the lowercase 10-byte slug
   `sweetgreen`). **Second cohort plugin to apply D-09**
   (after Fivetran's run-292 first-ever trailing-whitespace
   application); **first cohort plugin to apply D-09 via
   LEADING-whitespace strip** — a fundamentally different
   sub-axis from Fivetran's trailing-whitespace case. This
   completes the leading-vs-trailing-pad recurrence pattern
   under D-09 that mirrors the recurrence patterns observed
   under D-10 (single-trailing → leading; multi-byte
   trailing; TAB) and D-11 (trailing → leading-pad cases).

## 2. Goals

- Ship a `source-company-sweetgreen` plugin returning live
  `JobPostDto` rows for the public sweetgreen careers board.
- Match the structural and behavioural shape of the existing
  `source-company-fivetran` plugin — Fivetran is the closest
  cohort cousin via shared D-09 application axis (a rare
  cohort axis — only two cohort plugins apply D-09 at this
  run).
- **Three structural deviations** from Fivetran:
  1. **D-04 variant 29** (Fivetran variant 19 `www.`-prefixed
     `/careers/job` query-only-id; sweetgreen variant 29
     careers-subdomain + bare-brand + `/jobs/<id>` path-id
     + dual-id — first cohort observation of variant 29).
  2. **D-09 sub-axis** (Fivetran trailing-whitespace pad;
     sweetgreen LEADING-whitespace pad — first cohort
     observation of leading-whitespace under D-09).
  3. **D-10 sub-axis** (Fivetran 0/173 padded — D-10 omitted;
     sweetgreen 3/44 trailing-pad — D-10 applied — twenty-
     eighth cohort plugin to apply D-10).
- Bundle a unit-test suite (≥ 8 cases) including locks for
  variant-29 URL pass-through, the D-09 leading-whitespace
  trim sub-axis, and the D-10 trailing-pad sub-axis.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical sweetgreen postings.
- sweetgreen product-API / restaurant-management / digital-
  ordering / loyalty integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.SWEETGREEN`** in
> the source registry, so that **a single `siteType:
> [Site.SWEETGREEN]` request returns sweetgreen's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.SWEETGREEN = 'sweetgreen'` to the `Site` enum.                                          | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-sweetgreen`.                                        | must     |
| FR-3  | `SweetgreenService.scrape(input)` returns a `JobResponseDto`; never throws.                       | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `sweetgreen-`, `site === Site.SWEETGREEN`, `companyName === 'sweetgreen'` (D-09 applied — leading-whitespace stripped). | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 29). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (3 of 44 padded).             | must     |
| FR-14 | D-09 **applied** — `company_name` `.trim()` strips leading ASCII-space pad (100 % wire pad rate). | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.SWEETGREEN, name: 'sweetgreen', category: 'company' })
@Injectable()
export class SweetgreenService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts:
  - **D-04 variant-29 lock**: emitted `jobUrl` byte-for-byte;
    contains `careers.sweetgreen.com/jobs/`; contains
    `?gh_jid=`; does NOT contain `job-boards.greenhouse.io`;
    does NOT contain `/careers/` (locks the no-`/careers/`-
    ancestor sub-axis vs Epic Games variant 13).
  - **D-09 application lock with leading-whitespace strip
    sub-axis**: input `company_name === ' sweetgreen'`
    (11 bytes; 1 leading space + 10-byte brand) → emitted
    `companyName === 'sweetgreen'` (10 bytes — byte-distinct
    + 1-byte-shorter; does NOT start with whitespace);
    `'sweetgreen'.toLowerCase() === 'sweetgreen' === slug`
    (matches the slug under casefold post-strip).
  - **D-10 application lock with trailing-pad sub-axis**:
    input title `'Assistant General Manager '` (trailing
    space) → emitted `'Assistant General Manager'` (byte-
    distinct + 1-byte-shorter).
  - D-08 regression locks (entity-decode + tag-strip + brand
    substring presence).
  - D-11 pass-through behaviour: wire `departments[0].name`
    flows through byte-for-byte (e.g. `'Operations'`,
    `'Mountain View'`, `'Pentagon City'`).
- Plus standard cohort cases: `resultsWanted=1` cap, searchTerm
  filter on title, searchTerm filter on department, HTTP 500 →
  empty, empty `data.jobs` → empty.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #314):** **Wire-shape variant 29 — careers-
  subdomain on bare brand-domain + `/jobs/<id>` path-id (no
  `/careers/` ancestor) + dual-id query — first cohort
  observation.** Thirty-second distinct wire-shape variant.
- **D-08 (run #314):** Decode-then-strip pipeline. **Sixtieth**
  cohort plugin to apply D-08 — the cohort crosses the 60-
  plugin D-08 threshold at this run.
- **D-09 (run #314):** **APPLIED with first-cohort-observation
  LEADING-whitespace sub-axis.** Wire `company_name ===
  ' sweetgreen'` byte-for-byte (11 bytes; 1 leading space +
  10-byte lowercase brand-stem); 100 % of run-314 listings
  carry the leading-space wire form. The plugin applies
  `.trim()` to `listing.company_name` before emit so the
  emitted `companyName === 'sweetgreen'` (10 bytes — byte-
  symmetric with the lowercase 10-byte slug `sweetgreen`).
  **Second cohort plugin to apply D-09** (after Fivetran's
  run-292 first-ever trailing-whitespace application);
  **first cohort plugin to apply D-09 via LEADING-whitespace
  strip** — a fundamentally different sub-axis from Fivetran's
  trailing-whitespace case (Fivetran trimmed `'Fivetran '` to
  `'Fivetran'`; sweetgreen trims `' sweetgreen'` to
  `'sweetgreen'`). The leading-vs-trailing pad recurrence
  pattern under D-09 mirrors the recurrence patterns observed
  under D-10 (single-trailing → leading → multi-byte trailing
  → TAB) and D-11 (trailing → leading-pad cases).
- **D-10 (run #314):** **APPLIED with trailing-pad form.** 3
  of 44 wire titles in the run-314 probe carry single-
  trailing-ASCII-space padding (`'Assistant General Manager '`,
  `'Restaurant General Manager '` × 2; ~6.8 % pad rate, all
  trailing-only). **Twenty-eighth cohort plugin to apply
  D-10**.
- **D-11 (run #314):** **Omitted** — 0 of 44 wire department
  names padded (`'Operations'`, `'Galleria Edina'`,
  `'Mountain View'`, `'Berkeley'`, `'Marketing'`,
  `'55th + Park'`, `'Evanston'`, `'Finance'`, `'Business
  Technology'`, `'Pentagon City'`, `'Hollywood'`, `'Edge
  District'`, plus 27 others — the high unique-count of 39 /
  44 reflects sweetgreen's restaurant-location-as-department
  convention where each restaurant location is a distinct
  department; clean multi-token forms with internal
  whitespace, plus signs, and proper-noun tokens). **Forty-
  fifth cohort plugin** with fully-clean department pass-
  through.
- **D-13 (run #314):** **Three structural deviations** from
  the Fivetran (Spec 082) template:
  1. D-04 wire-shape variant 29 (Fivetran variant 19 `www.`-
     prefixed `/careers/job`; sweetgreen variant 29 careers-
     subdomain + bare-brand + `/jobs/<id>`).
  2. D-09 sub-axis (Fivetran trailing-whitespace; sweetgreen
     LEADING-whitespace — first cohort observation).
  3. D-10 sub-axis (Fivetran 0/173 padded — D-10 omitted;
     sweetgreen 3/44 trailing-pad — D-10 applied).

## 11. References

- `packages/plugins/source-company-fivetran/src/fivetran.service.ts` —
  closest cohort cousin (D-09 application reference).
- `packages/plugins/source-company-stockx/src/stockx.service.ts` —
  immediate predecessor in run-history (run #313).
- `packages/plugins/source-company-hellofresh/src/hellofresh.service.ts` —
  variant-26 careers-subdomain reference.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
