# Spec: 086 — Source Company Plugin: Peloton

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 086                                                                                                                                                                                            |
| Slug           | source-company-peloton                                                                                                                                                                         |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #296)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..085                                                                                                                                                                        |

## 1. Problem Statement

Run #295's Spec 085 closed end-to-end (New Relic shipped). Run
#296 picks up the **eighth** live hit alphabetically from the
fifth-fresh-sweep candidate pool: **Peloton** (52 roles confirmed
at run-296 start — significantly lower than the run-289 probe-
counter estimate of ~104, due to the same probe-counter inflation
pattern that affected New Relic, Marqeta, and DataCamp).

Peloton Interactive, Inc. — operator of the **dominant
connected-fitness platform pioneered around the on-demand-and-
live-streamed cycling-and-treadmill-instructor data model**
(founded by John Foley in 2012 in New York City; IPO'd on NASDAQ
as `PTON` in September 2019; ships connected-bike, connected-
tread, and Peloton Guide / App-only subscription services across
the connected-fitness segment — alongside competitors Hydrow,
Tonal, NordicTrack, iFit, and Apple Fitness+ — with a hybrid
distributed workforce concentrated across New York City, Toronto,
London, Berlin, Atlanta, and Remote across the United States,
Canada, the United Kingdom, and Germany) — publishes its
consolidated careers board through Greenhouse at the bare slug
`peloton` (the lowercase concatenated single-word brand; case-
asymmetric only with the wire `company_name === 'Peloton'`) and
was confirmed live via run #296's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/peloton/jobs?content=true`
(52 open roles confirmed at run-296 start). Peloton publishes
its `absolute_url` on a **previously-unobserved wire-shape
variant 21** — `https://careers.onepeloton.com/en/all-jobs/?gh_jid=<id>`
— a brand-host careers-subdomain (`careers.onepeloton.com`) with
**locale-prefix path segment** (`/en/`) and **multi-segment
listing path with trailing slash** (`/all-jobs/`) followed by the
`?gh_jid=<id>` query-only listing identifier. Distinct from
Toast's variant 8 (`careers.toasttab.com/jobs?gh_jid=<id>` — no
locale prefix, single-segment path, no trailing slash) and
ZoomInfo's variant 9 (`www.zoominfo.com/careers?gh_jid=<id>` —
apex-www brand-domain, no locale prefix, single-segment path).

## 2. Goals

- Ship a `source-company-peloton` plugin returning live
  `JobPostDto` rows for the public Peloton careers board with
  **no caller config required**.
- Match the structural and behavioural shape of the existing
  `source-company-marqeta` plugin (Greenhouse-backed,
  `category: 'company'`, `Site.PELOTON` enum value, `id`
  prefixed `peloton-`) — Marqeta is the closest behavioural
  cousin because both share four of the five primary axes: D-08
  entity-decode-then-tag-strip, D-09 omitted with case-symmetric
  bare-brand wire form, D-10 applied (low pad rate), and D-11
  omitted (departments fully clean). Peloton introduces **one
  structural deviation**: D-04 wire-shape variant 21 (the **first
  cohort plugin to use this previously-unobserved shape** —
  brand-host careers-subdomain with locale-prefix + multi-segment
  listing-path-with-trailing-slash + `?gh_jid=<id>`).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

**Cohort observation of note:** Peloton's wire title pad rate
~3.85 % (2 of 52 padded) is the **lowest D-10 pad rate observed
in the cohort to date** — undercutting the prior cohort low of
Calendly's 5.0 % (1 of 20 padded) and Marqeta's 6.1 % (2 of 33
padded) and locking in a new floor for the cohort distribution.
Pad-form distribution: 0 leading-only, 2 trailing-only, 0 dual.
Both padded titles share the trailing-only single-ASCII-space
form (`'Senior Full Stack Software Engineer, Device Services '`,
`'Software Engineer III, Social '`).

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Any locale / search-term / location filtering beyond what
  `source-company-marqeta` already supports.
