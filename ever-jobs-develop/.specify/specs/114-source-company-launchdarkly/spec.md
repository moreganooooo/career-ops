# Spec: 114 — Source Company Plugin: LaunchDarkly

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 114                                                                                                                                                                                            |
| Slug           | source-company-launchdarkly                                                                                                                                                                    |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #324)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..113                                                                                                                                                                        |

## 1. Problem Statement

Run #323's Spec 113 closed end-to-end (Fastly shipped — first
cohort observation of variant 30; crossed the 60-plugin D-09-
omission threshold). Run #324 picks up the **ninth** live hit
alphabetically from the seventh-fresh-sweep candidate pool:
**LaunchDarkly** (45 visible roles confirmed at run-324 start).

LaunchDarkly, Inc. — operator of the **dominant feature-
management / experimentation platform pioneered around the
runtime-flag-evaluation-as-a-service data model** (founded by
Edith Harbaugh, John Kodumal, and Ian Henderson in 2014 in
Oakland, California; raised ~$330M across rounds at peak ~$3B
valuation in 2021 led by Lightspeed Venture Partners; ships
LaunchDarkly's feature-flag platform, experimentation engine,
and observability tooling across the feature-management /
release-orchestration / progressive-delivery segment —
alongside competitors Optimizely, Split.io, ConfigCat,
Statsig, and AWS AppConfig — with a hybrid distributed
workforce concentrated across Oakland (HQ), New York, San
Francisco, London, and Remote across the United States, the
United Kingdom, and the European Union) — is published at the
bare `launchdarkly` Greenhouse slug (case-asymmetric with the
wire `company_name === 'LaunchDarkly'` — TWO-cap PascalCase
form with caps at byte indices 0 and 6).

## 2. Goals

- Ship a `source-company-launchdarkly` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-planetscale` plugin — PlanetScale is the
  closest cohort cousin via shared D-04 variant 2 + D-08 + D-09
  case-asymmetric PascalCase + D-11 omitted axes.
- **One structural deviation** from PlanetScale:
  1. **D-10 APPLIED with trailing-pad form** (PlanetScale
     omitted; LaunchDarkly applies — 3 of 45 wire titles
     padded ~6.7 %).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical LaunchDarkly postings.
- LaunchDarkly product-API / feature-flag-evaluation /
  experimentation-engine integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.LAUNCHDARKLY`** in
> the source registry, so that **a single `siteType:
> [Site.LAUNCHDARKLY]` request returns LaunchDarkly's open
> roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.LAUNCHDARKLY = 'launchdarkly'` to the `Site` enum.                                      | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-launchdarkly`.                                      | must     |
| FR-3  | `LaunchdarklyService.scrape(input)` returns a `JobResponseDto`; never throws.                     | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `launchdarkly-`, `site === Site.LAUNCHDARKLY`, `companyName === 'LaunchDarkly'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2). Fallback uses canonical Greenhouse variant-2. | must |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (3 of 45 padded ~6.7 %).      | must     |
| FR-14 | D-11 **omitted** — 0 of 45 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.LAUNCHDARKLY, name: 'LaunchDarkly', category: 'company' })
@Injectable()
export class LaunchdarklyService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-through;
  D-09 PascalCase TWO-cap case-asymmetric `'LaunchDarkly'` lock;
  D-10 trailing-pad trim lock; D-11 clean pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #324):** Wire-shape variant 2 — canonical
  Greenhouse host (`https://job-boards.greenhouse.io/launchdarkly/jobs/<id>`).
  **Thirty-fifth** plugin in the cohort to use variant 2.
- **D-08 (run #324):** Decode-then-strip pipeline. **Seventieth**
  cohort plugin to apply D-08.
- **D-09 (run #324):** **Omitted with PascalCase TWO-cap case-
  asymmetric wire form** — wire `'LaunchDarkly'` byte-for-byte
  (12 bytes; case-asymmetric vs the lowercase 12-byte slug
  `launchdarkly` at TWO byte indices: 0 (`L` vs `l`) and 6
  (`D` vs `d`); both UPPERCASE on the wire). **Sixty-first
  cohort plugin to omit D-09**. **Fourth cohort observation of
  TWO-cap PascalCase D-09 sub-axis** (after SoFi caps 0/2,
  StockX caps 0/5, xAI caps 0/2 — note xAI's first cap is
  lowercase `x` not uppercase). LaunchDarkly is the **second
  cohort plugin with caps at index 0 + a deeper-than-3 second
  cap** (StockX has caps at 0/5; LaunchDarkly's caps at 0/6
  are the deepest-second-cap observed in the cohort).
- **D-10 (run #324):** **APPLIED with trailing-pad form.** 3
  of 45 wire titles padded (`'Enterprise Account Executive -
  Germany '`, plus 2 others; ~6.7 % pad rate, all trailing-
  only). **Thirty-eighth cohort plugin to apply D-10**.
- **D-11 (run #324):** **Omitted** — 0 of 45 wire department
  names padded across 17 unique department names (`'AI
  Engineering'`, `'CEO Administration'`, `'Core Engineering'`,
  `'Customer Success'`, `'Finance'`, `'IT'`, `'Legal'`,
  `'Marketing'`, `'Measure Engineering'`, `'Partnerships'`,
  plus 7 others — clean multi-token forms with internal
  whitespace and acronym suffixes). **Fifty-fifth cohort
  plugin** with fully-clean department pass-through.
- **D-13 (run #324):** **One structural deviation** from the
  PlanetScale (Spec 100) template: D-10 applied (PlanetScale
  D-10 omitted at 0/6 padded; LaunchDarkly D-10 applied at
  3/45 padded ~6.7 %).

## 11. References

- `packages/plugins/source-company-planetscale/src/planetscale.service.ts` —
  closest cohort cousin (variant 2 + D-09 PascalCase + D-11
  omitted reference).
- `packages/plugins/source-company-fastly/src/fastly.service.ts` —
  immediate predecessor (run #323).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
