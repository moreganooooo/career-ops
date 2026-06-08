# Spec: 294 — Source Company Plugin: AppleTree Prep

| Field          | Value                                  |
| -------------- | -------------------------------------- |
| Spec ID        | 294                            |
| Slug           | source-company-appletreeprep               |
| Status         | accepted                               |
| Owner          | claude (run #398)                      |
| Created        | 2026-06-03                             |
| Last updated   | 2026-06-03                             |
| Supersedes     | (none)                                 |
| Related specs  | 001, 003, 005                          |

## 1. Problem Statement

AppleTree Prep is a Georgia-based child care and early education
provider operating multiple centers in the Athens area and beyond,
including Watkinsville, Athens, Bogart, Loganville, and Macon. It
serves children from infancy through school age with programs
spanning all-day care, Georgia Lottery-funded Pre-K, after-school
care, and summer camp. Several of its centers hold a three-star
Quality Rated accreditation through Georgia's state program. Hiring
spans classroom roles such as infant teachers as well as center
leadership positions like assistant director.

AppleTree Prep publishes its careers board through Greenhouse at
the bare slug `appletreeprep`. The run-398 batch sweep confirmed
13 live role(s) via a direct probe of
`https://api.greenhouse.io/v1/boards/appletreeprep/jobs?content=true`.
Sector: Early Childhood Education / Child Care. HQ: Watkinsville, Georgia, USA.

## 2. Goals

- Ship a `source-company-appletreeprep` plugin returning live
  `JobPostDto` rows from the Greenhouse board.
- Mirror the canonical variant-2 + D-08 company-direct template
  (wire `company_name` pass-through; defensive title/department
  trim; entity-decode-then-tag-strip descriptions).
- Bundle a unit-test suite (≥ 9 cases) with a mocked HTTP fixture.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical AppleTree Prep postings.
- Cross-board enrichment or salary inference.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.APPLETREEPREP`** in the
> source registry, so that **a single `siteType: [Site.APPLETREEPREP]`
> request returns AppleTree Prep's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                 | Priority |
| ----- | --------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.APPLETREEPREP = 'appletreeprep'` to the `Site` enum.               | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-appletreeprep`.                  | must     |
| FR-3  | `AppletreeprepService.scrape(input)` returns a `JobResponseDto`; never throws. | must   |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                          | must     |
| FR-5  | `tsconfig.base.json` path-alias + matching `jest.config.js` mapper.      | must     |
| FR-6  | Each `JobPostDto` `id` prefixed `appletreeprep-`, `site === Site.APPLETREEPREP`. | must |
| FR-7  | `input.resultsWanted` honoured.                                           | must     |
| FR-8  | `input.searchTerm` honoured (title + department substring).               | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                            | must     |
| FR-10 | ≥ 9 unit tests with mocked HTTP.                                            | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                            | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).               | must     |
| FR-13 | D-10 defensive `.trim()` on wire titles.                                   | must     |
| FR-14 | D-11 defensive `.trim()` on wire department names.                         | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline (no new runtime deps;
`Promise`-based async; `Logger` not `console`; resilient to
malformed payloads).

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.APPLETREEPREP, name: 'AppleTree Prep', category: 'company' })
@Injectable()
export class AppletreeprepService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 9 cases. Happy-path asserts variant-2 URL pass-through
  (`job-boards.greenhouse.io/appletreeprep/jobs/<id>`), wire
  `company_name` pass-through (`'AppleTree Prep'`),
  D-10 title-trim lock, D-11 department-trim lock, and the
  D-08 decode-then-strip regression guard.
- Plus standard cohort cases (resultsWanted cap, searchTerm
  match + non-match, HTTP 500 error handling, empty payload).

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #398):** Wire-shape variant 2 (canonical hosted-board
  host `job-boards.greenhouse.io/appletreeprep/jobs/<id>`).
- **D-08 (run #398):** Decode-then-strip description pipeline.
- **D-09 (run #398):** Wire `company_name` pass-through
  (`'AppleTree Prep'`).
- **D-10 (run #398):** Defensive `.trim()` on wire titles.
- **D-11 (run #398):** Defensive `.trim()` on wire department names.

## 11. References

- `packages/plugins/source-company-acurussolutions/src/acurussolutions.service.ts`
  — canonical variant-2 + D-08 company-direct template.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
