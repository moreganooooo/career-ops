# Spec: 143 — Source Company Plugin: Cribl

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 143                                                                                                                                                                                            |
| Slug           | source-company-cribl                                                                                                                                                                           |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #353)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..142                                                                                                                                                                        |

## 1. Problem Statement

Run #352's Spec 142 closed end-to-end (Conviva shipped — first
cohort observation of variant 37). Run #353 picks up the
**ninth** live hit alphabetically from the ninth-fresh-sweep
candidate pool: **Cribl** (51 visible roles confirmed at
run-353 start — ninth-sweep estimate ~33; ~1.55× ratio over-count).

Cribl, Inc. — operator of the **dominant observability-data-
pipeline (also known as observability-data-engineering or
"telemetry-routing") platform pioneered around the
vendor-agnostic event-routing data model** (founded by
Clint Sharp, Ledion Bitincka, and Dritan Bitincka in 2018 in
San Francisco, CA; private since the 2024 Series E round at
~$3.5B valuation; ships Cribl Stream (event-routing /
reduction / enrichment), Cribl Edge (agent-based collection),
Cribl Search (federated search across SIEM / observability
backends), and Cribl Lake (low-cost telemetry storage)
across the observability-data-engineering / SIEM-augmentation
/ telemetry-pipeline vertical — alongside competitors Splunk
Edge Processor, Datadog Observability Pipelines, Grafana
Beyla, and OpenTelemetry Collector — with a hybrid distributed
workforce concentrated across San Francisco (HQ), Austin,
Dublin, and Remote across the United States, Europe, and
APAC) — is published at the bare `cribl` Greenhouse slug
(case-symmetric with the wire `company_name === 'Cribl'`
after casefold).

## 2. Goals

- Ship a `source-company-cribl` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-lookout` plugin — Lookout is the closest
  cohort cousin sharing four primary axes: D-08 + D-09 case-
  symmetric + D-10 omitted + D-11 omitted.
- **One structural deviation** from Lookout: D-04 sub-axis
  (variant 20 `www.lookout.com/careers/job-post?gh_jid=<id>`
  → variant 38 `cribl.io/job-detail/?gh_jid=<id>` first cohort
  observation — bare brand-domain on `.io` TLD + `/job-detail/`
  trailing-slash leaf with NO `/careers/` prefix + query-only-
  id).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Cribl postings.
- Cribl product-API / Stream / Edge / Search / Lake
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.CRIBL`** in the
> source registry, so that **a single `siteType: [Site.CRIBL]`
> request returns Cribl's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.CRIBL = 'cribl'` to the `Site` enum.                                                                           | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-cribl`.                                                                    | must     |
| FR-3  | `CriblService.scrape(input)` returns a `JobResponseDto`; never throws.                                                   | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `cribl-`, `site === Site.CRIBL`, `companyName === 'Cribl'`.                          | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 38 `cribl.io/job-detail/?gh_jid=<id>`).                            | must     |
| FR-13 | D-10 **omitted** — no title `.trim()` (0 of 51 padded).                                                                  | must     |
| FR-14 | D-11 **omitted** — 0 of 51 wire department names padded across 9 unique departments.                                     | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.CRIBL, name: 'Cribl', category: 'company' })
@Injectable()
export class CriblService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts **variant-38 URL byte-
  for-byte lock** (`cribl.io/job-detail/?gh_jid=<id>` `.io`-TLD
  bare brand-domain + non-`/careers/` leaf + query-only-id);
  D-09 case-symmetric `'Cribl'` lock; D-10 omitted byte-for-
  byte title pass-through (no trim) lock; D-11 clean dept
  pass-through lock.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #353):** **Wire-shape variant 38 — first cohort
  observation.** `https://cribl.io/job-detail/?gh_jid=<id>`
  — HTTPS + bare brand-domain on `.io` TLD + `/job-detail/`
  (trailing-slash leaf with hyphen, NO `/careers/` ancestor)
  + query-only-id. **First cohort observation of `.io` TLD
  on a vanity-domain** (all prior 40 variants used `.com` or
  legacy `boards.greenhouse.io` apex). **First cohort
  observation of NO-`/careers/` ancestor on a vanity-domain**
  — every prior bare-brand vanity-domain variant included
  `/careers/` in the path. The **forty-first distinct wire-
  shape variant** in the company-direct cohort.
- **D-08 (run #353):** Decode-then-strip pipeline. **Ninety-
  ninth** cohort plugin to apply D-08.
- **D-09 (run #353):** **Omitted** — case-symmetric bare-brand
  wire `'Cribl'` (5 bytes; case-symmetric vs slug `cribl`
  after casefold). 0 of 51 padded. **Ninetieth cohort plugin
  to omit D-09 — the cohort crosses the 90-plugin D-09-
  omission threshold at this run.**
- **D-10 (run #353):** **Omitted.** 0 of 51 wire titles
  padded; the plugin emits `listing.title` byte-for-byte
  without a `.trim()`. **Twenty-eighth cohort plugin to
  omit D-10**.
- **D-11 (run #353):** **Omitted.** 0 of 51 wire department
  names padded across 9 unique department names (`'Customer
  Experience'`, `'Engineering'`, `'Finance'`, `'IT & Security'`,
  `'Marketing'`, `'Operations'`, `'People'`, `'Sales'`,
  `'Support'` — clean multi-token forms with internal
  whitespace and ampersands). **Eightieth cohort plugin** with
  fully-clean department pass-through — **the cohort crosses
  the 80-plugin D-11-omission threshold at this run.**
- **D-13 (run #353):** **One structural deviation** from the
  Lookout (Spec 083) template — D-04 sub-axis (variant 20
  `www.lookout.com/careers/job-post?gh_jid=<id>` → variant 38
  `cribl.io/job-detail/?gh_jid=<id>`).

## 11. References

- `packages/plugins/source-company-lookout/src/lookout.service.ts` —
  closest cohort cousin (one-deviation D-04 sub-axis).
- `packages/plugins/source-company-conviva/src/conviva.service.ts` —
  immediate predecessor (run #352).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
