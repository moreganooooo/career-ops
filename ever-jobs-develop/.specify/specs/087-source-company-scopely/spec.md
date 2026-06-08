# Spec: 087 — Source Company Plugin: Scopely

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 087                                                                                                                                                                                            |
| Slug           | source-company-scopely                                                                                                                                                                         |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #297)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..086                                                                                                                                                                        |

## 1. Problem Statement

Run #296's Spec 086 closed end-to-end (Peloton shipped). Run #297
picks up the **ninth** live hit alphabetically from the
fifth-fresh-sweep candidate pool: **Scopely** (170 roles confirmed
at run-297 start — significantly lower than the run-289 probe-
counter estimate of ~1190, due to the same probe-counter inflation
pattern that affected Peloton, New Relic, Marqeta, and DataCamp).

Scopely Inc. — operator of the **dominant mobile-games
publishing platform pioneered around the live-operations-and-
licensed-IP-game-portfolio data model** (founded by Walter Driver,
Eytan Elbaz, Eric Futoran, and Ankur Bulsara in 2011 in Culver
City, CA; acquired by Savvy Games Group / Public Investment Fund
of Saudi Arabia in April 2023 at a $4.9B valuation; ships Monopoly
GO!, Star Trek Fleet Command, MARVEL Strike Force, WWE Champions,
Stumble Guys, and Pokémon GO (via the September 2024 acquisition
of Niantic's games division for $3.5B which brought Pikmin Bloom
under the Scopely umbrella) across the mobile-games segment —
alongside competitors Zynga, Playtika, Activision Blizzard
(King), Supercell, and Niantic — with a hybrid distributed
workforce concentrated across Culver City, Barcelona, Madrid,
Mexico City, Tel Aviv, Bangalore, Seoul, Tokyo, and Remote across
the United States, Europe, the Middle East, and Asia-Pacific) —
publishes its consolidated careers board through Greenhouse at
the bare slug `scopely` (the lowercase concatenated single-word
brand; case-symmetric with the wire `company_name === 'Scopely'`)
and was confirmed live via run #297's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/scopely/jobs?content=true`
(170 open roles confirmed at run-297 start — including listings
under the `'Niantic'` and `'Playgami'` department-name banners,
which are wholly-owned operating divisions reflecting the post-
acquisition structure rather than separate Greenhouse tenants).
Scopely publishes its `absolute_url` on the **canonical Greenhouse
variant 2** shape `https://job-boards.greenhouse.io/scopely/jobs/<id>`
— same baseline shape used by 19 prior cohort plugins.

## 2. Goals

- Ship a `source-company-scopely` plugin returning live
  `JobPostDto` rows for the public Scopely careers board with
  **no caller config required**.
- Match the structural and behavioural shape of the existing
  `source-company-marqeta` plugin (Greenhouse-backed,
  `category: 'company'`, `Site.SCOPELY` enum value, `id`
  prefixed `scopely-`) — Marqeta is the closest behavioural
  cousin because both share **all five primary axes**: D-04
  variant 2 (canonical Greenhouse host), D-08 entity-decode-
  then-tag-strip, D-09 omitted with case-symmetric bare-brand
  wire form, D-10 applied (Scopely 17/170 padded ~10.0 %;
  Marqeta 2/33 padded ~6.1 %), and D-11 omitted (departments
  fully clean).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

**Cohort observation of note:** Scopely's wire title pad
distribution introduces **two new sub-axes under D-10**:
(1) **Second cohort observation of dual-pad on title axis** (2 of
170 — `' D2C Program Manager '`, `' Senior Performance Marketing
Manager '`) — the first observation was New Relic's run-295 single
dual-pad case (`" Account Executive - Commercial "`); Scopely is
the first cohort plugin where dual-pad appears in **multiple**
listings on the same board, lifting the dual-pad sub-axis from a
one-off to a recurring observation.
(2) **First cohort observation of multi-byte trailing pad** (1 of
170 — `'Senior Software Engineer - Pikmin Bloom   '` carries 3
trailing ASCII spaces). Distinct from prior single-trailing-pad
observations across the cohort.
(3) **First cohort observation of non-breaking-space (U+00A0) pad
byte** (1 of 170 — `'Senior Analytics Engineer '` carries a
trailing NBSP). Standard `String.prototype.trim()` already strips
all Unicode whitespace including U+00A0 — no implementation change
needed; the observation locks the NBSP-pad observable for future
regression guards.

