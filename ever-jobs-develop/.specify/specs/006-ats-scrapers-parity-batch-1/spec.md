# Spec 006 — ATS-Scrapers Parity, Batch 1 (Avature / Gem / Join.com)

| Field          | Value                                                |
| -------------- | ---------------------------------------------------- |
| Spec ID        | 006                                                  |
| Slug           | ats-scrapers-parity-batch-1                          |
| Status         | All phases done (T01..T13 runs #29..#36); spec complete |
| Owner          | scheduled-task agent (`ever-jobs`)                   |
| Created        | 2026-04-27 (run #28)                                 |
| Last updated   | 2026-04-27 (run #36)                                 |
| Supersedes     | (none)                                               |
| Related specs  | 001 (Plugin Architecture Foundation), 003 (Dedup Engine), 005 (Circuit Breaker) |

## 1. Problem Statement

The hourly competitor-watch backlog (`/competitor-watch.md §C`) lists nine
follow-up actions (AC-1..AC-9) accumulated across the last twenty-eight
scheduled runs. AC-1..AC-3 are three new ATS-vendor coverage gaps —
Avature, Gem, and Join.com — that exist in the upstream OSS reference
codebase (`OTHERS/Ats-scrapers`) but not in our `packages/plugins/`
catalogue. Every week another batch of public companies adopts one of
these three ATSes; our coverage drift compounds run-over-run.

This spec adopts those three plugins as a single batch — they share
the same registration topology (`Site` enum + `ALL_SOURCE_MODULES` +
two-place tsconfig+jest aliases per Spec 001) and the same
authoring rhythm (slug-driven aggregator dispatch via `/api/jobs?…&site=<key>`,
optional Harvest-style auth fallback, per-plugin `getCircuitBreakerPolicy()`
override per Spec 005 / FR-3). Bundling them keeps the cold-start
boot-time amortisation cost flat (one `ALL_SOURCE_MODULES` rebuild,
one lockfile sync round) and keeps the scaffolding-vs-business-logic
ratio sane — the per-plugin business logic is small (HTML scrape for
Avature, a single GraphQL batch query for Gem, a 2-step REST hop for
Join.com), so three independent specs would be 90% scaffolding noise.

## 2. Goals

- Ship three new source plugins under `packages/plugins/`:
  - `source-ats-avature` — HTML-scrape `*.avature.net/careers/SearchJobs/`
    plus the rare custom-domain Avature deployments
    (e.g. `careers.ibm.com`, `bloomberg.avature.net`).
  - `source-ats-gem` — single batched GraphQL POST to
    `https://jobs.gem.com/api/public/graphql/batch` (operations
    `JobBoardTheme` + `JobBoardList`).
  - `source-ats-joincom` — two-step REST flow: scrape company page
    for numeric ID, then `GET /api/public/companies/{id}/jobs?…`.
- Each plugin exposes its catalog of supported companies via the
  existing `COMPANY_SLUG_DIRECTORY.md` mechanism — no new directory
  shape, no new contract.
- Each plugin honours `ScraperInputDto.proxies / .caCert / .requestTimeout`
  via `@ever-jobs/common`'s `createHttpClient` (per Spec 001's
  HTTP-client mandate).
- Each plugin emits standard `JobPostDto` rows: `title / company /
  location / description / url / postedAt` — same shape Greenhouse,
  Lever, Workday already produce.
- Each plugin registers in **all four** required places (per
  `AGENTS.md §5`): `site.enum.ts`, `packages/plugins/index.ts`,
  `tsconfig.base.json`, `jest.config.js`.
- Each plugin has **at least one** happy-path unit test under
  `__tests__/<plugin-id>.service.spec.ts` (per `AGENTS.md §7`).

## 3. Non-Goals

- **Hard parity with the Python upstream's CLI / discovery scripts.**
  We adopt the SCRAPER LOGIC, not the bundled `firecrawl_discovery.py`
  / `searxng_discovery.py` tooling — discovery in Ever Jobs is the
  `PluginRegistry` itself (per `competitor-watch.md §D`).
- **Job-detail scraping.** Avature / Gem / Join.com all expose
  per-job detail pages with richer descriptions, but Greenhouse /
  Lever / Workable plugins in this repo only fetch board-level data
  on the happy path. Detail-fetch is deferred to a future spec
  (candidate Spec 016 — "ATS detail-page enrichment", future
  follow-up).
- **Authenticated-API parity.** Avature has no documented public auth
  scheme; Gem's GraphQL endpoint is unauthenticated by design;
  Join.com's `/api/public` namespace is also unauthenticated. No
  Harvest-API equivalent ships in this batch.
- **Bulk-discovery refresh** (AC-8 in `competitor-watch.md §C`).
  Refreshing Greenhouse/Lever/Workable/SmartRecruiters seed company
  lists from the upstream CSVs is a separate spec (candidate
  Spec 014).
- **European salary parser** (AC-7). Defers to Spec 012 in
  `competitor-watch.md §C` (or absorbed into Spec 003 normalisation).
- **AC-4..AC-9.** Out of scope; subsequent specs / batches.

## 4. User / Caller Stories

- *As a job-seeker dashboard*, I want to query
  `GET /api/jobs?site=avature&companySlug=bloomberg&limit=50` and get
  a paginated list of Bloomberg's open roles via Avature.
- *As an operator*, I want a per-source breaker on each of the three
  plugins (Spec 005 / FR-1) so an Avature TLS hiccup doesn't degrade
  my Gem / Join.com fan-out.
- *As a downstream consumer*, I want each plugin's `JobPostDto.company`
  field populated correctly even when the company name is encoded as
  the URL subdomain (Avature `bloomberg.avature.net` → `Bloomberg`).
- *As a plugin author*, I want a small per-plugin
  `getCircuitBreakerPolicy()` override option for known-flaky
  Avature tenants without forking the whole service (Spec 005 / FR-3).

## 5. Functional Requirements

| ID     | Requirement                                                                                            | Priority |
| ------ | ------------------------------------------------------------------------------------------------------ | -------- |
| FR-1   | New plugin `source-ats-avature` implements `IScraper` and exposes `Site.AVATURE = 'avature'`.         | must     |
| FR-2   | `source-ats-avature` paginates via `?jobOffset=N&jobRecordsPerPage=12`; stops on empty page or short page (< requested limit). | must |
| FR-3   | `source-ats-avature` accepts both subdomain-style (`bloomberg.avature.net`) AND custom-domain (`careers.ibm.com`) tenants via `companyUrl` input override or default-to-subdomain construction from `companySlug`. | must |
| FR-4   | New plugin `source-ats-gem` implements `IScraper` and exposes `Site.GEM = 'gem'`.                     | must     |
| FR-5   | `source-ats-gem` issues exactly ONE batched POST to `/api/public/graphql/batch` carrying both `JobBoardTheme` + `JobBoardList` operations; tolerates either order in response. | must |
| FR-6   | `source-ats-gem` extracts `jobPostings[]` from the response and emits `JobPostDto` rows with `id`, `title`, `locations[]`, `department`, `employmentType`, `locationType`. | must |
| FR-7   | New plugin `source-ats-joincom` implements `IScraper` and exposes `Site.JOIN_COM = 'join_com'`.       | must     |
| FR-8   | `source-ats-joincom` resolves a company slug to a numeric ID by parsing `"company":{"id":N` (or fallback `"companyId":N`) from `https://join.com/companies/<slug>`. | must |
| FR-9   | `source-ats-joincom` paginates `GET /api/public/companies/<id>/jobs?page=N&pageSize=50` until `pagination.totalPages` is reached or `items[]` is empty. | must     |
| FR-10  | All three plugins register in `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`, `tsconfig.base.json` (paths), and `jest.config.js` (moduleNameMapper). | must     |
| FR-11  | All three plugins use `@ever-jobs/common` `createHttpClient` so `proxies / caCert / requestTimeout` flow through correctly. | must     |
| FR-12  | All three plugins respect `input.resultsWanted` (default `100`) and stop fetching once the cap is reached. | must     |
| FR-13  | All three plugins produce `JobPostDto` with at minimum: `title`, `company`, `location` (string), `url`, `postedAt` (when available — Avature and Join.com expose it; Gem does not). | must     |
| FR-14  | Each plugin ships a `<plugin>.service.spec.ts` with at least three cases: happy-path parsing, empty-board guard, error-tolerance (HTTP 500 returns empty `JobResponseDto`, never throws). | must     |
| FR-15  | Each plugin documents its scrape-input contract in a sibling JSDoc block on the `@SourcePlugin({…})` decorator AND in the `ATS_INTEGRATIONS.md` matrix. | should   |
| FR-16  | Each plugin is dedup-engine-friendly: its emitted `JobPostDto.id` (or `(site, externalId)` tuple) is stable across reruns so the `dedup-hybrid` strategy can collapse identical postings (Spec 003 / FR-1). | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                                                                | Target            |
| ------ | ------------------------------------------------------------------------------------------ | ----------------- |
| NFR-1  | Per-plugin cold-start contribution to module-graph init                                    | < 25 ms           |
| NFR-2  | `scrape()` p95 latency, single company, default `resultsWanted=100`, no proxy             | Avature < 8 s; Gem < 1.5 s; Join.com < 4 s |
| NFR-3  | Per-plugin memory ceiling (`maxResults=100`)                                               | < 8 MB transient  |
| NFR-4  | Bundle weight per plugin (NestJS module + service + types + constants)                     | < 25 KB minified  |
| NFR-5  | Default circuit-breaker policy (Spec 005 / DEFAULT_CIRCUIT_POLICY)                         | inherited; no override unless evidence of flakiness |

## 7. Contracts

### 7.1 Plugin Surfaces

```ts
// packages/models/src/enums/site.enum.ts (additions)
export enum Site {
  // … existing values …
  AVATURE  = 'avature',
  GEM      = 'gem',
  JOIN_COM = 'join_com',
}

// Per-plugin service shape (uniform across the three)
@SourcePlugin({ site: Site.AVATURE, name: 'Avature', category: 'ats', isAts: true })
@Injectable()
export class AvatureService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}

@SourcePlugin({ site: Site.GEM, name: 'Gem', category: 'ats', isAts: true })
@Injectable()
export class GemService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}

@SourcePlugin({ site: Site.JOIN_COM, name: 'Join.com', category: 'ats', isAts: true })
@Injectable()
export class JoinComService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 ScraperInputDto fields consumed (subset)

| Field                   | Avature | Gem | Join.com | Notes |
| ----------------------- | :-----: | :-: | :------: | ----- |
| `companySlug`           | ✓ (subdomain default) | ✓ (board id) | ✓ (slug) | required |
| `companyUrl`            | ✓ (custom domain override) | — | — | optional |
| `resultsWanted`         | ✓       | ✓   | ✓        | default 100 |
| `descriptionFormat`     | ✓ (md/html/text) | — (no body) | ✓ | optional |
| `proxies / caCert / requestTimeout` | ✓ | ✓ | ✓ | per Spec 001 HTTP-client mandate |

### 7.3 Errors

| Code                          | Meaning                                                       |
| ----------------------------- | ------------------------------------------------------------- |
| `ERR_AVATURE_BAD_TENANT`      | Avature: subdomain/path could not be resolved to a careers URL. |
| `ERR_GEM_GRAPHQL_BATCH`       | Gem: GraphQL batch returned an unexpected envelope shape.     |
| `ERR_JOINCOM_COMPANY_NOT_FOUND` | Join.com: `companies/<slug>` page lacks a parseable company ID. |

(All three are caught and converted to an empty `JobResponseDto` per
`AGENTS.md §10` "Tests required" — never re-thrown to the aggregator.
The aggregator's circuit breaker counts the empty result as success
unless an upstream HTTP error bubbled, which the breaker independently
records.)

## 8. Test Plan

### 8.1 Unit (per plugin, under `packages/plugins/source-ats-<id>/__tests__/`)

- **Happy path** — fixture HTML/JSON loaded from
  `__tests__/fixtures/<id>-page-1.{html,json}`; assert `JobPostDto[]`
  count, sample `title` / `company` / `url`.
- **Empty board** — empty HTML / `jobPostings: []` / empty `items`;
  assert empty `JobResponseDto` returned.
- **HTTP 500 error** — mocked `axios` throws; assert empty
  `JobResponseDto`, no exception bubbles.
- **`resultsWanted` cap** — fixture w/ 200 jobs, `resultsWanted: 50`;
  assert exactly 50 emitted, no extra page fetched.
- **Avature only** — custom domain (`careers.ibm.com`) override via
  `companyUrl` input; assert URL composition.
- **Gem only** — batched GraphQL: assert single POST issued; assert
  tolerance to operation order swap in response array.
- **Join.com only** — two-step flow: assert `companies/<slug>` GET
  precedes `companies/<id>/jobs?…` GET; assert pagination loop
  termination on `pagination.totalPages` reached.

### 8.2 Integration (`apps/api/__tests__/integration/`)

- **`source-ats-batch-1.integration.spec.ts`** — wire all three new
  plugins through the live `JobsService` fan-out; assert each
  contributes ≥ 1 row from a stubbed-`createHttpClient` fixture.
  Verifies the four-place registration is correct.

### 8.3 E2E (`apps/api/__tests__/e2e/`)

- **`source-ats-batch-1.e2e-spec.ts`** — `GET /api/jobs?site=avature&companySlug=bloomberg`,
  `&site=gem&companySlug=accel`, `&site=join_com&companySlug=primer-ai`
  return `200 OK` + non-empty `JobPostDto[]` against a sandboxed
  fixture server. Asserts dedup-engine consumes the rows without
  collisions across the three plugins.

### 8.4 Performance

- Each plugin's `scrape()` benchmark (`__tests__/<id>.bench.ts`)
  asserts NFR-2 ceilings against the `__tests__/fixtures/` corpus.
  Bench ships in this spec; CI gating is a follow-up.

## 9. Open Questions

- **Q-021** — Spec packaging: 1 batched spec vs 3 per-plugin specs?
  See `docs/questions.md` Q-021 (default = batched, this spec).
- **Q-022** — Avature tenant discovery: subdomain vs custom-domain
  resolution rules — see `docs/questions.md` Q-022 (default =
  `companyUrl` override + subdomain fallback construction from
  `companySlug`).
- **Q-023** — Gem GraphQL response shape — accept both
  `jobPostings[]` (current upstream) and any future `nodes[]` Relay
  reshape — see `docs/questions.md` Q-023 (default = current shape
  only; Relay reshape becomes a separate spec if it ships upstream).

## 10. Decisions

(Empty until T01 lands. Append-only.)

## 11. References

- Upstream Python implementations:
  - `OTHERS/Ats-scrapers/avature/api_client.py` (405 LOC).
  - `OTHERS/Ats-scrapers/gem/scripts/gem_jobs_scraper/api_client.py`.
  - `OTHERS/Ats-scrapers/join_com/api_client.py` (122 LOC).
- Existing analogue plugins for shape reference:
  - `packages/plugins/source-ats-greenhouse/` — public-board JSON path.
  - `packages/plugins/source-ats-lever/` — slug-paginated REST path.
  - `packages/plugins/source-ats-workday/` — multi-tenant URL discovery.
- `docs/ATS_INTEGRATIONS.md` — coverage matrix to update on T-finale.
- `docs/COMPANY_SLUG_DIRECTORY.md` — append entries on each plugin's T0X.
- `competitor-watch.md §C` — backlog source (AC-1..AC-3).
- `AGENTS.md §5` — four-place plugin registration mandate.
- `Spec 001` — `PluginRegistry` discovery contract.
- `Spec 003 / FR-1` — `dedup-hybrid` consumer contract for `(site, externalId)`.
- `Spec 005 / FR-3` — per-plugin `getCircuitBreakerPolicy()` override.
