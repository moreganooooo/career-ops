# Spec: 093 — Source Company Plugin: Bobbie

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 093                                                                                                                                                                                            |
| Slug           | source-company-bobbie                                                                                                                                                                          |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #303)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..092                                                                                                                                                                        |

## 1. Problem Statement

Run #302's Spec 092 closed end-to-end (BILL shipped, variant 24
inaugurated). Run #303 picks up the **fourth** live hit
alphabetically from the sixth-fresh-sweep candidate pool:
**Bobbie** (9 roles confirmed at run-303 start).

Bobbie — operator of the **dominant European-style infant-formula
D2C platform pioneered around the FDA-compliant organic / non-GMO
/ glyphosate-free clean-label baby-formula data model** (founded
by Laura Modi (formerly Airbnb) and Sarah Hardy in 2018 in San
Francisco; raised $100M+ across Series A/B/C/D rounds led by
Park West, North Sun Ventures, Maveron, and Coatue at peak ~$525M
valuation post-Series-D in October 2023; ships a subscription-
first organic infant-formula direct-to-consumer brand across the
parenting-CPG segment — alongside competitors Kendamil, ByHeart,
Serenity Kids, and Earth's Best — with a hybrid distributed
workforce concentrated across San Francisco (HQ), Heath, OH
(manufacturing plant acquired from Perrigo in 2023), and Remote
across the United States) — is published at the bare `bobbie`
Greenhouse slug (the lowercase brand name; case-symmetric with
the wire `company_name === 'Bobbie'`) and was confirmed live via
run #303's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/bobbie/jobs?content=true`
(9 open roles confirmed at run-303 start).

## 2. Goals

- Ship a `source-company-bobbie` plugin returning live
  `JobPostDto` rows for the public Bobbie careers board.
- Match the structural and behavioural shape of the existing
  `source-company-coursera` plugin — Coursera is the closest
  structural cousin because both share **all five primary axes**:
  D-04 wire-shape variant 2 (canonical Greenhouse host), D-08
  entity-decode-then-tag-strip, D-09 omitted with case-symmetric
  bare-brand wire, D-10 omitted (clean wire titles), and D-11
  fully-clean department pass-through. Bobbie carries **zero
  structural deviations** — making this the **ninth** Greenhouse-
  only company-direct plugin in run-history to ship as a clean
  re-spin of a prior cohort plugin with no per-axis deviations.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Bobbie postings.
- Bobbie product-API / subscription / fulfilment integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.BOBBIE`** in
> the source registry, so that **a single `siteType:
> [Site.BOBBIE]` request returns Bobbie's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.BOBBIE = 'bobbie'` to the `Site` enum.                                                  | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-bobbie`.                                            | must     |
| FR-3  | `BobbieService.scrape(input)` returns a `JobResponseDto`; never throws.                           | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `bobbie-`, `site === Site.BOBBIE`, `companyName === 'Bobbie'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **omitted** — 0 of 9 wire titles padded.                                                     | must     |
| FR-14 | D-11 **omitted** — 0 of 9 wire department names padded.                                           | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.BOBBIE, name: 'Bobbie', category: 'company' })
@Injectable()
export class BobbieService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-through
  (canonical `job-boards.greenhouse.io/bobbie/jobs/`); D-09 case-
  symmetric lock; D-08 entity-decode + tag-strip locks.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #303):** **Wire-shape variant 2** — canonical
  Greenhouse host `https://job-boards.greenhouse.io/bobbie/jobs/<id>`.
  **Twenty-third** plugin in the cohort to use variant 2.
- **D-08 (run #303):** Decode-then-strip pipeline. **Forty-ninth**
  cohort plugin to apply D-08.
- **D-09 (run #303):** **Omitted** — case-symmetric bare-brand
  wire `'Bobbie'` (6 bytes — fully clean; case-symmetric with
  the lowercase 6-byte slug `bobbie`). **Forty-second cohort
  plugin to omit D-09**.
- **D-10 (run #303):** **Omitted** — 0 of 9 wire titles padded.
  **Eighteenth cohort plugin to omit D-10**.
- **D-11 (run #303):** **Omitted** — 0 of 9 wire department
  names padded (`'Operations'`, `'Brand & Marketing'`, `'Talent
  Pipeline'`, `'Commercial'`, `'Manufacturing'` — clean multi-
  token forms). **Thirty-seventh cohort plugin** with fully-
  clean department pass-through.
- **D-13 (run #303):** **Zero structural deviations** from the
  Coursera (Spec 068) template — making this the **ninth**
  Greenhouse-only company-direct plugin in run-history to ship
  as a clean re-spin (after Coursera off Chime, Flexport off
  Faire, Glossier off Flexport, Marqeta off Calendly, New Relic
  off Maven Clinic, Scopely off Marqeta, Adyen off Marqeta, and
  Bobbie off Coursera at this run).

## 11. References

- `packages/plugins/source-company-coursera/src/coursera.service.ts` —
  zero-deviation template.
- `packages/plugins/source-company-billcom/src/billcom.service.ts` —
  immediate predecessor in run-history (run #302).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
