# Spec: 418 — Roubler ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 418                                           |
| Slug           | source-ats-roubler                            |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-04                                    |
| Last updated   | 2026-06-04                                    |
| Supersedes     | (none)                                        |
| Related specs  | 405 (Apploi), 395 (Hirehive), 385 (Gupy)      |

## 1. Problem Statement

Roubler (roubler.com, founded 2012 — an Australian-headquartered, globally deployed
workforce-management, recruitment & payroll platform spanning AU / NZ / SG / MY / HK / UK) hosts
a branded, public, candidate-facing careers board for every customer tenant on the shared
single-page application host `https://app.roubler.com/`, addressed by a per-tenant **company
identifier** (`/careers/{companyId}`). Roubler's recruitment module advertises an integrated
careers page that surfaces "all job vacancies via the Roubler platform". The board fetches its
open-roles data from a **region-sharded careers API** under `https://graphql.{region}.roubler.com/`
(the AU shard is the platform's primary region, baked into the board's runtime `config.js`),
which exposes a `/static/` REST namespace the board uses for its non-GraphQL static endpoints.

Roubler is material for workforce aggregation because its installed base skews toward AU / APAC
hospitality, retail, healthcare and franchise employers — high-volume, hourly-shift hiring that
is under-represented in US-centric ATS coverage. Ever Jobs has no adapter for Roubler-powered
boards, so these vacancy catalogues are currently un-ingestable. A single generic, multi-tenant
Roubler adapter unlocks the full catalogue of Roubler-powered boards with one plugin.

**Surface confidence is verified=FALSE.** Live research on 2026-06-04 confirmed the platform, the
shared application host, the region-aliased hosts that redirect to it, and the region-sharded
backend + `/static/` namespace advertised in `config.js` — but an *anonymous* careers-feed JSON
response could not be captured (the board is client-rendered, the GraphQL backend requires an
access token, and `/static/*` answers HTTP 403 anonymously). The feed path / shape / pagination
in this spec are therefore a **defensive best-effort model** of the documented public careers
surface, narrowed conservatively so unexpected shapes degrade to empty rather than throwing.

## 2. Goals

- Add a generic, multi-tenant `source-ats-roubler` plugin that ingests roles from **any** Roubler
  careers board given a `companySlug` (the careers company id, e.g. `acme`) or a `companyUrl`
  (an `app.roubler.com/careers/{companyId}` URL, from which the id is derived).
- Use the **public, anonymous** careers surface (no auth, no API key): GET the tenant's
  job-advert feed `GET https://graphql.au.roubler.com/static/careers/{companyId}/adverts?page={n}`,
  narrowing the role array defensively (`data` / `adverts` / `results` / bare array).
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'roubler'`, `department`, `employmentType`).
- Degrade gracefully on every failure mode — unknown tenant, empty board, malformed payload,
  unreachable host — never throwing out of `scrape()`.

## 3. Non-Goals

- Any authenticated Roubler API (the GraphQL backend `graphql.{region}.roubler.com/graphql`
  requires an access token; this plugin uses only the anonymous careers path).
- Server-side filtering by department / location / keyword. We ingest the tenant's full role set
  and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Roubler tenant company ids (handled by the source-adoption backlog, not
  this plugin).
- Region-shard auto-discovery beyond the default AU shard (a future enhancement once the public
  feed shape is confirmed live).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Roubler plugin at a tenant's careers
> company id, so that I ingest that organisation's full open-roles list without writing a bespoke
> scraper.

> As a **plugin host**, I want the Roubler adapter to behave like every other ATS source plugin
> (same DI module, same `IScraper.scrape` contract), so that it is enable/disable/replace-able
> like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant company id from `companySlug` or from a `companyUrl` on an `app.roubler.com` host (`/careers/{companyId}` path). | must |
| FR-2  | Fetch the public careers feed `GET /static/careers/{companyId}/adverts?page={n}` on the region shard as JSON. | must |
| FR-3  | Narrow the role array from the envelope (`data` / `adverts` / `results` / bare array) defensively. | must |
| FR-4  | Drain pages by incrementing `page` until a page returns an empty role array, bounded by a page cap. | must |
| FR-5  | Use each role's id (`id` / `advertId` / `uuid`) as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-6  | Map each role to `JobPostDto` (title, url ← apply/detail URL, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-7  | Convert any role description body per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-8  | Honour `resultsWanted` (default 100 internally) by stopping the page drain once collected, bounded by a page cap. | must |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided, or when no id resolves. | must |
| FR-10 | Tolerate unknown tenants (HTTP 4xx), network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public anonymous careers feed    |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | parse the public JSON feed only  |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ROUBLER, name: 'Roubler', category: 'ats', isAts: true })
class RoublerService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface researched 2026-06-04 — **verified=FALSE**, defensive model):

```
GET https://graphql.au.roubler.com/static/careers/{companyId}/adverts?page={n}
  → { "data": [
        { "id":"…", "title":"…",
          "location":{ "city":"Sydney", "state":"NSW", "country":"Australia" },
          "employmentType":"Full Time", "department":"Hospitality",
          "description":"<p>…</p>", "publishedAt":"2026-05-12T…",
          "applyUrl":"https://app.roubler.com/careers/{companyId}/{advertId}" }
      ],
      "meta": { … } }
  (An out-of-range `page` is expected to return an empty role array — drain-until-empty.)

