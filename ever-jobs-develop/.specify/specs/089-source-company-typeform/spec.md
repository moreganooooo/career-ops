# Spec: 089 — Source Company Plugin: Typeform

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 089                                                                                                                                                                                            |
| Slug           | source-company-typeform                                                                                                                                                                        |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #299)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..088                                                                                                                                                                        |

## 1. Problem Statement

Run #298's Spec 088 closed end-to-end (Squarespace shipped). Run
#299 picks up the **eleventh and last** live hit alphabetically
from the fifth-fresh-sweep candidate pool: **Typeform** (22 roles
confirmed at run-299 start — significantly lower than the run-289
probe-counter estimate of ~132).

Typeform — operator of the **dominant conversational form-builder
platform pioneered around the one-question-at-a-time form data
model** (founded by David Okuniev and Robert Muñoz in 2012 in
Barcelona; raised $187M+ across rounds led by General Atlantic,
Index Ventures, and Connect Ventures at a peak $1.0B valuation;
ships a freemium B2C / B2B form-builder + payments + Acuity-like
scheduling product across the form-and-survey segment —
alongside competitors Google Forms, SurveyMonkey, JotForm,
Cognito Forms, and Tally — with a hybrid distributed workforce
concentrated across Barcelona, Berlin, San Francisco, and Remote
across Europe and the Americas) — is published at the bare
`typeform` Greenhouse slug (the lowercase brand name; case-
symmetric with the wire `company_name === 'Typeform'`) and was
confirmed live via run #299's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/typeform/jobs?content=true`
(22 open roles confirmed at run-299 start). Typeform publishes
its `absolute_url` on the canonical Greenhouse variant-2 shape.

**Run #299 closes out the fifth-fresh-sweep candidate pool**
(all eleven live hits — Bitwarden, Calendly, DataCamp, Fivetran,
Lookout, Marqeta, New Relic, Peloton, Scopely, Squarespace, and
Typeform — shipped across runs #289–#299). Subsequent runs
(#300+) will pivot to a **sixth fresh probe sweep** targeting
yet-untested large-employer candidate slugs.

## 2. Goals

- Ship a `source-company-typeform` plugin returning live
  `JobPostDto` rows for the public Typeform careers board with
  **no caller config required**.
- Match the structural and behavioural shape of the existing
  `source-company-lattice` plugin (Greenhouse-backed,
  `category: 'company'`, `Site.TYPEFORM` enum value, `id`
  prefixed `typeform-`) — Lattice is the closest structural
  cousin because both share four primary axes: D-08 entity-
  decode-then-tag-strip, D-09 omitted with case-symmetric
  bare-brand wire form, D-10 omitted (clean wire titles), and
  **D-11 applied with trailing-pad form** (Lattice 3/11 padded
  with `'Customer Account Management '` / `'Product '` × 2;
  Typeform 3/22 padded with `'Product '` and similar trailing-
  pad cases). Typeform carries **one structural deviation**
  from the Lattice template — D-04 wire-shape variant 2
  (canonical Greenhouse host; distinct from Lattice's variant
  15 bare brand-domain).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

**Cohort observation of note:** Typeform is the **third cohort
plugin to apply D-11** (after Lattice's run-284 first-ever
trailing-pad application and DataCamp's run-291 first-ever
leading-pad application). Typeform's D-11 application is
trailing-pad, lifting Lattice's first-ever observation from a
one-off to a recurring axis (now two trailing-pad cases:
Lattice + Typeform).

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Any locale / search-term / location filtering beyond what
  `source-company-lattice` already supports.
- A dedicated salary parser pass.
- Backfilling historical Typeform postings.
- Typeform product-API / form-builder / payments integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.TYPEFORM`** in the
> source registry, so that **a single `siteType: [Site.TYPEFORM]`
> request returns Typeform's open roles without my code knowing
> the underlying ATS slug**.

> As a **circuit-breaker operator** (Spec 005), I want **per-
> source failure isolation for Typeform**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.TYPEFORM = 'typeform'` to `packages/models/src/enums/site.enum.ts`.                     | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-typeform` under `packages/plugins/`.                | must     |
| FR-3  | `TypeformService.scrape(input)` returns a `JobResponseDto`; never throws.                         | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `typeform-`, `site === Site.TYPEFORM`, and `companyName === 'Typeform'` (D-09 omitted; case-symmetric bare-brand). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive against the trimmed form — D-11 search guard). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/typeform.service.spec.ts`, all using mocked HTTP.      | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags.                | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (variant 2). Fallback uses canonical Greenhouse variant-2 form. | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **omitted** — 0 of 22 wire titles in the run-299 probe carry pad bytes. | must     |
| FR-14 | Wire `departments[0].name` IS trimmed (D-11 applied) — 3 of 22 wire department names in the run-299 probe carry trailing ASCII-space padding (`'Product '` and similar trailing-pad cases). The plugin applies `.trim()` to `listing.departments?.[0]?.name` before downstream filters and emit. **Third cohort plugin to apply D-11** (after Lattice's run-284 first-ever trailing-pad application and DataCamp's run-291 first-ever leading-pad application). | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 22-job page.                                         |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 22-job page.                                       |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only.                           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[TypeformModule]})` resolves.    |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-typeform/src/typeform.service.ts
@SourcePlugin({ site: Site.TYPEFORM, name: 'Typeform', category: 'company' })
@Injectable()
export class TypeformService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. |

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts D-11 application lock —
  emitted `department` for the trimmed listing equals trimmed
  form `'Product'` (no trailing pad) AND byte-distinct from wire
  `'Product '` (with trailing pad) AND exactly 1 byte shorter.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-01..D-03 (run #299):** Wrap Greenhouse public API; skip
  Harvest API; no salary parser hook.
- **D-04 (run #299):** **Wire-shape variant 2 — canonical
  Greenhouse host.** **Twenty-first** plugin in the cohort to
  use variant 2.
- **D-05 (run #299):** Use Greenhouse slug `typeform`.
- **D-06 (run #299):** Class names are `TypeformService` /
  `TypeformModule`.
- **D-07 (run #299):** Selected from the **fifth fresh probe
  sweep** live-board pool, alphabetically-eleventh AND **last**
  live-board hit (after Bitwarden #289, Calendly #290, DataCamp
  #291, Fivetran #292, Lookout #293, Marqeta #294, New Relic
  #295, Peloton #296, Scopely #297, Squarespace #298). With
  Typeform shipped, the **fifth-fresh-sweep candidate pool is
  fully exhausted**. Subsequent runs (#300+) will pivot to a
  **sixth fresh probe sweep**.
- **D-08 (run #299):** Description-cleanup pipeline is
  `stripHtmlTags(decodeHtmlEntities(listing.content))`. **Forty-
  fifth** company-direct plugin to apply D-08.
- **D-09 (run #299):** Brand-name trim **omitted** with case-
  symmetric bare-brand wire form. Wire `company_name ===
  'Typeform'` byte-for-byte (8 bytes — fully clean). **Thirty-
  eighth cohort plugin to omit D-09**.
- **D-10 (run #299):** Wire-title `.trim()` deviation is
  **omitted**. 0 of 22 wire titles in the run-299 probe carry
  whitespace padding (the wire is fully clean — `'Account
  Executive - EU'`, `'Creative Project Manager'`, etc.).
  **Sixteenth cohort plugin to omit D-10**.
