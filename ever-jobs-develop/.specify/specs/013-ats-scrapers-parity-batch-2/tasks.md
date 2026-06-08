# Tasks: 013 — ATS-Scrapers Parity, Batch 2 (Oracle HCM Cloud / Mercor / Tesla)

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Bootstrap

- [x] T01 — Site enum + tsconfig paths + jest moduleNameMapper additions;
  `ScraperInputDto` extended with `siteNumber` + `descriptionDepth`.
  **Landed run #44.**
  - **Files (planned):** `packages/models/src/enums/site.enum.ts`,
    `packages/models/src/dtos/scraper-input.dto.ts`,
    `tsconfig.base.json`, `jest.config.js`.
  - **Acceptance:**
    - `Site.ORACLE === 'oracle'`, `Site.MERCOR === 'mercor'`,
      `Site.TESLA === 'tesla'`, `Site.TESLA_PLAYWRIGHT === 'tesla_playwright'`.
    - tsconfig + jest mapper mirror **all four** new package paths
      (including `source-tesla-playwright`, even though the optional
      plugin is NOT in `ALL_SOURCE_MODULES`).
    - `ScraperInputDto.siteNumber?: string` and
      `ScraperInputDto.descriptionDepth?: 'board' | 'detail-25' | 'detail-all'`
      land with JSDoc + `@ApiProperty` decoration matching existing
      optional-field conventions.
  - **Estimate:** 0.25 day.

