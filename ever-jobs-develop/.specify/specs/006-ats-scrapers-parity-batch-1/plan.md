# Plan 006 — ATS-Scrapers Parity, Batch 1 (Avature / Gem / Join.com)

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-04-27                         |
| Last updated | 2026-04-27                         |

> Implementation plan for `Spec 006 — ats-scrapers-parity-batch-1`.

## Overview

Three new ATS source plugins ship in this spec. They share the same
shape (NestJS module + `IScraper` service + types + constants + barrel
index + `__tests__`) and the same registration topology (per
`AGENTS.md §5`). Per-plugin business logic differs:

- **Avature** — HTML scrape via `cheerio`, multi-selector resilience
  borrowed from the upstream Python (`article.job` / `div.job-item`
  / `li.job-listing` / `tr.job` / `div[data-job-id]`, with link-text
  fallback). Per-tenant base URL via `companyUrl` override.
- **Gem** — single batched GraphQL POST. Two operations
  (`JobBoardTheme` + `JobBoardList`) issued in one round-trip; we
  consume only `JobBoardList`'s response and discard `JobBoardTheme`
  (the upstream Python uses theme for rendering chrome we don't ship).
- **Join.com** — two-step REST: scrape company page for ID, paginate
  `/api/public/companies/<id>/jobs?page=N&pageSize=50` until
  `pagination.totalPages` reached or `items[]` empty.

Each plugin emits standard `JobPostDto[]` rows so the existing
`dedup-hybrid` engine and `JobsAggregator` consume them without any
core-side changes.

## Phases

### Phase 1 — Bootstrap

Goal: Land registration scaffolding and stop-the-world types so
later phases compile. No business logic yet.

- **T01** — Site enum additions (`AVATURE`, `GEM`, `JOIN_COM`) +
  `tsconfig.base.json` paths + `jest.config.js` moduleNameMapper.
- **T02** — Three empty plugin packages
  (`source-ats-avature`, `source-ats-gem`, `source-ats-joincom`)
  with `package.json`, `tsconfig.json`, `src/index.ts`,
  `src/<plugin>.module.ts`, `src/<plugin>.service.ts` (stub),
  `__tests__/<plugin>.service.spec.ts` (placeholder).
  Append to `packages/plugins/index.ts`'s `ALL_SOURCE_MODULES`.

### Phase 2 — Avature

- **T03** — `AvatureService.scrape(input)` — HTML scrape,
  pagination via `?jobOffset` / `?jobRecordsPerPage`, custom-domain
  resolution from `companyUrl` else subdomain construction. Use
  `cheerio` (already in `@ever-jobs/common` per Greenhouse's
  pattern) for HTML parsing.
- **T04** — Avature unit tests (5 cases: happy path, empty,
  HTTP 500, resultsWanted cap, custom-domain override).

### Phase 3 — Gem

- **T05** — `GemService.scrape(input)` — single batched POST to
  `https://jobs.gem.com/api/public/graphql/batch`; parse
  `oatsExternalJobPostings.jobPostings[]`; tolerate operation
  order swap in response array.
- **T06** — Gem unit tests (4 cases: happy path, empty
  `jobPostings`, HTTP 500, response-order tolerance).

### Phase 4 — Join.com

- **T07** — `JoinComService.scrape(input)` — two-step:
  `GET /companies/<slug>` → regex-extract numeric ID;
  `GET /api/public/companies/<id>/jobs?…` paginated until
  `totalPages`. `resultsWanted` cap respected mid-pagination.
- **T08** — Join.com unit tests (5 cases: happy path, empty,
  HTTP 500, slug-not-found, resultsWanted-mid-page cap).

### Phase 5 — Integration & docs

- **T09** — `apps/api/__tests__/integration/source-ats-batch-1.integration.spec.ts`
  (live wiring: all three plugins fan-out + dedup).
- **T10** — `apps/api/__tests__/e2e/source-ats-batch-1.e2e-spec.ts`
  (real HTTP via supertest + mocked upstream; assert 200 OK +
  non-empty rows for each `&site=` value).
- **T11** — `docs/ATS_INTEGRATIONS.md` matrix update; new
  `docs/COMPANY_SLUG_DIRECTORY.md` entries for the three plugins'
  seed companies (read from upstream `*_companies.csv` files but
  filtered to a "starter" subset of ~10 per plugin — full
  bulk-discovery refresh is AC-8 / Spec 014).
- **T12** — Performance benches under each plugin's
  `__tests__/<plugin>.bench.ts`. Bench ships green; CI gating is
  a follow-up spec.

### Phase 6 — Closeout

- **T13** — Spec 006 graduates to "All phases done"; Spec 006
  follow-ups (AC-4..AC-9 from `competitor-watch.md §C`) listed in
  `tasks.md` Notes-for-the-next-run.

## Packages touched

| Package                                               | Change                                |
| ----------------------------------------------------- | ------------------------------------- |
| `packages/models/src/enums/site.enum.ts`              | Three enum values added.              |
| `packages/plugins/index.ts`                           | Three modules appended to `ALL_SOURCE_MODULES`. |
| `tsconfig.base.json`                                  | Three `paths` entries added.          |
| `jest.config.js`                                      | Three `moduleNameMapper` entries.     |
| `packages/plugins/source-ats-avature/`                | New package.                          |
| `packages/plugins/source-ats-gem/`                    | New package.                          |
| `packages/plugins/source-ats-joincom/`                | New package.                          |
| `apps/api/__tests__/integration/`                     | One new integration suite.            |
| `apps/api/__tests__/e2e/`                             | One new e2e suite.                    |
| `docs/ATS_INTEGRATIONS.md`                            | Coverage matrix entries.              |
| `docs/COMPANY_SLUG_DIRECTORY.md`                      | Seed-slug entries.                    |

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Avature multi-selector logic drifts when a tenant adopts a custom theme | Medium | Borrow upstream's selector chain verbatim and add a test for each; future themes ship as a follow-up T0X. |
| Gem GraphQL endpoint adds Relay-style `nodes[]` wrapping | Low | Q-023 default = current shape only; Relay reshape becomes a separate spec. |
| Join.com regex `"company":{"id":N` rotates (e.g. minified key obfuscation) | Medium | Two-regex fallback already in upstream; we mirror it (`"companyId":N`). Add a test fixture for each. |
| Lockfile churn from new package paths | Low | No new external deps — `cheerio`, `axios` already in `@ever-jobs/common`. Lockfile sync is a no-op. |
| Per-plugin CI test parallelism saturates GitHub-runner cores | Low | Each plugin's `__tests__/` is < 10 cases; jest's default `--maxWorkers=50%` absorbs the increment. |
| Cold-start NFR-1 (<25 ms/plugin) regressed by three new plugins | Low | Same module-init cost as Greenhouse / Lever / Workable; no new top-level imports beyond what `@ever-jobs/common` already pulls. Verify via T12 bench. |

## Acceptance gates

- [ ] All four-place registrations applied for each new plugin.
- [ ] `npm run lint:docs` green.
- [ ] `npm run test -- --testPathPattern=source-ats-(avature|gem|joincom)` green.
- [ ] `npm run build` green.
- [ ] `apps/api/__tests__/integration/source-ats-batch-1.integration.spec.ts` green.
- [ ] `apps/api/__tests__/e2e/source-ats-batch-1.e2e-spec.ts` green.
- [ ] `docs/ATS_INTEGRATIONS.md` matrix shows three new rows.
- [ ] `docs/log.md` appended with run-tagged entries for T01..T13.
