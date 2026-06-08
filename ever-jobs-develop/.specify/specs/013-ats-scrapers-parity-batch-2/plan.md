# Plan 013 — ATS-Scrapers Parity, Batch 2 (Oracle HCM Cloud / Mercor / Tesla)

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-04-27                         |
| Last updated | 2026-04-27                         |

> Implementation plan for `Spec 013 — ats-scrapers-parity-batch-2`.

## Overview

Three new default source plugins (plus one OPTIONAL companion plugin)
ship in this spec. They share the same shape (NestJS module + `IScraper`
service + types + constants + barrel index + `__tests__`) and the same
registration topology (per `AGENTS.md §5`). Per-plugin business logic
differs significantly:

- **Oracle HCM Cloud** — multi-tenant REST. URL composition from
  `companyUrl` (full URL override) OR `companySlug` (`<subdomain>-<region>`
  form → `https://<subdomain>.fa.<region>.oraclecloud.com`). Finder-string
  pagination via `offset=N` against
  `/hcmRestApi/resources/latest/recruitingCEJobRequisitions` until
  `requisitionList[]` empty OR `resultsWanted` cap. Closest existing
  analogue: `source-ats-workday/` (multi-tenant URL discovery).
- **Mercor** — single-tenant catalogue-wide. ONE GET to
  `https://aws.api.mercor.com/work/listings-explore-page` with the
  literal `Authorization: Bearer` (empty token) header. Returns the
  full public catalogue; `companySlug` post-filters by case-insensitive
  substring match on `companyName`. Different shape from any existing
  plugin: catalogue-wide rather than slug-keyed. Closest existing
  analogue: `source-ats-greenhouse/` (public-board JSON path), but
  with no slug-driven URL rewrite.
- **Tesla** (default) — single-company, pure-HTTP. Direct
  `GET https://www.tesla.com/cua-api/apps/careers/state` with rotated
  UA + `Accept: application/json`; emits `JobPostDto[]` from
  `data.lookup.listings[]`. Follow-up `GET .../careers/job/{id}` for
  the first ≤ 25 jobs to populate `description` (FR-11). When the
  board endpoint returns 403/503/Akamai-HTML, returns empty
  `JobResponseDto` with sentinel error code (operator opts into the
  Playwright fallback if needed). Different shape from any existing
  plugin: single-tenant + N+1 detail-fetch pattern. Closest existing
  analogue: `source-ats-greenhouse/` for the JSON parsing, but no
  multi-tenancy.
- **Tesla-Playwright** (OPTIONAL companion) — lazy-imports
  `playwright` at first `scrape()` call. NOT included in
  `ALL_SOURCE_MODULES` by default; operators opt in via
  `EVER_JOBS_PLUGINS_TESLA_PLAYWRIGHT=1` env var (or the equivalent
  config-driven plugin allowlist landing in a future spec).

Each default plugin emits standard `JobPostDto[]` rows so the existing
`dedup-hybrid` engine and `JobsAggregator` consume them without any
core-side changes.

## Phases

### Phase 1 — Bootstrap

Goal: Land registration scaffolding and stop-the-world types so later
phases compile. No business logic yet.

