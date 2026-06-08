# Spec: 134 — Source Company Plugin: Starburst

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 134                                                                                                                                                                                            |
| Slug           | source-company-starburst                                                                                                                                                                       |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #344)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..133                                                                                                                                                                        |

## 1. Problem Statement

Run #343's Spec 133 closed end-to-end (Oscar shipped — first
cohort observation of variant 35 + first-cohort slug-extra-
word D-09 asymmetry; crossed 80-plugin D-09-omission
threshold). Run #344 picks up the **fifteenth and last** live
hit alphabetically from the eighth-fresh-sweep candidate pool:
**Starburst** (26 visible roles confirmed at run-344 start —
**seventh 1× match in eighth-sweep**, matching estimate
exactly).

Starburst Data, Inc. — operator of the **dominant enterprise-
distribution Trino-managed-platform pioneered around the
SQL-federation-across-data-lakes / connect-to-50+-data-
sources / Iceberg-native-query-engine data model** (founded
by Justin Borgman and Matt Fuller in 2017 in Boston —
inheriting the original Apache Drill / Presto founding team
of Martin Traverso, Dain Sundstrom, David Phillips (creators
of Presto at Facebook); raised ~$414M across rounds at peak
~$3.35B valuation in February 2022 led by Andreessen
Horowitz; ships Starburst Galaxy (managed Trino SaaS),
Starburst Enterprise (self-hosted Trino), Starburst Stargate
(cross-cluster federation), Starburst Warp Speed (autonomous
query acceleration), and Apache Iceberg + Trino + Hive
contributions across the data-federation / SQL-on-data-
lakes / enterprise-Trino segment — alongside competitors
Dremio, Snowflake, Databricks, Microsoft Fabric, Google
BigQuery, AWS Athena, and Tabular (acquired by Databricks)
— with a hybrid distributed workforce concentrated across
Boston (HQ), Warsaw (Poland), London, and Remote across the
United States, Poland, the United Kingdom, and the European
Union) — is published at the bare `starburst` Greenhouse
slug (case-symmetric with the wire `company_name ===
'Starburst'` after casefold).

> **Run #344 closes out the eighth fresh probe sweep** —
> Starburst is the 15th and last live-board hit from the
> run-330 candidate pool. The ninth fresh probe sweep
> launches at run #345+.

## 2. Goals

- Ship a `source-company-starburst` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-doximity` plugin — Doximity is the closest
  cohort cousin (recent zero-deviation match) sharing all
  five primary axes: D-04 variant 2 + D-08 + D-09 case-
  symmetric + D-10 applied + D-11 omitted.
- **Zero structural deviations** from Doximity.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Starburst postings.
- Starburst product-API / Galaxy / Enterprise / Stargate /
  Warp Speed integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.STARBURST`** in
> the source registry, so that **a single `siteType:
> [Site.STARBURST]` request returns Starburst's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.STARBURST = 'starburst'` to the `Site` enum.                                            | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-starburst`.                                         | must     |
| FR-3  | `StarburstService.scrape(input)` returns a `JobResponseDto`; never throws.                        | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `starburst-`, `site === Site.STARBURST`, `companyName === 'Starburst'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).                                        | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (6 of 26 padded ~23.1 %).     | must     |
| FR-14 | D-11 **omitted** — 0 of 26 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.STARBURST, name: 'Starburst', category: 'company' })
@Injectable()
export class StarburstService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Starburst'` lock; D-10
  trailing-pad title trim lock; D-11 clean dept pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #344):** Wire-shape variant 2. **Forty-ninth**
  plugin in the cohort to use variant 2.
- **D-08 (run #344):** Decode-then-strip pipeline. **Ninetieth**
  cohort plugin to apply D-08 — **the cohort crosses the
  90-plugin D-08-application threshold at this run**.
- **D-09 (run #344):** **Omitted** — case-symmetric bare-brand
  wire `'Starburst'` (9 bytes). **Eighty-first cohort plugin
  to omit D-09**.
- **D-10 (run #344):** **APPLIED with trailing-pad form.** 6
  of 26 wire titles padded (~23.1 % pad rate, all trailing-
  only — `'Executive Assistant '`, `'Partner Solution
  Architect '`, `'Sales Development Representative '`, plus
  3 others). **Fifty-fourth cohort plugin to apply D-10**.
- **D-11 (run #344):** **Omitted** — 0 of 26 wire department
  names padded across 11 unique department names
  (`'Engineering'`, `'Enterprise Sales'`, `'Executive
  Operations'`, `'GTM'`, `'IT'`, `'Marketing'`, `'Presales'`,
  `'Product'`, `'Professional Services'`, `'Sales
  Development'`, `'Support'` — clean multi-token forms with
  internal whitespace). **Seventy-second cohort plugin** with
  fully-clean department pass-through.
- **D-13 (run #344):** **Zero structural deviations** from the
  Doximity (Spec 127) template — making this the **thirty-
  second** Greenhouse-only company-direct plugin in run-
  history to ship as a clean re-spin.
- **D-14 (run #344 — sweep close-out):** **Eighth fresh probe
  sweep fully exhausted at this run** — all 15 live-board
  hits from the run-330 candidate pool have shipped
  (Betterment, Branch, Chainguard, Checkr, Contentful,
  Descope, Dialpad, Doximity, Dremio, Justworks, Melio,
  Modern Health, Opendoor, Oscar, and now Starburst). The
  **ninth fresh probe sweep** launches at run #345+.

## 11. References

- `packages/plugins/source-company-doximity/src/doximity.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin).
- `packages/plugins/source-company-oscar/src/oscar.service.ts` —
  immediate predecessor (run #343).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
