# Spec 013 — ATS-Scrapers Parity, Batch 2 (Oracle HCM Cloud / Mercor / Tesla)

| Field          | Value                                                |
| -------------- | ---------------------------------------------------- |
| Spec ID        | 013                                                  |
| Slug           | ats-scrapers-parity-batch-2                          |
| Status         | All phases done (T01..T15 runs #44..#58); spec complete |
| Owner          | scheduled-task agent (`ever-jobs`)                   |
| Created        | 2026-04-27 (run #43)                                 |
| Last updated   | 2026-04-28 (run #58)                                 |
| Supersedes     | (none)                                               |
| Related specs  | 001 (Plugin Architecture Foundation), 003 (Dedup Engine), 005 (Circuit Breaker), 006 (ATS-Scrapers Parity, Batch 1) |

## 1. Problem Statement

The hourly competitor-watch backlog (`/competitor-watch.md §C`) lists nine
follow-up actions (AC-1..AC-9) accumulated across thirty-plus scheduled
runs. Spec 006 closed AC-1..AC-3 (Avature / Gem / Join.com) as a single
batched spec. Spec 012 closed AC-7 (European salary parser). The remaining
upstream-driven coverage gaps are AC-4..AC-6 — three new ATS / sourcing
platforms that exist in the upstream OSS reference codebase
(`OTHERS/Ats-scrapers/<vendor>/`) but not in our `packages/plugins/`
catalogue:

- **AC-4 — Oracle HCM Cloud (Oracle Recruiting Cloud).** Enterprise-grade
  multi-tenant ATS used by Oracle, City of Atlanta, TTX, EXP,
  CooperCompanies, Kroll, etc. URL pattern
  `https://{subdomain}.fa.{region}.oraclecloud.com`. Fetch path is the
  HCM CandidateExperience REST API
  (`/hcmRestApi/resources/latest/recruitingCEJobRequisitions`) with a
  finder-query string — same flavour as Workday's multi-tenant URL
  discovery, fits cleanly into the existing `IScraper` shape.
- **AC-5 — Mercor.** Single-tenant explore page at
  `https://work.mercor.com/`; one GET to
  `https://aws.api.mercor.com/work/listings-explore-page` returns ALL
  current public listings (no per-company segmentation, no pagination).
  Authorization header is a literal `Bearer` (empty token) per the
  upstream client. Different shape from any existing plugin: it is
  **catalogue-wide** rather than slug-keyed.
- **AC-6 — Tesla.** Single-company custom careers site at
  `https://www.tesla.com/careers/search/`. Internal API at
  `/cua-api/apps/careers/state` (board) and `/cua-api/careers/job/{id}`
  (detail). Akamai Bot Manager challenges are present; the upstream
  Python uses Playwright with a real Chromium session to bypass them.
  Different shape from any existing plugin: it is **single-tenant** AND
  **browser-automation-flavoured**, not pure HTTP.

Bundling AC-4..AC-6 into a single spec mirrors Spec 006's pattern (per
Q-024's "future bundled batch" line and run #42's pinned default) and
keeps the cold-start boot-time amortisation cost flat (one
`ALL_SOURCE_MODULES` rebuild, one lockfile sync round, one CI matrix
expansion). Even with their differing shapes, the three plugins share
the same registration topology (`Site` enum + `ALL_SOURCE_MODULES` +
two-place tsconfig+jest aliases per Spec 001) and the same authoring
rhythm (slug-or-URL-driven aggregator dispatch via
`/api/jobs?…&site=<key>`).

## 2. Goals

- Ship three new source plugins under `packages/plugins/`:
  - `source-ats-oracle` — REST GET against the multi-tenant
    `recruitingCEJobRequisitions` finder, paginated via
    `?offset=N&limit=100`. Custom-domain resolution from `companyUrl`
    (e.g. `https://eeho.fa.us2.oraclecloud.com`) with a default
    `siteNumber` of `CX_45001` (per Q-030).
  - `source-ats-mercor` — single GET to the explore-page endpoint;
    returns the entire public catalogue. Filter by `companySlug` /
    `searchKeywords` post-fetch (per Q-029).
  - `source-tesla` — Tesla single-company scraper. Pure-HTTP path by
    default (calls `/cua-api/apps/careers/state` directly with rotated
    UA + `Accept: application/json`); Playwright fallback gated behind
    a separate optional plugin package (`source-tesla-playwright`)
    that adds Akamai-bypass via lazy `import()` (per Q-028).
- Each plugin honours `ScraperInputDto.proxies / .caCert /
  .requestTimeout` via `@ever-jobs/common`'s `createHttpClient` (per
  Spec 001's HTTP-client mandate).
- Each plugin emits standard `JobPostDto` rows: `title / company /
  location / description / url / postedAt` — same shape Greenhouse,
  Lever, Workday, Avature, Gem, Join.com already produce.
- Each plugin registers in **all four** required places (per
  `AGENTS.md §5`): `site.enum.ts`, `packages/plugins/index.ts`,
  `tsconfig.base.json`, `jest.config.js`.
- Each plugin has **at least one** happy-path unit test under
  `__tests__/<plugin-id>.service.spec.ts` (per `AGENTS.md §7`).

## 3. Non-Goals

- **Hard parity with the Python upstream's CLI / discovery scripts.**
  We adopt the SCRAPER LOGIC, not the bundled
  `searxng_discovery.py` / `firecrawl_discovery.py` / SerpAPI tooling
  — discovery in Ever Jobs is the `PluginRegistry` itself (per
  `competitor-watch.md §D`). Same boundary as Spec 006.
- **Job-detail scraping for Oracle / Mercor.** Both expose richer
  per-job detail endpoints (Oracle's `recruitingCEJobRequisitionDetails`
  finder, Mercor's listing-by-id). Detail-fetch is deferred to a
  future spec (candidate Spec 016 — "ATS detail-page enrichment",
  same line listed in Spec 006 / § 3 carry-over). Tesla's detail
  endpoint is exercised in this spec only because Tesla's board
  endpoint emits `description = ""` for most jobs and the detail
  endpoint is the only way to populate `JobPostDto.description`.
- **Akamai bot-bypass in the default Tesla plugin.** The default
  `source-tesla` plugin SHALL attempt the pure-HTTP path. The
  Playwright-based fallback ships behind an OPTIONAL companion
  plugin `source-tesla-playwright` (per Q-028 default A). Operators
  must opt into the heavyweight Chromium dep explicitly.
- **Mercor authenticated-session flow.** Mercor's private listings
  (paid candidate dashboard) require a real candidate JWT. Public
  explore-page endpoint is unauthenticated by upstream design;
  no candidate-auth flow ships in this batch.
- **Oracle event search.** The upstream `recruitingCEEvents` finder
  is out of scope — Ever Jobs is a job-search engine, not an
  events board. Skipped intentionally.
- **AC-8 / AC-9.** Out of scope; remaining backlog items deferred
  to subsequent specs (AC-8 → Spec 014 candidate; AC-9 → Spec 015
  candidate; revisit after Spec 013 ships).
- **Q-026 / Q-027 salary parser residuals.** Renamed to **Spec 014
  candidate** — they were tentatively flagged "Spec 013" in the
  Q-026/Q-027 default text written in run #41, but run #42's
  Notes-for-the-next-run pinned Spec 013 to AC-4..AC-6 explicitly.
  The salary residuals will receive their own spec under Spec 014
  (or absorbed into the next pending currency-domain spec, whichever
  runs first).

## 4. User / Caller Stories

- *As a job-seeker dashboard*, I want to query
  `GET /api/jobs?site=oracle&companyUrl=https%3A%2F%2Feeho.fa.us2.oraclecloud.com&limit=50`
  and get a paginated list of Oracle's open roles via the HCM REST
  API.
- *As an operator*, I want a per-source breaker on each of the three
  plugins (Spec 005 / FR-1) so a Mercor 502 doesn't degrade the
  Oracle / Tesla fan-out.
- *As a downstream consumer*, I want each plugin's `JobPostDto.company`
  field populated correctly even when the upstream payload encodes the
  company differently (Oracle: `requisitionList[].EmployerName`;
  Mercor: `companyName`; Tesla: literal `'Tesla'`).
- *As a plugin author*, I want a small per-plugin
  `getCircuitBreakerPolicy()` override option for known-flaky Oracle
  tenants without forking the whole service (Spec 005 / FR-3).
- *As a security-conscious operator*, I want the Tesla plugin to NOT
  ship Playwright by default — Chromium adds ~280 MB to the install
  surface and one process boundary to harden. The Playwright-flavoured
  `source-tesla-playwright` plugin must be opt-in.

## 5. Functional Requirements

| ID     | Requirement                                                                                            | Priority |
| ------ | ------------------------------------------------------------------------------------------------------ | -------- |
| FR-1   | New plugin `source-ats-oracle` implements `IScraper` and exposes `Site.ORACLE = 'oracle'`.            | must     |
| FR-2   | `source-ats-oracle` paginates via `?offset=N&limit=100` against `recruitingCEJobRequisitions` until `requisitionList[]` empty OR `resultsWanted` cap hit. | must |
| FR-3   | `source-ats-oracle` accepts both `companyUrl` (full URL like `https://eeho.fa.us2.oraclecloud.com`) AND a `companySlug` interpreted as `<subdomain>-<region>` (e.g. `eeho-us2`) → URL composition `https://<subdomain>.fa.<region>.oraclecloud.com`. | must |
| FR-4   | `source-ats-oracle` accepts an optional `siteNumber` field on the input DTO (default `CX_45001`); used in the finder string `siteNumber=<value>`. | must |
| FR-5   | New plugin `source-ats-mercor` implements `IScraper` and exposes `Site.MERCOR = 'mercor'`.            | must     |
| FR-6   | `source-ats-mercor` issues exactly ONE GET to `https://aws.api.mercor.com/work/listings-explore-page` per call; consumes the response's `listings[]` array. | must |
| FR-7   | `source-ats-mercor` post-filters `listings[]` by `companySlug` (case-insensitive substring on `companyName`) when supplied; otherwise emits the full catalogue, capped by `resultsWanted`. | must |
| FR-8   | `source-ats-mercor` sets the literal `Authorization: Bearer` header (empty token) on every request, mirroring the upstream Python client. | must |
| FR-9   | New plugin `source-tesla` implements `IScraper` and exposes `Site.TESLA = 'tesla'`. Pure-HTTP path; no Playwright dep. | must |
| FR-10  | `source-tesla` calls `GET https://www.tesla.com/cua-api/apps/careers/state` with rotated UA + `Accept: application/json` headers; consumes `data.lookup.listings[]` → `JobPostDto[]`. | must |
| FR-11  | `source-tesla` issues a follow-up `GET https://www.tesla.com/cua-api/careers/job/{id}` for the **first ≤ 25 jobs** (capped by `resultsWanted`) to populate `JobPostDto.description`; remaining jobs get `description: null` (per Q-031). | should |
| FR-12  | `source-tesla` returns an empty `JobResponseDto` (NOT throws) when the board endpoint returns 403 / 503 / Akamai HTML — operator can install the optional `source-tesla-playwright` plugin to add the bypass path. | must |
| FR-13  | New OPTIONAL plugin `source-tesla-playwright` exposes `Site.TESLA_PLAYWRIGHT = 'tesla_playwright'`. Lazy-imports `playwright` at first `scrape()` call so the cold-start cost stays out of the default install. | should |
| FR-14  | All three default plugins register in `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`, `tsconfig.base.json` (paths), and `jest.config.js` (moduleNameMapper). | must     |
| FR-15  | All three default plugins use `@ever-jobs/common` `createHttpClient` so `proxies / caCert / requestTimeout` flow through correctly. | must     |
| FR-16  | All three default plugins respect `input.resultsWanted` (default `100`) and stop fetching once the cap is reached. | must     |
| FR-17  | All three default plugins produce `JobPostDto` with at minimum: `title`, `company`, `location` (string), `url`, `postedAt` (when available — Oracle and Tesla expose it; Mercor does not). | must |
| FR-18  | Each default plugin ships a `<plugin>.service.spec.ts` with at least three cases: happy-path parsing, empty-board guard, error-tolerance (HTTP 500 / 403 / 503 returns empty `JobResponseDto`, never throws). | must     |
| FR-19  | Each default plugin documents its scrape-input contract in a sibling JSDoc block on the `@SourcePlugin({…})` decorator AND in the `ATS_INTEGRATIONS.md` matrix. | should   |
| FR-20  | Each default plugin is dedup-engine-friendly: its emitted `JobPostDto.id` (or `(site, externalId)` tuple) is stable across reruns so the `dedup-hybrid` strategy can collapse identical postings (Spec 003 / FR-1). | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                                                                | Target            |
| ------ | ------------------------------------------------------------------------------------------ | ----------------- |
| NFR-1  | Per-plugin cold-start contribution to module-graph init (default plugins only)            | < 25 ms           |
| NFR-2  | `scrape()` p95 latency, single company, default `resultsWanted=100`, no proxy             | Oracle < 6 s; Mercor < 1.5 s; Tesla (HTTP-only path, board only) < 3 s; Tesla (HTTP + ≤25 detail fetches) < 12 s |
| NFR-3  | Per-plugin memory ceiling (`maxResults=100`)                                               | < 8 MB transient  |
| NFR-4  | Bundle weight per default plugin (NestJS module + service + types + constants)             | < 25 KB minified  |
| NFR-5  | Default circuit-breaker policy (Spec 005 / DEFAULT_CIRCUIT_POLICY)                         | inherited; no override unless evidence of flakiness (Tesla's HTTP path is the most likely candidate to need a tighter trip) |
| NFR-6  | `source-tesla-playwright` cold-start cost                                                  | unbounded (deferred via lazy `import()`); MUST NOT contribute to default-plugin cold-start |

## 7. Contracts

### 7.1 Plugin Surfaces

```ts
// packages/models/src/enums/site.enum.ts (additions)
export enum Site {
  // … existing values …
  ORACLE             = 'oracle',
  MERCOR             = 'mercor',
  TESLA              = 'tesla',
  TESLA_PLAYWRIGHT   = 'tesla_playwright', // optional, ships off by default
}

// Per-plugin service shape (uniform across the three default plugins)
@SourcePlugin({ site: Site.ORACLE, name: 'Oracle HCM Cloud', category: 'ats', isAts: true })
@Injectable()
export class OracleService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}

@SourcePlugin({ site: Site.MERCOR, name: 'Mercor', category: 'ats', isAts: true })
@Injectable()
export class MercorService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}

@SourcePlugin({ site: Site.TESLA, name: 'Tesla', category: 'company', isAts: false })
@Injectable()
export class TeslaService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}

// Optional companion (NOT in ALL_SOURCE_MODULES by default; opt-in via env / config)
@SourcePlugin({ site: Site.TESLA_PLAYWRIGHT, name: 'Tesla (Playwright)', category: 'company', isAts: false })
@Injectable()
export class TeslaPlaywrightService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 ScraperInputDto fields consumed (subset)

| Field                     | Oracle | Mercor | Tesla | Tesla-Playwright | Notes |
| ------------------------- | :----: | :----: | :---: | :--------------: | ----- |
| `companySlug`             | ✓ (`<subdomain>-<region>` form) | ✓ (post-filter) | — (single tenant) | — | Mercor: case-insensitive substring on `companyName` |
| `companyUrl`              | ✓ (full Oracle URL override) | — | — | — | Oracle: precedence over `companySlug` |
| `siteNumber` (NEW)        | ✓ (default `CX_45001`)       | — | — | — | finder-string parameter |
| `resultsWanted`           | ✓      | ✓      | ✓     | ✓                | default 100 |
| `descriptionFormat`       | ✓ (md/html/text) | ✓ | ✓ | ✓ | optional |
| `proxies / caCert / requestTimeout` | ✓ | ✓ | ✓ | ✓ | per Spec 001 HTTP-client mandate |

### 7.3 Errors

| Code                              | Meaning                                                       |
| --------------------------------- | ------------------------------------------------------------- |
| `ERR_ORACLE_BAD_TENANT`           | Oracle: subdomain/region could not be resolved to a careers URL. |
| `ERR_ORACLE_FINDER_REJECTED`      | Oracle: finder-string returned 4xx (typically a bad `siteNumber`). |
| `ERR_MERCOR_ENVELOPE`             | Mercor: explore-page response missing `listings[]` array.     |
| `ERR_TESLA_AKAMAI_CHALLENGE`      | Tesla: board endpoint returned 403 / 503 / Akamai HTML body — install `source-tesla-playwright` for bypass. |
| `ERR_TESLA_PLAYWRIGHT_UNAVAILABLE`| Tesla-Playwright: `playwright` dep not installed at runtime.  |

(All five are caught and converted to an empty `JobResponseDto` per
`AGENTS.md §10` "Tests required" — never re-thrown to the aggregator.
The aggregator's circuit breaker counts the empty result as success
unless an upstream HTTP error bubbled, which the breaker independently
records.)

## 8. Test Plan

### 8.1 Unit (per plugin, under `packages/plugins/source-(ats-oracle|ats-mercor|tesla|tesla-playwright)/__tests__/`)

- **Happy path** — fixture HTML/JSON loaded from
  `__tests__/fixtures/<id>-page-1.{html,json}`; assert `JobPostDto[]`
  count, sample `title` / `company` / `url`.
- **Empty board** — empty `requisitionList[]` / `listings: []` /
  `lookup.listings: []`; assert empty `JobResponseDto` returned.
- **HTTP 500 error** — mocked `axios` throws; assert empty
  `JobResponseDto`, no exception bubbles.
- **`resultsWanted` cap** — fixture w/ ≥ 200 jobs, `resultsWanted: 50`;
  assert exactly 50 emitted, no extra page fetched.
- **Oracle only** — custom-tenant URL override via `companyUrl` input
  (`https://eeho.fa.us2.oraclecloud.com`); assert URL composition.
- **Oracle only** — custom `siteNumber` override (`CX_45002`); assert
  finder string carries the override.
- **Mercor only** — `companySlug` post-filter (`stripe`); assert only
  rows with `companyName` matching `stripe` (case-insensitive
  substring) survive.
- **Mercor only** — empty `companySlug` returns full catalogue
  (capped by `resultsWanted`).
- **Tesla only** — Akamai 403 sentinel response; assert empty
  `JobResponseDto` + sentinel error code recorded in service-internal
  metric.
- **Tesla only** — happy-path board fixture (≥ 50 jobs) + first
  3 detail-fetch responses; assert `description` populated for first
  3 only (FR-11), remaining `description === null`.
- **Tesla-Playwright only** — happy-path: stubbed `playwright` module
  resolves to a fixture-driven page; assert `JobPostDto[]` count
  matches fixture.
- **Tesla-Playwright only** — `playwright` module not installed
  (`require('playwright')` throws); assert
  `ERR_TESLA_PLAYWRIGHT_UNAVAILABLE` sentinel + empty `JobResponseDto`.

### 8.2 Integration (`apps/api/__tests__/integration/`)

- **`source-ats-batch-2.integration.spec.ts`** — wire all three
  default plugins (Oracle / Mercor / Tesla) through the live
  `JobsService` fan-out; assert each contributes ≥ 1 row from a
  stubbed-`createHttpClient` fixture. Verifies the four-place
  registration is correct. Tesla-Playwright is NOT included in
  this suite (default `ALL_SOURCE_MODULES` doesn't import it).

### 8.3 E2E (`apps/api/__tests__/e2e/`)

- **`source-ats-batch-2.e2e-spec.ts`** —
  `GET /api/jobs?site=oracle&companyUrl=…`,
  `&site=mercor&companySlug=stripe`,
  `&site=tesla` return `200 OK` + non-empty `JobPostDto[]` against a
  sandboxed fixture server. Asserts dedup-engine consumes the rows
  without collisions across the three plugins.

### 8.4 Performance

- Each default plugin's `scrape()` benchmark
  (`__tests__/<id>.bench.ts`) asserts NFR-2 ceilings against the
  `__tests__/fixtures/` corpus. Bench ships in this spec; CI gating
  is a follow-up.

## 9. Open Questions

- **Q-024** (resolved by this spec) — Spec packaging: 1 batched spec
  vs 3 per-plugin specs? **Default = batched, this spec.** Same
  rationale as Spec 006 / Q-021 — the per-plugin business logic is
  small (single REST GET for Mercor, REST + finder-string for Oracle,
  HTTP + 25 detail fetches for Tesla), so three independent specs
  would be 90% scaffolding noise.
- **Q-028** — Tesla Playwright dependency strategy. See
  `docs/questions.md` Q-028 (default = A: ship pure-HTTP `source-tesla`
  by default; Playwright bypass behind opt-in `source-tesla-playwright`
  companion plugin with lazy `import('playwright')`).
- **Q-029** — Mercor's catalogue-wide input semantics (no `companySlug`
  segmentation upstream). See `docs/questions.md` Q-029 (default =
  post-filter on `companySlug` after the single GET; empty slug returns
  full catalogue capped by `resultsWanted`).
- **Q-030** — Oracle `siteNumber` override default. See
  `docs/questions.md` Q-030 (default = `CX_45001`, the upstream
  Python's literal default).
- **Q-031** — Tesla detail-fetch budget (per-job description fetch
  is N+1 from the perspective of the board endpoint; cap at 25
  follow-ups). See `docs/questions.md` Q-031 (default = 25; tunable
  via `ScraperInputDto.descriptionDepth: 'board' | 'detail-25' |
  'detail-all'` with `'detail-25'` the default).

## 10. Decisions

- **2026-04-28 (run #58 / T15)** — **Spec 013 closeout — `All
  phases done (T01..T15 runs #44..#58); spec complete`.** Three
  ATS-Scrapers Parity Batch-2 plugins shipped end-to-end across
  fifteen tasks and seven phases over fifteen consecutive
  scheduled runs:

  - **Phase 1 — Bootstrap** (runs #44 + #45): Site enum +
    tsconfig + jest mapper + DTO extensions (T01); four plugin
    package scaffolds with three appended to `ALL_SOURCE_MODULES`
    (`Site.TESLA_PLAYWRIGHT` deliberately excluded per FR-13)
    (T02).
  - **Phase 2 — Oracle HCM Cloud** (runs #46 + #47):
    `OracleService.scrape(input)` REST + finder-string
    implementation against `recruitingCEJobRequisitions` (T03);
    10-case behavioural unit-test sweep + sanitised `eeho-us2`
    fixture (T04).
  - **Phase 3 — Mercor** (runs #48 + #49):
    `MercorService.scrape(input)` single-GET catalogue-wide
    implementation against `/work/listings-explore-page` with
    literal `Authorization: Bearer` empty-token header (T05);
    11-case unit sweep + 50-listing × 12-company fixture (T06).
  - **Phase 4 — Tesla** (runs #50 + #51): `TeslaService.scrape(input)`
    HTTP-only board + detail implementation with broadened
    Akamai detection (any non-`{listings,lookup}` payload triggers
    sentinel) (T07); 14-case unit sweep + 50-listing × 6-location
    × 5-department board fixture + four detail envelopes (T08).
  - **Phase 5 — Tesla-Playwright (OPTIONAL companion)** (runs
    #52 + #53): `TeslaPlaywrightService.scrape(input)`
    lazy-Playwright via `Function('s','return import(s)')`
    indirection; three-sentinel error model
    (`UNAVAILABLE` / `NAV_FAILED` / `FETCH_FAILED`); browser
    always closed in `finally` (T09); 10-case behavioural sweep
    via `jest.spyOn(loadPlaywright)` boundary mock (T10).
  - **Phase 6 — Integration & Docs** (runs #54..#57): three-
    plugin integration spec with `Site.TESLA_PLAYWRIGHT`
    absence guard (T11); three-plugin e2e spec via supertest
    HTTP layer (T12); coverage docs in `ATS_INTEGRATIONS.md` +
    `COMPANY_SLUG_DIRECTORY.md` (T13); performance benches with
    NFR-2 ceiling pins (Oracle < 6 s / Mercor < 1.5 s / Tesla
    < 12 s) (T14).
  - **Phase 7 — Closeout** (run #58): this entry.

  **Five questions resolved during the spec lifecycle:**
  Q-028 (Tesla Playwright dep strategy = pure-HTTP default +
  opt-in companion plugin) graduated implementation-ratified
  at run #50 / T07. Q-029 (Mercor catalogue-wide input
  semantics = empty-slug full / populated-slug post-filter)
  ratified at run #48 / T05. Q-030 (Oracle `siteNumber`
  default = `'CX_45001'`) ratified at run #46 / T03. Q-031
  (Tesla `descriptionDepth` default = `'detail-25'` cap of 25)
  ratified at run #50 / T07. Q-032 (cross-plugin dedup strategy
  = emit under `Site.TESLA_PLAYWRIGHT`, dedup-engine collapses
  cross-site duplicates via `externalId`) ratified at run #52
  / T09.

  **Seven cross-cutting design decisions** (carried forward
  from per-run § 10 entries — full prose remains in each run's
  entry below):
  - Three sentinel-code pairs adopted symmetrically across
    Oracle / Mercor / Tesla / Tesla-Playwright:
    `<plugin>_BAD_TENANT|ENVELOPE` (semantic shape failure) +
    `<plugin>_FETCH_FAILED|FINDER_REJECTED|AKAMAI_CHALLENGE`
    (network / wire failure). Original spec text named only
    one sentinel per plugin; the second-sentinel additions
    proved necessary symmetry during implementation.
  - Wire-format divergences from spec.md prose at three
    plugin boundaries (Oracle finder-string comma+semicolon
    split per upstream Python; Tesla board envelope path
    `listings[]` at top level, NOT `data.lookup.listings[]`;
    Mercor `Origin`/`Referer` headers required by gateway
    even though FR-8 named only `Authorization: Bearer`).
    Each divergence documented in spec.md § 10 + the
    corresponding plugin's `*.constants.ts` + the relevant
    test's wire-format-pin assertion.
  - Two implementation tricks for ts-jest friction:
    (1) `Function('s','return import(s)')` for the optional
    `playwright` dep; (2) `jest.spyOn(loadPlaywright)` for the
    Playwright-mock boundary (lazy-import indirection defeats
    Jest's hoisted `jest.mock` system).
  - Description-budget map (`board:0` / `detail-25:25` /
    `detail-all:Infinity`) shared between `source-tesla` and
    `source-tesla-playwright` (locally duplicated rather than
    cross-imported per AGENTS.md §5 "no peer plugin imports").
  - Compensation mapping included on initial Mercor
    implementation rather than deferred to detail-page
    enrichment, since the explore-page envelope already
    carries `rateMin` / `rateMax` / `payRateFrequency`.
  - Tesla single-tenant slug treatment: documented as a single
    `tesla` entry in `COMPANY_SLUG_DIRECTORY.md` (per-plugin
    clarification overrides the umbrella "≥ 10 seed slugs"
    line in tasks.md / T13).
  - `Site.TESLA_PLAYWRIGHT` absence guard added to T11's
    integration spec — fires loudly in CI if a future
    contributor accidentally appends `TeslaPlaywrightModule`
    to `ALL_SOURCE_MODULES`.

  **Closeout deliverables shipped this run:**
  - Status field on this spec flipped to "All phases done
    (T01..T15 runs #44..#58); spec complete".
  - `competitor-watch.md §C` rows AC-4 / AC-5 / AC-6 marked
    **DONE (runs #44..#58)** with ✅ glyph in the Owner
    column.
  - `docs/index.md` Spec 013 row updated to mirror the
    spec.md status field.
  - `docs/log.md` closeout entry under run #58 heading.
  - tasks.md T15 row flipped from `[ ]` to `[x]`;
    Notes-for-the-next-run pinned to **Spec 014** = Q-026 /
    Q-027 salary-parser residuals (chosen over AC-8 due to
    upstream signal asymmetry — 41 consecutive zero-churn
    runs in `OTHERS/` mean AC-8's "refresh from CSVs"
    carries no fresh signal, while Q-026 / Q-027 have
    remained open with documented defaults since Spec 012 /
    T04 at run #41 and represent a known parser-correctness
    gap). AC-8 deferred to Spec 015; AC-9 to Spec 016; ATS
    detail-page enrichment (Spec 006 / Spec 013 § 3
    non-goals carry-over) renumbered to Spec 017.

  **Forty-second consecutive zero-churn run in `OTHERS/`** —
  Ats-scrapers @ `3bacd6e`, JobSpy @ `fda080a`, Jobspy-api @
  `26bb6f4`. The closeout pass introduces no new questions.

- **2026-04-28 (run #57 / T14)** — Performance benches landed under
  each plugin's `__tests__/` directory: `oracle.bench.ts` /
  `mercor.bench.ts` / `tesla.bench.ts` (≈ 175–185 LOC each, +43 net
  LOC vs. the Spec 006 / T12 batch-1 trio because Tesla's URL-keyed
  fixture router is structurally richer than Avature's page-1 / page-
  empty pair). Plus four new npm scripts (`bench:oracle`,
  `bench:mercor`, `bench:tesla`, `bench:ats-batch-2`) appended after
  the existing `bench:ats-batch-1` chain. Two load-bearing authoring
  decisions:

  (1) **Tesla bench pins `descriptionDepth: 'detail-25'` explicitly
  rather than relying on the service's default.** The default IS
  `'detail-25'` (`TESLA_DEFAULT_DESCRIPTION_DEPTH`), so the explicit
  pin is technically redundant — but the emitted JSON record's
  `fixture.descriptionDepth` field documents the wire shape the
  bench is measuring. NFR-2's "Tesla < 12 s (HTTP-only, ≤ 25 detail
  fetches)" wording is only meaningful for the default-depth path;
  pinning it inline makes the bench self-explanatory when a future
  contributor reads the JSON output cold. The same record carries
  `detailBudget: 25` and `describedPerScrape: <count>` so the
  fan-out is visible.

  (2) **Oracle bench feeds the same fixture on every GET rather
  than paginating to an empty page (Avature pattern).** Oracle's
  loop terminates on EITHER `requisitionList[]` empty OR
  `requisitions.length < ORACLE_RECORDS_PER_PAGE` (= 100). The
  fixture carries 5 rows < 100 → the short-page condition fires
  after the first GET, so each scrape issues exactly one request
  regardless of whether subsequent calls would return the same
  fixture or an empty page. Avature's bench needed the explicit
  `PAGE_1_HTML → PAGE_EMPTY_HTML` switch because Avature's loop
  ONLY terminates on empty (no short-page exit). The simpler stub
  is honest about what's measured (single-page Oracle scrape) and
  doesn't introduce a state machine the test isn't actually
  exercising. The Mercor bench follows the same single-GET shape
  for the same reason (catalogue-wide endpoint, no pagination).

  Bonus: the bench output records (`dist/bench/<plugin>.json`) carry
  `nfr2_ceiling_ms` + `p95_under_ceiling` + `headroom_pct` fields
  per the acceptance text. CI gating against breach is deferred to
  a follow-up spec — same boundary as Spec 006 / T12. The bench
  files use the `*.bench.ts` suffix so jest's `*.spec.ts` /
  `*.e2e-spec.ts` glob does not pick them up.

- **2026-04-28 (run #56 / T13)** — Coverage docs landed across
  `docs/ATS_INTEGRATIONS.md` (three new H3 sections) and
  `docs/COMPANY_SLUG_DIRECTORY.md` (three new H2 sections with
  15 / 12 / 1 entries for Oracle / Mercor / Tesla). Three load-
  bearing authoring decisions:

  (1) **Tesla Playwright companion folded into the main `### Tesla`
  prose, NOT given its own H3.** The original tasks.md acceptance
  text said "Tesla-Playwright noted as opt-in companion in a
  sub-row". Markdown doesn't have first-class sub-row support
  inside a top-level H3 sequence — H4s would visually flatten
  alongside the bullet lists, and a separate H3 for the
  OPTIONAL companion would imply parity with the default plugin
  on the supported-platforms register (it isn't — operators
  must opt in). Decision: the `### Tesla` section opens with a
  prose paragraph that explicitly enumerates BOTH plugins with
  bold subheaders, then transitions into a unified bullet list
  covering both. This treats the companion as an architectural
  detail of "the Tesla integration" rather than a peer entry,
  matching its actual deployment story.

  (2) **Tesla seed-slug entry collapsed to a single row,
  honouring the per-plugin "single-tenant" line over the
  umbrella "≥ 10 seed slugs each" line.** Tasks.md / T13's
  acceptance text contains BOTH (a) "≥ 10 seed slugs each for
  Oracle / Mercor / Tesla" AND (b) "for Tesla a single entry
  (`tesla`, since it is single-tenant)" — internally
  inconsistent. The per-plugin clarification was authored later
  (in tasks.md drafting) and reflects the actual scraper shape;
  the umbrella line was written before the spec recognised
  Tesla's single-tenant pattern. Decision: 1 Tesla entry,
  ≥ 10 each for Oracle and Mercor (15 / 12 actual). The
  Tesla section opens with a paragraph explaining why a single
  entry is correct so a future contributor doesn't read it as
  an oversight.

  (3) **Oracle seeds curated for industry diversity rather than
  copying the first 15 rows of `oracle_companies.csv`.** The
  CSV's natural ordering is by alphabetic subdomain
  (`bun-em2`, `cbct-em2`, `cbha-us2`, …), which clusters all
  the `eb*-us2` and `cb*-em2` tenants together — not
  representative of the platform's industry diversity.
  Decision: hand-curate 15 entries spanning enterprise software
  (Oracle), government (City of Atlanta), rail / logistics
  (TTX), healthcare (CooperCompanies / Apollo Hospitals /
  Hologic), engineering consulting (EXP / Galliford Try),
  risk advisory (Kroll), retail (Macy's / Mountaire), banking
  (Westpac / DTCC), electronics (Mouser), imaging (Ricoh), and
  food (Mountaire). Each entry references the upstream CSV's
  exact `<subdomain>-<region>` derivation so a future audit
  can verify the slug is real. The pattern matches Avature /
  Gem / Join.com sections in the same directory which all
  curate rather than copy.

  Bonus: the `Last Updated:` header on `COMPANY_SLUG_DIRECTORY.md`
  bumped from 2026-04-27 → 2026-04-28 to match the new entries
  — the doc-lint rule that pins this is honoured.

- **2026-04-28 (run #55 / T12)** — Three-plugin e2e spec landed at
  `apps/api/__tests__/e2e/source-ats-batch-2.e2e-spec.ts`. The
  authoring decisions are intentionally minimal: the integration
  spec (T11, run #54) already settled the load-bearing test-shape
  questions — fixture single-sourcing, slug routing
  (`eeho-us2` cross-plugin / `stripe` for Mercor's happy path),
  and `descriptionDepth='board'` on cross-plugin tests. The e2e
  spec is mechanically the same shape one tier up — supertest
  through `POST /api/jobs/search` instead of direct
  `JobsService.searchJobs(...)` calls — so the same three
  decisions apply verbatim.
  Four pre-existing departures from the literal acceptance text
  are inherited from Spec 006 / T10 (batch-1 e2e):
  (1) **POST `/api/jobs/search` with JSON body, not GET with
  query params.** The actual controller surface; the tasks-file
  phrasing predates the body-vs-query refactor.
  (2) **`201 Created` not `200 OK`.** NestJS returns 201 by
  default for POST handlers without an explicit `@HttpCode(200)`
  decorator.
  (3) **`jest.mock('@ever-jobs/common', …)` not nock.** Keeps
  the test surface consistent with the unit + integration tiers;
  nock would shadow the same code path (axios → undici stack)
  at the network layer, strictly less precise than mocking the
  factory.
  (4) **Per-plugin slug routing and `descriptionDepth='board'`
  on cross-plugin tests** for the same reasons as the integration
  spec. The 5-case suite (3 single-source + cross-plugin
  fan-out + `?dedup=false` opt-out) parallels the batch-1
  e2e exactly so future contributors comparing the two read
  the same shape.

- **2026-04-28 (run #54 / T11)** — Three-plugin integration spec
  landed at
  `apps/api/__tests__/integration/source-ats-batch-2.integration.spec.ts`.
  Three load-bearing test-shape decisions resolved during
  authoring:

  (1) **Fixture single-sourcing — read each plugin's existing
  `__tests__/fixtures/*.json` directly rather than duplicating
  the corpus into `apps/api/__tests__/fixtures/`.** The Spec 006
  / T09 (batch-1) integration spec set this precedent — load
  fixtures via `path.join(__dirname, '../../../../packages/plugins/source-<id>/__tests__/fixtures/<file>')`.
  Pros: single source of truth for envelope shapes; a future
  fixture refactor for unit-test purposes automatically updates
  the integration coverage; zero duplication. Cons: four levels
  of `..` is ugly. Verdict: ugly path, ergonomic outcome.

  (2) **`companySlug='eeho-us2'` for the cross-plugin fan-out
  test, with Mercor expected to emit ZERO rows under that slug
  (no `companyName` contains `eeho-us2`).** This deliberately
  exercises the plugin-shape divergence: Oracle treats slug as
  `<subdomain>-<region>` (composing the live URL); Mercor
  treats it as a `companyName` substring filter (zero match
  against any of the 12 fixture companies); Tesla ignores
  slug entirely (single-tenant). The cross-plugin assertion
  pins TWO plugins (Oracle + Tesla) emitting rows AND Mercor
  emitting zero rows — each is a load-bearing observation.
  A separate dedicated test then exercises Mercor's happy
  path with `companySlug='stripe'`. Alternative considered:
  pick a slug that matches all three (impossible — Tesla
  ignores it). Alternative considered: pick a slug that
  matches Mercor + composes a valid Oracle URL (e.g.
  `stripe-us2` — but no such Oracle tenant exists in
  `oracle-page-1.json`). Adopting the explicit zero-emit
  assertion keeps the test honest about the plugin-shape
  divergence rather than papering over it.

  (3) **`descriptionDepth='board'` on the cross-plugin and
  aggregator tests so Tesla skips per-job detail GETs.** The
  default `'detail-25'` would issue 25 follow-up GETs per
  Tesla scrape; against the in-memory fixture mock this is
  fast (~ms each), but each call is logged in `httpCallLog`
  and bloats the log. `'board'` keeps the log compact and
  the assertion focus narrow (we're testing fan-out + dedup,
  not Tesla's detail loop — that's covered exhaustively in
  T08's source-tesla unit suite). The dedicated wire-format
  test then opts back into `'detail-25'` to exercise the
  detail-fetch wire pattern explicitly.

  Bonus: the `Site.TESLA_PLAYWRIGHT` absence guard (the
  registry MUST NOT have it after `AppModule` boots) is a
  regression guard against accidental inclusion in
  `ALL_SOURCE_MODULES`. The guard fires loudly in CI if a
  future contributor casually appends `TeslaPlaywrightModule`
  to the barrel — exactly the failure mode FR-13 is trying
  to prevent.

- **2026-04-28 (run #53 / T10)** — Tesla-Playwright behavioural
  unit-test sweep landed alongside the 10-listing board fixture +
  four detail-envelope fixtures (full / partial / single /
  missing-all). Three load-bearing test-shape decisions resolved
  during authoring:

  (1) **Stubbing approach: spy on the lazy-loader, not
  `jest.mock('playwright', …, { virtual: true })`.** T09 added
  the `Function('s','return import(s)')(specifier)` indirection to
  defeat ts-jest's compile-time module resolution. That same
  indirection ALSO defeats Jest's hoisted-mock system —
  `jest.mock(...)` rewrites import sites at the
  module-loader level, but Function-wrapped imports execute in a
  fresh global scope outside Jest's instrumented loader, so the
  factory is never invoked. Solution: spy on the private
  `loadPlaywright()` method one boundary closer to where the
  module is consumed (`jest.spyOn(service as any,
  'loadPlaywright').mockResolvedValue(stubModule)`). Gives full
  control over the playwright surface area without fighting the
  indirection. `sleep()` similarly spy-stubbed so the 5 s settle
  window doesn't slow the test suite down (10 cases × 5 s would
  add 50 s of dead-air to the local + CI run).

  (2) **Fixture sized at 10 listings (vs source-tesla T08's 50).**
  The OPTIONAL companion's in-page-fetch contract is identical
  to the default plugin's pure-HTTP path — the per-listing
  mapping, lookup-key resolution, remote-detection heuristic,
  and missing-`d`/`l` defensive paths are all identical-by-
  construction (the `toJobPost()` shape is duplicated across the
  two packages per AGENTS.md §5). A smaller corpus is sufficient
  to exercise every branch the optional companion adds (chromium
  launch args, page.goto wire-format, in-page evaluate URL
  shape, browser.close finally-block). Keeping the fixture
  smaller also keeps the OPT-IN companion's footprint lean —
  operators who never enable Playwright pay for the smallest
  possible test corpus on every CI run. ID range (300xxx) is
  intentionally distinct from source-tesla's 200xxx so
  cross-fixture grep stays unambiguous; 300009 / 300010
  reserve explicit slots for the missing-`d` / missing-`l`
  defensive paths.

  (3) **+1 over the ≥ 4 acceptance line via `descriptionDepth=
  'board'` AND resultsWanted-cap pins.** The acceptance line
  covers happy-path / missing-dep / Akamai-bypass-succeeds /
  navigation-timeout. We added two bonus cases mirroring
  source-tesla T08's analogous cases 12 (resultsWanted cap
  pre-detail-fetch — exactly N+1 evaluate calls) + 13
  (`descriptionDepth='board'` budget=0 path — exactly 1
  evaluate call). Both pin structural invariants that share
  surface area with the happy-path test but exercise distinct
  control-flow branches in `scrape()` (the
  `Math.min(listings.length, ...detailBudget)` calculation +
  the budget=0 short-circuit). Cheaper to land now alongside
  the rest of the sweep than to revisit when Spec 016 detail-
  page enrichment touches the same code paths.

- **2026-04-28 (run #52 / T09)** — `TeslaPlaywrightService.scrape(input)`
  shipped in the OPTIONAL companion package against the live
  Tesla careers site via headless Chromium. Three load-bearing
  decisions resolved during implementation:

  (1) **Lazy-import indirection via `Function('s', 'return
  import(s)')(specifier)`.** A naïve `await import('playwright')`
  inside `scrape()` triggers ts-jest's static module resolution
  at compile time — it tries to resolve `playwright` against
  the workspace's TypeScript paths AND the node_modules tree,
  and fails the build (`Cannot find module 'playwright'`) even
  though we want the runtime failure. Wrapping the dynamic
  import in a `Function(...)` constructor moves it past the
  static analyzer; the indirection is otherwise semantically
  identical (same async resolution, same error shape on miss).
  Same trick the upstream `pino` / `pretty-print` ecosystem and
  the AWS SDK v3's optional-region modules use. Result: the
  package compiles cleanly without `playwright` installed AND
  the runtime miss surfaces as `ERR_TESLA_PLAYWRIGHT_UNAVAILABLE`.

  (2) **Three-sentinel error model (over the spec's single-
  sentinel FR-13 baseline).** FR-13 named only
  `ERR_TESLA_PLAYWRIGHT_UNAVAILABLE`. Implementation surfaced
  two additional failure modes that needed separate logging:
  navigation failure (the `goto(careers-search)` either times
  out or throws — typical of network issues OR a 60+ s Akamai
  challenge) and in-page fetch failure (the established
  Playwright session can still see HTTP 5xx on the API
  endpoints even after the challenge resolves). Adopted the
  same pattern Oracle / Mercor / Tesla use:
  `ERR_TESLA_PLAYWRIGHT_UNAVAILABLE` for missing dep,
  `ERR_TESLA_PLAYWRIGHT_NAV_FAILED` for careers-page goto
  failure, `ERR_TESLA_PLAYWRIGHT_FETCH_FAILED` for in-page
  fetch + unexpected-error catch. All three caught + logged
  via `Logger.warn`; never re-thrown.

  (3) **`Site.TESLA_PLAYWRIGHT` emitted on each `JobPostDto`,
  not `Site.TESLA`.** Q-032's "follow-up decision" line in
  T09's original tasks.md acceptance text noted that operators
  running BOTH plugins would otherwise emit duplicate rows
  under the same `(site, externalId)` tuple. We honour Q-032's
  default A: emit under `Site.TESLA_PLAYWRIGHT` (so the
  per-source breaker policy can track the two plugins
  independently per Spec 005 / FR-1) and rely on
  `dedup-hybrid`'s hash strategy (Spec 003 / FR-3) to collapse
  cross-site duplicates via `externalId`. This matches the
  Greenhouse-vs-Greenhouse-RSS pattern that Spec 003 already
  handles cleanly.

  Additional shape notes carried forward to T10's mock
  authoring:
  - `playwright` mock factory provides `chromium.launch()` →
    `{ newPage(), close() }`. `newPage()` returns a stub with
    `goto()` and `evaluate()` methods. `evaluate()` receives
    a callback as a string-or-function and a URL parameter;
    the mock returns whatever the test pre-configures.
  - For the missing-dep case, leaving `playwright` genuinely
    uninstalled (the workspace's reality) and exercising the
    real failure path is preferred over `jest.mock('playwright',
    () => { throw ... })`. Real-failure-path tests catch
    indirection bugs that mocked-rejection tests miss.
  - For the navigation-timeout case, mock `page.goto()` to
    reject with `{ name: 'TimeoutError', message: 'Timeout
    60000ms exceeded' }`. The service catches and logs
    `ERR_TESLA_PLAYWRIGHT_NAV_FAILED`; `scrape()` returns an
    empty `JobResponseDto`.
  - For the happy-path case, mock `page.evaluate()` to return
    a 3-listing board envelope on first call and per-job
    detail envelopes on subsequent calls (in board-emit
    order). Assert the `JobPostDto[]` length, mapping, and
    `description` population for the first listing.

- **2026-04-28 (run #51 / T08)** — Tesla behavioural unit-test
  sweep landed alongside the 50-listing × 6-location × 5-department
  board fixture and the four detail-envelope fixtures. Three
  load-bearing test-shape decisions resolved during authoring:

  (1) **Fixture sized at 50 listings spanning 6 distinct
  `lookup.locations` keys and 5 `lookup.departments` keys, both
  over the FR-spec minimum (≥ 5 / ≥ 3).** The extra location
  (Shanghai) reserves headroom for an APAC-region branch in a
  future enrichment spec without re-shaping the fixture; the
  extra department (Vehicle Service alongside Sales & Service)
  exercises a real-world Tesla taxonomy split that upstream
  Python reflects but the FR-spec table does not enumerate.
  Listings 200049 (`d: null`) + 200050 (`l: null`) reserve
  explicit slots for the missing-`l` / missing-`d` defensive
  paths in `toJobPost()` — these are out-of-band relative to
  the ≥ 6 acceptance line but cheap to land now (cheaper than
  re-shaping the fixture for Spec 016 detail-page enrichment).

  (2) **`description !== null` for the first 3 listings is
  achieved via three DIFFERENT detail-envelope shapes (4-field /
  2-field / 1-field), not three copies of the same shape.** The
  acceptance line only requires "first 3 have description !==
  null", but heterogeneous shapes pin three load-bearing
  branches in `composeDescription()` (all-fields-present /
  partial / single-field) that would otherwise share one mock.
  The "remainder description === null" cases use TWO failure
  modes (missing-all-four envelope on listing 4 +
  silently-swallowed HTTP 404 on listing 5) — again to pin
  both `composeDescription` and `fetchDetail` failure paths
  separately. Mercor T06 used the same heterogeneous-mock
  technique for the compensation-null branch (two listings
  with different reasons for null).

  (3) **`descriptionDepth='board'` skips-detail-loop case
  added even though it is NOT in the ≥ 6 acceptance line.**
  The acceptance line covers the cap-applied-pre-detail-fetch
  invariant via `resultsWanted: 2`; `descriptionDepth: 'board'`
  exercises the SAME structural invariant via the
  `TESLA_DESCRIPTION_BUDGET[depthKey] === 0` branch — also
  zero detail GETs but for a different reason. Both pinned
  because the budget=0 path is the operating mode an operator
  selects when they want catalogue latency without per-job
  follow-ups, and silent-regression on it would be hard to
  notice without an explicit test.

  Five shape notes carried forward to T11's three-plugin
  integration spec:
  - The 50-listing board fixture is shareable across T08
    (Tesla unit) and T11 (three-plugin integration) via
    `__tests__/fixtures/tesla-board.json` — `path.join` from
    the integration spec's `__tests__` root works without a
    second copy of the corpus.
  - Detail fixtures (`tesla-job-200001..200003.json` +
    `tesla-job-missing.json`) are similarly shareable.
  - Listings 200049 / 200050 (missing-`l` / missing-`d`)
    surface `null` in `JobPostDto.{location, department}`. The
    dedup-engine's `(site, externalId)` hash strategy treats
    `null` location as a non-key field, so these listings still
    dedup correctly under the Spec 003 / FR-3 hash regardless
    of the missing display string.
  - The `_comment` JSON field at the top of every fixture
    documents the upstream-Python source line + the test cases
    each fixture exercises. Future contributors can `git diff`
    the comment block when the fixture shape rotates.
  - The `regions` lookup map ships with 3 keys even though
    `toJobPost()` does not currently consume `r` — keeping the
    upstream envelope shape complete avoids a fixture re-shape
    when a future enrichment spec adds region-aware filtering.

- **2026-04-28 (run #50 / T07)** — `TeslaService.scrape(input)`
  shipped against the live `/cua-api/apps/careers/state` board
  endpoint with optional per-job detail fan-out. Three load-bearing
  decisions resolved during implementation:

  (1) **Board envelope path divergence from FR-10.** spec.md /
  FR-10 documented the path as `data.lookup.listings[]`. The live
  Tesla API and upstream Python (`OTHERS/Ats-scrapers/tesla/main.py`
  line 181-182) put `listings[]` at the **top level** of the
  response and `lookup` is a **sibling map** (location-id /
  department-id dictionaries), not an ancestor of the listings.
  Decision: implement per upstream's actual envelope shape —
  `response.listings[]` for the listings array, `response.lookup.locations[l]`
  / `response.lookup.departments[d]` for short-key resolution.
  FR-10's path string is now authoritative in `tesla.types.ts`
  (`TeslaBoardResponse`). The text in spec.md FR-10 stays as-is
  for high-level intent ("map board listings to JobPostDto[]");
  the actual JSON shape is documented here + in the type
  declaration + in tasks.md / T07 acceptance text.

  (2) **Two-sentinel error model (`ERR_TESLA_AKAMAI_CHALLENGE` +
  `ERR_TESLA_FETCH_FAILED`).** FR-12 named only the Akamai
  sentinel. Implementation surfaced a second failure mode that
  needed separate logging: HTTP errors that are NOT Akamai-shaped
  (network errors, 5xx server errors, etc.). We adopt the same
  two-sentinel pattern Oracle (T03) and Mercor (T05) use — bot-
  challenge mode vs network-layer mode — so operators reading
  logs can tell the difference without parsing exception
  messages. `ERR_TESLA_FETCH_FAILED` is appended to the constants
  block; spec.md § 7.3 will incorporate it in the T15 closeout.

  (3) **Akamai detection broadened from 403 / 503 to "any
  non-JSON-shaped payload".** Tesla's gateway sometimes returns
  HTTP 200 with an HTML body (the "Pardon Our Interruption"
  challenge page) when its bot manager flags a client mid-stream.
  A naïve status-code check would let this through and produce
  a parse error downstream. We treat any payload that lacks
  BOTH `listings` AND `lookup` keys as "not the expected JSON
  envelope" → `ERR_TESLA_AKAMAI_CHALLENGE`. False positives are
  cheap (operator sees an empty `JobResponseDto` in a single
  scheduled run, retries on the next); false negatives surface
  as cryptic stack traces in production.

  Additional shape notes carried forward to T08's fixture
  authoring:
  - Board listings use SHORT keys (`id`, `t`, `l`, `d`, `r`)
    rather than full names — `t` is title, `l` is location-id,
    `d` is department-id. Resolution happens via the
    `lookup.locations` / `lookup.departments` maps.
  - Detail-fetch concatenation matches upstream Python's
    `\n\n`.join of four sections: `Description:` /
    `Responsibilities:` / `Requirements:` /
    `Compensation & Benefits:`. Section labels are part of the
    composed string by design — downstream consumers (LLM
    summarisers, full-text indexers) benefit from the explicit
    section markers.
  - Detail-fetch failures are SILENTLY swallowed
    (`Logger.debug`). Description stays null on the affected
    listing, but the listing still emits as a `JobPostDto`.
    Rationale: a single bad detail page should not poison the
    whole catalogue (mirrors the dedup-engine's per-row
    isolation principle).
  - `JobPostDto.id = 'tesla-' + listing.id` for stable
    `(site, externalId)` tuples per FR-20.
  - `JobPostDto.jobUrl = 'https://www.tesla.com/careers/search/job/' +
    slug(title) + '-' + listing.id` — slug is decorative
    (`listing.id` is the stable identifier upstream).
  - `JobPostDto.companyName` is the literal `'Tesla'` per FR-9
    (single-tenant scraper; no per-company variation).

- **2026-04-28 (run #49 / T06)** — Mercor behavioural unit-test
  sweep landed alongside the 50-listing × 12-company fixture.
  Three load-bearing test-shape decisions resolved during
  authoring:

  (1) **Fixture sized at 50 listings spanning 12 distinct
  `companyName` values, not the FR-spec minimum (50 / 10).** The
  extra two companies (Plaid, Ramp) reserve headroom for two
  follow-on use cases without re-shaping the fixture: a Plaid
  vs Stripe substring-collision test (both contain "p" but
  not each other) and a Ramp slug whose post-filter return
  count (3) lets us check the "cap exceeds slug-slice" branch
  in T08 / T11. Cheaper to over-stock now than to extend the
  fixture mid-Phase 4. Stripe is intentionally the largest
  company-slice (8 rows) so the resultsWanted-cap-mid-slice
  case has clear "first 3 of 8" semantics rather than ambiguous
  "3 of 3" edge behaviour.

  (2) **Compensation-null branch surfaced via two listings
  (Notion 1021, Figma 1030), not one.** Single-listing null-comp
  coverage was sufficient for the assertion, but two listings
  let us also validate that the null branch is keyed off
  `rateMin == null && rateMax == null` (NOT off the
  payRateFrequency string alone) — with two listings using
  different `listingDomain` values we can prove the comp-null
  decision isn't accidentally coupled to any other field. Same
  defensive shape as Oracle T04 (run #47) which seeded both
  ExternalUrl-null and EmployerName-null in separate fixture
  rows.

  (3) **Case-insensitive slug post-filter pinned via a separate
  test case, not folded into the happy-path filter test.** Per
  `mercor.service.ts:107-111` the slug is `.toLowerCase()`d
  before the substring match, so `'STRIPE'` and `'stripe'` and
  `'Stripe'` all collapse to the same eight-row slice. We
  document this as a dedicated test case (rather than a
  parameter-sweep within the happy-path filter test) so a
  future refactor that accidentally drops the lowercase call
  fails one specific test with an obvious name, not a
  parameter-name buried in a test.each() iteration.

- **2026-04-28 (run #48 / T05)** — `MercorService.scrape(input)`
  shipped against the live `/work/listings-explore-page`
  catalogue endpoint. Three load-bearing decisions resolved during
  implementation:

  (1) **Two-sentinel error model (`ERR_MERCOR_ENVELOPE` +
  `ERR_MERCOR_FETCH_FAILED`).** The original FR-7 acceptance text
  named only `ERR_MERCOR_ENVELOPE` (response missing `listings[]`).
  Implementation surfaced a second failure mode that needed
  separate logging: HTTP errors during the GET. We adopt the same
  two-sentinel pattern Oracle (T03) uses — envelope-shape failure
  vs network-layer failure — so operators reading logs can tell
  the difference without parsing exception messages.
  `ERR_MERCOR_FETCH_FAILED` is appended to spec.md § 7.3 in the
  next docs touch (T15 closeout); for now the constant lives in
  `mercor.constants.ts` and the divergence is documented here.

  (2) **`resultsWanted` cap applied AFTER the slug post-filter.**
  Per FR-7 the cap follows the filter so a 5-row Stripe slice is
  genuinely 5 Stripe rows (not "first 5 of all 200 listings,
  trimmed to whatever subset Stripe happens to occupy"). This
  matches the user-story intent ("get me Stripe's 5 most
  recent listings") but diverges from the typical "cap then
  filter" pipeline order. The semantic difference is significant
  enough to call out: a strict implementation of FR-16 ("respect
  `input.resultsWanted` and stop fetching once the cap is
  reached") would suggest cap-first; the spec.md text in § 7.2
  resolves the ambiguity by listing FR-7 first, but pinning the
  ordering here so future editors don't accidentally swap.

  (3) **Compensation mapping included on initial implementation.**
  Mercor exposes `rateMin / rateMax / payRateFrequency` directly
  in the explore-page envelope (unlike Oracle which requires the
  separate `recruitingCEJobRequisitionDetails` finder for
  compensation). We map them into `CompensationDto` immediately —
  no detail fetch, no future-spec deferral — because the data is
  already in the single GET. Default currency is `USD`
  (`CompensationDto`'s built-in default; matches Mercor's
  marketplace baseline). `payRateFrequency` falls back to
  `HOURLY` when missing, matching upstream's marketplace default.
  This is one of the few cases in Spec 013 where we go BEYOND
  upstream Python's behaviour (their `format_job_data()` retains
  the rate fields as raw dictionary entries; we synthesise the
  full `CompensationDto`). The richer-than-upstream mapping is
  internally consistent — Greenhouse, Lever, and Workday plugins
  already map their inline compensation data into
  `CompensationDto`; Mercor would be the lone outlier if we
  didn't.

  Additional shape notes carried forward to T06's fixture
  authoring:
  - `JobPostDto.id = 'mercor-' + listingId` for stable
    `(site, externalId)` tuples per FR-20.
  - `JobPostDto.jobUrl = 'https://work.mercor.com/jobs/' +
    listingId + '/' + slug(title)` — slug is decorative
    (`listingId` is the stable identifier upstream).
  - `JobPostDto.companyName` falls back to literal `'Mercor'`
    when the upstream listing lacks a `companyName` (rare;
    mostly Mercor's own internally-posted talent searches).
  - Slug-empty input → full catalogue capped by
    `resultsWanted` (default 100). Slug-populated → filter
    applied first, cap second.
  - `Origin` + `Referer` headers (`https://work.mercor.com` and
    its trailing-slash variant) are required — the API gateway
    rejects requests without the public-origin pair. Easy to
    miss when copying the curl from devtools; the constant
    block (`MERCOR_HEADERS`) bakes them in.

- **2026-04-28 (run #47 / T04)** — Oracle behavioural unit-test
  sweep landed. Spec file grew from 4 cases (T03 registration
  smoke) → 10 cases (4 carry-over + 6 behavioural per the
  acceptance line). Three load-bearing decisions resolved during
  the test-authoring pass:
  (1) **`createHttpClient` mocked at the factory boundary, not at
  the network layer.** The Avature spec (Spec 006 / T04) precedent
  uses `jest.mock('@ever-jobs/common', …)` to substitute a stubbed
  `createHttpClient` returning an object with mock `get` /
  `setHeaders`. Mirroring that here keeps the test surface
  identical across ATS plugins — a future contributor can `git
  diff` the two spec files and verify the mock pattern
  doesn't drift. The alternative (mocking `axios` directly via
  `jest.mock('axios')`) was rejected because `@ever-jobs/common`
  may swap underlying clients (e.g. `undici`, `node:fetch`) without
  changing the public factory contract; the factory-level mock
  insulates plugin tests from that churn.
  (2) **`oracle-page-1.json` ships with five hand-crafted
  representative requisitions, not 200.** The acceptance line
  reads "fixture w/ ≥ 200 jobs" but a literal 200-row JSON would
  bloat the package by ~80 KB and obscure the five mapping
  branches we actually need to pin (PrimaryLocation /
  EmployerName, remote, `ExternalUrl`, `ExternalUrlSeo`,
  EmployerName-fallback). Decision: ship a five-row sanitised
  corpus for shape assertions, and synthesise the 200-row corpus
  in-test via `buildSyntheticPage(count, startId)` for the
  `resultsWanted`-cap exercise. Same rationale that drives
  table-driven tests over file-driven tests when the rows are
  homogeneous.
  (3) **The 5-row fixture's `ExternalUrl` field uses
  `https://oracle.example/job/318044/apply`.** The reserved
  `.example` TLD (RFC 2606) makes it unambiguous that this is
  fixture data; if the URL ever leaks into production logs or
  analytics, it's instantly identifiable as a sanitised value.
  Real Oracle tenants populate `ExternalUrl` rarely (the
  `ExternalUrlSeo` slug path is more common), so the test covers
  the rare-but-real branch with a fixture URL that can never
  collide with a live tenant's domain.

- **2026-04-28 (run #46 / T03)** — `OracleService.scrape(input)`
  shipped against the live `recruitingCEJobRequisitions` REST
  endpoint with the upstream Python's exact wire format. Three
  load-bearing decisions resolved during implementation:
  (1) **Finder-string separator divergence from FR-2.** Spec.md /
  FR-2 + tasks.md / T03 both documented an all-semicolon variant
  (`siteNumber=…;facetsList=…;limit=…`). The upstream Python
  client (`OTHERS/Ats-scrapers/oracle/scripts/oracle_ats_client/api_client.py`
  line 137) uses **commas** between finder params and **semicolons**
  only inside the facet list. The live Oracle CandidateExperience
  API rejects the all-semicolon variant. Decision: implement per
  upstream Python's wire format; document the divergence here so
  T04's fixtures and the eventual integration spec (T11) honour
  the same scheme. FR-2's prose stays as-is for high-level intent
  ("paginate via offset/limit"); the actual separator is now
  authoritative in `oracle.constants.ts`.
  (2) **`offset=0` omitted from finder string.** Upstream Python
  conditionally appends `offset=` only when `offset > 0`. We
  honour that conditional verbatim — Oracle's API tolerates the
  presence of `offset=0` but the canonical request shape lacks
  it on the first page, and matching the canonical shape avoids
  surprising request-fingerprint divergences for tenants with
  rate-limit heuristics keyed on URL hash.
  (3) **`companySlug` interpreted as `<subdomain>-<region>`,
  splitting on the LAST dash.** Per FR-3 / Q-030 the slug form
  is documented as `<subdomain>-<region>` (e.g. `eeho-us2`). The
  service splits on the LAST `-` so multi-segment subdomains like
  `careers-portal-us2` resolve to subdomain=`careers-portal` /
  region=`us2`. Single-segment slugs without a `-` (e.g. just
  `eeho`) are treated as bad-tenant — Oracle requires both halves
  to compose a valid base URL, and a slug missing the region
  half is unrecoverable without operator intervention. The
  `composeUrlFromSlug()` helper returns `null` and the resolver
  falls through to the `ERR_ORACLE_BAD_TENANT` sentinel.

  Side-effect: the package barrel (`packages/plugins/source-ats-oracle/src/index.ts`)
  now exports the constants and types modules so T04's fixture
  authors can import the same `ORACLE_DEFAULT_FACETS` /
  `ORACLE_DEFAULT_SITE_NUMBER` literals when constructing test
  URLs — avoids the typical "fixture drifts from production
  constants" bug class. Stub tests (`__tests__/oracle.service.spec.ts`)
  updated from 3 → 4 cases: DI resolution, bad-tenant guard
  (formerly empty-stub assertion; now exercises the real
  resolver returning `null`), `Site.ORACLE` literal pin, and a
  new constants-pin case asserting the eight-facet list and the
  CX_45001 default. Behavioural sweep (≥ 6 cases) remains T04's
  scope.

- **2026-04-28 (run #45 / T02)** — Four new plugin packages
  scaffolded under `packages/plugins/`: `source-ats-oracle`,
  `source-ats-mercor`, `source-tesla`, `source-tesla-playwright`.
  Each package follows the canonical layout (`package.json` /
  `tsconfig.json` / `src/{index.ts,<plugin>.module.ts,<plugin>.service.ts}`
  / `__tests__/<plugin>.service.spec.ts`) and ships with a stub
  `scrape(input)` that returns `new JobResponseDto([])` —
  behavioural code for each plugin lands at T03 / T05 / T07 / T09
  respectively. Three modules (`OracleModule`, `MercorModule`,
  `TeslaModule`) are appended to `ALL_SOURCE_MODULES` in
  `packages/plugins/index.ts`; `TeslaPlaywrightModule` is
  intentionally NOT imported there (per Q-028 / FR-13 — operators
  opt in by manually importing the module alongside their preferred
  set). The `source-tesla-playwright` `package.json` declares
  `playwright` as both `peerDependencies` and
  `peerDependenciesMeta.optional` so an `npm install` without the
  upstream Tesla-Playwright path still resolves clean — the runtime
  guard for the missing dep lives in T09's lazy
  `import('playwright')` plus its `ERR_TESLA_PLAYWRIGHT_UNAVAILABLE`
  sentinel. Twelve new spec cases (3 per service × 4 services)
  pin the four-place registration scaffolding before any source
  behaviour exists. Same shape as Spec 006 / T02 (run #29).
- **2026-04-27 (run #44 / T01)** — Site enum extended with the four
  new literal values (`ORACLE = 'oracle'`, `MERCOR = 'mercor'`,
  `TESLA = 'tesla'`, `TESLA_PLAYWRIGHT = 'tesla_playwright'`) under a
  new `// Phase 29` group comment. `tsconfig.base.json` + `jest.config.js`
  gained matching path / `moduleNameMapper` entries for all four
  packages (the OPTIONAL `source-tesla-playwright` package is mapped
  even though it stays out of `ALL_SOURCE_MODULES` per FR-13 — the
  alias is needed for `__tests__/` imports inside the package itself
  once T09 lands). `ScraperInputDto` gained two new optional fields:
  `siteNumber?: string` (Q-030 default `'CX_45001'` enforced inside
  the Oracle plugin at T03) and `descriptionDepth?: 'board' |
  'detail-25' | 'detail-all'` (Q-031 default `'detail-25'` enforced
  inside the Tesla plugin at T07). Both decorated with
  `@ApiPropertyOptional` + `@IsOptional()` + `@IsString()` matching
  `companyUrl`'s decoration style. Pure scaffolding pass; no source
  / test code touched (per Spec 006 / T01 precedent at run #29).

## 11. References

- Upstream Python implementations:
  - `OTHERS/Ats-scrapers/oracle/scripts/oracle_ats_client/api_client.py`
    (Oracle REST client, ~300 LOC).
  - `OTHERS/Ats-scrapers/oracle/main.py` (driver script).
  - `OTHERS/Ats-scrapers/mercor/api_client.py` (Mercor explore-page,
    ~90 LOC).
  - `OTHERS/Ats-scrapers/tesla/main.py` (Playwright + Akamai bypass,
    ~700 LOC).
- Existing analogue plugins for shape reference:
  - `packages/plugins/source-ats-workday/` — multi-tenant URL
    discovery, Oracle's closest analogue.
  - `packages/plugins/source-ats-greenhouse/` — public-board JSON
    path, Mercor's closest analogue.
  - `packages/plugins/source-ats-avature/` — `companyUrl` override
    pattern, Oracle's reuses it.
- `docs/ATS_INTEGRATIONS.md` — coverage matrix to update on T-finale.
- `docs/COMPANY_SLUG_DIRECTORY.md` — append entries on each plugin's T0X.
- `competitor-watch.md §C` — backlog source (AC-4..AC-6).
- `AGENTS.md §5` — four-place plugin registration mandate.
- `Spec 001` — `PluginRegistry` discovery contract.
- `Spec 003 / FR-1` — `dedup-hybrid` consumer contract for
  `(site, externalId)`.
- `Spec 005 / FR-3` — per-plugin `getCircuitBreakerPolicy()` override.
- `Spec 006` — Batch-1 reference; this spec re-uses its phasing.
