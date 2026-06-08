# Spec: 128 — Source Company Plugin: Dremio

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 128                                                                                                                                                                                            |
| Slug           | source-company-dremio                                                                                                                                                                          |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #338)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..127                                                                                                                                                                        |

## 1. Problem Statement

Run #337's Spec 127 closed end-to-end (Doximity shipped — 29th
clean re-spin off Contentful). Run #338 picks up the **ninth**
live hit alphabetically from the eighth-fresh-sweep candidate
pool: **Dremio** (12 visible roles confirmed at run-338 start;
**fourth 1× match in eighth-sweep** after Branch, Descope,
Doximity).

Dremio Corporation — operator of the **dominant data-lakehouse
+ open-table-format query-engine platform pioneered around
the SQL-on-Iceberg / Apache-Arrow-acceleration / data-mesh-
without-data-movement data model** (founded by Tomer Shiran
and Jacques Nadeau (former Apache Drill PMC chair) in 2015 in
Mountain View, California; raised ~$415M across rounds at
peak ~$2B valuation in January 2022 led by Sapphire Ventures
and Adams Street Partners; ships Dremio Cloud (managed
lakehouse), Dremio Software, Dremio Sonar (SQL query engine),
Dremio Arctic (Apache-Iceberg catalog with Nessie git-like
versioning, since acquisition of Nessie founders), and Apache-
Iceberg + Apache-Arrow + Apache-Parquet + Apache-Polaris
contributions across the data-lakehouse / data-mesh / SQL-
on-Iceberg / open-table-format segment — alongside competitors
Snowflake, Databricks, Starburst (Trino), Microsoft Fabric,
Google BigQuery, AWS Athena, and Tabular (acquired by Databricks)
— with a hybrid distributed workforce concentrated across
Mountain View (HQ), Bangalore, London, Tel Aviv, and Remote
across the United States, India, the United Kingdom, the
European Union, and Israel) — is published at the bare
`dremio` Greenhouse slug (case-symmetric with the wire
`company_name === 'Dremio'` after casefold).

## 2. Goals

- Ship a `source-company-dremio` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-fastly` plugin — Fastly is the closest
  cohort cousin via shared D-08 + D-09 case-symmetric + D-10
  applied + D-11 omitted axes, AND the closest D-04 sister
  (both variants are HTTPS-scheme `www.`-prefixed brand-domain
  forms with query-only `gh_jid` ID).
- **One structural deviation** from Fastly:
  1. **D-04 wire-shape variant 33 — HTTPS-scheme `www.`-prefixed
     brand-domain `/careers/job-postings/` query-only-id (first
     cohort observation; thirty-sixth distinct wire-shape
     variant).** Variant 33 is sister to Fastly's variant 30
     (`www.fastly.com/about/jobs/apply?gh_jid=<id>`) — both
     HTTPS + www + query-only-id, distinct path
     (`/careers/job-postings/` with trailing slash vs
     `/about/jobs/apply` without trailing slash).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Dremio postings.
- Dremio product-API / Cloud / Sonar / Arctic / Nessie
  catalog integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.DREMIO`** in
> the source registry, so that **a single `siteType:
> [Site.DREMIO]` request returns Dremio's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.DREMIO = 'dremio'` to the `Site` enum.                                                  | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-dremio`.                                            | must     |
| FR-3  | `DremioService.scrape(input)` returns a `JobResponseDto`; never throws.                           | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `dremio-`, `site === Site.DREMIO`, `companyName === 'Dremio'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 33). Fallback uses canonical Greenhouse variant-2. | must |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (2 of 12 padded ~16.7 %).     | must     |
| FR-14 | D-11 **omitted** — 0 of 12 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.DREMIO, name: 'Dremio', category: 'company' })
@Injectable()
export class DremioService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-33 URL byte-
  for-byte pass-through (`https://www.dremio.com/careers/job-postings/?gh_jid=<id>`);
  D-09 case-symmetric `'Dremio'` lock; D-10 trailing-pad
  title trim lock; D-11 clean dept pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #338):** **Wire-shape variant 33 — HTTPS +
  `www.`-prefixed brand-domain + `/careers/job-postings/` +
  `?gh_jid=<id>` (query-only id) — first cohort observation.**
  **Thirty-sixth distinct wire-shape variant** in the company-
  direct cohort. Sub-axes: (a) HTTPS scheme; (b) `www.`-
  prefixed brand-domain (same prefix as variants 16 / 19 / 20
  / 22 / 30 / 32); (c) `/careers/job-postings/` path (with
  **trailing slash**) — distinct from variant 30's
  `/about/jobs/apply` (no trailing slash) and variant 32's
  `/careers/current-openings/job`; (d) query-only id
  (`?gh_jid=<id>` — single param). Sister to Fastly's variant
  30 (HTTPS + www + query-only-id, different path).
- **D-08 (run #338):** Decode-then-strip pipeline. **Eighty-
  fourth** cohort plugin to apply D-08.
- **D-09 (run #338):** **Omitted** — case-symmetric bare-brand
  wire `'Dremio'` (6 bytes). **Seventy-fifth cohort plugin to
  omit D-09**.
- **D-10 (run #338):** **APPLIED with trailing-pad form.** 2
  of 12 wire titles padded (~16.7 % pad rate, all trailing-
  only — `'Senior Product Manager '`, `'Staff Software
  Engineer - Platform & Integrations '`). **Forty-eighth
  cohort plugin to apply D-10**.
- **D-11 (run #338):** **Omitted** — 0 of 12 wire department
  names padded across 7 unique department names (`'Engineering'`,
  `'Marketing'`, `'Presales'`, `'Product'`, `'Sales'`,
  `'Security'`, plus 1 sentence-style **catchall dept**:
  `'Unsure what to apply for? No worries! Submit your resume
  here.'` — first cohort observation of a sentence-style /
  question-mark-bearing dept name; standard pass-through
  preserves byte-for-byte). **Sixty-seventh cohort plugin**
  with fully-clean department pass-through.
- **D-13 (run #338):** **One structural deviation** from the
  Fastly (Spec 113) template: D-04 sub-axis (variant 30
  `/about/jobs/apply` → variant 33 `/careers/job-postings/`).

## 11. References

- `packages/plugins/source-company-fastly/src/fastly.service.ts` —
  closest cohort cousin (variant 30 — HTTPS + www + query-
  only-id sister).
- `packages/plugins/source-company-doximity/src/doximity.service.ts` —
  immediate predecessor (run #337).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