- A dedicated salary parser pass.
- Backfilling historical Peloton postings.
- Peloton product-API / class-catalogue / instructor-lookup
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.PELOTON`** in the
> source registry, so that **a single `siteType: [Site.PELOTON]`
> request returns Peloton's open roles without my code knowing
> the underlying ATS slug**.

> As a **plugin author**, I want **the first proof-point of
> Greenhouse-backed company-direct plugins on wire-shape variant
> 21** (brand-host careers-subdomain with locale-prefix and
> multi-segment listing path with trailing slash), so that **the
> `absolute_url` pass-through emit semantic remains byte-for-byte
> stable across a previously-unobserved variant family without
> any plugin-side normalisation**.

> As a **circuit-breaker operator** (Spec 005), I want **per-
> source failure isolation for Peloton**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.PELOTON = 'peloton'` to `packages/models/src/enums/site.enum.ts`.                       | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-peloton` under `packages/plugins/`.                 | must     |
| FR-3  | `PelotonService.scrape(input)` returns a `JobResponseDto`; never throws.                          | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `peloton-`, `site === Site.PELOTON`, and `companyName === 'Peloton'` (D-09 omitted; case-symmetric bare-brand wire form — wire 7 bytes, slug 7 bytes; same shape as Marqeta/Calendly/DataCamp/Bitwarden/Lookout). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/peloton.service.spec.ts`, all using mocked HTTP.       | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags.                | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (variant 21 — brand-host careers-subdomain with locale-prefix and multi-segment listing path with trailing slash). Fallback uses the canonical Greenhouse variant-2 form `https://job-boards.greenhouse.io/peloton/jobs/<id>` (NOT variant 21) — defensive fallback when wire omits `absolute_url`; the variant-2 fallback constructor matches the prior cohort fallback pattern (ClassPass / Spec 067 — variant 12 wire, variant 2 fallback). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **applied** — 2 of 52 wire titles in the run-296 probe carry trailing pad bytes (~3.85 % pad rate — **new cohort low**). The plugin applies `.trim()` to `listing.title` before downstream filters and emit. | must     |
| FR-14 | Wire `departments[0].name` is **NOT** trimmed (D-11 omitted) — 0 of 52 wire department names in the run-296 probe carry pad bytes. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 52-job page.                                         |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 52-job page.                                       |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[PelotonModule]})` resolves.    |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-peloton/src/peloton.service.ts
@SourcePlugin({ site: Site.PELOTON, name: 'Peloton', category: 'company' })
@Injectable()
export class PelotonService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/peloton/jobs?content=true`
exactly once per call.

### 7.2 Errors

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. The caller sees `{ jobs: [] }` (FR-9). |

## 8. Test Plan

