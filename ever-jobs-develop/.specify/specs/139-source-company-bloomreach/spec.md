# Spec: 139 — Source Company Plugin: Bloomreach

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 139                                                                                                                                                                                            |
| Slug           | source-company-bloomreach                                                                                                                                                                      |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #349)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..138                                                                                                                                                                        |

## 1. Problem Statement

Run #348's Spec 138 closed end-to-end (Blend shipped — first
cohort observation of company-suffix dept naming D-11 sub-axis).
Run #349 picks up the **fifth** live hit alphabetically from
the ninth-fresh-sweep candidate pool: **Bloomreach** (78
visible roles confirmed at run-349 start — ninth-sweep estimate
~62, ~0.79× ratio — under-count).

Bloomreach, Inc. — operator of the **dominant ecommerce-AI
platform combining commerce-experience cloud, content-
management, discovery / search, marketing-automation, and
customer-data** (founded by Raj De Datta and Ashutosh Garg
in 2009 in Mountain View, CA; private since the 2022 Goldman
Sachs $175M round at ~$2.2B valuation; ships Bloomreach
Discovery (search + merchandising), Bloomreach Engagement
(CDP + marketing-automation), Bloomreach Content (headless
CMS), and Bloomreach Clarity (AI conversational shopping)
across the ecommerce-personalisation / B2C-retail / consumer-
goods vertical — alongside competitors Algolia, Salesforce
Commerce Cloud, Adobe Experience Manager, Klaviyo, Braze —
with a hybrid distributed workforce concentrated across
Mountain View (HQ), Bratislava (engineering HQ), Brno,
Amsterdam, and Remote across the United States and Europe)
— is published at the bare `bloomreach` Greenhouse slug
(case-symmetric with the wire `company_name === 'Bloomreach'`
after casefold).

## 2. Goals

- Ship a `source-company-bloomreach` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-doximity` plugin — Doximity is the closest
  cohort cousin sharing all five primary axes: D-04 variant
  2 + D-08 + D-09 case-symmetric + D-10 applied + D-11
  omitted.
- **Zero structural deviations** from Doximity, with **D-10
  observation: first-cohort mojibake-NBSP trailing-pad sub-
  axis** — 1 of 10 padded titles carries `c3 82 c2 a0` byte
  sequence (double-UTF-8-encoded U+00A0 NBSP). `.trim()`
  strips trailing NBSP; residual `Â` (U+00C2) byte preserved
  by-design — wire-faithful.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Bloomreach postings.
- Bloomreach product-API / Discovery / Engagement / Content /
  Clarity integration.
- Downstream normalisation of mojibake `Â` residual byte —
  scrape-layer contract is wire-faithful pass-through modulo
  `.trim()`.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.BLOOMREACH`** in
> the source registry, so that **a single `siteType:
> [Site.BLOOMREACH]` request returns Bloomreach's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                | Priority |
| ----- | ---------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.BLOOMREACH = 'bloomreach'` to the `Site` enum.                                                   | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-bloomreach`.                                                 | must     |
| FR-3  | `BloomreachService.scrape(input)` returns a `JobResponseDto`; never throws.                                | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                          | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.               | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `bloomreach-`, `site === Site.BLOOMREACH`, `companyName === 'Bloomreach'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                            | must     |
| FR-8  | `input.searchTerm` honoured.                                                                               | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                            | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                           | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                           | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).                                                 | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers trailing-pad sub-axis (10 of 78 padded ~12.8 %; 1 mojibake-NBSP).| must     |
| FR-14 | D-11 **omitted** — 0 of 76 wire department names padded across 8 unique departments.                       | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.BLOOMREACH, name: 'Bloomreach', category: 'company' })
@Injectable()
export class BloomreachService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Bloomreach'` lock; **D-10
  first-cohort mojibake-NBSP trailing-pad lock** (`'Senior
  Security & Compliance Analyst Â '` → `'Senior Security &
  Compliance Analyst Â'` — `.trim()` strips trailing NBSP,
  residual `Â` mojibake byte preserved); D-11 clean dept
  pass-through lock.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #349):** Wire-shape variant 2. **Fifty-third**
  plugin in the cohort to use variant 2.
- **D-08 (run #349):** Decode-then-strip pipeline. **Ninety-
  fifth** cohort plugin to apply D-08.
- **D-09 (run #349):** **Omitted** — case-symmetric bare-brand
  wire `'Bloomreach'` (10 bytes). **Eighty-sixth cohort plugin
  to omit D-09**.
- **D-10 (run #349):** **APPLIED with trailing-pad form +
  FIRST-COHORT mojibake-NBSP sub-axis observation.** 10 of 78
  wire titles padded (~12.8 % pad rate, all trailing-only). 1
  of the 10 carries a mojibake-double-encoded NBSP byte
  sequence (`c3 82 c2 a0` — wire-side double-UTF-8-encoded
  U+00A0 NBSP). JavaScript `.trim()` includes U+00A0 NBSP in
  its `WhiteSpace` set so the trailing NBSP is stripped; the
  residual mojibake `Â` (U+00C2) byte remains by-design —
  wire-faithful pass-through. **First cohort observation of
  mojibake-NBSP pad form** across 57 prior D-10-applying
  plugins. **Fifty-eighth cohort plugin to apply D-10**.
- **D-11 (run #349):** **Omitted.** 0 of 76 wire department
  names padded across 8 unique department names (`'Engineering'`,
  `'G&A - FLS'`, `'G&A - GIST'`, `'G&A - People'`, `'Marketing'`,
  `'Operations'`, `'Product'`, `'Revenue'` — clean multi-token
  forms with internal whitespace, ampersands, and hyphens).
  **Seventy-sixth cohort plugin** with fully-clean department
  pass-through.
- **D-13 (run #349):** **Zero structural deviations** from the
  Doximity (Spec 127) template — making this the **thirty-
  fifth** Greenhouse-only company-direct plugin in run-history
  to ship as a clean re-spin. (The first-cohort mojibake-NBSP
  D-10 sub-axis is captured as an observability note —
  `.trim()` is byte-count agnostic, so no axis change is
  required.)

## 11. References

- `packages/plugins/source-company-doximity/src/doximity.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin).
- `packages/plugins/source-company-blend/src/blend.service.ts` —
  immediate predecessor (run #348).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
