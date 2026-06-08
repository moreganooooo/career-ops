# Spec: 409 — Workwise ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 409                                           |
| Slug           | source-ats-workwise                           |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 395 (Hirehive), 385 (Gupy), 384 (Emply)       |

## 1. Problem Statement

Workwise (workwise.io, Karlsruhe, Germany — formerly "Campusjäger"; a German SMB recruiting
platform + applicant-tracking system used by 2,000+ companies) gives every customer a
branded, public, candidate-facing career board on its own sub-domain of the shared host
`https://{tenant}.workwise.io/`, plus a public per-role detail page on the main site
`https://www.workwise.io/job/{id}-{slug}`. A Workwise job is internally an "enquiry"; the
numeric `id` (e.g. `121910`) is the stable per-role id. Ever Jobs has no adapter for
Workwise-powered career boards, so these (German-heavy SMB) vacancy catalogues are currently
un-ingestable. A single generic, multi-tenant Workwise adapter unlocks the catalogue of
Workwise-powered boards with one plugin.

The per-role detail page is server-rendered and **fully anonymous** (it carries a
`JobPosting` JSON-LD block and a complete `enquiry` job object in its Next.js data island).
The tenant board, however, renders its open-roles **list** client-side by calling the
candidate jobs-search API `POST https://api.workwise.io/v1/jobs/search` with the browser
session's credentials — and that API answers every anonymous call HTTP 405. There is
therefore no clean anonymous JSON **list** feed (unlike Hirehive / Greenhouse / Lever).

## 2. Goals

- Add a generic, multi-tenant `source-ats-workwise` plugin that ingests roles from **any**
  Workwise career board given a `companySlug` (the tenant sub-domain label, e.g. `aifinyo`)
  or a `companyUrl` (a career-site URL on a `workwise.io` host, from which the tenant label
  is derived).
- Use the **public** surface (no auth, no API key the adapter holds): resolve the tenant,
  then attempt the candidate jobs-search API to enumerate the tenant's open roles, mapping
  each role to the confirmed public per-role shape.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'workwise'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated employer / candidate API (e.g. `hire.workwise.io`, the credentialed
  candidate session). This plugin holds no credentials; it attempts the public candidate
  jobs-search and degrades to empty when that surface is session-gated for an anonymous
  caller.
- A headless browser to drive the client-side board render.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Workwise tenant sub-domains (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Workwise plugin at a tenant's career
> sub-domain, so that I ingest that organisation's open-roles list without writing a bespoke
> scraper.

> As a **plugin host**, I want the Workwise adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (the sub-domain label) or from a `companyUrl` on a `workwise.io` host (leading sub-domain label is the tenant; infra labels `www`/`app`/`api`/`hire`/… rejected). | must |
| FR-2  | Attempt the public candidate jobs-search `POST /v1/jobs/search` on `api.workwise.io`, scoped to the tenant (company id when numeric, else name/slug term), as JSON. | must |
| FR-3  | Read the roles array from the search envelope (whichever of `content`/`results`/`items`/`data`); drain pages bounded by a page cap, stopping on `last`/`totalPages`/a short page. | must |
| FR-4  | Use each role's numeric `id` (stringified, e.g. `121910`) as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl), using `https://www.workwise.io/job/{id}-{slug}` as the canonical detail / apply URL. | must |
| FR-6  | Convert any role description body per `descriptionFormat` (HTML / Markdown / Plain), joining `descriptionParts[]` when the flat body is absent. | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by stopping the page drain once collected, bounded by a page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown tenants, the session-gated HTTP 405, network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets held by the adapter  | public surface only              |
| NFR-2  | A fetch failure / 405 / unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | attempt the JSON search API only |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.WORKWISE, name: 'Workwise', category: 'ats', isAts: true })
class WorkwiseService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (researched live 2026-06-03):

```
# Tenant board (Next.js SPA — renders its list client-side, credentialed):
GET  https://{tenant}.workwise.io/                        → HTTP 200, no SSR job links

# Candidate jobs-search API (session-gated — answers anonymous calls HTTP 405):
POST https://api.workwise.io/v1/jobs/search
  body: { "filters": { "companyIds": [<companyId>] }, "query": "", "page": 0, "size": 50 }
  → paginated envelope { content|results|items|data: [ {…enquiry…} ], totalPages, last }

# Per-role public detail page (CONFIRMED anonymous, server-rendered):
GET  https://www.workwise.io/job/{id}-{slug}
  → JobPosting JSON-LD { title, datePosted, employmentType, hiringOrganization, jobLocation, url }
  → __NEXT_DATA__ pageProps.enquiry { id, slug, name, status, description,
        firstPublished, lastPublished, type, jobLocationTypes, locationLevels, jobRole,
        company: { id, name, slug, website, city, … } }

Canonical per-role detail / apply URL:  https://www.workwise.io/job/{id}-{slug}
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `id` (numeric → string)                             | `atsId`, `id`           | `id` is prefixed `workwise-{atsId}`; role skipped if absent |
| `name` (else `title`)                               | `title`                 | required; role skipped if absent                            |
| `https://www.workwise.io/job/{id}-{slug}`           | `jobUrl`, `applyUrl`    | canonical public detail URL (also hosts the apply flow)     |
| `description` (else joined `descriptionParts[]`)    | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `firstPublished` (else `lastPublished`/`modified`)  | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `locationLevels[0]` / `company.city`/`country`      | `location`              | structured city / state / country; null when none           |
| `jobLocationTypes`/`remoteWork` + title/loc regex   | `isRemote`              | structured token first, then text regex (DE + EN tokens)     |
| `jobRole`                                           | `department`            | when present                                                |
| `employmentType`/`type` (mapped)                    | `employmentType`        | e.g. `FULL_TIME` → `Full Time`                              |
| `company.name` (else de-slugified tenant)           | `companyName`           | the search list carries the employer block                  |
| —                                                   | `site`                  | constant `Site.WORKWISE`                                    |
| —                                                   | `atsType`               | constant `'workwise'`                                       |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `aifinyo`) → the tenant board host `aifinyo.workwise.io`.
- `companySlug` containing a bare host / `workwise.io` → tenant taken from the host.
- `companyUrl` on a `workwise.io` host → leading sub-domain label is the tenant
  (`www`/`app`/`api`/`hire`/`hr`/`recruiting`/`static`/`img`/`bewerber` rejected).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant, session-gated 405, or no roles |
