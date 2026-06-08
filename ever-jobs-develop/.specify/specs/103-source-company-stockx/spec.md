# Spec: 103 — Source Company Plugin: StockX

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 103                                                                                                                                                                                            |
| Slug           | source-company-stockx                                                                                                                                                                          |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #313)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..102                                                                                                                                                                        |

## 1. Problem Statement

Run #312's Spec 102 closed end-to-end (SoFi shipped — variant
28 inaugurated, first cohort observation of trailing-TAB pad-
byte under D-10). Run #313 picks up the **fourteenth** live
hit alphabetically from the sixth-fresh-sweep candidate pool:
**StockX** (25 visible roles confirmed at run-313 start via
direct HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/stockx/jobs?content=true`;
the run-300 sixth-sweep estimate of ~50 keys was probe-counter-
inflated by ~2× via dept/office IDs).

StockX, Inc. — operator of the **dominant US-domestic peer-to-
peer authenticated-resale marketplace pioneered around the
sneaker / streetwear / collectibles bid-ask-orderbook data
model** (founded by Josh Luber, Greg Schwartz, Dan Gilbert,
and Chris Kaufman in 2015 in Detroit; raised ~$690M+ across
rounds at peak ~$3.8B valuation in April 2021 led by Tiger
Global, GGV Capital, and DST Global; ships authenticated peer-
to-peer resale of sneakers, streetwear, watches, handbags,
electronics, and collectibles via a stock-market-style bid-
ask matching engine + multi-jurisdiction authentication
verification centers across the resale-marketplace segment —
alongside competitors GOAT, Grailed, eBay, Vestiaire Collective,
and The RealReal — with a hybrid distributed workforce
concentrated across Detroit (HQ), New York, London, Bangalore,
Tempe (AZ verification center), Eindhoven (NL verification
center), and Remote across the United States, the Netherlands,
the United Kingdom, India, Hong Kong, and Australia) — is
published at the bare `stockx` Greenhouse slug (the lowercase
6-byte brand-stem; case-asymmetric with the wire `company_name
=== 'StockX'` mixed-case with internal capital `X` at byte
index 5 — same case-only-asymmetric same-byte-count shape
family as DataCamp / HelloFresh / N26 / PlanetScale / SoFi)
and was confirmed live via run #313's HTTP 200 probe.

## 2. Goals

- Ship a `source-company-stockx` plugin returning live
  `JobPostDto` rows for the public StockX careers board.
- Match the structural and behavioural shape of the existing
  `source-company-dollarshaveclub` plugin — Dollar Shave Club
  is the closest cohort cousin via shared D-04 variant 2,
  D-08 entity-decode-then-tag-strip, D-10 omitted (clean wire
  titles), and D-11 applied with trailing-pad form.
  **One structural deviation** from Dollar Shave Club:
  1. **D-09 sub-axis** — StockX's wire `'StockX'` is case-
     asymmetric mixed-case 6-byte (internal capital `X` at
     byte index 5); Dollar Shave Club's wire `'Dollar Shave
     Club'` is three-token internal-whitespace 17-byte. Both
     are slug/wire-asymmetric (StockX same-byte-count case-
     only; DSC length-asymmetric internal-whitespace) but
     under different sub-axes.
- Bundle a unit-test suite (≥ 8 cases) including locks for
  variant-2 URL pass-through, the case-asymmetric mixed-case
  6-byte wire `'StockX'`, the D-10 omission, and the D-11
  trailing-pad sub-axis on `'Customer Service '`.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical StockX postings.
- StockX product-API / marketplace / authentication-flow
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.STOCKX`** in
> the source registry, so that **a single `siteType:
> [Site.STOCKX]` request returns StockX's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.STOCKX = 'stockx'` to the `Site` enum.                                                  | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-stockx`.                                            | must     |
| FR-3  | `StockXService.scrape(input)` returns a `JobResponseDto`; never throws.                           | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `stockx-`, `site === Site.STOCKX`, `companyName === 'StockX'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **omitted** — 0 of 25 wire titles padded.                                                    | must     |
| FR-14 | D-11 **applied** — department `.trim()` covers the trailing-pad sub-axis on `'Customer Service '` (5 of 25 listings padded). | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.STOCKX, name: 'StockX', category: 'company' })
@Injectable()
export class StockXService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts:
  - **D-04 variant-2 lock**: emitted `jobUrl` contains
    `job-boards.greenhouse.io/stockx/jobs/`; does NOT contain
    `stockx.com` (anti-substring lock).
  - **D-09 omission lock with case-asymmetric mixed-case
    6-byte wire**: emitted `companyName === 'StockX'` byte-
    for-byte (6 bytes); contains internal capital `X` at byte
    index 5; `'StockX'.toLowerCase() === 'stockx'` (matches
    the slug under casefold).
  - **D-11 application lock with trailing-pad sub-axis**:
    input department `'Customer Service '` (trailing space) →
    emitted `'Customer Service'` (byte-distinct + 1-byte-
    shorter; does NOT end with whitespace).
  - D-08 regression locks (entity-decode + tag-strip + brand
    substring presence).
  - D-10 pass-through behaviour: wire `title` flows through
    byte-for-byte.
- Plus standard cohort cases: `resultsWanted=1` cap, searchTerm
  filter on title, searchTerm filter on department (matching
  the trimmed form), HTTP 500 → empty, empty `data.jobs` →
  empty.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #313):** **Wire-shape variant 2 — canonical
  Greenhouse host** `https://job-boards.greenhouse.io/stockx/jobs/<id>`.
  **Twenty-ninth** plugin in the cohort to use variant 2.
- **D-08 (run #313):** Decode-then-strip pipeline. **Fifty-
  ninth** cohort plugin to apply D-08.
- **D-09 (run #313):** **Omitted** — wire `company_name ===
  'StockX'` byte-for-byte (6 bytes; case-asymmetric with the
  lowercase 6-byte slug `stockx` — same byte-count, internal
  capital `X` at byte index 5). Same case-only-asymmetric
  same-byte-count shape as DataCamp / HelloFresh / N26 /
  PlanetScale / SoFi. **Fifty-second cohort plugin to omit
  D-09**.
- **D-10 (run #313):** **Omitted** — 0 of 25 wire titles
  padded. **Twenty-first cohort plugin to omit D-10**.
- **D-11 (run #313):** **APPLIED with trailing-pad form.** 5
  of 25 listings padded with single-trailing-ASCII-space form
  (`'Customer Service '` × 5; ~20 % listing-level pad rate;
  1 of 7 unique department names padded). **Seventh cohort
  plugin to apply D-11** (after Lattice's run-284 first-ever
  trailing-pad, DataCamp's run-291 first-ever leading-pad,
  Typeform's run-299 second trailing-pad, BILL's run-302
  high-pad-rate trailing-pad, Dollar Shave Club's run-306
  D-09-asymmetric trailing-pad, and HelloFresh's run-307
  mid-rate trailing-pad).
- **D-13 (run #313):** **One structural deviation** from the
  Dollar Shave Club (Spec 096) template: D-09 sub-axis (DSC
  three-token internal-whitespace 17-byte wire `'Dollar Shave
  Club'`; StockX case-asymmetric mixed-case 6-byte wire
  `'StockX'`).

## 11. References

- `packages/plugins/source-company-dollarshaveclub/src/dollarshaveclub.service.ts` —
  closest cohort cousin (variant 2 + D-10 omitted + D-11
  trailing-pad applied).
- `packages/plugins/source-company-sofi/src/sofi.service.ts` —
  immediate predecessor in run-history (run #312).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
