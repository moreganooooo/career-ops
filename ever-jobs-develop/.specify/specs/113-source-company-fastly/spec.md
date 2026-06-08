# Spec: 113 — Source Company Plugin: Fastly

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 113                                                                                                                                                                                            |
| Slug           | source-company-fastly                                                                                                                                                                          |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #323)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..112                                                                                                                                                                        |

## 1. Problem Statement

Run #322's Spec 112 closed end-to-end (Descript shipped —
nineteenth zero-deviation clean re-spin; fifth variant-10
plugin). Run #323 picks up the **eighth** live hit
alphabetically from the seventh-fresh-sweep candidate pool:
**Fastly** (64 visible roles confirmed at run-323 start).

Fastly, Inc. — operator of the **dominant edge-cloud platform
pioneered around the programmable-CDN / Compute@Edge / image-
optimization / DDoS-protection data model** (founded by
Artur Bergman in 2011 in San Francisco; public on the NYSE
since May 2019 IPO under ticker `FSLY` at a $2.6B initial
valuation; market-cap settled in the $0.7-2.5B band as of
2026; ships Fastly's globally-distributed edge network
(Compute@Edge, Image Optimization, Cloud Security, Bot
Management, DDoS Protection, Next-Gen WAF) across the
edge-cloud / CDN / web-performance segment — alongside
competitors Cloudflare, Akamai, AWS CloudFront, Fastly's own
historical predecessor Limelight Networks, and AT&T Edgecast
— with a hybrid distributed workforce concentrated across
San Francisco (HQ), Denver, New York, Pune (India), London,
and Remote across the United States, India, the United
Kingdom, the European Union, and the Asia-Pacific region) —
is published at the bare `fastly` Greenhouse slug
(case-symmetric with the wire `company_name === 'Fastly'`
after casefold) and was confirmed live via run #323's HTTP
200 probe.

## 2. Goals

- Ship a `source-company-fastly` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-squarespace` plugin — Squarespace is the
  closest cohort cousin via shared `/about/`-ancestor wire-
  shape pattern and D-09 case-symmetric + D-10 trailing-pad +
  D-11 clean axes.
- **One structural deviation** from Squarespace:
  1. **D-04 variant 30** (Squarespace variant 22 HTTP scheme +
     `/about/careers` query-only-id; Fastly variant 30 HTTPS +
     `/about/jobs/apply` query-only-id — first cohort
     observation of variant 30). Variant 30 is the HTTPS
     sister to Squarespace's HTTP variant 22, but with a
     different path (`/about/jobs/apply` rather than
     `/about/careers`). **First cohort observation of
     `/jobs/apply` mid+leaf path-segment combination.**
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Fastly postings.
- Fastly product-API / Compute@Edge / Image Optimization /
  Cloud Security integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.FASTLY`** in
> the source registry, so that **a single `siteType:
> [Site.FASTLY]` request returns Fastly's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.FASTLY = 'fastly'` to the `Site` enum.                                                  | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-fastly`.                                            | must     |
| FR-3  | `FastlyService.scrape(input)` returns a `JobResponseDto`; never throws.                           | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `fastly-`, `site === Site.FASTLY`, `companyName === 'Fastly'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 30). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (1 of 64 padded ~1.6 %).      | must     |
| FR-14 | D-11 **omitted** — 0 of 64 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.FASTLY, name: 'Fastly', category: 'company' })
@Injectable()
export class FastlyService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-30 URL pass-through;
  D-09 case-symmetric `'Fastly'` lock; D-10 trailing-pad trim
  lock; D-11 clean pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #323):** **Wire-shape variant 30 — HTTPS +
  `www.`-prefixed brand-domain + `/about/jobs/apply` + query-
  only-id — first cohort observation.** **Thirty-third
  distinct wire-shape variant** in the company-direct cohort.
  Sub-axes: (a) HTTPS scheme; (b) `www.`-prefixed brand-domain;
  (c) `/about/jobs/apply` path (HTTPS sister to Squarespace's
  variant 22 `/about/careers`; Fastly is the **first** cohort
  plugin to use a `/about/jobs/<leaf>` form with a `/jobs/`
  mid-segment + `/apply` leaf); (d) query-only-id `?gh_jid=<id>`.
- **D-08 (run #323):** Decode-then-strip pipeline. **Sixty-
  ninth** cohort plugin to apply D-08.
- **D-09 (run #323):** **Omitted** — case-symmetric bare-brand
  wire `'Fastly'` (6 bytes). **Sixtieth cohort plugin to omit
  D-09** — the cohort crosses the 60-plugin D-09-omission
  threshold at this run.
- **D-10 (run #323):** **APPLIED with trailing-pad form.** 1
  of 64 wire titles padded (`'Senior Customer Solutions
  Engineer, Streaming Media - Mandarin Speaking '`; ~1.6 % pad
  rate, all trailing-only — second-lowest D-10 pad rate
  observed in cohort, just behind Braze's ~1.4 %). **Thirty-
  seventh cohort plugin to apply D-10**.
- **D-11 (run #323):** **Omitted** — 0 of 64 wire department
  names padded across 28 unique department names (`'Sales
  Engineering'`, `'Cloud Engineering - COR'`, `'Customer
  Security - CSOC'`, `'CFO'`, `'Infrastructure Engineering'`,
  `'Finance Systems'`, `'Information Technology'`, `'Human
  Resources'`, `'Solution Engineering'`, plus 19 others — clean
  multi-token forms with internal whitespace, hyphens, and
  acronym suffixes). **Fifty-fourth cohort plugin** with fully-
  clean department pass-through.
- **D-13 (run #323):** **One structural deviation** from the
  Squarespace (Spec 088) template: D-04 sub-axis (Squarespace
  variant 22 HTTP scheme `/about/careers`; Fastly variant 30
  HTTPS `/about/jobs/apply`).

## 11. References

- `packages/plugins/source-company-squarespace/src/squarespace.service.ts` —
  closest cohort cousin (variant 22 — `/about/`-ancestor
  reference).
- `packages/plugins/source-company-descript/src/descript.service.ts` —
  immediate predecessor (run #322).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