- **T01** — Site enum additions (`ORACLE`, `MERCOR`, `TESLA`,
  `TESLA_PLAYWRIGHT`) + `tsconfig.base.json` paths + `jest.config.js`
  moduleNameMapper. Plus a one-line addition to
  `packages/models/src/dtos/scraper-input.dto.ts` adding
  `siteNumber?: string` (Oracle's finder-string parameter, FR-4) and
  `descriptionDepth?: 'board' | 'detail-25' | 'detail-all'` (Tesla's
  detail-fetch knob, FR-11 / Q-031).
- **T02** — Four empty plugin packages
  (`source-ats-oracle`, `source-ats-mercor`, `source-tesla`,
  `source-tesla-playwright`) with `package.json`, `tsconfig.json`,
  `src/index.ts`, `src/<plugin>.module.ts`,
  `src/<plugin>.service.ts` (stub),
  `__tests__/<plugin>.service.spec.ts` (placeholder). Append the
  three DEFAULT plugins (NOT Tesla-Playwright) to
  `packages/plugins/index.ts`'s `ALL_SOURCE_MODULES`.

### Phase 2 — Oracle HCM Cloud

- **T03** — `OracleService.scrape(input)` — REST + finder-string,
  pagination via `?offset=N&limit=100`, custom-tenant resolution from
  `companyUrl` else subdomain-region construction from `companySlug`.
  Use `axios` via `@ever-jobs/common.createHttpClient` (no new deps).
- **T04** — Oracle unit tests (≥ 6 cases: happy path, empty,
  HTTP 500, resultsWanted cap, custom-tenant URL override, custom
  `siteNumber` override).

### Phase 3 — Mercor

- **T05** — `MercorService.scrape(input)` — single GET to the
  explore-page endpoint with the literal `Authorization: Bearer`
  empty-token header; post-filter `listings[]` by `companySlug`
  (case-insensitive substring on `companyName`); cap by `resultsWanted`.
- **T06** — Mercor unit tests (≥ 5 cases: happy path with full
  catalogue, slug post-filter narrows result, empty `listings[]`,
  HTTP 500, resultsWanted cap mid-catalogue).

### Phase 4 — Tesla (default, pure-HTTP)

- **T07** — `TeslaService.scrape(input)` — board endpoint GET +
  follow-up detail-endpoint GETs for the first ≤ 25 jobs (FR-11 /
  Q-031). When board endpoint returns 403 / 503 / Akamai HTML body,
  return empty `JobResponseDto` with sentinel error code recorded.
  Use `axios` via `@ever-jobs/common.createHttpClient`.
- **T08** — Tesla unit tests (≥ 6 cases: happy path with detail
  fetches, empty `lookup.listings[]`, HTTP 500, Akamai 403 sentinel,
  Akamai 503 sentinel, resultsWanted cap pre-detail-fetch).

### Phase 5 — Tesla-Playwright (OPTIONAL companion)

- **T09** — `TeslaPlaywrightService.scrape(input)` — lazy
  `import('playwright')` (caught when missing → sentinel
  `ERR_TESLA_PLAYWRIGHT_UNAVAILABLE`), launch headless Chromium,
  navigate to careers page, scrape via in-page fetch through the
  established session. Mirrors upstream Python `tesla/main.py` flow
  (~700 LOC reduced to ~300 LOC TS).
- **T10** — Tesla-Playwright unit tests (≥ 4 cases: happy path with
  stubbed `playwright` module, `playwright` not installed sentinel,
  Akamai bypass succeeds, page navigation timeout returns empty).

### Phase 6 — Integration & docs

- **T11** — `apps/api/__tests__/integration/source-ats-batch-2.integration.spec.ts`
  (live wiring: three default plugins fan-out + dedup; Tesla-Playwright
  excluded — it is opt-in).
- **T12** — `apps/api/__tests__/e2e/source-ats-batch-2.e2e-spec.ts`
  (real HTTP via supertest + mocked upstream; assert 200 OK +
  non-empty rows for each `&site=` value).
- **T13** — `docs/ATS_INTEGRATIONS.md` matrix update; new
  `docs/COMPANY_SLUG_DIRECTORY.md` entries for the three default
  plugins' seed companies (read from upstream
  `OTHERS/Ats-scrapers/oracle/oracle_companies.csv` etc., filtered to
  a "starter" subset of ~10 per plugin — full bulk-discovery refresh
  remains AC-8 / future Spec).
- **T14** — Performance benches under each default plugin's
  `__tests__/<plugin>.bench.ts`. Bench ships green; CI gating is a
  follow-up spec.

### Phase 7 — Closeout

- **T15** — Spec 013 graduates to "All phases done"; Spec 013
  follow-ups (AC-8 / AC-9 + Q-026 / Q-027 salary residuals) listed
  in `tasks.md` Notes-for-the-next-run as Spec 014 / 015 candidates.

## Packages touched

