# Spec: 142 — Source Company Plugin: Conviva

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 142                                                                                                                                                                                            |
| Slug           | source-company-conviva                                                                                                                                                                         |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #352)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..141                                                                                                                                                                        |

## 1. Problem Statement

Run #351's Spec 141 closed end-to-end (ComplyAdvantage shipped —
6th cohort plugin with TWO-cap PascalCase D-09 sub-axis;
60-plugin D-10-application threshold crossed). Run #352 picks up
the **eighth** live hit alphabetically from the ninth-fresh-
sweep candidate pool: **Conviva** (9 visible roles confirmed at
run-352 start — ninth-sweep estimate ~9, **1× exact match** —
fourth 1× match in the ninth-sweep after BEAM, BigID, and
ComplyAdvantage).

Conviva, Inc. — operator of the **dominant cross-screen video
streaming-quality measurement and analytics platform pioneered
around the longitudinal-streaming-telemetry data model**
(founded by Hui Zhang in 2006 in Foster City, CA; private since
the 2007 NEA + 2009 Foundation Capital + 2018 PE-led
recapitalisation; ships Conviva Sensor (client-side video
QoE/QoS instrumentation), Stream Sensor (server-side
streaming-pipeline telemetry), Operations & Marketing
Intelligence (real-time engagement / churn dashboards), and
Conviva Touchstone (state-aware experience-quality
benchmarking) across the streaming-media-analytics / video-
QoE / OTT-operations vertical — alongside competitors NPAW
(formerly NicePeopleAtWork), Mux, Datazoom, and Streaming
Video Alliance — with a hybrid distributed workforce
concentrated across Foster City CA (HQ), London, Bangalore,
and Remote across the United States, Europe, and India) — is
published at the bare `conviva` Greenhouse slug (case-symmetric
with the wire `company_name === 'Conviva'` after casefold).

## 2. Goals

- Ship a `source-company-conviva` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-lookout` plugin — Lookout is the closest
  cohort cousin sharing four primary axes: D-08 + D-09 case-
  symmetric + D-10 omitted + D-11 omitted.
- **One structural deviation** from Lookout: D-04 sub-axis
  (variant 20 `www.lookout.com/careers/job-post?gh_jid=<id>`
  query-only-id with `-post` suffix → variant 37
  `www.conviva.com/careers/job/<id>?gh_jid=<id>` dual-id with
  bare singular-leaf path; first cohort observation of variant
  37 — sister to variant 19 (Klaviyo) by `www.`-prefix and
  singular-leaf, sister to variant 28 (SoFi) by singular-leaf
  + path-id + dual-id, distinct from both by having ALL THREE
  shape elements: www-prefix + singular-leaf + path-id + dual-id).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Conviva postings.
- Conviva product-API / Sensor / Stream Sensor / Touchstone
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.CONVIVA`** in the
> source registry, so that **a single `siteType: [Site.CONVIVA]`
> request returns Conviva's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.CONVIVA = 'conviva'` to the `Site` enum.                                                                       | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-conviva`.                                                                  | must     |
| FR-3  | `ConvivaService.scrape(input)` returns a `JobResponseDto`; never throws.                                                 | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `conviva-`, `site === Site.CONVIVA`, `companyName === 'Conviva'`.                    | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 37 `www.conviva.com/careers/job/<id>?gh_jid=<id>`).                | must     |
| FR-13 | D-10 **omitted** — no title `.trim()` (0 of 9 padded).                                                                   | must     |
| FR-14 | D-11 **omitted** — 0 of 9 wire department names padded across 5 unique departments.                                      | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.CONVIVA, name: 'Conviva', category: 'company' })
@Injectable()
export class ConvivaService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts **variant-37 URL byte-
  for-byte lock** (`www.conviva.com/careers/job/<id>?gh_jid=<id>`);
  D-09 case-symmetric `'Conviva'` lock; D-10 omitted byte-for-
  byte title pass-through (no trim) lock; D-11 clean dept
  pass-through lock.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #352):** **Wire-shape variant 37 — first cohort
  observation.** `https://www.conviva.com/careers/job/<id>?gh_jid=<id>`
  — HTTPS + `www.`-prefixed brand-domain + `/careers/job/<id>`
  (singular leaf with id-in-path) + dual-id (path-id + query-id).
  **Sister to variant 19** (Klaviyo / Fivetran / Amplitude) by
  `www.`-prefix and singular-leaf base form. **Sister to variant
  28** (SoFi) by singular-leaf + id-in-path + dual-id. Distinct
  from both by combining all three shape elements: www-prefix
  + singular-leaf + path-id + dual-id. The **fortieth distinct
  wire-shape variant** in the company-direct cohort.
- **D-08 (run #352):** Decode-then-strip pipeline. **Ninety-
  eighth** cohort plugin to apply D-08.
- **D-09 (run #352):** **Omitted** — case-symmetric bare-brand
  wire `'Conviva'` (7 bytes; case-symmetric vs slug `conviva`
  after casefold). 0 of 9 padded. **Eighty-ninth cohort plugin
  to omit D-09**.
- **D-10 (run #352):** **Omitted.** 0 of 9 wire titles padded;
  the plugin emits `listing.title` byte-for-byte without a
  `.trim()`. **Twenty-seventh cohort plugin to omit D-10**.
- **D-11 (run #352):** **Omitted.** 0 of 9 wire department
  names padded across 5 unique department names (`'Customer
  Support'`, `'Finance'`, `'Product Management'`, `'Sales'`,
  `'Technical Solutions'` — clean multi-token forms with
  internal whitespace). **Seventy-ninth cohort plugin** with
  fully-clean department pass-through.
- **D-13 (run #352):** **One structural deviation** from the
  Lookout (Spec 083) template — D-04 sub-axis (variant 20
  `www.lookout.com/careers/job-post?gh_jid=<id>` query-only-id
  with `-post` suffix → variant 37
  `www.conviva.com/careers/job/<id>?gh_jid=<id>` dual-id with
  bare singular-leaf path).

## 11. References

- `packages/plugins/source-company-lookout/src/lookout.service.ts` —
  closest cohort cousin (one-deviation D-04 sub-axis).
- `packages/plugins/source-company-complyadvantage/src/complyadvantage.service.ts` —
  immediate predecessor (run #351).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