- **D-11 (run #299):** Wire `departments[0].name` `.trim()`
  deviation is **applied**. 3 of 22 wire department names in
  the run-299 probe carry trailing ASCII-space padding
  (`'Product '` × 2 and one other trailing-pad case; ~13.6 %
  pad rate). The plugin applies `.trim()` to
  `listing.departments?.[0]?.name` before downstream filters
  and emit. **Third cohort plugin to apply D-11** (after
  Lattice's run-284 first-ever trailing-pad application and
  DataCamp's run-291 first-ever leading-pad application).
  Typeform's trailing-pad form lifts Lattice's first-ever
  observation from a one-off to a recurring axis (now two
  trailing-pad cases: Lattice + Typeform).
- **D-12 (run #299):** Eleventh and **last** plugin in the
  fifth-fresh-sweep pool processing.
- **D-13 (run #299):** **One structural deviation** from the
  Lattice (Spec 074) template — D-04 wire-shape variant 2
  (Typeform variant 2 canonical Greenhouse host; Lattice
  variant 15 bare brand-domain). All other axes share with
  Lattice: D-08 entity-decode-then-tag-strip, D-09 omitted
  with case-symmetric bare-brand wire, D-10 omitted, D-11
  applied with trailing-pad form (Typeform 3/22 padded ~13.6 %;
  Lattice 3/11 padded ~27.3 %).

## 11. References

- `packages/plugins/source-company-lattice/src/lattice.service.ts` —
  closest structural cousin (one deviation: D-04 variant 2 vs
  variant 15).
- `packages/plugins/source-company-datacamp/src/datacamp.service.ts` —
  prior D-11 cohort plugin (run #291; first-ever leading-pad
  application — distinct sub-axis from Typeform's trailing-pad).
- `packages/plugins/source-company-squarespace/src/squarespace.service.ts` —
  immediate predecessor in the fifth-sweep pool.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter.
- `packages/common/src/utils/html-utils.ts` —
  `decodeHtmlEntities` + `stripHtmlTags` helpers (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog amended in this spec.
- `docs/PLUGIN_ARCHITECTURE.md` — four-file registration contract.
