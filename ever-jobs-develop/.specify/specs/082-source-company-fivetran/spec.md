# Spec: 082 — Source Company Plugin: Fivetran

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 082                                                                                                                                                                                            |
| Slug           | source-company-fivetran                                                                                                                                                                        |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #292)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..081                                                                                                                                                                        |

## 1. Problem Statement

Run #291's Spec 081 closed end-to-end (DataCamp shipped — first
cohort observation of leading-space pad on the department axis;
second cohort plugin to apply D-11). Run #292 picks up the
**fourth** live hit alphabetically from the fifth-fresh-sweep
candidate pool: **Fivetran** (173 roles confirmed at run-292
start — the run-289 probe-counter estimate of 346 was inflated
by counting all `"id":` JSON keys including department/office
IDs).

Fivetran — operator of the **dominant managed-data-pipeline ELT
platform pioneered around the automated data-replication-and-
transformation longitudinal-warehouse data model** (founded by
George Fraser and Taylor Brown in 2012 in Oakland, CA; raised
$728M+ across rounds led by Andreessen Horowitz, General
Catalyst, ICONIQ Growth, CEAS Investments, and D1 Capital
Partners at a peak $5.6B valuation in 2021; ships an automated
data-pipeline + Fivetran HVR enterprise-replication platform
across the modern-data-stack segment — alongside competitors
Stitch, Airbyte, Hevo Data, Matillion, and Talend — with a
hybrid distributed workforce concentrated across Oakland,
Denver, Bangalore, Dublin, and Remote across the United States,
Europe, and Asia-Pacific) — is published at the bare `fivetran`
Greenhouse slug (the lowercase brand name; case-symmetric with
the trimmed wire `company_name === 'Fivetran'`) and was confirmed
live via run #292's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/fivetran/jobs?content=true`
(173 open roles confirmed at run-292 start). Fivetran publishes
its `absolute_url` on a **previously-unobserved wire-shape
variant 19** — the `www.`-prefixed brand-domain singular
`/careers/job` query-only-id shape
`https://www.fivetran.com/careers/job?gh_jid=<id>` — making this
the **first** plugin in the cohort to use variant 19 — the
**twenty-second distinct wire-shape variant** in the company-
direct cohort.

**Critically — Fivetran is also the first cohort plugin where
the wire `company_name` itself carries pad bytes**: the wire
`'Fivetran '` (9 bytes) carries a single trailing ASCII-space
padding byte that the lowercase slug `fivetran` (8 bytes) does
not. **First cohort plugin to APPLY D-09** (`.trim()` on
`listing.company_name` before emit) — opening a brand-new sub-
axis under D-09 alongside the existing D-09 omission cases.

Aggregator-callers asking for "all jobs at major modern-data-
stack / managed-pipeline / ELT-platform vendors" must currently
either (a) deduce the Greenhouse slug `fivetran` and call
`source-ats-greenhouse` by hand, or (b) post-filter the firehose
of every Greenhouse-hosted role for a company-name match — both
paths bypass the per-source health and circuit-breaker plumbing
that the company-direct plugins sit behind (Spec 005).

The gap closes when we add a thin company-direct plugin pinning
the `fivetran` Greenhouse slug behind its own `Site` enum value,
in the identical shape the codebase already uses seventy times.

## 2. Goals

- Ship a `source-company-fivetran` plugin returning live
  `JobPostDto` rows for the public Fivetran careers board with
  **no caller config required**.
