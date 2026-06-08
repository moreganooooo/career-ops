# Spec: 385 — Gupy ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 385                                           |
| Slug           | source-ats-gupy                               |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 384 (Emply), 366 (Scout Talent)               |

## 1. Problem Statement

Gupy (gupy.io, Brazil — the largest recruitment / ATS in Brazil & LATAM) hosts a
branded, public, candidate-facing career site for every customer tenant on its own
sub-domain of the shared host `https://{tenant}.gupy.io/`. The career-site landing page
is a server-rendered Next.js application that **embeds the full open-roles set directly
in the HTML** inside the Next.js data island
(`<script id="__NEXT_DATA__" type="application/json">{ … }</script>`, at
`props.pageProps.jobs`), so the board is directly crawlable without authentication and
without a headless browser. Ever Jobs has no adapter for Gupy-powered career sites, so
these (very large, Brazil/LATAM-heavy) vacancy catalogues are currently un-ingestable. A
single generic, multi-tenant Gupy adapter unlocks the full catalogue of Gupy-powered
career boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-gupy` plugin that ingests roles from **any**
  Gupy career site given a `companySlug` (the tenant sub-domain label, e.g. `sicredi`)
  or a `companyUrl` (a career-site URL on a `gupy.io` host, from which the tenant label
  is derived).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered
  career landing page `https://{tenant}.gupy.io/` whose HTML embeds the full open-roles
  set in the `__NEXT_DATA__` island at `props.pageProps.jobs`; each role carries an `id`,
  `title`, `type`, `department`, and a `workplace` (structured address + workplaceType).
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'gupy'`, `department`).

## 3. Non-Goals

- Any authenticated Gupy API (the `api.gupy.io` REST API and the partner job-board API
  require credentials / a per-tenant context). This plugin consumes only the public
  candidate-facing career site.
- Server-side filtering by category / location / work type (the board supports these
  facets). We ingest the tenant's full embedded role set and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Gupy tenant sub-domains (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Gupy plugin at a tenant's career
> sub-domain, so that I ingest that organisation's full open-roles list without writing a
> bespoke scraper.

> As a **plugin host**, I want the Gupy adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (expanded to `{tenant}.gupy.io`) or from a `companyUrl` on a `gupy.io` host (leading sub-domain label is the tenant). | must |
| FR-2  | Fetch the public server-rendered career landing page across known path variants (`/`, `/pt`, `/en`, `/es`) until one embeds a `__NEXT_DATA__` jobs island. | must |
| FR-3  | Extract `props.pageProps.jobs` from the `__NEXT_DATA__` island (plain JSON — `JSON.parse` directly). | must |
| FR-4  | Use each role's numeric `id` as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl) building the canonical detail / apply URL `/jobs/{id}`. | must |
| FR-6  | Convert any role description body per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the embedded role set, bounded by a probe-page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public embedded-JSON landing page |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | parse server-embedded JSON only  |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.GUPY, name: 'Gupy', category: 'ats', isAts: true })
class GupyService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://{tenant}.gupy.io/
  → server-rendered HTML embedding the full open-roles set in the Next.js data island:
      <script id="__NEXT_DATA__" type="application/json">{ … }</script>
    Parse the island JSON, then read props.pageProps.jobs → array of role objects:
      { "id": 11428934, "title": "…", "type": "vacancy_type_effective",
        "department": "Atendimento",
        "workplace": { "address": { "country":"Brasil", "state":"Paraná",
          "stateShortName":"PR", "city":"Rio Azul", "district":"" },
          "workplaceType":"on-site" },
        "quickApply": false }
    props.pageProps.careerPage.name carries the tenant display brand (e.g. "Sicredi").

Canonical per-role detail / apply URL:  https://{tenant}.gupy.io/jobs/{id}
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `id`                                                | `atsId`, `id`           | `id` is prefixed `gupy-{atsId}`; role skipped if absent     |
| `title`                                             | `title`                 | required; role skipped if absent                            |
| `/jobs/{id}`                                         | `jobUrl`, `applyUrl`    | canonical public detail URL (also hosts the apply flow)     |
| `description` (when present, HTML)                  | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `publishedDate` (when present)                      | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `workplace.address.{city, stateShortName/state, country}` | `location`        | structured city / state / country; null when none           |
| `workplace.workplaceType` (`remote`) + title/location/department regex | `isRemote` | structured flag first, then text regex (`remoto`/`home office`/`remote`…) |
| `department`                                        | `department`            | when present                                                |
| `careerPage.name` (else de-slugified slug)          | `companyName`           | the per-role records carry no brand name                    |
| —                                                   | `site`                  | constant `Site.GUPY`                                        |
| —                                                   | `atsType`               | constant `'gupy'`                                           |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `sicredi`) → expanded to `https://sicredi.gupy.io`.
- `companySlug` containing a bare host / `gupy.io` → tenant taken from the host.
- `companyUrl` on a `gupy.io` host → leading sub-domain label is the tenant
  (`www` / `portal` rejected as non-tenant labels).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | island present but unparseable, or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/gupy.e2e-spec.ts`): known tenant (`companySlug: 'sicredi'`) returns
  shaped jobs (`site === Site.GUPY`, `atsType === 'gupy'`, `atsId`/`jobUrl` defined);
  `companyUrl` resolution path exercised; no-slug/url returns empty; unknown tenant
  degrades gracefully; `resultsWanted` honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`). 30000 ms timeouts on network
  tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-GU-1 — Landing path / locale.** The board is server-rendered on the site root;
  some tenants may redirect the root to a localised home. **Default (proceeding):** probe
  `/` then `/pt` / `/en` / `/es`, taking the first page whose `__NEXT_DATA__` island
  exposes a `props.pageProps.jobs` array.
