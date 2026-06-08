# Spec: 112 — Source Company Plugin: Descript

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 112                                                                                                                                                                                            |
| Slug           | source-company-descript                                                                                                                                                                        |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #322)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..111                                                                                                                                                                        |

## 1. Problem Statement

Run #321's Spec 111 closed end-to-end (Constant Contact shipped
— eighteenth zero-deviation clean re-spin; 100-plugin company-
direct catalogue milestone). Run #322 picks up the **seventh**
live hit alphabetically from the seventh-fresh-sweep candidate
pool: **Descript** (25 visible roles confirmed at run-322
start).

Descript, Inc. — operator of the **dominant AI-powered audio /
video editing platform pioneered around the transcript-first
multitrack-editing data model** (founded by Andrew Mason
(former Groupon co-founder) in 2017 in San Francisco; raised
~$200M+ across rounds at peak ~$553M valuation in February
2022 led by Spark Capital, Andreessen Horowitz, and Tiger
Global; ships Descript audio editor, Descript video editor,
Overdub voice-cloning, Studio Sound noise-reduction, and Live
Collaboration features across the AI-creator-tooling /
podcasting / video-editing segment — alongside competitors
Adobe Premiere, Final Cut Pro, DaVinci Resolve, Riverside,
and CapCut — with a remote-first distributed workforce
concentrated across San Francisco (HQ) and Remote across the
United States) — is published at the bare `descript`
Greenhouse slug (case-symmetric with the wire `company_name
=== 'Descript'` after casefold) and was confirmed live via
run #322's HTTP 200 probe.

## 2. Goals

- Ship a `source-company-descript` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-braze` plugin — Braze is the closest cohort
  cousin via shared D-04 variant 10 (legacy hosted-board apex),
  D-08, D-09 case-symmetric, D-10 trailing-pad, and D-11
  fully-clean.
- **Zero structural deviations** from Braze — making this the
  **nineteenth** Greenhouse-only company-direct plugin in run-
  history to ship as a clean re-spin (after Coursera, Flexport,
  Glossier, Marqeta, New Relic, Scopely, Adyen, Bobbie,
  Cerebral, Misfits Market, Monzo, Airtable, Bandwidth, Braze,
  Constant Contact, plus corrected counts).
- **Fifth cohort plugin to use wire-shape variant 10** (after
  Chime / Faire / Flexport / Braze).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Descript postings.
- Descript product-API / Overdub / Studio Sound integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.DESCRIPT`** in
> the source registry, so that **a single `siteType:
> [Site.DESCRIPT]` request returns Descript's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.DESCRIPT = 'descript'` to the `Site` enum.                                              | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-descript`.                                          | must     |
| FR-3  | `DescriptService.scrape(input)` returns a `JobResponseDto`; never throws.                         | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `descript-`, `site === Site.DESCRIPT`, `companyName === 'Descript'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 10). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (2 of 25 padded ~8.0 %).      | must     |
| FR-14 | D-11 **omitted** — 0 of 25 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.DESCRIPT, name: 'Descript', category: 'company' })
@Injectable()
export class DescriptService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-10 URL pass-through,
  D-09 case-symmetric `'Descript'` lock, D-10 trailing-pad trim
  lock, D-11 clean pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #322):** **Wire-shape variant 10** — legacy
  hosted-board apex `https://boards.greenhouse.io/descript/jobs/<id>?gh_jid=<id>`.
  **Fifth** plugin in the cohort to use variant 10 (after
  Chime / Faire / Flexport / Braze).
- **D-08 (run #322):** Decode-then-strip pipeline. **Sixty-
  eighth** cohort plugin to apply D-08.
- **D-09 (run #322):** **Omitted** — case-symmetric bare-brand
  wire `'Descript'` (8 bytes). **Fifty-ninth cohort plugin to
  omit D-09**.
- **D-10 (run #322):** **APPLIED with trailing-pad form.** 2
  of 25 wire titles padded (`'Senior Software Engineer, Agent '`,
  `'Software Engineer, Editor '`; ~8.0 % pad rate, all
  trailing-only). **Thirty-sixth cohort plugin to apply D-10**.
- **D-11 (run #322):** **Omitted** — 0 of 25 wire department
  names padded across 5 unique department names (`'Sales &
  Business Development'`, `'Marketing'`, `'Engineering'`,
  `'Product & Design'`, `'Finance'`). **Fifty-third cohort
  plugin** with fully-clean department pass-through.
- **D-13 (run #322):** **Zero structural deviations** from
  the Braze (Spec 110) template — making this the
  **nineteenth** Greenhouse-only company-direct plugin in run-
  history to ship as a clean re-spin.

## 11. References

- `packages/plugins/source-company-braze/src/braze.service.ts` —
  zero-deviation template (variant 10).
- `packages/plugins/source-company-constantcontact/src/constantcontact.service.ts` —
  immediate predecessor (run #321).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