- [x] T02 — Four new plugin packages scaffolded; three appended to
  `ALL_SOURCE_MODULES`.
  **Landed run #45.**
  - **Files (planned):** `packages/plugins/source-ats-oracle/{package.json,tsconfig.json,src/{index.ts,oracle.module.ts,oracle.service.ts},__tests__/oracle.service.spec.ts}`,
    same shape for `source-ats-mercor`, `source-tesla`, AND
    `source-tesla-playwright` (the optional companion gets a stub
    package too — its scaffolding is identical, only `ALL_SOURCE_MODULES`
    excludes it). Plus one edit to `packages/plugins/index.ts`.
  - **Files (actual):** matched plan exactly. Four packages × six
    files each (package.json + tsconfig.json + src/index.ts +
    src/<plugin>.module.ts + src/<plugin>.service.ts +
    __tests__/<plugin>.service.spec.ts) = 24 new files. Plus
    one edit to the `ALL_SOURCE_MODULES` barrel (3 imports
    added, 3 array entries added — `MercorModule` /
    `OracleModule` interleaved alphabetically into the ATS
    block, `TeslaModule` interleaved into the source-* block;
    `TeslaPlaywrightModule` deliberately not imported per
    FR-13).
  - **Acceptance:**
    - Four packages exist and compile with stub
      `scrape(input) { return new JobResponseDto([]); }`.
    - `ALL_SOURCE_MODULES` includes `OracleModule`, `MercorModule`,
      `TeslaModule` — but **NOT** `TeslaPlaywrightModule`.
    - Each new plugin's `__tests__/<plugin>.service.spec.ts` pins
      (a) NestJS DI resolution via the corresponding module,
      (b) stub `scrape()` returning empty `JobResponseDto`,
      (c) the new `Site` enum value's literal string.
  - **Estimate:** 0.5 day. **Actual:** ~0.3 day (matches Spec 006 /
    T02 actual at run #29).

## Phase 2 — Oracle HCM Cloud

- [x] T03 — `OracleService.scrape(input)` REST + finder-string path.
  **Landed run #46.**
  - **Files (planned):** `packages/plugins/source-ats-oracle/src/oracle.service.ts`,
    `…/oracle.types.ts`, `…/oracle.constants.ts`.
  - **Acceptance (FR-1 / FR-2 / FR-3 / FR-4):**
    - URL composition: `companyUrl` (full URL override) ⇒ used verbatim;
      `companySlug` (`<subdomain>-<region>` form) ⇒ composed to
      `https://<subdomain>.fa.<region>.oraclecloud.com`.
    - Finder string: `siteNumber=<value>,facetsList=<facets>,limit=100,offset=N,sortBy=POSTING_DATES_DESC`
      (commas between params, semicolons between facets — matches the
      live API's wire format per upstream Python; spec.md / FR-2's
      all-semicolon variant was wrong, see § 10 Decisions log).
      Documented facet list:
      `LOCATIONS;WORK_LOCATIONS;WORKPLACE_TYPES;TITLES;CATEGORIES;ORGANIZATIONS;POSTING_DATES;FLEX_FIELDS`.
    - Pagination: increment `offset` by `100` until
      `requisitionList[]` empty OR `resultsWanted` cap.
    - HTTP via `@ever-jobs/common.createHttpClient` (no new deps).
    - Errors caught → empty `JobResponseDto`; sentinel codes
      `ERR_ORACLE_BAD_TENANT` / `ERR_ORACLE_FINDER_REJECTED` recorded.
  - **Estimate:** 0.5 day.

- [x] T04 — Oracle unit tests (≥ 6 cases).
  **Landed run #47.**
  - **Files (planned):** `packages/plugins/source-ats-oracle/__tests__/oracle.service.spec.ts`
    (extend), `…/__tests__/fixtures/oracle-page-1.json`.
  - **Files (actual):** matched plan exactly. The spec file grew
    from 4 cases (T03 registration smoke) → 10 cases (4 carry-over
    + 6 behavioural). Fixture is a sanitised five-requisition
    `eeho-us2` corpus exercising the five mapping branches
    (PrimaryLocation/EmployerName, remote, `ExternalUrl`,
    `ExternalUrlSeo`, EmployerName-fallback). The ≥ 200-job
    `resultsWanted` corpus is synthesised in-test via
    `buildSyntheticPage()` so the on-disk fixture stays small.
  - **Acceptance:**
    - Cases: happy path, empty `requisitionList[]`, HTTP 500,
      `resultsWanted` cap (fixture w/ ≥ 200 jobs), `companyUrl`
      override (custom-tenant URL), custom `siteNumber` override.
    - Fixture sourced from Oracle's own careers site (sanitised
      `eeho-us2` corpus).
  - **Estimate:** 0.5 day. **Actual:** ~0.3 day (matches Spec 006 /
    T04 actual at run #31).

## Phase 3 — Mercor

- [x] T05 — `MercorService.scrape(input)` single GET path.
  **Landed run #48.**
  - **Files (planned):** `packages/plugins/source-ats-mercor/src/mercor.service.ts`,
    `…/mercor.types.ts`, `…/mercor.constants.ts`.
  - **Acceptance (FR-5 / FR-6 / FR-7 / FR-8):**
    - Single GET to `https://aws.api.mercor.com/work/listings-explore-page`
      per `scrape()` call.
    - Headers include literal `Authorization: Bearer` (empty token)
      mirroring upstream Python.
    - Post-filter: when `companySlug` supplied, retain only
      `listings[]` rows whose `companyName` (lower-cased) contains
      the slug (lower-cased). Empty slug → full catalogue.
    - `resultsWanted` cap applied AFTER post-filter.
    - HTTP via `@ever-jobs/common.createHttpClient`.
    - Errors caught → empty `JobResponseDto`; sentinel
      `ERR_MERCOR_ENVELOPE` recorded when response lacks `listings[]`;
      sentinel `ERR_MERCOR_FETCH_FAILED` recorded on HTTP failure
      (added during implementation — not in original spec text but
      necessary symmetry with Oracle's two-sentinel pattern).
  - **Estimate:** 0.4 day.

- [x] T06 — Mercor unit tests (≥ 5 cases).
  **Landed run #49.**
  - **Files (planned):** `packages/plugins/source-ats-mercor/__tests__/mercor.service.spec.ts`
    (extend), `…/__tests__/fixtures/mercor-explore.json`.
  - **Files (actual):** matched plan exactly. The spec file grew
    from 5 cases (T05 registration / wire-format / envelope-guard /
    HTTP-failure smoke) → 11 cases (5 carry-over + 6 behavioural).
    Fixture is a sanitised 50-listing corpus spanning 12 distinct
    `companyName` values (Stripe ×8, OpenAI ×5, Anthropic ×4, Notion
    ×4, Airbnb ×5, Figma ×4, Vercel ×3, Linear ×4, Discord ×4,
    Coinbase ×3, Plaid ×3, Ramp ×3) covering hourly / monthly /
    yearly compensation intervals and remote / on-site location
    variants. Two listings (Notion 1021, Figma 1030) deliberately
    have null `rateMin / rateMax / payRateFrequency` to exercise
    the compensation-null branch.
  - **Acceptance:**
    - Cases: happy path with full catalogue, slug post-filter narrows
      result, empty `listings[]`, HTTP 500, resultsWanted cap
      mid-catalogue.
    - Fixture has ≥ 50 listings spanning ≥ 10 distinct
      `companyName` values so post-filter can be exercised
      meaningfully.
  - **Estimate:** 0.4 day. **Actual:** ~0.3 day (matches Spec 006 /
    T04 actual at run #31 and Spec 013 / T04 actual at run #47).

## Phase 4 — Tesla (default, pure-HTTP)

- [x] T07 — `TeslaService.scrape(input)` board + detail path.
  **Landed run #50.**
  - **Files (planned):** `packages/plugins/source-tesla/src/tesla.service.ts`,
    `…/tesla.types.ts`, `…/tesla.constants.ts`.
  - **Acceptance (FR-9 / FR-10 / FR-11 / FR-12):**
    - Board GET: `https://www.tesla.com/cua-api/apps/careers/state` with
      rotated UA + `Accept: application/json`.
    - Map `listings[]` → `JobPostDto[]` with `id` / `title` /
      `location` / `department` (location resolved via
      `lookup.locations[l]`, department via `lookup.departments[d]` —
      spec.md / FR-10's "data.lookup.listings[]" path was wrong;
      upstream Python and the live API put `listings[]` at the top
      level of the response and `lookup` is a sibling map. See § 10
      Decisions log).
    - Detail fetches: for the first
      `min(resultsWanted, descriptionDepth-budget)` jobs, GET
      `https://www.tesla.com/cua-api/careers/job/{id}`; populate
      `description`. `descriptionDepth` budget map:
      `'board'` → 0, `'detail-25'` (default) → 25, `'detail-all'` → ∞.
    - Akamai sentinel: when board GET returns 403 / 503 / HTML body
      (or any non-`{listings,lookup}`-shaped payload), return empty
      `JobResponseDto` with sentinel `ERR_TESLA_AKAMAI_CHALLENGE`.
      Other HTTP failures use `ERR_TESLA_FETCH_FAILED` (added during
      implementation — symmetric with Oracle / Mercor patterns).
    - HTTP via `@ever-jobs/common.createHttpClient`.
  - **Estimate:** 0.7 day.

- [x] T08 — Tesla unit tests (≥ 6 cases).
  **Landed run #51.**
  - **Files (planned):** `packages/plugins/source-tesla/__tests__/tesla.service.spec.ts`
    (extend), `…/__tests__/fixtures/tesla-board.json`,
    `…/__tests__/fixtures/tesla-job-{id}.json`.
  - **Files (actual):** matched plan exactly. The spec file grew
    from 7 cases (T07 registration / wire-format / budget-map /
    Akamai-403 / HTML-Akamai / HTTP-500) → 14 cases (7 carry-over
    + 7 behavioural — one extra over the ≥ 6 acceptance line so
    the `descriptionDepth='board'` budget=0 path AND the
    lookup-key null-fallback paths both get explicit pins).
    `tesla-board.json` ships a sanitised 50-listing corpus
    spanning **6** distinct `lookup.locations` keys (Palo Alto /
    Austin / Fremont / Remote-US / Berlin / Shanghai) and **5**
    `lookup.departments` keys (Engineering / Manufacturing /
    Sales & Service / Software & IT / Vehicle Service) — both
    over the minimum of ≥ 5 / ≥ 3. Plus 3 `lookup.regions` keys
    (Americas / EMEA / APAC) even though `r` is not currently
    consumed by `toJobPost()` (carries the upstream envelope
    shape forward for future enrichment specs). Listings 200049
    has `d: null` and 200050 has `l: null` to exercise the
    `toJobPost()` defensive paths. Detail fixtures:
    `tesla-job-200001.json` (FULL 4-field envelope),
    `tesla-job-200002.json` (PARTIAL 2-field — Description +
    Responsibilities only), `tesla-job-200003.json` (SINGLE-field
    — Compensation only), `tesla-job-missing.json` (the
    missing-all-four branch — only `department` + `timeType`
    metadata flows; the four free-text fields are absent so
    `composeDescription()` resolves to `null`).
  - **Acceptance:**
    - Cases: happy path with detail fetches (assert first 3 have
      `description !== null`, remainder `description === null`),
      empty `lookup.listings[]`, HTTP 500, Akamai 403 sentinel,
      Akamai 503 sentinel, resultsWanted cap pre-detail-fetch.
  - **Estimate:** 0.5 day. **Actual:** ~0.3 day (matches Spec 006 /
    T04 actual at run #31, Spec 013 / T04 actual at run #47, and
    Spec 013 / T06 actual at run #49).

## Phase 5 — Tesla-Playwright (OPTIONAL companion)

- [x] T09 — `TeslaPlaywrightService.scrape(input)` lazy-Playwright path.
  **Landed run #52.**
  - **Files (planned):** `packages/plugins/source-tesla-playwright/src/tesla-playwright.service.ts`,
    `…/tesla-playwright.types.ts`, `…/tesla-playwright.constants.ts`,
    `packages/plugins/source-tesla-playwright/package.json` (declares
    `"playwright": "^X.Y"` as a `peerDependency` + `optionalDependency`).
  - **Acceptance (FR-13):**
    - Lazy `import('playwright')` inside `scrape()`; caught when
      missing → sentinel `ERR_TESLA_PLAYWRIGHT_UNAVAILABLE` + empty
      `JobResponseDto`. Implemented via `Function('s', 'return import(s)')(...)`
      indirection so ts-jest doesn't statically resolve the missing
      module at compile time (typical TypeScript-tooling-vs-optional-dep
      friction; same trick the upstream `pino` / `pretty-print`
      ecosystem uses).
    - Headless Chromium launched with anti-automation flags mirroring
      upstream Python (`--disable-blink-features=AutomationControlled`
      plus `--disable-dev-shm-usage` and `--no-sandbox` for sandboxed
      CI hardening).
    - Navigate to `https://www.tesla.com/careers/search/`; wait for
      `networkidle` with 60 s timeout; settle 5 s after navigation;
      in-page `fetch()` through the established session.
    - Same `JobPostDto[]` mapping as `TeslaService` (FR-10) but
      emitting `Site.TESLA_PLAYWRIGHT` (not `Site.TESLA`) per Q-032
      default — dedup-engine's hash strategy collapses cross-site
      duplicates via `externalId`.
    - Three sentinel codes: `ERR_TESLA_PLAYWRIGHT_UNAVAILABLE` (missing
      `playwright`), `ERR_TESLA_PLAYWRIGHT_NAV_FAILED` (careers-page
      goto failed), `ERR_TESLA_PLAYWRIGHT_FETCH_FAILED` (in-page fetch
      failed or unexpected error). Browser always closed in `finally`.
  - **Estimate:** 0.8 day.

- [x] T10 — Tesla-Playwright unit tests (≥ 4 cases).
  **Landed run #53.**
  - **Files (planned):** `packages/plugins/source-tesla-playwright/__tests__/tesla-playwright.service.spec.ts`
    (extend), with `jest.mock('playwright', …)` for the happy-path
    case + a separate spec for the missing-dep case.
  - **Files (actual):** matched plan with one load-bearing
    deviation. The spec file grew from 5 cases (T09 carry-over —
    DI / Site enum / budget map / launch-args / missing-dep
    real-failure path) → 10 cases (5 carry-over + 5 behavioural —
    +1 over the ≥ 4 acceptance line so the
    `descriptionDepth='board'` budget=0 path AND the resultsWanted
    cap pre-detail-fetch path both get explicit pins, mirroring
    source-tesla T08's analogous cases 12 + 13). Local fixtures
    ship under `__tests__/fixtures/`:
    `tesla-playwright-board.json` (10 listings × 6 location keys ×
    5 department keys × 3 region keys; listings 300009 / 300010
    exercise the missing-`d` / missing-`l` defensive paths,
    intentionally smaller than source-tesla's 50-row corpus since
    the in-page-fetch contract is identical and the smaller fixture
    keeps the OPT-IN companion's footprint lean) and four detail
    envelopes (`tesla-playwright-job-300001.json` full 4-field /
    `-300002.json` partial 2-field / `-300003.json` single-1 field /
    `-missing.json` missing-all-four → null description). The IDs
    use 300xxx (not source-tesla's 200xxx) so cross-fixture grep
    stays unambiguous when both packages are inspected together.
    **Deviation from planned approach:** instead of
    `jest.mock('playwright', …, { virtual: true })`, the tests
    inject the stubbed module via
    `jest.spyOn(service as any, 'loadPlaywright').mockResolvedValue(...)`.
    Reason: the production service uses a `Function('s','return
    import(s)')(specifier)` indirection (per T09) to defeat
    ts-jest's compile-time module resolution — that same
    indirection ALSO defeats Jest's hoisted `jest.mock` system,
    which intercepts at the require/import call site (Function-
    wrapped imports run in a fresh global scope outside Jest's
    instrumented loader). Spying on the lazy-loader method itself
    (one boundary closer to where the module is consumed) gives
    full control without fighting the indirection. `sleep()` is
    similarly spy-stubbed to skip the 5 s settle window.
  - **Acceptance:**
    - Cases: happy path with stubbed `playwright` module
      (5-job mapping pin + first-3-have-descriptions assertion +
      browser.close finally-block contract),
      `playwright` not installed sentinel
      (`require('playwright')` throws — exercised genuinely
      against the workspace's actual dependency graph in T09's
      carry-over case 5), Akamai bypass succeeds (anti-automation
      flag + networkidle + 60 s timeout wire-format pins),
      page navigation timeout returns empty (page.goto rejects
      with TimeoutError-shape error → empty JobResponseDto + no
      detail fetches + browser still closed). PLUS bonus:
      `descriptionDepth='board'` skips detail loop entirely;
      resultsWanted cap pre-detail-fetch (1 board + N details =
      N+1 page.evaluate calls).
  - **Estimate:** 0.5 day. **Actual:** ~0.3 day (matches Spec 006
    / T04 actual at run #31, Spec 013 / T04 actual at run #47,
    Spec 013 / T06 actual at run #49, Spec 013 / T08 actual at
    run #51).

## Phase 6 — Integration & docs

- [x] T11 — Three-plugin integration spec.
  **Landed run #54.**
  - **Files (planned):** `apps/api/__tests__/integration/source-ats-batch-2.integration.spec.ts`.
  - **Files (actual):** matched plan exactly. New 12-case suite
    structured into four `describe` blocks: four-place
    registration (`Site.ORACLE` / `Site.MERCOR` / `Site.TESLA`
    present + `Site.TESLA_PLAYWRIGHT` absent + ATS-flag check),
    fan-out across the three plugins (≥ 1 row from Oracle &
    Tesla on `eeho-us2` slug + dedicated Mercor `stripe` post-
    filter case + Tesla `resultsWanted` cap pre-detail-fetch),
    `JobsAggregator` Spec-003 dedup zero-collision pin + opt-out
    case, and per-plugin wire-format pins (Oracle finder string
    contains `siteNumber=CX_45001` + 8-facet list; Mercor single
    GET to `/work/listings-explore-page` + literal
    `Authorization: Bearer` header set; Tesla board GET +
    per-job detail GETs). Reuses fixtures from each plugin's
    `__tests__/fixtures/` directory rather than duplicating
    them — keeps the corpus single-sourced.
  - **Acceptance:**
    - Wires Oracle + Mercor + Tesla through live `JobsService`
      fan-out via stubbed-`createHttpClient` fixture.
    - Asserts each plugin contributes ≥ 1 row.
    - Asserts `JobsAggregator` dedup with zero collisions on the
      synthetic fixture (Spec 003 / FR-1).
    - Tesla-Playwright NOT in this suite (default
      `ALL_SOURCE_MODULES` excludes it). Additional regression
      guard: `Site.TESLA_PLAYWRIGHT` is asserted ABSENT from
      `PluginRegistry.listSiteKeys()`.
  - **Estimate:** 0.4 day. **Actual:** ~0.3 day (matches Spec
    006 / T09 actual at run #34).

- [x] T12 — Three-plugin e2e spec.
  **Landed run #55.**
  - **Files (planned):** `apps/api/__tests__/e2e/source-ats-batch-2.e2e-spec.ts`.
  - **Files (actual):** matched plan exactly. New 5-case suite
    mirrors the Spec 006 / T10 (batch-1) e2e shape: three single-
    source POSTs (oracle / mercor / tesla) + cross-plugin fan-out
    + `dedup=false` opt-out. Departs from the literal acceptance
    text in four ways (all pre-existing departures, see header
    comment in the spec file): (1) POST `/api/jobs/search` not
    GET — actual controller surface, returns `201 Created` per
    NestJS POST default; (2) `jest.mock('@ever-jobs/common', …)`
    not nock, since the unit + integration tiers already use it;
    (3) per-plugin slug routing (`eeho-us2` for oracle, `stripe`
    for mercor, ignored for tesla); (4) `descriptionDepth='board'`
    on cross-plugin tests so Tesla doesn't fan out 25 detail
    GETs against synthetic fixtures. Reuses each plugin's
    existing `__tests__/fixtures/` corpus directly (no
    duplication into `apps/api/__tests__/fixtures/`) — same
    single-source rationale as T11.
  - **Acceptance:**
    - `GET /api/jobs?site=oracle&companyUrl=https%3A%2F%2Feeho.fa.us2.oraclecloud.com`,
      `&site=mercor&companySlug=stripe`, `&site=tesla` return
      `200 OK` + non-empty `JobPostDto[]` against a sandboxed
      fixture server.
    - Asserts dedup-engine consumes the rows without collisions
      across the three plugins.
  - **Estimate:** 0.4 day. **Actual:** ~0.3 day (matches Spec 006
    / T10 actual at run #35).

- [x] T13 — Coverage docs.
  **Landed run #56.**
  - **Files (planned):** `docs/ATS_INTEGRATIONS.md` (three new
    matrix rows for Oracle / Mercor / Tesla; Tesla-Playwright noted
    as opt-in companion in a sub-row), `docs/COMPANY_SLUG_DIRECTORY.md`
    (≥ 10 seed slugs each for Oracle / Mercor / Tesla — Mercor's
    "slugs" are case-insensitive substring matches against
    `companyName`).
  - **Files (actual):** matched plan exactly.
    `docs/ATS_INTEGRATIONS.md` gained three new H3 sections after
    Join.com (`### Oracle HCM Cloud (Oracle Recruiting Cloud)` /
    `### Mercor` / `### Tesla`) — the Tesla section folds the
    Playwright companion into the prose as the second of two
    bullet variants (matches the spec's "sub-row" framing without
    introducing a new H3 just for the OPTIONAL companion).
    `docs/COMPANY_SLUG_DIRECTORY.md` gained three new H2 sections
    after Join.com (`## Oracle HCM Cloud` / `## Mercor` /
    `## Tesla`) with 15 / 12 / 1 entries respectively. Tesla's
    single entry honours the per-plugin "single-tenant" line
    over the umbrella "≥ 10" line — documented inline so a
    future contributor doesn't read it as an oversight. The
    `Last Updated:` header on the directory bumped from
    2026-04-27 → 2026-04-28.
  - **Acceptance:**
    - Matrix rows include: Method (REST / GraphQL / Playwright),
      Data Format, Notable Users (sampled from upstream
      `*_companies.csv`), URL pattern.
    - Seed-slug entries for Oracle sampled from
      `OTHERS/Ats-scrapers/oracle/oracle_companies.csv` (e.g.
      `eeho-us2`, `ttx`, `cooper`); for Mercor a curated list of
      visible companies on the explore page (e.g. `stripe`, `notion`,
      `airbnb`); for Tesla a single entry (`tesla`, since it is
      single-tenant).
  - **Estimate:** 0.4 day. **Actual:** ~0.3 day.

- [x] T14 — Performance benches.
  **Landed run #57.**
  - **Files (planned):** `packages/plugins/source-ats-oracle/__tests__/oracle.bench.ts`,
    `packages/plugins/source-ats-mercor/__tests__/mercor.bench.ts`,
    `packages/plugins/source-tesla/__tests__/tesla.bench.ts`,
    plus four new npm-script entry points (`bench:oracle`,
    `bench:mercor`, `bench:tesla`, `bench:ats-batch-2`).
  - **Files (actual):** matched plan exactly. Three new bench files
    (≈ 175 LOC each — Oracle / Mercor / Tesla) and four new npm
    scripts appended after `bench:ats-batch-1` in the root
    `package.json`. The Tesla bench is the longest (~185 LOC)
    because of the URL-keyed router that dispatches `/cua-api/apps/
    careers/state` → `tesla-board.json` and `/cua-api/careers/job/
    <id>` → matching detail fixture (200001 / 200002 / 200003)
    with `tesla-job-missing.json` as the fallback. Same router
    shape Spec 013 / T11 (integration) and T12 (e2e) use, so a
    future contributor can `git diff` the three test runners and
    convince themselves the bench measures the real wire shape.
    Oracle and Mercor benches each issue ONE GET per scrape (Oracle
    short-page-termination on the 5-row fixture; Mercor
    catalogue-wide endpoint with no pagination).
  - **Acceptance:**
    - Each bench runs 3 warm-ups + 20 timed iterations against the
      `__tests__/fixtures/` corpus; patches
      `@ever-jobs/common.createHttpClient` via module-cache override
      BEFORE requiring the service.
    - Computes `min/median/mean/p95/p99/max` +
      `memory_bytes.{before,after,delta}`; emits a single JSON
      record at `dist/bench/<plugin>.json`.
    - NFR-2 ceilings pinned: Oracle < 6 s, Mercor < 1.5 s, Tesla
      (HTTP-only, ≤ 25 detail fetches) < 12 s.
    - Bench reports `p95_under_ceiling` + `headroom_pct` but does
      NOT exit non-zero on breach (CI gating is a follow-up spec,
      same boundary as Spec 006 / T12).
  - **Estimate:** 0.4 day. **Actual:** ~0.3 day (matches the Spec
    006 / T12 batch-1 bench landing cadence).

## Phase 7 — Closeout

- [x] T15 — Spec 013 graduates to "All phases done".
  **Landed run #58.**
  - **Files (planned):** `.specify/specs/013-ats-scrapers-parity-batch-2/spec.md`
    (Status flip), `competitor-watch.md §C` (rows AC-4 / AC-5 / AC-6
    marked DONE with run-tag attributions), `docs/log.md` (closeout
    entry), `docs/index.md` (Spec 013 status update).
  - **Files (actual):** matched plan exactly. Status field on
    spec.md flipped to "All phases done (T01..T15 runs #44..#58);
    spec complete". `competitor-watch.md §C` rows AC-4 / AC-5 /
    AC-6 each gained the ✅ glyph in the Owner column and the
    "**DONE (runs #44..#58)**" prefix.
    `docs/index.md` Spec 013 row updated to read
    "All phases done (T01..T15 runs #44..#58); spec complete".
    `docs/log.md` gained a closeout entry under the standard
    run-#58 heading. Spec 014 candidate pinned to **Q-026 /
    Q-027 salary residuals** rather than AC-8 (seed-companies
    refresh) — rationale: 41 consecutive zero-churn runs in
    `OTHERS/` mean AC-8's "refresh from CSVs" carries no fresh
    upstream signal, while Q-026 / Q-027 have remained open
    with documented defaults since Spec 012 / T04 (run #41) and
    represent a known parser-correctness gap. AC-8 deferred to
    Spec 015 candidate; AC-9 to Spec 016 candidate; ATS
    detail-page enrichment (Spec 006 / Spec 013 § 3 non-goals
    carry-over) renumbered to Spec 017 candidate.
  - **Acceptance:**
    - Status field reads "All phases done (T01..T15 runs #44..#XX);
      spec complete".
    - §C rows AC-4 / AC-5 / AC-6 marked **DONE** with run-tag
      attributions and ✅ glyph.
    - Notes-for-the-next-run pinned to:
      * Spec 014 candidate = Q-026 / Q-027 salary residuals
        (chosen over AC-8 due to upstream signal asymmetry — see
        Files (actual) above).
      * Spec 015 candidate = AC-8 (seed-companies refresh —
        revisit when upstream CSV churn resumes).
      * Spec 016 candidate = AC-9 (Workable diff).
      * Spec 017 candidate = ATS detail-page enrichment
        (carry-over from Spec 006 / Spec 013 § 3 non-goals).
  - **Estimate:** 0.25 day. **Actual:** ~0.2 day (matches Spec 006
    / T13 actual at run #36).

---

## Notes for the next run (after this scaffold lands)

- **Default for run #59** = **Spec 014** scaffolding pass for
  Q-026 / Q-027 salary-parser residuals. Three new artefacts
  under `.specify/specs/014-salary-parser-residuals/` (spec.md +
  plan.md + tasks.md) addressing the two open questions logged
  at Spec 012 / T04 (run #41):
  - **Q-026** — bare-number country fallback: when
    `extractSalary` is given an input like `"50000-80000"` (no
    currency symbol, no ISO code) and an explicit
    `options.country`, the parser currently falls through to
    its default-currency branch instead of consulting the
    `country → currency` map. Documented default = honour
    `options.country` for the currency dispatch; only fall
    through when both currency-detection paths AND
    `options.country` are absent.
  - **Q-027** — `$` symbol registration + apostrophe-in-numSrc:
    the current symbol regex does not register `$` as a USD
    detector (USD is the default; the symbol's absence is a
    historical oversight). Apostrophes inside the number-source
    capture (`"$50'000"` for Swiss formatting OR escaped
    apostrophes inside JS string literals) need an additional
    Swiss-locale tolerance branch in `parseSalaryNumber`.
  Pure docs / Spec-Kit scaffolding pass; NO source code. Spec
  covers FR-1..FR-N (TBD during scaffolding) addressing both
  residuals; T01..T05 across three phases (Phase 1: enum +
  helper signature pass; Phase 2: per-residual implementation
  + unit cases; Phase 3: closeout). Estimated 0.5 day for the
  scaffolding pass.
- **Default for run #58 (DONE — landed run #58)** = Spec 013 /
  Phase 7 / T15 — Spec 013 closeout. Status flipped to "All
  phases done (T01..T15 runs #44..#58); spec complete";
  AC-4 / AC-5 / AC-6 marked **DONE** with ✅ glyph; Spec 014
  pinned to Q-026 / Q-027 salary residuals (chosen over AC-8
  due to upstream signal asymmetry — 41 consecutive zero-churn
  runs in `OTHERS/`).
- **Default for run #57 (DONE — landed run #57)** = Spec 013 /
  Phase 6 / T14 — performance benches. Three new bench files
  (`packages/plugins/source-ats-oracle/__tests__/oracle.bench.ts`,
  `packages/plugins/source-ats-mercor/__tests__/mercor.bench.ts`,
  `packages/plugins/source-tesla/__tests__/tesla.bench.ts`), each
  running 3 warm-ups + 20 timed iterations against the existing
  `__tests__/fixtures/` corpus and emitting JSON to
  `dist/bench/<plugin>.json`. NFR-2 ceilings pinned: Oracle < 6 s,
  Mercor < 1.5 s, Tesla (HTTP-only, ≤ 25 detail fetches) < 12 s.
  Plus four new npm scripts (`bench:oracle`, `bench:mercor`,
  `bench:tesla`, `bench:ats-batch-2`). Mirror the Spec 006 / T12
  bench pattern; CI gating deferred. Two load-bearing decisions
  resolved during T14's authoring pass (full prose in spec.md
  § 10): Tesla bench pins `descriptionDepth: 'detail-25'` inline
  even though it's the service default (so the emitted JSON
  record self-documents the wire shape); Oracle bench uses a
  single-fixture stub instead of Avature's page-1 / page-empty
  switch (Oracle's loop has a short-page exit, Avature's only
  exits on empty).
- **Default for run #56 (DONE — landed run #56)** = Spec 013 /
  Phase 6 / T13 — coverage docs. Three new H3 sections in
  `ATS_INTEGRATIONS.md` (Oracle / Mercor / Tesla, with Tesla
  folding the Playwright companion into the prose) + three new
  H2 sections in `COMPANY_SLUG_DIRECTORY.md` (15 Oracle seeds /
  12 Mercor `companyName`-substring seeds / 1 Tesla single-tenant
  entry).
- **Default for run #55 (DONE — landed run #55)** = Spec 013 /
  Phase 6 / T12 — three-plugin e2e spec under
  `apps/api/__tests__/e2e/source-ats-batch-2.e2e-spec.ts`. 5-case
  suite mirrors Spec 006 / T10 (batch-1) e2e shape: oracle /
  mercor / tesla single-source POSTs + cross-plugin fan-out +
  `dedup=false` opt-out. Reuses each plugin's existing fixtures
  (single-sourced URL→fixture router same as T11). Same four
  pre-existing departures as batch-1's e2e (POST not GET, 201
  not 200, `jest.mock('@ever-jobs/common')` not nock,
  `descriptionDepth='board'` to keep Tesla cheap on the
  cross-plugin tests).
- **Default for run #54 (DONE — landed run #54)** = Spec 013 /
  Phase 6 / T11 — three-plugin integration spec under
  `apps/api/__tests__/integration/source-ats-batch-2.integration.spec.ts`.
  12 cases: four-place registration (incl. `Site.TESLA_PLAYWRIGHT`
  absence guard) + cross-plugin fan-out + dedup zero-collision +
  per-plugin wire-format pins. Reuses each plugin's fixtures
  rather than duplicating them.
- **Default for run #53 (DONE — landed run #53)** = Spec 013 /
  Phase 5 / T10 — Tesla-Playwright behavioural unit-test sweep.
  Spec file grew from 5 → 10 cases (5 carry-over + 5
  behavioural — +1 over the ≥ 4 acceptance line for explicit
  `board`-budget + resultsWanted-cap pins). Local fixtures shipped
  under `__tests__/fixtures/`: `tesla-playwright-board.json`
  (10 listings × 6 locations × 5 departments × 3 regions; ID range
  300xxx; listings 300009 / 300010 exercise missing-`d` / `l`
  branches), four detail envelopes
  (`tesla-playwright-job-300001.json` full 4-field /
  `-300002.json` partial 2-field / `-300003.json` single-1 field /
  `-missing.json` missing-all-four). Stubbing approach deviated
  from the planned `jest.mock('playwright', …, { virtual: true })`
  factory: the `Function('s','return import(s)')(specifier)`
  indirection added in T09 also defeats Jest's hoisted-mock
  system, so tests `jest.spyOn(service as any, 'loadPlaywright')`
  the lazy loader instead — gives full control over the playwright
  surface without fighting the indirection. `sleep()` similarly
  spy-stubbed to skip the 5 s settle window.
- **Default for run #52 (DONE — landed run #52)** = Spec 013 /
  Phase 5 / T09 — `TeslaPlaywrightService.scrape(input)`
  lazy-Playwright path in the OPTIONAL companion package.
  Real `tesla-playwright.service.ts` + `tesla-playwright.types.ts`
  + `tesla-playwright.constants.ts` shipped. Lazy import via
  `Function('s', 'return import(s)')` indirection (avoids
  ts-jest's static-resolution friction with optional deps);
  three sentinel codes (`ERR_TESLA_PLAYWRIGHT_UNAVAILABLE` /
  `_NAV_FAILED` / `_FETCH_FAILED`); browser always closed in
  `finally`. Emits `Site.TESLA_PLAYWRIGHT` (Q-032 default).
- **Default for run #51 (DONE — landed run #51)** = Spec 013 /
  Phase 4 / T08 — Tesla behavioural unit-test sweep. Spec file
  grew from 7 → 14 cases (7 carry-over + 7 behavioural —
  +1 over the ≥ 6 acceptance line for explicit `board=0`-budget
  + lookup-key null-fallback pins);
  `__tests__/fixtures/tesla-board.json` shipped (50 listings ×
  6 locations × 5 departments × 3 regions; listings 200049 /
  200050 exercise the missing-`d` / missing-`l` branches);
  detail fixtures `tesla-job-200001.json` (full 4-field) /
  `tesla-job-200002.json` (partial 2-field) /
  `tesla-job-200003.json` (single-field) /
  `tesla-job-missing.json` (missing-all-four → composeDescription
  returns null) ship the documented detail-envelope variants.
- **Default for run #50 (DONE — landed run #50)** = Spec 013 /
  Phase 4 / T07 — `TeslaService.scrape(input)` HTTP-only board +
  detail path. Real `tesla.service.ts` + `tesla.types.ts` +
  `tesla.constants.ts` shipped; sentinel codes
  `ERR_TESLA_AKAMAI_CHALLENGE` (403 / 503 / non-JSON body) +
  `ERR_TESLA_FETCH_FAILED` (other HTTP failures) recorded via
  `Logger.warn`. Detail-fetch budget honoured per Q-031 / FR-11.
  Three load-bearing decisions resolved during implementation
  (board envelope path divergence from FR-10; two-sentinel error
  model symmetric with Oracle/Mercor; broadened Akamai detection
  beyond status codes to "any non-JSON-shaped payload"); see § 10
  Decisions log of spec.md.
- **Default for run #49 (DONE — landed run #49)** = Spec 013 /
  Phase 3 / T06 — Mercor behavioural unit-test sweep. Spec file
  grew from 5 → 11 cases; `__tests__/fixtures/mercor-explore.json`
  shipped (50-listing × 12-company corpus exercising slug
  post-filter narrowing, resultsWanted-cap-after-filter, hourly /
  monthly / yearly compensation intervals, remote / on-site
  locations, and the compensation-null branch via two deliberate
  null-rate entries).
- **Default for run #48 (DONE — landed run #48)** = Spec 013 /
  Phase 3 / T05 — `MercorService.scrape(input)` single GET path
  against `https://aws.api.mercor.com/work/listings-explore-page`.
  Real `mercor.service.ts` + `mercor.types.ts` +
  `mercor.constants.ts` shipped; literal `Authorization: Bearer`
  empty-token header per FR-8; client-side `companyName`
  substring post-filter; `resultsWanted` cap applied AFTER filter;
  sentinel codes `ERR_MERCOR_ENVELOPE` /
  `ERR_MERCOR_FETCH_FAILED` recorded via `Logger.warn`.
- **Default for run #47 (DONE — landed run #47)** = Spec 013 /
  Phase 2 / T04 — Oracle behavioural unit-test sweep. Spec file
  grew from 4 → 10 cases; `__tests__/fixtures/oracle-page-1.json`
  shipped (sanitised `eeho-us2` 5-row corpus + in-test
  `buildSyntheticPage()` for the ≥ 200-job `resultsWanted` cap
  exercise). `axios` factory mocked at `@ever-jobs/common.createHttpClient`
  per the Avature pattern.
- **Default for run #46 (DONE — landed run #46)** = Spec 013 /
  Phase 2 / T03 — `OracleService.scrape(input)` REST + finder-string
  path. Real `oracle.service.ts` + `oracle.types.ts` +
  `oracle.constants.ts` shipped; sentinel codes
  `ERR_ORACLE_BAD_TENANT` / `ERR_ORACLE_FINDER_REJECTED` recorded
  via `Logger.warn`. Wire format follows upstream Python's exact
  comma+semicolon scheme (see § 10 Decisions log).
- **Default for run #45 (DONE — landed run #45)** = Spec 013 /
  Phase 1 / T02 — scaffold the four new plugin packages and
  append three (Oracle / Mercor / Tesla) to `ALL_SOURCE_MODULES`.
  `TeslaPlaywrightModule` deliberately excluded per FR-13.
- **Default for run #44 (DONE — landed run #44)** = Spec 013 /
  Phase 1 / T01 (Site enum + tsconfig paths + jest moduleNameMapper
  + `ScraperInputDto` extensions). Pure scaffolding pass; same
  shape as Spec 006 / T01 (run #29).
- **Out-of-scope reminders for future runs:**
  - Tesla-Playwright is OPT-IN. Do NOT add it to
    `ALL_SOURCE_MODULES` even when the package compiles.
  - `playwright` dep is declared on `source-tesla-playwright`'s
    `package.json` ONLY. Root `package.json` does NOT declare it.
    Lockfile sync uses the npmjs.org registry override per
    `MEMORY.md` "Lockfile registry rule".
  - Q-026 / Q-027 salary-parser residuals are NOT bundled into Spec
    013. They retain their own future spec ID (Spec 014 or later).
  - Detail-page enrichment for Oracle / Mercor (richer
    `JobPostDto.description`, `applicationUrl`, etc.) is deferred
    to candidate Spec 016. Do NOT extend Oracle's or Mercor's
    services with detail fetches in this batch.
- **Decision boundaries to honour during T01..T15:**
  - **`source-tesla` (default) is HTTP-only.** No `playwright`
    import in this package, period. The Akamai bypass is a feature
    of the OPTIONAL companion plugin.
  - **Mercor is catalogue-wide.** Do NOT implement per-slug URL
    construction; the explore-page endpoint is the only entry point.
    Filter happens client-side after the GET.
  - **Oracle's `companyUrl` is the canonical input.** `companySlug`
    is a convenience shorthand; do NOT prefer it when both supplied.
- **Cross-spec coordination:**
  - When Spec 014 (or whichever spec inherits Q-026/Q-027) lands,
    update `docs/questions.md` Q-026/Q-027 resolution text from
    "tentatively Spec 013" to the actual spec ID that landed.
  - When Spec 016 (detail-page enrichment) lands, update Spec 006 §
    3 + Spec 013 § 3 non-goals references from "candidate Spec 016"
    to the actual spec ID + status.
