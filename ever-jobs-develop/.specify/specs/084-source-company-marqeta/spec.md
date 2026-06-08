# Spec: 084 — Source Company Plugin: Marqeta

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 084                                                                                                                                                                                            |
| Slug           | source-company-marqeta                                                                                                                                                                         |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #294)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..083                                                                                                                                                                        |

## 1. Problem Statement

Run #293's Spec 083 closed end-to-end (Lookout shipped). Run
#294 picks up the **sixth** live hit alphabetically from the
fifth-fresh-sweep candidate pool: **Marqeta** (33 roles confirmed
at run-294 start — significantly lower than the run-289 probe-
counter estimate of ~330, due to the same probe-counter
inflation pattern from counting all `"id":` JSON keys including
department/office IDs).

Marqeta — operator of the **dominant modern card-issuing platform
pioneered around the open-API embedded-payments-and-instant-funds-
disbursement data model** (founded by Jason Gardner in 2010 in
Oakland, CA; IPO'd on NASDAQ as `MQ` in June 2021 at a $14B
valuation; ships a B2B card-issuing + program-management platform
across the embedded-payments segment — alongside competitors
Stripe Issuing, Lithic, Galileo, Adyen Issuing, and i2c — with a
hybrid distributed workforce concentrated across Oakland,
London, Singapore, and Remote across the United States, Europe,
and Asia-Pacific) — is published at the bare `marqeta`
Greenhouse slug (the lowercase brand name; case-symmetric with
the wire `company_name === 'Marqeta'`) and was confirmed live
via run #294's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/marqeta/jobs?content=true`
(33 open roles confirmed at run-294 start). Marqeta publishes
its `absolute_url` on the canonical Greenhouse variant-2 shape.

## 2. Goals

- Ship a `source-company-marqeta` plugin returning live
  `JobPostDto` rows for the public Marqeta careers board with
  **no caller config required**.
- Match the structural and behavioural shape of the existing
  `source-company-calendly` plugin (Greenhouse-backed, `category:
  'company'`, `Site.MARQETA` enum value, `id` prefixed
  `marqeta-`) — Calendly is the closest structural cousin
  because both publish on Greenhouse public API at variant 2
  (canonical Greenhouse host), both use the case-symmetric bare-
  brand wire `company_name` against a lowercase slug (D-09
  omitted), both emit HTML-entity-encoded content requiring D-08,
  both apply D-10 wire-title `.trim()` (Calendly 1/20 padded
  ~5.0 %, Marqeta 2/33 padded ~6.1 % — near-identical pad rate),
  and both omit D-11 (departments fully clean). **Zero
  structural deviations** from the Calendly template — making
  this the **fifth** Greenhouse-only company-direct plugin in
  run-history to ship as a clean re-spin of a prior cohort
  plugin with no per-axis deviations (after Coursera off Chime
  at run #278, Flexport off Faire at run #280, Glossier off
  Flexport at run #282, and Coursera/Flexport/Glossier).
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path
  + at least five failure / boundary modes against deterministic
  fixtures.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.
- Keep the surface area inside one package.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Any locale / search-term / location filtering beyond what
  `source-company-calendly` already supports.
- A dedicated salary parser pass.
- Backfilling historical Marqeta postings.
- Marqeta product-API / card-issuing / KYC integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.MARQETA`** in the
> source registry, so that **a single `siteType: [Site.MARQETA]`
> request returns Marqeta's open roles without my code knowing
> the underlying ATS slug**.

> As a **circuit-breaker operator** (Spec 005), I want **per-
> source failure isolation for Marqeta**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.MARQETA = 'marqeta'` to `packages/models/src/enums/site.enum.ts`.                       | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-marqeta` under `packages/plugins/`.                 | must     |
| FR-3  | `MarqetaService.scrape(input)` returns a `JobResponseDto`; never throws.                          | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `marqeta-`, `site === Site.MARQETA`, and `companyName === 'Marqeta'` (D-09 omitted; case-symmetric bare-brand). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/marqeta.service.spec.ts`, all using mocked HTTP.       | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags.                | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (variant 2). Fallback uses canonical Greenhouse variant-2 form. | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **applied** — 2 of 33 wire titles in the run-294 probe carry trailing ASCII-space padding (`'Group Product Manager, Fraud '`, `'Senior Director, Global Strategic Partnerships '`); the plugin applies `.trim()` to `listing.title` before downstream filters and emit. | must     |
| FR-14 | Wire `departments[0].name` is **NOT** trimmed (D-11 omitted) — 0 of 33 wire department names in the run-294 probe carry pad bytes; the plugin emits `listing.departments[0].name` byte-for-byte. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 33-job page.                                         |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 33-job page.                                       |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[MarqetaModule]})` resolves.     |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-marqeta/src/marqeta.service.ts
@SourcePlugin({ site: Site.MARQETA, name: 'Marqeta', category: 'company' })
@Injectable()
export class MarqetaService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/marqeta/jobs?content=true`
exactly once per call.