**Zero structural deviations** from the Marqeta (Spec 084)
template — making this the **seventh** Greenhouse-only company-
direct plugin in run-history to ship as a clean re-spin (after
Coursera off Chime at run #278, Flexport off Faire at run #280,
Glossier off Flexport at run #282, Marqeta off Calendly at run
#294, and New Relic off Maven Clinic at run #295).

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Any locale / search-term / location filtering beyond what
  `source-company-marqeta` already supports.
- A dedicated salary parser pass.
- Backfilling historical Scopely postings.
- Cross-tagging listings under `'Niantic'` / `'Playgami'`
  department banners as separate `Site.NIANTIC` / `Site.PLAYGAMI`
  enums — the wire emits `company_name === 'Scopely'` for all 170
  listings, so the cohort convention is to ship them under
  `Site.SCOPELY`. (A future spec may carve out per-IP brand
  tagging if user-side use cases emerge.)

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.SCOPELY`** in the
> source registry, so that **a single `siteType: [Site.SCOPELY]`
> request returns Scopely's open roles without my code knowing
> the underlying ATS slug**.

> As a **plugin author**, I want **the second cohort observation
> of dual-pad on the title axis AND the first cohort observation
> of multi-byte trailing pad AND the first cohort observation of
> NBSP (U+00A0) pad** locked in regression tests, so that **future
> wire-side hygiene drift surfaces as a single test diff**.

> As a **circuit-breaker operator** (Spec 005), I want **per-
> source failure isolation for Scopely**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.SCOPELY = 'scopely'` to `packages/models/src/enums/site.enum.ts`.                       | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-scopely` under `packages/plugins/`.                 | must     |
| FR-3  | `ScopelyService.scrape(input)` returns a `JobResponseDto`; never throws.                          | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `scopely-`, `site === Site.SCOPELY`, and `companyName === 'Scopely'` (D-09 omitted; case-symmetric bare-brand wire — wire 7 bytes, slug 7 bytes; same shape as Marqeta/Calendly/DataCamp/Bitwarden/Lookout/Peloton). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/scopely.service.spec.ts`, all using mocked HTTP.       | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags.                | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (variant 2 — canonical Greenhouse host). Fallback uses the canonical Greenhouse variant-2 form `https://job-boards.greenhouse.io/scopely/jobs/<id>`. | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **applied** — 17 of 170 wire titles in the run-297 probe carry pad bytes (~10.0 % pad rate). Pad-form distribution: 2 leading-only, 12 trailing-only, 2 dual, 1 multi-byte trailing (3 spaces), 1 NBSP (U+00A0) trailing. The plugin applies `.trim()` to `listing.title` before downstream filters and emit; `String.prototype.trim()` strips all five sub-axes in a single call. | must     |
| FR-14 | Wire `departments[0].name` is **NOT** trimmed (D-11 omitted) — 0 of 170 wire department names in the run-297 probe carry pad bytes. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 170-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 10 MB resident on a 170-job page.                                     |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[ScopelyModule]})` resolves.    |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-scopely/src/scopely.service.ts
@SourcePlugin({ site: Site.SCOPELY, name: 'Scopely', category: 'company' })
@Injectable()
export class ScopelyService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/scopely/jobs?content=true`
exactly once per call.

### 7.2 Errors

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. The caller sees `{ jobs: [] }` (FR-9). |

## 8. Test Plan

- **Unit (`__tests__/scopely.service.spec.ts`):**
  1. NestJS DI resolves `ScopelyService` through `ScopelyModule`.
  2. `Site.SCOPELY === 'scopely'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s,
     including regression assertions for variant-2 URL byte-for-
     byte pass-through, decode-then-strip pipeline cleanliness,
     case-symmetric bare-brand wire `companyName === 'Scopely'`
     (D-09 omission lock; wire and slug both 7 bytes), **D-10
     application lock with single-trailing-padded form** —
     emitted `title` for the padded listing equals trimmed form
     `'Accounting Specialist'` AND byte-distinct from wire
     `'Accounting Specialist '` (trailing pad byte) AND exactly 1
     byte shorter (locking the trailing-pad observable).
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

- **D-01 (run #297):** Wrap Greenhouse public API.
- **D-02 (run #297):** Skip Harvest API code path.
- **D-03 (run #297):** No salary parser hook beyond helpers
  defaults — Scopely posts USD / EUR / GBP / ILS / INR / KRW /
  JPY / MXN ranges across global remote and hub roles; Spec 015
  covers all eight.
- **D-04 (run #297):** **Wire-shape variant 2 (canonical
  Greenhouse host).** Scopely publishes `absolute_url` on the
  canonical variant-2 shape `https://job-boards.greenhouse.io/scopely/jobs/<id>`.
  **Twentieth** plugin in the cohort to use variant 2.
