# Spec: 101 — Source Company Plugin: PlanetScale

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 101                                                                                                                                                                                            |
| Slug           | source-company-planetscale                                                                                                                                                                     |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #311)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..100                                                                                                                                                                        |

## 1. Problem Statement

Run #310's Spec 100 closed end-to-end (N26 shipped — variant
27 inaugurated, second cohort observation of multi-byte
trailing pad, **100th source-company spec milestone**). Run
#311 picks up the **twelfth** live hit alphabetically from the
sixth-fresh-sweep candidate pool: **PlanetScale** (6 visible
roles confirmed at run-311 start via direct HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/planetscale/jobs?content=true`;
the run-300 sixth-sweep estimate of ~6 keys matched the
actual job count exactly — minimal probe-counter inflation,
similar to Adyen / BILL / Bobbie / Cerebral / Dollar Shave
Club / Monzo).

PlanetScale, Inc. — operator of the **dominant Vitess-backed
serverless-MySQL platform pioneered around the branchable-
schema / Git-style-database-workflow data model** (founded by
Jiten Vaidya and Sugu Sougoumarane in 2018 in Mountain View,
CA — both formerly YouTube database engineers and creators of
Vitess, the horizontal-scaling MySQL system that powers
YouTube, Slack, GitHub, and Square; raised ~$155M+ across
rounds at peak ~$1B valuation in November 2021 led by Insight
Partners, Kleiner Perkins, Accel, and SignalFire; offers
managed MySQL with branching workflows, instant rollbacks,
deploy requests, and connection pooling across the database-
infrastructure / DevTools segment — alongside competitors
Neon, Supabase, AWS RDS / Aurora, Google Cloud SQL,
CockroachDB, and Aiven — with a hybrid distributed workforce
concentrated across Mountain View (HQ), Remote across the
United States, the United Kingdom, and Europe) — is published
at the bare `planetscale` Greenhouse slug (the lowercase
concatenated two-word brand-stem; case-asymmetric with the
wire `company_name === 'PlanetScale'` PascalCase concat —
same byte-count (11 bytes) but byte-distinct via case at byte
index 6 — `'S'` vs `'s'`) and was confirmed live via run
#311's HTTP 200 probe.

## 2. Goals

- Ship a `source-company-planetscale` plugin returning live
  `JobPostDto` rows for the public PlanetScale careers board.
- Match the structural and behavioural shape of the existing
  `source-company-bobbie` plugin — Bobbie is the closest
  cohort cousin via shared D-04 variant 2, D-08 entity-decode-
  then-tag-strip, D-10 omitted (clean wire titles), and D-11
  fully-clean department pass-through. **One structural
  deviation** from Bobbie:
  1. **D-09 sub-axis** — PlanetScale's wire `'PlanetScale'`
     is case-asymmetric PascalCase with internal capital
     (same byte-count as the lowercase 11-byte slug
     `planetscale` but byte-distinct via case at byte index
     6 — `'S'` vs `'s'`); Bobbie's wire `'Bobbie'` is case-
     symmetric (lowercased equals slug). Same case-only-
     asymmetric same-byte-count shape as DataCamp (Spec 075)
     / HelloFresh (Spec 097) / N26 (Spec 100).
- Bundle a unit-test suite (≥ 8 cases) including locks for
  variant-2 URL pass-through, the case-asymmetric PascalCase
  internal-capital wire `'PlanetScale'`, and D-10/D-11 both
  omitted clean pass-through.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical PlanetScale postings.
- PlanetScale product-API / Vitess / database-management
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.PLANETSCALE`** in
> the source registry, so that **a single `siteType:
> [Site.PLANETSCALE]` request returns PlanetScale's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.PLANETSCALE = 'planetscale'` to the `Site` enum.                                        | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-planetscale`.                                       | must     |
| FR-3  | `PlanetScaleService.scrape(input)` returns a `JobResponseDto`; never throws.                      | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `planetscale-`, `site === Site.PLANETSCALE`, `companyName === 'PlanetScale'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **omitted** — 0 of 6 wire titles padded.                                                     | must     |
| FR-14 | D-11 **omitted** — 0 of 6 wire department names padded.                                           | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.PLANETSCALE, name: 'PlanetScale', category: 'company' })
@Injectable()
export class PlanetScaleService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts:
  - **D-04 variant-2 lock**: emitted `jobUrl` contains
    `job-boards.greenhouse.io/planetscale/jobs/`; does NOT
    contain `planetscale.com` (anti-substring lock).
  - **D-09 omission lock with case-asymmetric PascalCase
    internal-capital wire**: emitted `companyName ===
    'PlanetScale'` byte-for-byte (11 bytes); contains internal
    capital `S` at byte index 6; `'PlanetScale'.toLowerCase()
    === 'planetscale'` (matches the slug under casefold).
  - D-08 regression locks (entity-decode + tag-strip + brand
    substring presence).
  - D-10 / D-11 pass-through behaviour: wire `title` and wire
    `departments[0].name` flow through byte-for-byte.
- Plus standard cohort cases: `resultsWanted=1` cap, searchTerm
  filter on title, searchTerm filter on department, HTTP 500 →
  empty, empty `data.jobs` → empty.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #311):** **Wire-shape variant 2 — canonical
  Greenhouse host** `https://job-boards.greenhouse.io/planetscale/jobs/<id>`.
  **Twenty-eighth** plugin in the cohort to use variant 2.
- **D-08 (run #311):** Decode-then-strip pipeline. **Fifty-
  seventh** cohort plugin to apply D-08.
- **D-09 (run #311):** **Omitted** — wire `company_name ===
  'PlanetScale'` byte-for-byte (11 bytes; case-asymmetric
  with the lowercase 11-byte slug `planetscale` — same byte-
  count, different case at byte index 6 — `'S'` vs `'s'`).
  Same case-only-asymmetric same-byte-count shape as DataCamp
  (Spec 075) / HelloFresh (Spec 097) / N26 (Spec 100).
  **Fiftieth cohort plugin to omit D-09** — the cohort crosses
  the 50-plugin D-09-omission threshold at this run.
- **D-10 (run #311):** **Omitted** — 0 of 6 wire titles padded.
  **Twentieth cohort plugin to omit D-10**.
- **D-11 (run #311):** **Omitted** — 0 of 6 wire department
  names padded (`'Marketing'`, `'Customer Engineering'`,
  `'Engineering'`, `'Sales'` — clean single-token / multi-
  token forms). **Forty-third cohort plugin** with fully-clean
  department pass-through.
- **D-13 (run #311):** **One structural deviation** from the
  Bobbie (Spec 093) template: D-09 sub-axis (Bobbie case-
  symmetric `'Bobbie'`; PlanetScale case-asymmetric PascalCase
  internal-capital `'PlanetScale'`).

## 11. References

- `packages/plugins/source-company-bobbie/src/bobbie.service.ts` —
  closest cohort cousin (variant 2 + D-10/D-11 both omitted).
- `packages/plugins/source-company-n26/src/n26.service.ts` —
  immediate predecessor in run-history (run #310, Spec 100
  milestone).
- `packages/plugins/source-company-datacamp/src/datacamp.service.ts` —
  case-only-asymmetric PascalCase wire reference.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
