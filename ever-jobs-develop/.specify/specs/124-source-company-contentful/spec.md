# Spec: 124 — Source Company Plugin: Contentful

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 124                                                                                                                                                                                            |
| Slug           | source-company-contentful                                                                                                                                                                      |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #334)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..123                                                                                                                                                                        |

## 1. Problem Statement

Run #333's Spec 123 closed end-to-end (Checkr shipped — 26th
clean re-spin off Otter; crossed 70-plugin D-09-omission
threshold). Run #334 picks up the **fifth** live hit
alphabetically from the eighth-fresh-sweep candidate pool:
**Contentful** (108 visible roles confirmed at run-334 start —
eighth-sweep estimate was ~92 keys, ~0.85× ratio; **second
eighth-sweep candidate where probe-counter under-counted**
the actual job total after Checkr).

Contentful GmbH (Contentful AG) — operator of the **dominant
API-first headless-CMS / composable-content platform pioneered
around the structured-content-as-a-service data model**
(founded by Sascha Konietzke, Paolo Negri, and Rouven
Westphal in 2013 in Berlin, Germany; raised ~$330M across
rounds at peak ~$3B valuation in July 2021 led by Tiger Global
Management; ships Contentful Composable Content Platform
(headless CMS), Contentful Studio (visual editor), Contentful
Apps Framework, Contentful Live Preview, and Compose +
Launch app integrations across the headless-CMS / composable-
content / digital-experience-platform segment — alongside
competitors Sanity, Strapi, Storyblok, Adobe Experience
Manager, Sitecore, and Hygraph (formerly GraphCMS) — with a
hybrid distributed workforce concentrated across Berlin (HQ),
Denver, San Francisco, London, Aveiro (Portugal), and Remote
across the United States, Germany, the United Kingdom,
Portugal, the European Union, and Canada) — is published at
the bare `contentful` Greenhouse slug (case-symmetric with
the wire `company_name === 'Contentful'` after casefold).

## 2. Goals

- Ship a `source-company-contentful` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-checkr` plugin — Checkr is the closest
  cohort cousin (immediate predecessor) sharing all five
  primary axes: D-04 variant 2 + D-08 + D-09 case-symmetric +
  D-10 applied + D-11 omitted.
- **Zero structural deviations** from Checkr.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Contentful postings.
- Contentful product-API / Composable Content Platform /
  Studio integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.CONTENTFUL`** in
> the source registry, so that **a single `siteType:
> [Site.CONTENTFUL]` request returns Contentful's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.CONTENTFUL = 'contentful'` to the `Site` enum.                                          | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-contentful`.                                        | must     |
| FR-3  | `ContentfulService.scrape(input)` returns a `JobResponseDto`; never throws.                       | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `contentful-`, `site === Site.CONTENTFUL`, `companyName === 'Contentful'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).                                        | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (8 of 108 padded ~7.4 %).     | must     |
| FR-14 | D-11 **omitted** — 0 of 108 wire department names padded.                                         | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.CONTENTFUL, name: 'Contentful', category: 'company' })
@Injectable()
export class ContentfulService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Contentful'` lock; D-10
  trailing-pad title trim lock; D-11 clean dept pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #334):** Wire-shape variant 2. **Forty-third**
  plugin in the cohort to use variant 2.
- **D-08 (run #334):** Decode-then-strip pipeline. **Eightieth**
  cohort plugin to apply D-08 — the cohort crosses the
  80-plugin D-08-application threshold at this run.
- **D-09 (run #334):** **Omitted** — case-symmetric bare-brand
  wire `'Contentful'` (10 bytes). **Seventy-first cohort
  plugin to omit D-09**.
- **D-10 (run #334):** **APPLIED with trailing-pad form.** 8
  of 108 wire titles padded (~7.4 % pad rate, all trailing-
  only — `'Manager, Security Engineering '`, `'Manager,
  Security Engineering (Corporate Systems) '` ×2, plus 5
  others). **Forty-sixth cohort plugin to apply D-10**.
- **D-11 (run #334):** **Omitted** — 0 of 108 wire department
  names padded across 9 unique department names (`'Customer
  Experience'`, `'Engineering'`, `'Finance'`, `'IT'`,
  `'Marketing'`, `'Partnerships'`, `'Product'`, `'Sales'`,
  `'Security'` — clean multi-token forms). **Sixty-fourth
  cohort plugin** with fully-clean department pass-through.
- **D-13 (run #334):** **Zero structural deviations** from the
  Checkr (Spec 123) template — making this the **twenty-
  seventh** Greenhouse-only company-direct plugin in run-
  history to ship as a clean re-spin.

## 11. References

- `packages/plugins/source-company-checkr/src/checkr.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin,
  immediate predecessor).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
