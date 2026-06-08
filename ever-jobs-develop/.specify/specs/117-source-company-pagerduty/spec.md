# Spec: 117 — Source Company Plugin: PagerDuty

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 117                                                                                                                                                                                            |
| Slug           | source-company-pagerduty                                                                                                                                                                       |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #327)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..116                                                                                                                                                                        |

## 1. Problem Statement

Run #326's Spec 116 closed end-to-end (Otter shipped — 20th
clean re-spin off Airtable; crossed 40-plugin D-10-application
threshold). Run #327 picks up the **twelfth** live hit
alphabetically from the seventh-fresh-sweep candidate pool:
**PagerDuty** (48 visible roles confirmed at run-327 start).

PagerDuty, Inc. — operator of the **dominant digital-operations
platform pioneered around the on-call alerting / incident-
response / DevOps-orchestration data model** (founded by
Andrew Miklas, Alex Solomon, and Baskar Puvanathasan in 2009
in Toronto, Canada; public on the NYSE since April 2019 IPO
under ticker `PD` at ~$2.8B initial valuation; market-cap
settled in the $1.2-2.5B band as of 2026; ships PagerDuty's
Operations Cloud (Incident Response, Customer Service Ops,
Process Automation — Rundeck acquired October 2020 for
$67.5M, AIOps), Event Intelligence, and Service Standards
across the digital-operations / on-call-alerting / incident-
response / observability segment — alongside competitors
Opsgenie, ServiceNow IT Operations Management, Splunk On-Call
(formerly VictorOps), Datadog Incident Management, and
Squadcast — with a hybrid distributed workforce concentrated
across San Francisco (HQ), Toronto, Atlanta, London, Sydney,
Tokyo, and Remote across the United States, Canada, the
United Kingdom, the European Union, Australia, and Japan) —
is published at the bare `pagerduty` Greenhouse slug (case-
asymmetric with the wire `company_name === 'PagerDuty'` —
TWO-cap PascalCase form with caps at byte indices 0 and 5).

## 2. Goals

- Ship a `source-company-pagerduty` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-launchdarkly` plugin — LaunchDarkly is the
  closest cohort cousin via shared D-04 variant 2 + D-08 +
  D-09 TWO-cap PascalCase + D-10 applied + D-11 omitted axes.
- **Zero structural deviations** from LaunchDarkly.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical PagerDuty postings.
- PagerDuty product-API / Operations Cloud / Rundeck /
  AIOps integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.PAGERDUTY`** in
> the source registry, so that **a single `siteType:
> [Site.PAGERDUTY]` request returns PagerDuty's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.PAGERDUTY = 'pagerduty'` to the `Site` enum.                                            | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-pagerduty`.                                         | must     |
| FR-3  | `PagerdutyService.scrape(input)` returns a `JobResponseDto`; never throws.                        | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `pagerduty-`, `site === Site.PAGERDUTY`, `companyName === 'PagerDuty'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).                                        | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (4 of 48 padded ~8.3 %).      | must     |
| FR-14 | D-11 **omitted** — 0 of 48 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.PAGERDUTY, name: 'PagerDuty', category: 'company' })
@Injectable()
export class PagerdutyService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 PascalCase TWO-cap case-asymmetric `'PagerDuty'`
  lock (caps at 0/5); D-10 trailing-pad trim lock; D-11 clean
  pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #327):** Wire-shape variant 2 — canonical
  Greenhouse host. **Thirty-seventh** plugin in the cohort to
  use variant 2.
- **D-08 (run #327):** Decode-then-strip pipeline. **Seventy-
  third** cohort plugin to apply D-08.
- **D-09 (run #327):** **Omitted with PascalCase TWO-cap case-
  asymmetric wire form** — wire `'PagerDuty'` byte-for-byte
  (9 bytes; case-asymmetric vs the lowercase 9-byte slug
  `pagerduty` at TWO byte indices: 0 (`P` vs `p`) and 5
  (`D` vs `d`); both UPPERCASE on the wire). **Sixty-fourth
  cohort plugin to omit D-09**. **Fifth cohort observation of
  TWO-cap PascalCase D-09 sub-axis** (after SoFi caps 0/2,
  StockX caps 0/5, xAI caps 0/2 with lowercase first letter,
  LaunchDarkly caps 0/6). PagerDuty's caps at 0/5 **tie StockX
  for second-deepest second-cap** in the cohort (LaunchDarkly
  retains the deepest at 0/6).
- **D-10 (run #327):** **APPLIED with trailing-pad form.** 4
  of 48 wire titles padded (`'Account Manager- San Francisco '`,
  plus 3 others; ~8.3 % pad rate, all trailing-only). **Forty-
  first cohort plugin to apply D-10**.
- **D-11 (run #327):** **Omitted** — 0 of 48 wire department
  names padded across 14 unique department names (`'Business
  Operations'`, `'Commercial Sales'`, `'Customer Success'`,
  `'Enterprise Sales'`, `'Legal'`, `'Marketing'`, `'Product
  Management'`, `'Professional Services'`, `'Renewals'`,
  `'Sales'`, plus 4 others — clean multi-token forms with
  internal whitespace). **Fifty-eighth cohort plugin** with
  fully-clean department pass-through.
- **D-13 (run #327):** **Zero structural deviations** from the
  LaunchDarkly (Spec 114) template — making this the **twenty-
  first** Greenhouse-only company-direct plugin in run-history
  to ship as a clean re-spin.

## 11. References

- `packages/plugins/source-company-launchdarkly/src/launchdarkly.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin).
- `packages/plugins/source-company-otter/src/otter.service.ts` —
  immediate predecessor (run #326).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
