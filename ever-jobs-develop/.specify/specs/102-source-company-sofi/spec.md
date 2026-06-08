# Spec: 102 — Source Company Plugin: SoFi

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 102                                                                                                                                                                                            |
| Slug           | source-company-sofi                                                                                                                                                                            |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #312)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..101                                                                                                                                                                        |

## 1. Problem Statement

Run #311's Spec 101 closed end-to-end (PlanetScale shipped —
50th D-09-omission threshold crossed). Run #312 picks up the
**thirteenth** live hit alphabetically from the sixth-fresh-
sweep candidate pool: **SoFi** (204 visible roles confirmed at
run-312 start via direct HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/sofi/jobs?content=true`;
the run-300 sixth-sweep estimate of ~2652 keys was probe-
counter-inflated by ~13× via dept/office IDs — the most
extreme inflation observed in the cohort to date, exceeding
HelloFresh's run-307 ~3× inflation and Coalition's run-305
~2× inflation).

SoFi Technologies, Inc. — operator of the **dominant US-
domestic neobank-and-personal-finance-superapp platform
pioneered around the student-loan-refinance-to-banking-and-
investing graduation data model** (founded by Mike Cagney,
Dan Macklin, James Finnigan, and Ian Brady in 2011 in San
Francisco; took its name from "Social Finance"; raised
$2.5B+ across rounds, went public via SPAC merger with Social
Capital Hedosophia V in June 2021 at a $9B initial valuation
under NASDAQ ticker `SOFI`; market-cap settled in the $4-22B
band as of 2026; obtained US national-bank charter via the
February 2022 acquisition of Golden Pacific Bancorp; ships
banking, lending (student / personal / mortgage / auto),
investing, credit cards, and the SoFi Money / SoFi Stadium
brand portfolios across the US retail-banking / personal-
finance segment — alongside competitors Chime, Robinhood,
Affirm, Upstart, Marcus by Goldman Sachs, and Ally Bank — with
a hybrid distributed workforce concentrated across San
Francisco (HQ), New York, Cottonwood Heights (UT), Frisco
(TX), Seattle, Reston (VA), Murray (UT), Jacksonville (FL),
and Remote across the United States) — is published at the
bare `sofi` Greenhouse slug (the lowercase 4-byte brand-stem;
case-asymmetric with the wire `company_name === 'SoFi'` —
slug 4 bytes lowercase / wire 4 bytes mixed-case with
internal capital `F` at byte index 2; same case-only-
asymmetric same-byte-count shape as DataCamp / HelloFresh /
N26 / PlanetScale) and was confirmed live via run #312's HTTP
200 probe.

The run-312 probe revealed **two novel cohort observations**:

1. **D-04 wire-shape variant 28 — bare brand-domain + singular
   `/careers/job/<id>` path-id + dual-id query — first cohort
   observation.** SoFi's `absolute_url` shape
   `https://sofi.com/careers/job/<id>?gh_jid=<id>` combines
   four sub-axes: (a) bare brand-domain `sofi.com` (same as
   variants 13/15/18/23/27); (b) **singular `/careers/job/`
   path with path-id** — same singular `/job/` collection
   name as variant 19 (Klaviyo's `/careers/job` query-only)
   and variant 24 (BILL's `/job?<id>` bare-id-query); same
   id-in-path positioning as variant 13 (Epic Games' PLURAL
   `/careers/jobs/<id>`); first cohort observation of
   singular-`/job/`-WITH-path-id (Klaviyo's variant 19 has
   no path-id; BILL's variant 24 has path-id but as bare-id-
   query); (c) dual-id (path + query) `?gh_jid=<id>` —
   listing ID repeated in path AND query, same dual-id
   form as variants 13/26 but with the singular-`job/`
   parent. **Thirty-first distinct wire-shape variant** in
   the company-direct cohort.

2. **D-10 trailing-TAB pad-byte sub-axis — first cohort
   observation.** 2 of 204 wire titles carry trailing TAB
   (U+0009) padding (`'Interactive Project Manager (Contract)\t'`,
   `'Senior Art Director (Contract)\t'`). **First cohort
   observation of trailing-TAB pad-byte under D-10** — distinct
   from BILL's run-302 first-ever leading-TAB observation
   (under D-10), Coalition's run-305 leading-double-space
   observation, and Scopely's run-297 multi-byte trailing-
   space + NBSP observations. Standard `String.prototype.trim()`
   strips trailing TAB. SoFi is also the **second** cohort
   plugin to observe a TAB pad-byte (after BILL) — lifting
   the TAB-pad-byte sub-axis from a one-off to a recurring
   axis.

## 2. Goals

- Ship a `source-company-sofi` plugin returning live
  `JobPostDto` rows for the public SoFi careers board.
- Match the structural and behavioural shape of the existing
  `source-company-epicgames` plugin — Epic Games is the
  closest cohort cousin via shared bare-brand-domain +
  `/careers/<job-collection>/<id>` + dual-id query wire-
  shape pattern. **Three structural deviations** from Epic
  Games:
  1. **D-04 variant 28** (Epic Games variant 13 PLURAL
     `/careers/jobs/<id>`; SoFi variant 28 SINGULAR
     `/careers/job/<id>` — first cohort observation of
     variant 28).
  2. **D-09 sub-axis** (Epic Games multi-token bare-brand
     wire `'Epic Games'` 10 bytes with internal whitespace;
     SoFi case-asymmetric mixed-case `'SoFi'` 4 bytes with
     internal capital — same case-only-asymmetric same-byte-
     count shape as DataCamp / HelloFresh / N26 / PlanetScale).
  3. **D-10 sub-axis** (Epic Games applied D-10 with single-
     trailing-space pad; SoFi applies D-10 with mixed pad
     forms including the **first cohort observation of
     trailing-TAB pad-byte** under D-10).
- Bundle a unit-test suite (≥ 8 cases) including locks for
  variant-28 URL pass-through, the case-asymmetric mixed-case
  4-byte wire `'SoFi'`, and the D-10 trailing-TAB sub-axis.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical SoFi postings.
- SoFi product-API / banking / lending / investing /
  insurance integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.SOFI`** in
> the source registry, so that **a single `siteType:
> [Site.SOFI]` request returns SoFi's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.SOFI = 'sofi'` to the `Site` enum.                                                      | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-sofi`.                                              | must     |
| FR-3  | `SoFiService.scrape(input)` returns a `JobResponseDto`; never throws.                             | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `sofi-`, `site === Site.SOFI`, `companyName === 'SoFi'`.      | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 28). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers trailing-space, leading-space, dual, and trailing-TAB sub-axes. | must     |
| FR-14 | D-11 **omitted** — 0 of 204 wire department names padded.                                         | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.SOFI, name: 'SoFi', category: 'company' })
@Injectable()
export class SoFiService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts:
  - **D-04 variant-28 lock**: emitted `jobUrl` byte-for-byte;
    contains `sofi.com/careers/job/`; contains `?gh_jid=`;
    does NOT contain `job-boards.greenhouse.io`; does NOT
    contain `/jobs/` (locks the singular-`/job/` sub-axis vs
    Epic Games variant 13 plural `/jobs/`).
  - **D-09 omission lock with case-asymmetric mixed-case
    4-byte wire**: emitted `companyName === 'SoFi'` byte-for-
    byte (4 bytes); contains internal capital `F` at byte
    index 2; `'SoFi'.toLowerCase() === 'sofi'` (matches the
    slug under casefold).
  - **D-10 application lock with trailing-TAB sub-axis**:
    input title `'Interactive Project Manager (Contract)\t'`
    (trailing TAB) → emitted `'Interactive Project Manager
    (Contract)'` (byte-distinct + 1-byte-shorter; does NOT
    end with whitespace).
  - D-08 regression locks (entity-decode + tag-strip + brand
    substring presence).
  - D-11 pass-through behaviour: wire `departments[0].name`
    flows through byte-for-byte (e.g. `'Accounting'`).
- Plus standard cohort cases: `resultsWanted=1` cap, searchTerm
  filter on title, searchTerm filter on department, HTTP 500 →
  empty, empty `data.jobs` → empty.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #312):** **Wire-shape variant 28 — bare brand-
  domain + singular `/careers/job/<id>` path-id + dual-id
  query — first cohort observation.** Thirty-first distinct
  wire-shape variant.
- **D-08 (run #312):** Decode-then-strip pipeline. **Fifty-
  eighth** cohort plugin to apply D-08.
- **D-09 (run #312):** **Omitted** — wire `company_name ===
  'SoFi'` byte-for-byte (4 bytes; case-asymmetric with the
  lowercase 4-byte slug `sofi` — same byte-count, internal
  capital `F` at byte index 2). Same case-only-asymmetric
  same-byte-count shape as DataCamp / HelloFresh / N26 /
  PlanetScale. **Fifty-first cohort plugin to omit D-09**.
- **D-10 (run #312):** **APPLIED with mixed-pad form
  including first-cohort trailing-TAB sub-axis.** 8 of 204
  wire titles padded (~3.9 % pad rate): 5 single-trailing-
  space + 2 single-trailing-TAB + 1 dual-pad. **First cohort
  observation of trailing-TAB pad-byte** — distinct from
  BILL's run-302 first-ever leading-TAB. SoFi is the
  **second** cohort plugin to observe a TAB pad-byte under
  D-10, lifting it to a recurring axis. Standard
  `String.prototype.trim()` strips all sub-axes. **Twenty-
  seventh cohort plugin to apply D-10**.
- **D-11 (run #312):** **Omitted** — 0 of 204 wire department
  names padded (`'Accounting'`, `'Risk Management'`,
  `'Business Controls and Complaints'`, `'Home Loans Ops
  Production'`, `'BUL'`, `'OCEO'`, `'Capital Markets'`,
  `'Banking Ops'`, `'HL Sales'`, `'Ops PMO'`, plus 35 others
  — clean single-token / multi-token forms with internal
  whitespace, abbreviations, and ampersands).
  **Forty-fourth cohort plugin** with fully-clean department
  pass-through.
- **D-13 (run #312):** **Three structural deviations** from
  the Epic Games (Spec 069) template:
  1. D-04 wire-shape variant 28 (Epic Games variant 13 plural
     `/careers/jobs/<id>`; SoFi variant 28 singular
     `/careers/job/<id>`).
  2. D-09 sub-axis (Epic Games multi-token bare-brand 10-byte;
     SoFi case-asymmetric mixed-case 4-byte).
  3. D-10 sub-axis (Epic Games single-trailing-space pad;
     SoFi mixed-pad including first-cohort trailing-TAB).

## 11. References

- `packages/plugins/source-company-epicgames/src/epicgames.service.ts` —
  closest cohort cousin (variant 13 plural `/careers/jobs/<id>`).
- `packages/plugins/source-company-billcom/src/billcom.service.ts` —
  D-10 leading-TAB sister observation reference.
- `packages/plugins/source-company-planetscale/src/planetscale.service.ts` —
  immediate predecessor in run-history (run #311).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