- **Unit (`__tests__/peloton.service.spec.ts`):**
  1. NestJS DI resolves `PelotonService` through `PelotonModule`.
  2. `Site.PELOTON === 'peloton'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s,
     including regression assertions for variant-21 URL byte-for-
     byte pass-through (the **first cohort plugin to use variant
     21** — brand-host careers-subdomain with locale-prefix and
     multi-segment listing path with trailing slash; locks the
     `careers.onepeloton.com/en/all-jobs/?gh_jid=<id>` substring
     emit AND the absence of canonical-Greenhouse-host substring
     `job-boards.greenhouse.io` in the emitted `jobUrl`), decode-
     then-strip pipeline cleanliness, case-symmetric bare-brand
     wire `companyName === 'Peloton'` (D-09 omission lock; wire
     and slug both 7 bytes), **D-10 application lock with
     trailing-padded form** — emitted `title` for the padded
     listing equals trimmed form `'Senior Full Stack Software
     Engineer, Device Services'` AND byte-distinct from wire
     `'Senior Full Stack Software Engineer, Device Services '`
     (with trailing pad byte) AND exactly 1 byte shorter (locking
     the trailing-pad observable; Peloton's 3.85 % pad rate is
     the **new cohort low**).
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive,
     against the trimmed form — D-10 search guard).
  6. `searchTerm` filters listings by department name (case-
     insensitive).
  7. HTTP 500 → `scrape` resolves to `{ jobs: [] }`, never throws.
  8. Empty `data.jobs` → `{ jobs: [] }`.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-01 (run #296):** Wrap Greenhouse public API.
- **D-02 (run #296):** Skip Harvest API code path.
- **D-03 (run #296):** No salary parser hook beyond helpers
  defaults — Peloton posts USD / CAD / GBP / EUR ranges across
  global remote and hub roles; Spec 015 covers all four.
- **D-04 (run #296):** **Wire-shape variant 21 — brand-host
  careers-subdomain with locale-prefix and multi-segment listing
  path with trailing slash, followed by `?gh_jid=<id>`.**
  Peloton publishes `absolute_url` on
  `https://careers.onepeloton.com/en/all-jobs/?gh_jid=<id>`. The
  `careers.onepeloton.com` subdomain is on the brand domain
  `onepeloton.com`; the path carries a locale-prefix segment
  `/en/` followed by the multi-segment listing path
  `/all-jobs/` with trailing slash; the listing identifier is
  query-only via `?gh_jid=<id>`. **First cohort plugin to use
  variant 21** — distinct from Toast's variant 8
  (`careers.toasttab.com/jobs?gh_jid=<id>` — single-segment path
  `/jobs`, no locale prefix, no trailing slash) and ZoomInfo's
  variant 9 (`www.zoominfo.com/careers?gh_jid=<id>` — apex-www
  brand-domain, single-segment path `/careers`, no locale prefix,
  no trailing slash). The **twenty-second distinct wire-shape
  variant** observed across the cohort. Pass-through emits the
  wire `absolute_url` byte-for-byte; fallback constructor uses
  the canonical Greenhouse variant-2 form
  `https://job-boards.greenhouse.io/peloton/jobs/<id>` (NOT
  variant 21 — defensive fallback when wire omits
  `absolute_url`; matches the ClassPass (Spec 067) / Faire (Spec
  063) precedent of using variant 2 fallback even when the wire
  uses a non-2 variant). **One structural deviation from the
  Marqeta (Spec 084) template** — the only structural deviation
  on this plugin.
- **D-05 (run #296):** Use Greenhouse slug `peloton`.
- **D-06 (run #296):** Class names are `PelotonService` /
  `PelotonModule` (PascalCase preserving the brand's bare-word
  capitalisation `Peloton`; matches the slug-derived
  PascalCase convention since the slug is single-word lowercase).
  The alphabetical sort key in `index.ts` and
  `ALL_SOURCE_MODULES` uses the slug-derived form `peloton`
  (between `OracleModule` and `PostmanModule` alphabetically;
  `Ora` < `Pel` < `Pos`).
- **D-07 (run #296):** Selected from the **fifth fresh probe
  sweep** live-board pool, alphabetically-eighth live-board hit
  (after Bitwarden #289, Calendly #290, DataCamp #291, Fivetran
  #292, Lookout #293, Marqeta #294, New Relic #295).
- **D-08 (run #296):** Description-cleanup pipeline is
  `stripHtmlTags(decodeHtmlEntities(listing.content))`. **Forty-
  second** company-direct plugin to apply D-08.
- **D-09 (run #296):** Brand-name trim **omitted** with **case-
  symmetric bare-brand wire form**. Wire `company_name ===
  'Peloton'` byte-for-byte (7 bytes; slug `peloton` is 7 bytes —
  fully symmetric with the lowercase slug, no internal
  whitespace, no legal-entity suffix). Same shape as Marqeta
  (slug `marqeta` / wire `'Marqeta'`), Calendly (slug `calendly`
  / wire `'Calendly'`), DataCamp (slug `datacamp` / wire
  `'DataCamp'`), Bitwarden (slug `bitwarden` / wire
  `'Bitwarden'`), and Lookout (slug `lookout` / wire `'Lookout'`).
  **Thirty-fifth cohort plugin to omit D-09**, returning to the
  cohort-default D-09-omitted posture after New Relic's run-295
  internal-whitespace-asymmetric posture. The plugin reads
  `listing.company_name` directly with `'Peloton'` as a
  defensive fallback.
- **D-10 (run #296):** Wire-title `.trim()` deviation is
  **applied**. 2 of 52 wire titles in the run-296 probe carry
  trailing pad bytes (~3.85 % pad rate — the **new cohort low**,
  undercutting Calendly's prior 5.0 % low). Pad-form
  distribution: 0 leading-only, 2 trailing-only (`'Senior Full
  Stack Software Engineer, Device Services '`, `'Software
  Engineer III, Social '`), 0 dual. **Twenty-second cohort
  plugin to apply D-10**.
- **D-11 (run #296):** Wire `departments[0].name` `.trim()`
  deviation is **omitted**. 0 of 52 wire department names in the
  run-296 probe carry pad bytes (`'Marketing'`, `'Sales'`,
  `'Data Analytics'`, `'Hardware'`, `'Supply Chain & Logistics'`,
  `'Software'`, `'People'`, `'Legal'`, `'Studio & Content
  Production'`, `'Product Development'`, plus two more — clean
  multi-token forms with internal whitespace and ampersands).
  **Thirty-second cohort plugin** with fully-clean department
  pass-through.
- **D-12 (run #296):** Eighth plugin in the fifth-fresh-sweep
  pool processing.
- **D-13 (run #296):** **One structural deviation** from the
  Marqeta (Spec 084) template — **D-04 wire-shape variant 21**
  (vs Marqeta's variant 2). All other axes share with Marqeta:
  D-08 entity-decode-then-tag-strip, D-09 omitted with case-
  symmetric bare-brand wire form, D-10 applied (Peloton 2/52
  ~3.85 %; Marqeta 2/33 ~6.1 %), D-11 fully-clean department
  pass-through.

## 11. References

- `packages/plugins/source-company-marqeta/src/marqeta.service.ts` —
  closest behavioural cousin (one structural deviation: D-04).
- `packages/plugins/source-company-toast/src/toast.service.ts` —
  precedent for `?gh_jid=<id>` query-only listing identifier
  (variant 8; Peloton uses variant 21 — distinct via locale
  prefix + multi-segment path).
- `packages/plugins/source-company-classpass/src/classpass.service.ts` —
  precedent for non-variant-2 wire shape with variant-2 fallback
  constructor.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path.
- `packages/common/src/utils/html-utils.ts` —
  `decodeHtmlEntities` + `stripHtmlTags` helpers (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog amended in this spec.
- `docs/PLUGIN_ARCHITECTURE.md` — four-file registration contract.
