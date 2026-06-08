# Plan: 418 — Roubler ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-04                         |
| Last updated | 2026-06-04                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 405 (Apploi)                       |

## 1. Approach

Roubler powers each tenant's branded, public, candidate-facing careers board on the shared
single-page application host `https://app.roubler.com/careers/{companyId}`. The board is
client-rendered and fetches its open-roles data from a region-sharded careers API under
`https://graphql.{region}.roubler.com/`, whose `/static/` REST namespace is the same one the
board uses for its non-GraphQL static endpoints (advertised in the board's runtime `config.js`).
The adapter resolves the tenant's careers company id and drains the public job-advert feed
`GET /static/careers/{companyId}/adverts?page={n}`, mapping each role into the standard
`JobPostDto` contract — no headless browser, no authenticated API, no peer-plugin imports.

The single-host feed-drain pipeline is simpler than a two-hop ATS: there is no separate profile
lookup, so the adapter pages the feed directly from page 1. Because the public anonymous response
could not be captured live (surface verified=FALSE), the parser is built maximally defensively:
the envelope's role array is probed across `data` / `adverts` / `results` / bare-array shapes,
each role value is probed across alternate keys (e.g. title under `title` / `name` / `position`),
and any non-conforming body degrades to an empty result rather than throwing. This keeps the
adapter correct the day the public feed is confirmed, while never destabilising a batch run in the
interim.

Failure handling distinguishes a transport-level failure (DNS / connection refused / reset /
timeout → host unreachable → abort the drain) from an HTTP-status error (4xx / 5xx → reachable
host, nothing more to drain → stop). Both, plus a malformed / unparseable body and a per-role
mapping error, degrade to an empty / partial result and are logged via the NestJS `Logger`. The
per-request timeout is capped at 15s on both the `timeout` and `requestTimeout` keys so an
unresponsive host degrades fast inside the caller's budget.

## 2. Phases

### Phase 1 — Plugin package

- Goal: ship a compiling, self-contained `source-ats-roubler` package.
- Deliverables: `package.json`, `tsconfig.json`, `src/index.ts`, `src/roubler.module.ts`,
  `src/roubler.constants.ts`, `src/roubler.types.ts`, `src/roubler.service.ts`.
- Exit criteria: barrel exports `RoublerModule` + `RoublerService`; `tsc --noEmit` clean (modulo
  the orchestrator-supplied `Site.ROUBLER`).

### Phase 2 — Tests & spec artefacts

- Goal: network-tolerant E2E coverage + the spec triplet.
- Deliverables: `__tests__/roubler.e2e-spec.ts`; `.specify/specs/418-source-ats-roubler/{spec,plan,tasks}.md`.
- Exit criteria: 5 E2E tests (all network tests tolerate zero results); spec triplet complete.

## 3. Packages Touched

| Package                                  | Change                                |
| ---------------------------------------- | ------------------------------------- |
| `packages/plugins/source-ats-roubler`    | new package                           |
| `packages/plugin`                        | (no change — consumes `@SourcePlugin`)|
| `packages/models`                        | `Site.ROUBLER` enum value (orchestrator-owned) |
| `packages/common`                        | (no change — consumes HTTP + helpers) |

## 4. Dependencies

| Library            | Version  | Rationale                                            |
| ------------------ | -------- | ---------------------------------------------------- |
| `@ever-jobs/common`| workspace| shared HTTP client, HTML→text/markdown, email extract |
| `@ever-jobs/models`| workspace| `IScraper`, DTOs, `Site`, `DescriptionFormat`        |
| `@ever-jobs/plugin`| workspace| `@SourcePlugin` registration decorator               |

No third-party runtime dependency is added; the package talks only through `@ever-jobs/*`.

## Surface chosen

One public, anonymous careers feed the candidate-facing board itself consumes:

```
GET https://graphql.au.roubler.com/static/careers/{companyId}/adverts?page={n}
  → { data: [ { id, title, location, employmentType, description, publishedAt, applyUrl, … } ], meta }
```

No authentication, no API key, and no headless browser is required by design. This was preferred
over (a) the authenticated GraphQL backend (`graphql.{region}.roubler.com/graphql`, which requires
an access token) and (b) scraping the client-rendered board DOM (the JSON feed is the clean,
stable surface behind it). **Surface verified=FALSE** — an anonymous response could not be captured
live 2026-06-04; the feed path / shape are a defensive best-effort model (see spec §10 D-1).

## Parse strategy

1. **Resolve company id** from `companySlug` (or a full board URL passed as the slug) or
   `companyUrl`. An `app.roubler.com` host yields the id from its `/careers/{companyId}` path; a
   bare slug is used directly.
2. **Drain the feed** page by page (cap `ROUBLER_MAX_PAGES`), GETting each page as JSON via the
   `@ever-jobs/common` HTTP client. HTTP 4xx / 5xx degrade to "stop" (reachable host, nothing more
   to drain), never throw; a transport-level failure aborts the drain (host unreachable). The loop
   stops at the first empty role array, once `resultsWanted` roles are collected, or at the page cap.
3. **Narrow the items.** `coerceFeed` handles object / array / text-string bodies; `extractItems`
   probes `data` / `adverts` / `results` for the role array. A non-conforming body → null (stop),
   logged.
4. **Normalise + map** each role → `JobPostDto`, deduping by `atsId`, stopping at `resultsWanted`.

## Normalisation mapping

- `atsId` ← `id` / `advertId` / `uuid` (role skipped if none).
- `title` ← `title` / `name` / `position` (role skipped if none).
- `description` ← `description` / `content` / `summary` (HTML), converted per `descriptionFormat`.
- `jobUrl` = `applyUrl` ← `applyUrl` / `url` / `link`, else a derived `/careers/{companyId}/{id}`.
- `location` ← nested `location` object / flat `city`/`state`/`country` / free-text; null when none.
- `datePosted` ← `publishedAt` / `datePosted` / `createdAt`, parsed to `YYYY-MM-DD`.
- `department` ← `department` / `category`.
- `employmentType` ← `employmentType` / `jobType` / `type`.
- `isRemote` ← `remote` flag, else employment-type `remote` token, else regex over title /
  location / department.
- `companyName` ← role `companyName` / `brand`, else a de-slugified, title-cased company id.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.ROUBLER`; `atsType` = `'roubler'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial results
  on an unexpected error.
- `fetchPage` swallows HTTP 4xx / 5xx (logged warn → null, host reachable → stop drain) and
  DNS / network errors (logged warn → null, host unreachable → abort drain).
- `coerceFeed` returns `null` for a non-conforming body (stop), logged.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out (the feed is drained sequentially page by page); per-role work is a
  simple bounded loop.
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and `requestTimeout`
  (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-roubler/
  package.json
  tsconfig.json
  src/index.ts                       → barrel: RoublerModule, RoublerService
  src/roubler.constants.ts           → hosts, feed path builders, page cap, headers, remote token + regex
  src/roubler.types.ts               → advert-item + envelope + location + RoublerJob interfaces
  src/roubler.module.ts              → @Module providing+exporting RoublerService
  src/roubler.service.ts             → @SourcePlugin + RoublerService implements IScraper
  __tests__/roubler.e2e-spec.ts      → network-tolerant E2E
.specify/specs/418-source-ats-roubler/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this plugin
references `Site.ROUBLER` but does not edit any shared file.

## 5. Risks & Mitigations

| Risk                                          | Likelihood | Impact | Mitigation                                   |
| --------------------------------------------- | ---------- | ------ | -------------------------------------------- |
| Public anonymous feed shape differs from model| H          | M      | Multi-key probing + degrade-to-empty; verified=FALSE flagged; re-confirm on capture |
| Region shard differs per tenant               | M          | M      | Default AU shard; shard discovery deferred (Non-Goal) |
| Careers feed requires auth in practice        | M          | M      | HTTP 4xx degrades to empty; never throws; logged |
| Host connect-then-hang                        | L          | M      | 15s timeout cap on both keys                 |

## 6. Rollback Plan

Disable by removing the module from `ALL_SOURCE_MODULES` (orchestrator-owned). The package is
self-contained and side-effect-free at import time, so removal cannot affect other sources.

## 7. Migration Plan (if applicable)

None — additive new plugin; no data / config / consumer migration.

## 8. Open Questions for Plan

Resolved in spec §9 / §10 (Q-RB-1…Q-RB-4). The single open item carried to `docs/questions.md` is
Q-RB-2 (anonymous feed unconfirmed → defensive model, verified=FALSE).
