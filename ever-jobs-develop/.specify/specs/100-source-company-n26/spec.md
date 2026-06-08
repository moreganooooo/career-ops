# Spec: 100 — Source Company Plugin: N26

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 100                                                                                                                                                                                            |
| Slug           | source-company-n26                                                                                                                                                                             |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #310)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..099                                                                                                                                                                        |

## 1. Problem Statement

Run #309's Spec 099 closed end-to-end (Monzo shipped — twelfth
zero-deviation clean re-spin off Adyen). Run #310 picks up the
**eleventh** live hit alphabetically from the sixth-fresh-sweep
candidate pool: **N26** (47 visible roles confirmed at run-310
start via direct HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/n26/jobs?content=true`;
the run-300 sixth-sweep estimate of ~94 keys was probe-counter-
inflated by ~2× via dept/office IDs).

This is also Spec **100** — a milestone marker for the cohort
spec catalogue (the 100th .specify spec authored across run-
history; the catalogue spans foundational plugin/architecture/
deduplication specs at low IDs through ATS scrapers, salary
parser residuals, source-company batch buildouts, and now into
the second hundred of company-direct plugins).

N26 GmbH — operator of the **dominant German-headquartered
digital-bank platform pioneered around the mobile-first /
SEPA-instant / EU-passporting retail-banking data model**
(founded by Valentin Stalf and Maximilian Tayenthal in 2013 in
Berlin under the original "Number26" brand; rebranded to N26 in
2016; raised ~$1.7B+ across rounds at peak ~$9.2B valuation in
October 2021 led by Third Point Ventures, Coatue Management,
Dragoneer, and Allianz X; obtained German full banking licence
from BaFin in 2016; expanded across the EU under the SEPA
passport model; ships current accounts, joint accounts,
overdraft and personal-credit products, and a stock-and-ETF
investing product across the EU / EEA / UK retail-banking
segment — alongside competitors Revolut, Monzo, Wise, Bunq, and
Tomorrow — with a hybrid distributed workforce concentrated
across Berlin (HQ), Vienna, Barcelona, Milan, Paris, and
Remote across the European Economic Area) — is published at
the bare `n26` Greenhouse slug (the lowercase 3-byte brand-
stem; case-asymmetric with the wire `company_name === 'N26'` —
slug 3 bytes lowercase / wire 3 bytes uppercase first-byte;
same case-asymmetric same-byte-count shape as DataCamp /
HelloFresh) and was confirmed live via run #310's HTTP 200
probe.

The run-310 probe revealed **two novel cohort observations**:

1. **D-04 wire-shape variant 27 — bare brand-domain + COMPOUND
   locale-prefix `/en-eu/` + `/careers/positions/<id>` path
   + dual-id query — first cohort observation.** N26's
   `absolute_url` shape `https://n26.com/en-eu/careers/positions/<id>?gh_jid=<id>`
   combines five sub-axes: (a) bare brand-domain `n26.com`
   (same as variants 13/15/18/23); (b) **COMPOUND locale-
   prefix `/en-eu/`** — single path segment encoding both
   language code (`en`) AND region code (`eu`) joined with a
   hyphen; **first cohort observation of a compound
   language-region locale code** — distinct from variant 21's
   single-language `/en/` (Peloton) and variant 26's two-
   segment `/global/en/` (HelloFresh); (c) `/careers/positions/`
   path with `positions` collection name (distinct from
   variants 13/19/20/23 which use `/jobs/` or `/job/` or
   `/job-posting/`); (d) path-id under the `positions/`
   collection; (e) dual-id query (id repeated as `?gh_jid=<id>`).
   **Thirtieth distinct wire-shape variant** in the company-
   direct cohort.

2. **D-10 multi-byte trailing pad — second cohort observation.**
   1 of 47 wire titles carries multi-byte (double) trailing
   ASCII-space padding (`'Data Analytics Manager - Financial
   Empowerment  '` — 2 trailing spaces), plus 1 single-trailing
   pad (`'Lead Backend Engineer - Assistance '`). **Second
   cohort observation of multi-byte trailing pad** — after
   Scopely's run-297 first-ever observation (Pikmin Bloom
   listing with 3 trailing spaces). Standard
   `String.prototype.trim()` strips arbitrary-length runs.

## 2. Goals

- Ship a `source-company-n26` plugin returning live
  `JobPostDto` rows for the public N26 careers board.
- Match the structural and behavioural shape of the existing
  `source-company-hellofresh` plugin — HelloFresh is the
  closest cohort cousin via shared locale-prefix + path-id +
  dual-id query wire-shape pattern. **Two structural
  deviations** from HelloFresh:
  1. **D-04 variant 27** (HelloFresh variant 26; N26 variant
     27 — first cohort observation of variant 27).
  2. **D-09 sub-axis** (HelloFresh PascalCase 10-byte case-
     asymmetric `'HelloFresh'`; N26 case-asymmetric 3-byte
     all-caps `'N26'` — both case-only-asymmetric same-byte-
     count, but different lengths and case patterns).