- **Q-GU-2 — Stable per-role id.** Each role carries a numeric `id`. **Default
  (proceeding):** use `id` directly (it is the `/jobs/{id}` URL segment and the stable
  ATS id).
- **Q-GU-3 — Company display name.** The per-role records carry no brand name. **Default
  (proceeding):** read `props.pageProps.careerPage.name`, falling back to a de-slugified,
  title-cased tenant sub-domain label.
- **Q-GU-4 — Role description body.** The SSR island's role records are lightweight
  (id / title / type / department / workplace) and do not always embed the full
  description. **Default (proceeding):** map the description when present and degrade to a
  null description otherwise (the canonical `/jobs/{id}` detail page remains the body
  source for a future per-role detail fan-out); all other fields map from the island.

## 10. Decisions

- D-1: Primary surface is the public, anonymous server-rendered career landing page on
  `{tenant}.gupy.io`, whose HTML embeds the full open-roles set in the `__NEXT_DATA__`
  island at `props.pageProps.jobs`. **Confidence: verified** — the platform, the
  `{tenant}.gupy.io` addressing, the embedded-JSON island, and the per-role URL shape
  `/jobs/{id}` were confirmed live 2026-06-03 against named real tenants: `sicredi`
  (Sicredi — 891 live roles), `carreirasype` (Ypê — 108 live roles), and `tech-career`
  (Gupy Tech — 0 live roles, exercising the empty-board path). A live role
  `/jobs/11428934` returned HTTP 200; `/job/{id}` 307-redirects to `/jobs/{id}`.
- D-2: The board is a server-rendered Next.js app that bootstraps with an embedded JSON
  data island (not a SPA needing a headless browser, and not a separate JSON API needing
  credentials); the adapter `JSON.parse`s the island and reads `props.pageProps.jobs`
  (plain JSON — no JS-string-literal decoding needed).
- D-3: Each role carries `id`, `title`, `type`, `department`, and a structured
  `workplace` (address + workplaceType). The numeric `id` is the stable per-role ATS id;
  `careerPage.name` is the brand name.
- D-4: The island embeds every open role in one document (no server-side pagination of
  the job set in the island); the adapter collects the embedded roles, dedupes by
  `atsId`, and slices to `resultsWanted` (bounded by a probe-page cap).
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-gupy/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.gupy.io`, confirmed with named real tenants
    `sicredi` (Sicredi), `carreirasype` (Ypê), `tech-career` (Gupy Tech).
  - The server-rendered landing page embeds the open-roles set in the `__NEXT_DATA__`
    island at `props.pageProps.jobs`; `JSON.parse` yielded 891 live roles for `sicredi`
    and 108 for `carreirasype`, each with a numeric `id` mapping to the canonical detail
    URL `/jobs/{id}` (verified=true). `tech-career` returned 0 roles, exercising the
    empty-board path.