### 7.2 Errors

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. The caller sees `{ jobs: [] }` (FR-9). |

## 8. Test Plan

- **Unit (`__tests__/marqeta.service.spec.ts`):**
  1. NestJS DI resolves `MarqetaService` through `MarqetaModule`.
  2. `Site.MARQETA === 'marqeta'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s,
     mapped fields verified (variant-2 URL, decode-then-strip
     pipeline cleanliness, case-symmetric wire `companyName`,
     D-10 application lock — `'Group Product Manager, Fraud '`
     → `'Group Product Manager, Fraud'` trim assertion with
     byte-distinct + 1-byte-shorter checks, D-11 omission lock).
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive).
  6. `searchTerm` filters listings by department name (case-
     insensitive).
  7. HTTP 500 → `scrape` resolves to `{ jobs: [] }`, never throws.
  8. Empty `data.jobs` → `{ jobs: [] }`.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-01 (run #294):** Wrap Greenhouse public API rather than
  build a bespoke HTML scraper.
- **D-02 (run #294):** Skip Harvest API code path. Company-
  direct plugins stay thin.
- **D-03 (run #294):** No salary parser hook beyond helpers
  defaults.
- **D-04 (run #294):** **Wire-shape variant 2 — canonical
  Greenhouse host.** Marqeta's tenant publishes its
  `absolute_url` on the canonical Greenhouse variant-2 shape
  `https://job-boards.greenhouse.io/marqeta/jobs/<id>`.
  **Nineteenth** plugin in the cohort to use variant 2.
- **D-05 (run #294):** Use Greenhouse slug `marqeta`.
- **D-06 (run #294):** Class names are `MarqetaService` /
  `MarqetaModule`.
- **D-07 (run #294):** Selected from the **fifth fresh probe
  sweep** live-board pool, alphabetically-sixth live-board hit
  (after Bitwarden #289, Calendly #290, DataCamp #291, Fivetran
  #292, Lookout #293).
- **D-08 (run #294):** Description-cleanup pipeline is
  `stripHtmlTags(decodeHtmlEntities(listing.content))`.
  **Fortieth** company-direct plugin to apply D-08.
- **D-09 (run #294):** Brand-name trim **omitted** with case-
  symmetric bare-brand wire form. Wire `company_name ===
  'Marqeta'` (7 bytes — fully clean, case-symmetric with the
  lowercase slug). **Thirty-third cohort plugin to omit D-09**.
- **D-10 (run #294):** Wire-title `.trim()` deviation is
  **applied**. 2 of 33 wire titles in the run-294 probe carry
  trailing ASCII-space padding (`'Group Product Manager, Fraud '`,
  `'Senior Director, Global Strategic Partnerships '` — both
  single-trailing-space-padded; ~6.1 % pad rate). **Twentieth
  cohort plugin to apply D-10**.
- **D-11 (run #294):** Wire `departments[0].name` `.trim()`
  deviation is **omitted**. 0 of 33 wire department names in
  the run-294 probe carry pad bytes (`'Risk Operations'`,
  `'Marketing - General'`, `'Credit Engineering'`, `'Risk,
  Fraud, Disputes Product'`, `'CyberSecurity'`, `'Core
  Product'` — clean multi-token forms with internal whitespace,
  hyphens, and commas; ~0 % pad rate). **Thirtieth cohort
  plugin** with fully-clean department pass-through.
- **D-12 (run #294):** Sixth plugin in the fifth-fresh-sweep
  pool processing.
- **D-13 (run #294):** **Zero structural deviations** from the
  Calendly (Spec 080) template — making this the **fifth**
  Greenhouse-only company-direct plugin in run-history to ship
  as a clean re-spin of a prior cohort plugin with no per-axis
  deviations (after Coursera off Chime at run #278, Flexport
  off Faire at run #280, and Glossier off Flexport at run
  #282). All axes share with Calendly: D-04 wire-shape variant
  2, D-08 entity-decode-then-tag-strip, D-09 omitted with case-
  symmetric bare-brand wire, D-10 applied (Marqeta 2/33 padded
  ~6.1 %; Calendly 1/20 padded ~5.0 % — near-identical pad
  rate), D-11 fully-clean department pass-through.

## 11. References

- `packages/plugins/source-company-calendly/src/calendly.service.ts` —
  closest structural cousin (zero deviations).
- `packages/plugins/source-company-lookout/src/lookout.service.ts` —
  immediate predecessor in the fifth-fresh-sweep pool.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path.
- `packages/common/src/utils/html-utils.ts` — `decodeHtmlEntities`
  + `stripHtmlTags` helpers (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog amended in this spec.
- `docs/PLUGIN_ARCHITECTURE.md` — four-file registration contract.