- Bundle a unit-test suite (≥ 8 cases) including locks for
  variant-27 URL pass-through, the case-asymmetric 3-byte
  wire `'N26'`, and the D-10 multi-byte trailing pad sub-axis.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical N26 postings.
- N26 product-API / banking / SEPA / credit-product integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.N26`** in
> the source registry, so that **a single `siteType:
> [Site.N26]` request returns N26's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.N26 = 'n26'` to the `Site` enum.                                                        | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-n26`.                                               | must     |
| FR-3  | `N26Service.scrape(input)` returns a `JobResponseDto`; never throws.                              | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `n26-`, `site === Site.N26`, `companyName === 'N26'`.         | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 27). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers single and multi-byte trailing-pad sub-axes.            | must     |
| FR-14 | D-11 **omitted** — 0 of 47 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.N26, name: 'N26', category: 'company' })
@Injectable()
export class N26Service implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts:
  - **D-04 variant-27 lock**: emitted `jobUrl` byte-for-byte;
    contains `n26.com/en-eu/careers/positions/`; contains
    `?gh_jid=`; does NOT contain `job-boards.greenhouse.io`.
  - **D-09 omission lock with case-asymmetric 3-byte wire**:
    emitted `companyName === 'N26'` byte-for-byte (3 bytes);
    `'N26'.toLowerCase() === 'n26'` (matches the slug).
  - **D-10 application lock with multi-byte trailing pad**:
    input title `'Data Analytics Manager - Financial Empowerment  '`
    (2 trailing spaces) → emitted `'Data Analytics Manager -
    Financial Empowerment'` (byte-distinct + 2-bytes-shorter).
  - D-08 regression locks (entity-decode + tag-strip + brand
    substring presence).
  - D-11 pass-through behaviour: wire `departments[0].name`
    flows through byte-for-byte (e.g. `'Tech - Data Platform'`).
- Plus standard cohort cases: `resultsWanted=1` cap, searchTerm
  filter on title, searchTerm filter on department, HTTP 500 →
  empty, empty `data.jobs` → empty.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #310):** **Wire-shape variant 27 — bare brand-
  domain + compound locale-prefix `/en-eu/` +
  `/careers/positions/<id>` path + dual-id query — first
  cohort observation.** The shape
  `https://n26.com/en-eu/careers/positions/<id>?gh_jid=<id>`
  combines five sub-axes detailed in § 1. **Thirtieth distinct
  wire-shape variant**.
- **D-08 (run #310):** Decode-then-strip pipeline. **Fifty-
  sixth** cohort plugin to apply D-08.
- **D-09 (run #310):** **Omitted** — wire `company_name ===
  'N26'` byte-for-byte (3 bytes; case-asymmetric with the
  lowercase 3-byte slug `n26` — same byte-count, different
  case at byte index 0). Same case-only-asymmetric same-byte-
  count shape as DataCamp (Spec 075) / HelloFresh (Spec 097).
  **Forty-ninth cohort plugin to omit D-09**.
- **D-10 (run #310):** **APPLIED with mixed trailing-pad form.**
  2 of 47 wire titles padded (~4.3 % pad rate): 1 single-
  trailing (`'Lead Backend Engineer - Assistance '`) + 1
  multi-byte trailing (`'Data Analytics Manager - Financial
  Empowerment  '` — 2 trailing spaces). **Second cohort
  observation of multi-byte trailing pad** (after Scopely's
  run-297 first-ever 3-trailing-space observation; N26 lifts
  the multi-byte-trailing sub-axis from a one-off to a
  recurring observation). **Twenty-sixth cohort plugin to
  apply D-10**.
- **D-11 (run #310):** **Omitted** — 0 of 47 wire department
  names padded (`'Risk'`, `'Group Internal Audit'`, `'Banking
  Operations'`, `'Tech - Customer Risk Lifecycle'`, `'Tech -
  Data Platform'`, `'Tech - Internal IT'`, `'Tech - Assistance'`,
  `'Tech - Regulatory Technology'` — clean multi-token forms
  with internal whitespace, hyphens, and slashes).
  **Forty-second cohort plugin** with fully-clean department
  pass-through.
- **D-13 (run #310):** **Two structural deviations** from the
  HelloFresh (Spec 097) template:
  1. D-04 wire-shape variant 27 (HelloFresh variant 26; N26
     variant 27 — first cohort observation of variant 27).
  2. D-09 sub-axis (HelloFresh PascalCase 10-byte case-
     asymmetric `'HelloFresh'`; N26 case-asymmetric 3-byte
     all-caps `'N26'`).

## 11. References

- `packages/plugins/source-company-hellofresh/src/hellofresh.service.ts` —
  closest cohort cousin (variant-26 path-id + dual-id query).
- `packages/plugins/source-company-monzo/src/monzo.service.ts` —
  immediate predecessor in run-history (run #309).
- `packages/plugins/source-company-scopely/src/scopely.service.ts` —
  multi-byte trailing pad first cohort observation reference.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