- Match the structural and behavioural shape of the existing
  `source-company-bitwarden` plugin (Greenhouse-backed,
  `category: 'company'`, `Site.FIVETRAN` enum value, `id`
  prefixed `fivetran-`) — Bitwarden is the closest structural
  cousin because both use a **non-Greenhouse-host wire shape
  with a Greenhouse variant-2 fallback**, both have the case-
  insensitively-equal slug/wire base form (Bitwarden case-
  symmetric `'Bitwarden'`/`bitwarden`; Fivetran case-symmetric-
  after-trim `'Fivetran '`→`'Fivetran'`/`fivetran`), both emit
  HTML-entity-encoded content requiring D-08, and both omit D-11
  (departments fully clean). Fivetran carries **two structural
  deviations** from the Bitwarden template — D-04 wire-shape
  variant 19 (first cohort plugin to use variant 19; distinct
  from Bitwarden's variant 18) AND **D-09 APPLIED for the first
  time in cohort history** (trim wire `company_name` to strip
  the trailing pad — distinct from every prior cohort plugin
  which omitted D-09 because their wires were clean).
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path
  + at least five failure / boundary modes against deterministic
  fixtures — **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Fivetran.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public
  board is sufficient.
- Any locale / search-term / location filtering beyond what
  `source-company-bitwarden` already supports.
- A dedicated salary parser pass — Spec 015 covers USD / INR /
  EUR ranges Fivetran posts.
- Backfilling historical Fivetran postings.
- Fivetran product-API / pipeline-config / connector-catalog
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.FIVETRAN`** in the
> source registry, so that **a single `siteType: [Site.FIVETRAN]`
> request returns Fivetran's open roles without my code knowing
> the underlying ATS slug**.

> As a **plugin author**, I want **the first proof-point of D-09
> APPLIED (`.trim()` on the wire `company_name`)**, so that
> **the existing `String.prototype.trim()` semantic — already
> proven for D-10 (titles) and D-11 (departments) — is also
> available for the brand-name axis when the wire is non-clean**.

> As a **circuit-breaker operator** (Spec 005), I want **per-
> source failure isolation for Fivetran**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.FIVETRAN = 'fivetran'` to `packages/models/src/enums/site.enum.ts`.                     | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-fivetran` under `packages/plugins/`.                | must     |
| FR-3  | `FivetranService.scrape(input)` returns a `JobResponseDto`; never throws.                         | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `fivetran-`, `site === Site.FIVETRAN`, and `companyName === 'Fivetran'` (8 bytes — the **trimmed** form of the wire `'Fivetran '` 9-byte trailing-space-padded value; D-09 applied — the plugin **trims** `listing.company_name` before emit, with `'Fivetran'` as a defensive fallback). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/fivetran.service.spec.ts`, all using mocked HTTP.    | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags (see § 10 D-08). | must    |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (preserving the variant-19 shape `https://www.fivetran.com/careers/job?gh_jid=<id>`); the **fallback** `jobUrl` constructor uses the canonical Greenhouse **variant-2** form `https://job-boards.greenhouse.io/fivetran/jobs/<id>` rather than reconstructing the bare-domain shape (same fallback strategy as ClassPass, Epic Games, fuboTV, Lattice, Stitch Fix, Udemy, and Bitwarden). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **omitted** — 0 of 173 wire titles in the run-292 probe carry pad bytes; the plugin emits `listing.title` byte-for-byte without a `.trim()`. | must     |
| FR-14 | Wire `departments[0].name` is **NOT** trimmed (D-11 omitted) — 0 of 172 populated wire department names in the run-292 probe carry pad bytes; the plugin emits `listing.departments[0].name` byte-for-byte. | must     |
| FR-15 | **D-09 APPLIED — wire `company_name` IS trimmed** — 173 of 173 wire `company_name` values in the run-292 probe carry a single trailing ASCII-space pad byte (`'Fivetran '`); the plugin applies `.trim()` to `listing.company_name` before emit so the emitted `companyName` is the 8-byte `'Fivetran'`. **First cohort plugin to apply D-09** — opening a new sub-axis under D-09 alongside the existing thirty-one D-09 omission cases. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 173-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 173-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[FivetranModule]})` resolves.    |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-fivetran/src/fivetran.service.ts
@SourcePlugin({ site: Site.FIVETRAN, name: 'Fivetran', category: 'company' })
@Injectable()
export class FivetranService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/fivetran/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `fivetran-${listing.id}`,
  site:         Site.FIVETRAN,
  title:        listing.title ?? '',                                  // D-10 omitted (clean wire)
  companyName:  (listing.company_name ?? 'Fivetran').trim(),          // D-09 APPLIED (first cohort)
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/fivetran/jobs/${listing.id}`,
  location:     locationStr ? new LocationDto({ city: locationStr }) : null,
  description:  listing.content ? stripHtmlTags(decodeHtmlEntities(listing.content)) : null,
  datePosted:   listing.updated_at ?? null,
  isRemote:     locationStr?.toLowerCase().includes('remote') ?? false,
  department:   listing.departments?.[0]?.name ?? null,               // D-11 omitted (clean wire)
}
```

### 7.2 Errors

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. The caller sees `{ jobs: [] }` (FR-9). |

## 8. Test Plan

- **Unit (`__tests__/fivetran.service.spec.ts`):**
  1. NestJS DI resolves `FivetranService` through `FivetranModule`.
  2. `Site.FIVETRAN === 'fivetran'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s,
     mapped fields verified (including the variant-19
     `www.fivetran.com/careers/job?gh_jid=<id>` shape pass-through
     lock — `www.`-prefixed singular `/careers/job` + single
     `gh_jid` query preserved byte-for-byte; AND fallback URL
     using the canonical Greenhouse variant-2 form
     `job-boards.greenhouse.io/fivetran/jobs/<id>`; the decode-
     then-strip pipeline cleanliness; **D-09 application lock**
     — emitted `companyName === 'Fivetran'` (8 bytes) AND
     byte-distinct from the wire `company_name === 'Fivetran '`
     (9 bytes) AND exactly 1 byte shorter — locking the trailing-
     pad-trim observable, **first cohort observation of D-09
     application**; the D-10 omission lock — wire-clean title
     pass-through; and the D-11 fully-clean department pass-
     through).
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive).
  6. `searchTerm` filters listings by department name (case-
     insensitive).
  7. HTTP 500 → `scrape` resolves to `{ jobs: [] }`, never throws.
  8. Empty `data.jobs` → `{ jobs: [] }`.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-01 (run #292):** Wrap Greenhouse public API rather than
  build a bespoke HTML scraper. Rationale: Fivetran's
  `https://www.fivetran.com/careers` careers landing page
  redirects buyers to a Greenhouse-hosted board.
- **D-02 (run #292):** Skip the Harvest API code path.
  Company-direct plugins stay thin (Spec 001 / FR-2).
- **D-03 (run #292):** No salary parser hook beyond helpers
  defaults — Spec 014 / 015 covers USD / EUR / INR.
- **D-04 (run #292):** **Wire-shape variant 19 — `www.`-prefixed
  brand-domain singular `/careers/job` query-only-id shape —
  first cohort observation.** Fivetran's tenant publishes its
  `absolute_url` on a **previously-unobserved**
  `https://www.fivetran.com/careers/job?gh_jid=<id>` shape
  (`www.fivetran.com` — `www.`-prefixed brand-domain, distinct
  from variant 13's bare `epicgames.com`, variant 15's bare
  `lattice.com`, and variant 18's bare `bitwarden.com`;
  `/careers/job` SINGULAR path — distinct from variant 13's
  `careers/jobs/<id>?gh_jid=<id>` plural-with-id-in-path,
  variant 16's `www.stitchfix.com/careers/jobs?gh_jid=<id>&gh_jid=<id>`
  plural-with-duplicate-query, and variant 18's
  `bitwarden.com/careers/<id>/?gh_jid=<id>` `<id>`-in-path-with-
  trailing-slash-and-query; single `gh_jid` query parameter —
  same single-query shape as variants 10, 12, 13, 14, 15, 17,
  18). This is the **first** plugin in the cohort to use **wire-
  shape variant 19** — the **twenty-second distinct wire-shape
  variant** in the company-direct cohort.

  The plugin emits `listing.absolute_url` byte-for-byte. The
  **fallback** `jobUrl` constructor defaults to the canonical
  Greenhouse **variant-2** form
  `https://job-boards.greenhouse.io/fivetran/jobs/<id>` rather
  than reconstructing the `www.`-prefixed bare-domain shape
  (same fallback strategy as ClassPass / Epic Games / fuboTV /
  Lattice / Stitch Fix / Udemy / Bitwarden).
- **D-05 (run #292):** Use Greenhouse slug `fivetran`. Confirmed
  via run #292's HTTP 200 probe (173 open roles).
- **D-06 (run #292):** Class names are `FivetranService` /
  `FivetranModule` (PascalCase from the lowercase slug). Same
  convention as `BitwardenService` / `LatticeService`.
- **D-07 (run #292):** Selected from the **fifth fresh probe
  sweep** live-board pool, alphabetically-fourth live-board hit
  (after `bitwarden` shipped at run #289, `calendly` at run #290,
  and `datacamp` at run #291). The remaining seven live hits
  queue for runs #293+ in alphabetical order: `lookout` (~12),
  `marqeta` (~330), `newrelic` (~370), `peloton` (~104),
  `scopely` (~1190), `squarespace` (~72), `typeform` (~132).
- **D-08 (run #292):** Description-cleanup pipeline is
  `stripHtmlTags(decodeHtmlEntities(listing.content))`.
  Fivetran's `content` is HTML-entity-encoded
  (`&lt;div class=&quot;content-intro&quot;&gt;&lt;p&gt;From
  Fivetran's founding until now, our mission has remained the
  same: to make access to data as simple and reliable as
  electricity...`). **Thirty-eighth** company-direct plugin in
  the cohort to use the entity-decode-then-tag-strip pipeline.
- **D-09 (run #292):** **APPLIED with trailing-pad form — first
  cohort observation of D-09 application.** Rationale:
  Fivetran's wire `company_name === 'Fivetran '` byte-for-byte
  (the single-token bare brand name **with a single trailing
  ASCII-space pad byte**; 9 bytes total). The slug `fivetran` is
  8 bytes — slug/wire-asymmetric, wire LONGER than slug by 1
  byte (the trailing space). **All 173 of 173 wire
  `company_name` values in the run-292 probe carry the trailing
  pad** (100 % pad rate) — this is a systematic upstream
  pattern, not a one-off typo. The plugin applies `.trim()` to
  `listing.company_name` before emit so the emitted
  `companyName` is the 8-byte `'Fivetran'`.

  **First cohort plugin to apply D-09** — opening a brand-new
  sub-axis under D-09 alongside the existing thirty-one D-09
  omission cases. Distinct from prior slug/wire asymmetry cases
  which all preserved the wire byte-for-byte (Honeycomb wire 12
  bytes vs slug 9 bytes — TLD suffix preserved; MasterClass
  wire 11 bytes vs slug 11 bytes — case difference preserved;
  Maven Clinic wire 12 bytes vs slug 11 bytes — internal space
  preserved; Stitch Fix wire 10 bytes vs slug 9 bytes — internal
  space preserved). Fivetran is the first cohort case where the
  slug/wire asymmetry is **noise (whitespace pad) rather than
  signal (TLD / case / internal-space)** — so the plugin trims
  rather than preserving.

  The plugin reads `listing.company_name` directly with
  `'Fivetran'` (no trailing space) as a defensive fallback,
  applies `.trim()` to the result; if Greenhouse fixes the
  trailing pad upstream, the trim becomes a no-op on the clean
  wire data. The unit-test happy path locks this observable via
  byte-distinct + 1-byte-shorter assertions against the wire
  `'Fivetran '` form.
- **D-10 (run #292):** Wire-title `.trim()` deviation is
  **omitted**. 0 of 173 wire titles in the run-292 probe carry
  whitespace padding. **Fourteenth cohort plugin to omit D-10**.
- **D-11 (run #292):** Wire `departments[0].name` `.trim()`
  deviation is **omitted**. 0 of 172 populated wire department
  names in the run-292 probe carry pad bytes (one listing has
  empty `departments`, the optional-chain emits `null`).
  Departments mostly carry a `' Department'` suffix in the wire
  (`'Sales Department'`, `'Engineering Department'`, etc.) but
  this is structural data shape, not pad bytes — pass-through
  preserves it byte-for-byte. **Twenty-eighth cohort plugin**
  with fully-clean department pass-through.
- **D-12 (run #292):** This plugin is the **fourth** in the
  fifth-fresh-sweep live-board pool processing.
- **D-13 (run #292):** **Two structural deviations** from the
  Bitwarden (Spec 079) template — D-04 wire-shape variant 19
  (first cohort plugin to use variant 19; distinct from
  Bitwarden's variant 18) AND **D-09 APPLIED** (first cohort
  plugin to apply D-09; distinct from Bitwarden's D-09 omitted
  with case-symmetric clean wire). All other axes share with
  Bitwarden: D-08 entity-decode-then-tag-strip, D-10 omitted
  (Fivetran 0/173 padded; Bitwarden 1/11 padded — Fivetran's
  posting hygiene cleaner on titles), D-11 fully-clean
  department pass-through.

## 11. References

- `packages/plugins/source-company-bitwarden/src/bitwarden.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct,
  shipped Spec 079 / run #289; same D-08 + D-10 omitted + D-11
  omitted axes; deviates on D-04 variant 18 vs Fivetran's variant
  19, and D-09 omitted vs Fivetran's APPLIED).
- `packages/plugins/source-company-lattice/src/lattice.service.ts` —
  prior new-variant cohort plugin (Spec 074; first cohort plugin
  to apply D-11 with trailing-pad — analogous to Fivetran's
  first-cohort D-09 application; same fallback strategy).
- `packages/plugins/source-company-datacamp/src/datacamp.service.ts` —
  immediate predecessor in fifth-sweep pool (Spec 081; first
  cohort plugin to apply D-11 with leading-pad).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
  — full Greenhouse adapter for the authenticated path.
- `packages/common/src/utils/html-utils.ts` —
  `decodeHtmlEntities` + `stripHtmlTags` helpers (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog amended in this spec.
- `docs/PLUGIN_ARCHITECTURE.md` — four-file registration contract.