| Package                                               | Change                                |
| ----------------------------------------------------- | ------------------------------------- |
| `packages/models/src/enums/site.enum.ts`              | Four enum values added (3 default + 1 optional). |
| `packages/models/src/dtos/scraper-input.dto.ts`       | Two new optional fields (`siteNumber`, `descriptionDepth`). |
| `packages/plugins/index.ts`                           | Three modules appended to `ALL_SOURCE_MODULES` (default plugins only). |
| `tsconfig.base.json`                                  | Four `paths` entries added.           |
| `jest.config.js`                                      | Four `moduleNameMapper` entries.      |
| `packages/plugins/source-ats-oracle/`                 | New package.                          |
| `packages/plugins/source-ats-mercor/`                 | New package.                          |
| `packages/plugins/source-tesla/`                      | New package.                          |
| `packages/plugins/source-tesla-playwright/`           | New package (optional companion; lazy-imports `playwright`). |
| `apps/api/__tests__/integration/`                     | One new integration suite.            |
| `apps/api/__tests__/e2e/`                             | One new e2e suite.                    |
| `docs/ATS_INTEGRATIONS.md`                            | Coverage matrix entries.              |
| `docs/COMPANY_SLUG_DIRECTORY.md`                      | Seed-slug entries.                    |

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Oracle finder-string syntax drift (Oracle quietly renames `recruitingCEJobRequisitions` → versioned path) | Low | Pin path via constant `ORACLE_FINDER_PATH`; one-line update if upstream rotates. Test fixture documents current path. |
| Mercor's explore-page endpoint adds auth (literal `Bearer` rejected) | Medium | Catch 401 / 403 → empty `JobResponseDto` + sentinel; future spec adds candidate-JWT flow if real-world demand surfaces. |
| Tesla's Akamai challenge upgrade defeats the pure-HTTP path | High | EXPECTED. The HTTP path is best-effort by design (FR-12); operators install `source-tesla-playwright` for the bypass. CI fixture pins the HTTP-200 path so regressions in the parser stay visible. |
| `playwright` install size (~280 MB Chromium) silently included in default builds | High (footgun) | Mitigated by structuring `source-tesla-playwright` as a SEPARATE package whose `package.json` is the ONLY one to declare `playwright` as a dep, AND by NOT including it in `ALL_SOURCE_MODULES` by default. Cold-start NFR-1 stays clean for the 99% of operators not running Tesla. |
| `playwright` lazy `import()` evaluated under `ts-node` test runs without `playwright` installed | Medium | Test guards: explicit `try { import('playwright') } catch` path returns sentinel; unit test fixtures stub the module via `jest.mock('playwright', …)`. |
| Lockfile churn from `playwright` dep on `source-tesla-playwright` | Medium | Document in `docs/log.md` per the lockfile registry rule (memory: use `npm install --registry=https://registry.npmjs.org/` to override Verdaccio mirror). |
| Per-plugin CI test parallelism saturates GitHub-runner cores | Low | Each plugin's `__tests__/` is < 10 cases; jest's default `--maxWorkers=50%` absorbs the increment. Spec 006 added 30+ cases without runner stress. |
| Cold-start NFR-1 (<25 ms/plugin) regressed by three new default plugins | Low | Same module-init cost as Greenhouse / Lever / Workday; no new top-level imports beyond what `@ever-jobs/common` already pulls. Verify via T14 bench. |
| Tesla detail-fetch budget (FR-11 default 25) too aggressive for large boards | Medium | `descriptionDepth` knob lets operators opt out (`'board'`) or in (`'detail-all'`); default 25 keeps NFR-2 < 12 s on the happy path. Q-031 default. |

## Acceptance gates

- [ ] All four-place registrations applied for each new default plugin.
- [ ] Tesla-Playwright registered in `tsconfig.base.json` + `jest.config.js`
      ONLY (not `ALL_SOURCE_MODULES`).
- [ ] `npm run lint:docs` green.
- [ ] `npm run test -- --testPathPattern=source-(ats-oracle|ats-mercor|tesla|tesla-playwright)` green.
- [ ] `npm run build` green.
- [ ] `apps/api/__tests__/integration/source-ats-batch-2.integration.spec.ts` green.
- [ ] `apps/api/__tests__/e2e/source-ats-batch-2.e2e-spec.ts` green.
- [ ] `docs/ATS_INTEGRATIONS.md` matrix shows three new rows (Oracle /
      Mercor / Tesla); Tesla-Playwright noted as opt-in companion.
- [ ] `docs/log.md` appended with run-tagged entries for T01..T15.