| logged warn (HTTP 4xx/5xx)   | session-gated 405 / unknown tenant — degrades to empty, never throws      |
| logged warn (parse failure)  | search body unparseable, or per-role map error — partial, never throws    |

## 8. Test Plan

- E2E (`__tests__/workwise.e2e-spec.ts`): known tenant (`companySlug: 'aifinyo'`) returns
  shaped jobs when a list is obtainable (`site === Site.WORKWISE`, `atsType === 'workwise'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised; no-slug/url returns
  empty; unknown tenant degrades gracefully; `resultsWanted` honoured. Network-tolerant
  (zero results is acceptable, since the list API is session-gated for an anonymous CI run;
  shape assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths,
  and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-WW-1 — Anonymous list feed.** The tenant board renders its open-roles list
  client-side via the candidate jobs-search API (`api.workwise.io`), which answers anonymous
  calls HTTP 405. **Default (proceeding):** attempt that search API defensively, scoped to
  the tenant company id; degrade to an empty result for an un-credentialed caller. The
  per-role mapping mirrors the confirmed public detail shape so roles map correctly the
  moment a list is obtainable (e.g. behind a session-bearing proxy).
- **Q-WW-2 — Stable per-role id.** Each role carries a numeric `id` (e.g. `121910`).
  **Default (proceeding):** use `id` (stringified) as the stable ATS id; the canonical
  public URL is `https://www.workwise.io/job/{id}-{slug}`.
- **Q-WW-3 — Company display name.** The candidate search list carries the employer block
  (`company.name`). **Default (proceeding):** use `company.name`, falling back to a
  de-slugified, title-cased tenant sub-domain label.
- **Q-WW-4 — Pagination.** The search paginates (`page`/`size`, `totalPages`/`last`).
  **Default (proceeding):** request `size=50` and drain pages bounded by a page cap,
  stopping early once `resultsWanted` roles are collected.

## 10. Decisions

- D-1: Multi-tenant addressing is `{tenant}.workwise.io`; the canonical per-role detail /
  apply URL is `https://www.workwise.io/job/{id}-{slug}`. **Confidence: verified** — the
  platform, the `{tenant}.workwise.io` board host, the `/job/{id}-{slug}` detail URL, and
  the per-role wire shape (`enquiry` object + `JobPosting` JSON-LD) were confirmed live
  2026-06-03 against a named real tenant: `aifinyo` (aifinyo AG, company id `47188`; role
  `121910` "Backend Entwickler - Ruby on Rails (m/w/d)", `employmentType: FULL_TIME`,
  location Dresden/DE, `firstPublished` 2026-04-13).
- D-2: The open-roles LIST surface is the candidate jobs-search `POST
  /v1/jobs/search` on `api.workwise.io`. **Confidence: assumed/defensive** — that API
  answers anonymous GET/POST with HTTP 405 (it is session-gated; the board renders its list
  client-side with credentials), so it was NOT confirmed returning data anonymously on
  2026-06-03. The adapter attempts it defensively and degrades to empty. **verified=false.**
- D-3: Each role carries a numeric `id`, `name`/`title`, `slug`, `description` /
  `descriptionParts[]`, `locationLevels`, `jobRole` (department), `type`/`employmentType`,
  and a `company` block. The `id` is the stable per-role ATS id.
- D-4: The search paginates; the adapter requests `size=50`, drains pages bounded by a page
  cap, dedupes by `atsId`, and stops once `resultsWanted` roles are collected.
- D-5: No headless browser; the plugin is dependency-free beyond `@ever-jobs/common` (HTTP
  client + HTML → text/markdown converters + email extraction); all parsed values use
  defensive object/array narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-workwise/` — implementation.
- Surface researched live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.workwise.io`, confirmed with the named real
    tenant `aifinyo` (aifinyo AG, company id `47188`); board host `aifinyo.workwise.io`
    returned HTTP 200 (Next.js SPA, list rendered client-side).
  - Per-role detail `https://www.workwise.io/job/121910-backend-entwickler-ruby-on-rails-m-w-d`
    server-rendered a `JobPosting` JSON-LD and a full `enquiry` object anonymously
    (`id 121910`, `slug`, `name`, `status: open`, `company: { id 47188, name "aifinyo AG",
    slug "aifinyo-ag" }`). **Confirmed.**
  - `https://api.workwise.io/v1/jobs/search` answered every anonymous GET/POST HTTP 405
    (CORS preflight `OPTIONS` succeeded with `access-control-allow-credentials: true` for the
    tenant origin — i.e. the list API is session-gated). **Anonymous list NOT confirmed.**
  - Overall confidence: **verified=false** (per-role shape confirmed; anonymous multi-tenant
    list surface assumed/defensive).