- **D-05 (run #297):** Use Greenhouse slug `scopely`.
- **D-06 (run #297):** Class names are `ScopelyService` /
  `ScopelyModule` (PascalCase preserving the brand's bare-word
  capitalisation `Scopely`; matches the slug-derived
  PascalCase convention since the slug is single-word lowercase).
  The alphabetical sort key in `index.ts` and
  `ALL_SOURCE_MODULES` uses the slug-derived form `scopely`
  (between `ScaleaiModule` and `StitchfixModule` alphabetically;
  `Sca` < `Sco` < `Sti`).
- **D-07 (run #297):** Selected from the **fifth fresh probe
  sweep** live-board pool, alphabetically-ninth live-board hit
  (after Bitwarden #289, Calendly #290, DataCamp #291, Fivetran
  #292, Lookout #293, Marqeta #294, New Relic #295, Peloton #296).
- **D-08 (run #297):** Description-cleanup pipeline is
  `stripHtmlTags(decodeHtmlEntities(listing.content))`. **Forty-
  third** company-direct plugin to apply D-08.
- **D-09 (run #297):** Brand-name trim **omitted** with **case-
  symmetric bare-brand wire form**. Wire `company_name ===
  'Scopely'` byte-for-byte (7 bytes; slug `scopely` is 7 bytes —
  fully symmetric with the lowercase slug, no internal
  whitespace, no legal-entity suffix). Same shape as Marqeta /
  Calendly / DataCamp / Bitwarden / Lookout / Peloton. **Thirty-
  sixth cohort plugin to omit D-09**, returning to the cohort-
  default D-09-omitted posture. The plugin reads
  `listing.company_name` directly with `'Scopely'` as a
  defensive fallback. All 170 listings in the run-297 probe
  carry the wire `'Scopely'` form (including listings tagged
  under `departments[0].name === 'Niantic'` and `'Playgami'` —
  these are operating-division department names, not separate
  Greenhouse tenants; wire `company_name` is uniformly
  `'Scopely'`).
- **D-10 (run #297):** Wire-title `.trim()` deviation is
  **applied**. 17 of 170 wire titles in the run-297 probe carry
  pad bytes (~10.0 % pad rate). Pad-form distribution: 2
  leading-only (`' D2C Program Manager '`, `' Lead Product
  Manager – Growth (D2C)'`, `' Engineer_Monopoly GO'`, `'
  Senior Performance Marketing Manager '`), 12 trailing-only,
  2 dual (`' D2C Program Manager '`, `' Senior Performance
  Marketing Manager '`), 1 multi-byte trailing (`'Senior
  Software Engineer - Pikmin Bloom   '` — 3 trailing spaces),
  1 NBSP-trailing (`'Senior Analytics Engineer '` — U+00A0
  non-breaking space). **Twenty-third cohort plugin to apply
  D-10**. **Two new sub-axes under D-10:**
  (a) **First cohort observation of multi-byte trailing pad**
  (Pikmin Bloom listing carries 3 trailing ASCII spaces);
  (b) **First cohort observation of NBSP (U+00A0) pad byte**
  (Senior Analytics Engineer listing carries trailing NBSP).
  Standard `String.prototype.trim()` strips all five sub-axes
  in a single call (leading-only, trailing-only, dual, multi-
  byte trailing, NBSP-trailing) — no implementation change vs
  Marqeta. **Second cohort observation of dual-pad on title
  axis** (after New Relic's run-295 single dual-pad case).
- **D-11 (run #297):** Wire `departments[0].name` `.trim()`
  deviation is **omitted**. 0 of 170 wire department names in
  the run-297 probe carry pad bytes (`'Slate Development Group'`,
  `'MonopolyGo'`, `'Finance'`, `'People'`, `'Legal'`, `'Slate
  Portfolio'`, `'Publishing'`, `'Operations'`, `'Niantic'`,
  `'Live Games Portfolio'`, `'Corporate'`, `'Playgami'` — clean
  multi-token forms with internal whitespace; **the `'Niantic'`
  and `'Playgami'` department names are operating-division banners
  reflecting the post-acquisition structure**, not separate
  Greenhouse tenants — distinct from prior cohort plugins where
  department names were strictly role-domain names). **Thirty-
  third cohort plugin** with fully-clean department pass-through.
- **D-12 (run #297):** Ninth plugin in the fifth-fresh-sweep
  pool processing.
- **D-13 (run #297):** **Zero structural deviations** from the
  Marqeta (Spec 084) template. All five primary axes share with
  Marqeta: D-04 variant 2 (canonical Greenhouse host), D-08
  entity-decode-then-tag-strip, D-09 omitted with case-symmetric
  bare-brand wire form, D-10 applied (Scopely 17/170 ~10.0 % vs
  Marqeta 2/33 ~6.1 % — Scopely's posting hygiene slightly
  noisier across the larger board), D-11 fully-clean department
  pass-through. **Seventh** Greenhouse-only company-direct plugin
  in run-history to ship as a clean re-spin (after Coursera off
  Chime at run #278, Flexport off Faire at run #280, Glossier
  off Flexport at run #282, Marqeta off Calendly at run #294, and
  New Relic off Maven Clinic at run #295).

## 11. References

- `packages/plugins/source-company-marqeta/src/marqeta.service.ts` —
  closest behavioural cousin (zero structural deviations).
- `packages/plugins/source-company-newrelic/src/newrelic.service.ts` —
  precedent for dual-pad title observation under D-10.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path.
- `packages/common/src/utils/html-utils.ts` —
  `decodeHtmlEntities` + `stripHtmlTags` helpers (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog amended in this spec.
- `docs/PLUGIN_ARCHITECTURE.md` — four-file registration contract.
