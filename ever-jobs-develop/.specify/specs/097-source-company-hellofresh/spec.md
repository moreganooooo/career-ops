# Spec: 097 — Source Company Plugin: HelloFresh

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 097                                                                                                                                                                                            |
| Slug           | source-company-hellofresh                                                                                                                                                                      |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #307)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..096                                                                                                                                                                        |

## 1. Problem Statement

Run #306's Spec 096 closed end-to-end (Dollar Shave Club shipped
— D-11 first run-history APPLY off Cameo's pad pass-through).
Run #307 picks up the **eighth** live hit alphabetically from
the sixth-fresh-sweep candidate pool: **HelloFresh** (368 roles
confirmed at run-307 start; the run-300 sixth-sweep estimate of
~1104 keys was probe-counter-inflated by ~3× via dept/office IDs).

HelloFresh SE — operator of the **dominant European meal-kit
subscription platform pioneered around the weekly recipe-and-
ingredient-shipment data model** (founded by Dominik Richter,
Thomas Griesel, and Jessica Nilsson in November 2011 in Berlin;
Frankfurt-listed (HFG) since November 2017 at €1.7B initial IPO
valuation; expanded across 18+ countries via the HelloFresh,
EveryPlate, Green Chef, Chefs Plate, Factor, Goodchop, and
YouFoodz brands; ships weekly meal-kit subscriptions and heat-
and-eat ready meals) — is published at the bare `hellofresh`
Greenhouse slug (the lowercase concatenated brand-stem; case-
asymmetric with the wire `company_name === 'HelloFresh'`
PascalCase concat — same byte-count (10 bytes) but byte-distinct
via case at byte index 5).

The run-307 probe revealed **two cohort-first observations**:

1. **D-04 wire-shape variant 26** — brand-host careers-subdomain
   `careers.hellofresh.com` + dual-segment locale prefix
   `/global/en/` + path-id `/job/<id>` + single-`gh_jid` query.
   **First** plugin on variant 26 — the **twenty-ninth distinct
   wire-shape variant**. Two new sub-axes: dual-segment locale
   prefix starting with a `/global/` region-cluster ancestor;
   path-id + query-id dual-id form (distinct from BILL's bare-
   query-token + gh_jid dual-id under variant 24).
2. **D-10 + D-11 BOTH applied** at meaningful rates — 57/368
   wire titles (~15.5 %) AND 43/368 wire department names
   (~11.7 %). **Sixth cohort plugin to apply D-11**.

## 2. Goals

- Ship a `source-company-hellofresh` plugin returning live
  `JobPostDto` rows for the public HelloFresh careers board.
- Match the structural and behavioural shape of the existing
  `source-company-billcom` plugin — BILL is the closest
  structural cousin under D-10+D-11 dual-application axis.
  HelloFresh carries **three structural deviations** from BILL:
  D-04 wire-shape variant 26 (vs BILL variant 24); D-09 case-
  asymmetric PascalCase wire (vs BILL all-caps); D-11 medium-
  pad-rate (~11.7 %) trailing-pad form (vs BILL's high-pad-rate
  ~39.1 %).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical HelloFresh postings.
- HelloFresh product-API / subscription / fulfilment integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.HELLOFRESH`** in
> the source registry, so that **a single `siteType:
> [Site.HELLOFRESH]` request returns HelloFresh's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.HELLOFRESH = 'hellofresh'` to the `Site` enum.                                          | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-hellofresh`.                                        | must     |
| FR-3  | `HelloFreshService.scrape(input)` returns a `JobResponseDto`; never throws.                       | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `hellofresh-`, `site === Site.HELLOFRESH`, `companyName === 'HelloFresh'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 26). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **applied** — 57 of 368 wire titles padded (trailing-space form, ~15.5 %).                  | must     |
| FR-14 | D-11 **applied** — 43 of 368 wire department names padded (trailing-space form, ~11.7 %).        | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.HELLOFRESH, name: 'HelloFresh', category: 'company' })
@Injectable()
export class HelloFreshService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts:
  - **D-04 variant-26 lock**: emitted `jobUrl` byte-for-byte;
    contains `careers.hellofresh.com/global/en/job/`; contains
    `?gh_jid=`; does NOT contain `job-boards.greenhouse.io`,
    `www.`, `/all-jobs/`.
  - **D-09 case-asymmetric lock**: emitted
    `companyName === 'HelloFresh'` byte-for-byte (10 bytes);
    not equal to its lowercase form (case-distinct); equal to
    slug after `.toLowerCase()`.
  - **D-10 trailing-pad trim lock**: input
    `'Asset Protection Specialist '` → emitted
    `'Asset Protection Specialist'`.
  - **D-11 trailing-pad trim lock**: input `'Operations '` →
    emitted `'Operations'`.
  - D-08 entity-decode + tag-strip locks.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #307):** **Wire-shape variant 26 — careers-
  subdomain dual-segment-locale-prefix path-id+query-id —
  first cohort observation.** The `absolute_url`
  `https://careers.hellofresh.com/global/en/job/<id>?gh_jid=<id>`
  carries four sub-axes:
  1. Brand-host careers-subdomain `careers.hellofresh.com`
     (same as variants 8, 21).
  2. **Dual-segment locale prefix `/global/en/`** — TWO leading
     path segments before listing path; first cohort observation
     of `/global/` region-cluster ancestor + locale code.
  3. Path-id `/job/<id>` (same as variants 13/18/19/20/23/25).
  4. **Path-id + query-id dual-id `?gh_jid=<id>`** — first
     cohort observation of path-id-and-query-id dual-id (vs
     BILL's bare-query-token + gh_jid under variant 24).
  **First** plugin on **wire-shape variant 26** — the **twenty-
  ninth distinct wire-shape variant**.
- **D-08 (run #307):** Decode-then-strip pipeline. **Fifty-
  third** cohort plugin to apply D-08.
- **D-09 (run #307):** **Omitted with case-asymmetric
  PascalCase wire form `'HelloFresh'`** (10 bytes, fully clean).
  Same case-only-asymmetric same-byte-count shape as DataCamp
  (Spec 075). 0 of 368 padded. **Forty-sixth cohort plugin to
  omit D-09**.
- **D-10 (run #307):** **Applied** — 57 of 368 wire titles
  padded with single-trailing-ASCII-space form (~15.5 % pad
  rate). **Twenty-third cohort plugin to apply D-10**.
- **D-11 (run #307):** **Applied** — 43 of 368 wire
  departments padded with single-trailing-ASCII-space form
  (~11.7 % listing-level pad rate). **Sixth cohort plugin to
  apply D-11** (after Lattice's run-284 first-ever trailing-
  pad, DataCamp's run-291 first-ever leading-pad, Typeform's
  run-299 second trailing-pad, BILL's run-302 high-pad-rate
  trailing, and Dollar Shave Club's run-306 partial trailing).
- **D-13 (run #307):** **Three structural deviations** from
  the BILL (Spec 092) template — D-04 variant 26 (vs 24), D-09
  case-asymmetric PascalCase wire (vs all-caps), D-11 medium-
  rate (~11.7 %) trailing-pad (vs ~39.1 %).

## 11. References

- `packages/plugins/source-company-billcom/src/billcom.service.ts` —
  D-10+D-11 dual-application + slug-divergent-vanity template.
- `packages/plugins/source-company-peloton/src/peloton.service.ts` —
  variant 21 careers-subdomain template.
- `packages/plugins/source-company-dollarshaveclub/src/dollarshaveclub.service.ts` —
  immediate predecessor in run-history (run #306).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