Canonical per-role detail / apply URL:  data[].applyUrl
  (fallback shape: https://app.roubler.com/careers/{companyId}/{advertId})
```

Wire shape → `JobPostDto` mapping (each source field probed across the alternate keys modelled in
`roubler.types.ts`):

| Source                                               | JobPostDto field        | Notes                                                       |
| ---------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `id` / `advertId` / `uuid`                           | `atsId`, `id`           | `id` is prefixed `roubler-{atsId}`; role skipped if absent  |
| `title` / `name` / `position`                        | `title`                 | required; role skipped if absent                            |
| `applyUrl` / `url` / `link` (else derived)           | `jobUrl`, `applyUrl`    | canonical public detail URL (also hosts the apply flow)     |
| `description` / `content` / `summary`                | `description`           | HTML; format-converted (HTML / Markdown / Plain)            |
| `publishedAt` / `datePosted` / `createdAt`           | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `location` (nested / flat / free-text)               | `location`              | structured city / state / country; null when none           |
| `remote` flag + employmentType + title/location/dept regex | `isRemote`        | flag first, then `remote` token, then text regex            |
| `department` / `category`                            | `department`            | when present                                                |
| `employmentType` / `jobType` / `type`                | `employmentType`        | e.g. `Full Time`                                            |
| `companyName` / `brand` (else de-slugified id)       | `companyName`           | role-level brand preferred                                  |
| —                                                    | `site`                  | constant `Site.ROUBLER`                                     |
| —                                                    | `atsType`               | constant `'roubler'`                                        |
| `description` text                                   | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `acme`) → used directly as the careers company id.
- `companySlug` containing a board URL → id taken from the `/careers/{companyId}` path.
- `companyUrl` on an `app.roubler.com` host → id taken from the `/careers/{companyId}` path.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable id, unknown tenant (HTTP 4xx), or no roles       |
| logged warn (HTTP 4xx/5xx)   | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (transport fail) | host unreachable (DNS / refused / reset / timeout) — abort drain, never throws |
| logged warn (parse failure)  | feed body unparseable, or per-role map error — partial, never throws      |

## 8. Test Plan

- E2E (`__tests__/roubler.e2e-spec.ts`): known tenant (`companySlug: 'roubler'`) returns an array
  (shape assertions — `site === Site.ROUBLER`, `atsType === 'roubler'`, `atsId`/`jobUrl` defined —
  guarded by `length > 0`); `companyUrl` resolution path exercised; no-slug/url returns empty;
  unknown tenant degrades gracefully; `resultsWanted` honoured. Because the surface is
  verified=FALSE, **every network test tolerates zero results**. 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths, and
  `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-RB-1 — Company-id addressing.** Roubler addresses a tenant by a careers company id on the
  shared `app.roubler.com` host (not a sub-domain). **Default (proceeding):** resolve the id from
  `companySlug` directly or from a `/careers/{companyId}` path in `companyUrl`.
- **Q-RB-2 — Anonymous public feed unconfirmed.** The careers data is fetched by a client-rendered
  SPA from an auth-gated GraphQL backend; no anonymous JSON / RSS / JSON-LD response was capturable
  on 2026-06-04. **Default (proceeding):** model the documented public careers feed
  (`/static/careers/{companyId}/adverts`) defensively, narrow every field, and degrade to empty on
  any non-conforming response. Re-confirm once an anonymous response is captured. Logged in
  `docs/questions.md`.
- **Q-RB-3 — Region shard.** Roubler is region-sharded (`graphql.{region}.roubler.com`), AU being
  the primary region in `config.js`. **Default (proceeding):** target the AU shard; shard
  auto-discovery is a future enhancement (Non-Goal).
- **Q-RB-4 — Envelope shape.** Roles may arrive under `data` / `adverts` / `results` or as a bare
  array, and individual values under more than one key across regions. **Default (proceeding):**
  probe the alternate keys at parse time; the first array-valued / non-empty key wins.

## 10. Decisions

- D-1: Primary surface is the public, anonymous careers feed
  `GET https://graphql.au.roubler.com/static/careers/{companyId}/adverts?page={n}`. **Confidence:
  verified=FALSE** — the platform, the shared candidate-facing host `app.roubler.com` (HTTP 200, an
  Expo / React-Native-Web SPA served by nginx), the region-aliased hosts `app.roubler.com.au` +
  `production.roubler.net` (both 301 → `app.roubler.com`), and the region-sharded backend host
  `graphql.au.roubler.com` with its `/static/` REST namespace (advertised in the board's runtime
  `config.js`, which pins the public `/static/clock/` endpoints there) were all confirmed live
  2026-06-04; an *anonymous* careers-feed JSON response could NOT be captured (the SPA shell ships
  an empty `<title>` with no server-rendered JobPosting JSON-LD, `graphql.au.roubler.com/graphql`
  answers `{"errors":[{"name":"Authentication","message":"Access token is missing or invalid."}]}`
  anonymously, and every `/static/*` path answers HTTP 403 anonymously). The feed path / shape /
  pagination are therefore a defensive best-effort model mapped through the platform's own observed
  hosts and namespaces only.
- D-2: The feed is consumed as a JSON REST endpoint (not a SPA needing a headless browser, and not
  the authenticated GraphQL API); the adapter GETs JSON and narrows the role array, degrading to
  empty on any non-conforming body.
- D-3: Each role's `id` / `advertId` / `uuid` is the stable per-role ATS id; `applyUrl` / `url` /
  `link` (else a derived `/careers/{companyId}/{id}`) is the canonical detail / apply URL.
- D-4: The feed paginates with no guaranteed meta; the adapter increments `page`, stops at the
  first empty role array (bounded by a page cap), dedupes by `atsId`, and stops once
  `resultsWanted` roles are collected.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive object/array
  narrowing and multi-key probing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-roubler/` — implementation.
- Surface researched live 2026-06-04 (no authentication — verified=FALSE):
  - Platform + shared candidate host `https://app.roubler.com/` (HTTP 200, SPA via nginx);
    region aliases `https://app.roubler.com.au/` + `https://production.roubler.net/` both
    301 → `app.roubler.com`.
  - Board runtime `https://app.roubler.com/config.js` →
    `{ brand:"roubler", domain:"roubler.com", environment:"production",
       clockLogEndpoint:"https://graphql.au.roubler.com/static/clock/log/",
       clockLambdaEndpoint:"https://graphql.au.roubler.com/static/clock/" }` (region-sharded
    backend host + `/static/` namespace).
  - `graphql.au.roubler.com/graphql` → HTTP 200 with an authentication error anonymously;
    `graphql.au.roubler.com/static/*` → HTTP 403 anonymously. No anonymous careers JSON captured.
    Confidence: **verified=FALSE**.
