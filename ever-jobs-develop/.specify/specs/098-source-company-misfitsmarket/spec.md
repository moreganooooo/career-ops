# Spec: 098 — Source Company Plugin: Misfits Market

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 098                                                                                                                                                                                            |
| Slug           | source-company-misfitsmarket                                                                                                                                                                   |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #308)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..097                                                                                                                                                                        |

## 1. Problem Statement

Run #307's Spec 097 closed end-to-end (HelloFresh shipped —
variant 26 inaugurated, multi-sub-axis D-10 production-scale
observation). Run #308 picks up the **ninth** live hit
alphabetically from the sixth-fresh-sweep candidate pool:
**Misfits Market** (44 visible roles confirmed at run-308 start
via direct HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/misfitsmarket/jobs?content=true`;
the run-300 sixth-sweep estimate of ~132 keys was probe-counter-
inflated by ~3× via dept/office IDs).

Misfits Market — operator of the **dominant US-domestic
upcycled / surplus / aesthetically-imperfect-grocery direct-
to-consumer subscription platform pioneered around the rescued-
food / value-grocery / weekly-curated-box data model**
(founded by Abhi Ramesh in 2018 in Philadelphia; raised ~$525M
across rounds at peak ~$2B valuation in September 2021 led by
SoftBank Vision Fund 2, D1 Capital, Greenoaks, and Accel;
acquired Imperfect Foods in May 2022 to consolidate the rescued-
grocery segment; ships weekly subscription boxes of upcycled,
surplus, and aesthetically-imperfect produce + pantry +
specialty-grocery items across the rescued-grocery / value-
grocery / D2C-CPG segment — alongside competitors HungryRoot,
Thrive Market, FreshDirect, and the recently-divested Imperfect
Foods (now an internal Misfits Market brand) — with a hybrid
distributed workforce concentrated across Philadelphia (HQ),
Northlake (IL fulfilment), Pennsauken (NJ fulfilment), and
Remote across the United States) — is published at the bare
`misfitsmarket` Greenhouse slug (the lowercase concatenated
two-word brand-stem; case-asymmetric with the wire
`company_name === 'Misfits Market'`) and was confirmed live via
run #308's HTTP 200 probe.

## 2. Goals

- Ship a `source-company-misfitsmarket` plugin returning live
  `JobPostDto` rows for the public Misfits Market careers board.
- Match the structural and behavioural shape of the existing
  `source-company-newrelic` plugin — New Relic is the closest
  cohort cousin via shared D-04 variant 2, D-09 internal-
  whitespace-asymmetric two-token wire, D-10 trailing-pad
  application, and D-11 clean pass-through. Misfits Market
  carries **zero structural deviations** from New Relic —
  making this the **eleventh** Greenhouse-only company-direct
  plugin in run-history to ship as a clean re-spin (after
  Coursera off Chime, Flexport off Faire, Glossier off Flexport,
  Marqeta off Calendly, New Relic off Maven Clinic, Scopely off
  Marqeta, Adyen off Marqeta, Bobbie off Coursera, Cerebral off
  Adyen, plus a corrected count for prior near-miss re-spins).
- Bundle a unit-test suite (≥ 8 cases) including locks for
  variant-2 URL pass-through, the case-asymmetric two-token
  internal-whitespace wire `'Misfits Market'`, and the D-10
  trailing-pad sub-axis.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Misfits Market postings.
- Misfits Market product-API / subscription-management /
  fulfilment integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.MISFITSMARKET`**
> in the source registry, so that **a single `siteType:
> [Site.MISFITSMARKET]` request returns Misfits Market's open
> roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.MISFITSMARKET = 'misfitsmarket'` to the `Site` enum.                                    | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-misfitsmarket`.                                     | must     |
| FR-3  | `MisfitsMarketService.scrape(input)` returns a `JobResponseDto`; never throws.                    | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `misfitsmarket-`, `site === Site.MISFITSMARKET`, `companyName === 'Misfits Market'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (6 of 44 padded).             | must     |
| FR-14 | D-11 **omitted** — 0 of 44 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.MISFITSMARKET, name: 'Misfits Market', category: 'company' })
@Injectable()
export class MisfitsMarketService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts:
  - **D-04 variant-2 lock**: emitted `jobUrl` contains
    `job-boards.greenhouse.io/misfitsmarket/jobs/`; does NOT
    contain `misfitsmarket.com` (anti-substring lock).
  - **D-09 omission lock with two-token internal-whitespace
    wire**: emitted `companyName === 'Misfits Market'` byte-
    for-byte (14 bytes); contains internal ASCII space at byte
    index 7; byte-distinct from the lowercase 13-byte slug
    `'misfitsmarket'`.
  - **D-10 application lock with trailing-pad sub-axis**:
    input title `'Inventory Associate '` → emitted `'Inventory
    Associate'` (byte-distinct + 1-byte-shorter).
  - D-08 regression locks (entity-decode + tag-strip + brand
    substring presence).
  - D-11 pass-through behaviour: wire `departments[0].name`
    flows through byte-for-byte (e.g. `'Distribution'`).
- Plus standard cohort cases: `resultsWanted=1` cap, searchTerm
  filter on title, searchTerm filter on department, HTTP 500 →
  empty, empty `data.jobs` → empty.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #308):** **Wire-shape variant 2 — canonical
  Greenhouse host** `https://job-boards.greenhouse.io/misfitsmarket/jobs/<id>`.
  **Twenty-sixth** plugin in the cohort to use variant 2.
- **D-08 (run #308):** Decode-then-strip pipeline. **Fifty-
  fourth** cohort plugin to apply D-08.
- **D-09 (run #308):** **Omitted** — wire `company_name ===
  'Misfits Market'` byte-for-byte (14 bytes; two-word brand
  with internal ASCII space at byte index 7; case-AND length-
  asymmetric vs the lowercase 13-byte concatenated slug
  `misfitsmarket`). **Sixth** internal-whitespace asymmetry
  case in the cohort after Scale AI / Maven Clinic / Stitch
  Fix / New Relic / Dollar Shave Club. **Forty-seventh cohort
  plugin to omit D-09**, eleventh slug/wire asymmetry case
  overall.
- **D-10 (run #308):** **APPLIED with trailing-pad form.** 6
  of 44 wire titles in the run-308 probe carry single-trailing-
  ASCII-space padding (`'Clerk '`, `'Director of Grocery
  Category Management '`, `'Inventory Associate '` × 2,
  `'Inventory Lead '`, `'Senior Director, Procurement '`;
  ~13.6 % pad rate — all trailing-only; same pad-rate as
  Typeform's run-299 D-11 application). **Twenty-fourth cohort
  plugin to apply D-10**.
- **D-11 (run #308):** **Omitted** — 0 of 44 wire department
  names padded (`'Distribution'`, `'Operations'`,
  `'Merchandising'`, `'Safety'`, `'Marketing'` — clean
  single-token / multi-token forms). **Fortieth cohort plugin**
  with fully-clean department pass-through.
- **D-13 (run #308):** **Zero structural deviations** from the
  New Relic (Spec 085) template — making this the **eleventh**
  Greenhouse-only company-direct plugin in run-history to ship
  as a clean re-spin of a prior cohort plugin with no per-axis
  deviations.

## 11. References

- `packages/plugins/source-company-newrelic/src/newrelic.service.ts` —
  zero-deviation template.
- `packages/plugins/source-company-hellofresh/src/hellofresh.service.ts` —
  immediate predecessor in run-history (run #307).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
