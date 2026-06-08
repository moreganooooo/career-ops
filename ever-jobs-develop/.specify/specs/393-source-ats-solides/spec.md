# Spec: 393 — Sólides (solides.com.br) ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 393                                           |
| Slug           | source-ats-solides                            |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 384 (Emply), 379 (Carerix)                    |

## 1. Problem Statement

Sólides (solides.com.br, Brazil — "Sólides Recruta" / "Sólides Vagas") is a Brazilian
HCM / ATS whose candidate-facing product is a hosted, branded career site. Every customer
tenant publishes a branded, public career site on its own sub-domain of the shared
careers host `https://{tenant}.vagas.solides.com.br/`. That site is a client-rendered
Next.js SPA whose open roles are **not** in the server HTML — they are fetched after
hydration from the platform's public, unauthenticated JSON API gateway
(`https://apigw.solides.com.br/jobs/v3/home/vacancy?slug={tenant}`), so the board is
directly ingestable without authentication and without a headless browser. Ever Jobs has
no adapter for Sólides-powered career sites, so these vacancies are currently
un-ingestable. A single generic, multi-tenant Sólides adapter unlocks the full catalogue
of Sólides-powered career boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-solides` plugin that ingests vacancies from
  **any** Sólides career site given a `companySlug` (the tenant sub-domain label, e.g.
  `solides`) or a `companyUrl` (a career-site URL on a `vagas.solides.com.br` host, from
  which the tenant label is derived).
- Use the **public, anonymous** surface (no auth, no API key): the paginated JSON listing
  endpoint `https://apigw.solides.com.br/jobs/v3/home/vacancy?slug={tenant}&take=&page=`,
  whose response carries each role's title, HTML body, department, location, dates, and
  the stable numeric `id`.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'solides'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated Sólides API (the `developer.api.solides.jobs` REST API requires a
  per-tenant integration token). This plugin consumes only the public candidate-facing
  jobs gateway.
- Server-side filtering by area / location / contract type (the board supports these
  facets). We ingest the tenant's full open-vacancy set and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Sólides tenant sub-domains (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Sólides plugin at a tenant's
> career sub-domain, so that I ingest that organisation's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Sólides adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (used as the `slug` query param) or from a `companyUrl` on a `vagas.solides.com.br` host (leading sub-domain label is the tenant). | must |
| FR-2  | Fetch the public paginated JSON listing `…/jobs/v3/home/vacancy?slug={tenant}&take={n}&page={p}`, paging via `page` and stopping at `totalPages` / `resultsWanted`. | must |
| FR-3  | Read the vacancy array from the `{ data: { count, currentPage, totalPages, data: [ … ] } }` envelope, narrowing defensively. | must |
| FR-4  | Use each vacancy's numeric `id` (as text) as the stable `atsId`; de-duplicate roles by `atsId` within a run (across pages). | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl) building the canonical detail URL `https://{tenant}.vagas.solides.com.br/vaga/{id}`. | must |
| FR-6  | Convert the HTML job-ad body (`description`) per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by paging + slicing, bounded by a page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, empty boards, and malformed payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public JSON jobs gateway         |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + capped timeouts + proxy     |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | call the JSON gateway directly   |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.SOLIDES, name: 'Sólides', category: 'ats', isAts: true })
class SolidesService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://apigw.solides.com.br/jobs/v3/home/vacancy?slug={tenant}&take={n}&page={p}
  → { "success": true, "errors": [], "data": {
        "count": 29, "currentPage": 1, "totalPages": 15,
        "data": [
          { "id": 858464, "title": "ANALISTA DE SUPORTE JR - FOLHA DIGITAL",
            "description": "<p>…HTML body…</p>", "companyName": "Sólides Tecnologia",
            "state": { "name": "São Paulo", "code": "SP" },
            "city": { "name": "São Paulo" },
            "address": { "country": { "name": "Brasil", "code": "BR" }, … },
            "jobType": "remoto", "homeOffice": false, "createdAt": "2026-06-01",
            "redirectLink": "…", "slug": "solides",
            "occupationAreas": [ { "name": "Recursos Humanos" } ],
            "recruitmentContractType": [ { "name": "CLT" } ],
            "seniority": [ { "name": "Junior" } ] }, … ] } }

Canonical per-role detail / apply URL:  https://{tenant}.vagas.solides.com.br/vaga/{id}
Company-profile lookup (existence / brand): GET …/jobs/v3/home/company/{tenant}
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `id` (numeric, as text)                             | `atsId`, `id`           | `id` is prefixed `solides-{atsId}`; role skipped if absent  |
| `title`                                             | `title`                 | required; role skipped if absent                            |
| `https://{tenant}.vagas.solides.com.br/vaga/{id}`   | `jobUrl`                | canonical public detail URL                                 |
| `redirectLink` (else the detail URL)                | `applyUrl`              | external apply link when present                            |
| `description` (HTML)                                | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `createdAt`                                          | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `city.name` / `state.name`/`code` / `address.country.name` | `location`       | structured city / state / country; null when none           |
| `homeOffice` / `jobType` / title / location         | `isRemote`              | remote detection (`remoto` / `home office` / `wfh` …)       |
| `occupationAreas[].name`                            | `department`            | first usable area                                           |
| `recruitmentContractType[].name`                    | `employmentType`        | first usable contract type (e.g. `CLT`)                     |
| `companyName` (else de-slugified tenant)            | `companyName`           |                                                             |
| —                                                   | `site`                  | constant `Site.SOLIDES`                                     |
| —                                                   | `atsType`               | constant `'solides'`                                        |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `solides`) → used directly as the `slug` query param.
- `companySlug` containing a bare host / `vagas.solides.com.br` → tenant taken from host.
- `companyUrl` on a `vagas.solides.com.br` host → leading sub-domain label is the tenant.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx/5xx)   | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed payload or per-role map error — partial, never throws           |

## 8. Test Plan

- E2E (`__tests__/solides.e2e-spec.ts`): known tenant (`companySlug: 'solides'`) returns
  shaped jobs (`site === Site.SOLIDES`, `atsType === 'solides'`, `atsId`/`jobUrl`
  defined); `companyUrl` resolution path exercised; no-slug/url returns empty; unknown
  tenant degrades gracefully; `resultsWanted` honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`). 30000 ms timeouts on network
  tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths,
  and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-SO-1 — Pagination.** The listing endpoint pages via `take` (page size) + `page`,
  returning `count` / `currentPage` / `totalPages`. **Default (proceeding):** request a
  page size of 50 and walk pages until `totalPages` / `resultsWanted` is reached or a page
  adds nothing new (bounded by a page cap).
- **Q-SO-2 — Stable per-role id.** Each vacancy carries a numeric `id`. **Default
  (proceeding):** use `id` (as text) — it is both the ATS id and the `/vaga/{id}` URL
  segment.
- **Q-SO-3 — Company display name.** The vacancy carries `companyName`. **Default
  (proceeding):** use `companyName`, falling back to a de-slugified, title-cased tenant
  label when absent.
- **Q-SO-4 — Custom careers domains.** Some tenants may front the board under their own
  custom domain. **Default (proceeding):** address a tenant by its `vagas.solides.com.br`
  sub-domain (the stable public host); custom-domain detection is deferred to the
  source-adoption backlog.

## 10. Decisions

- D-1: Primary surface is the public, anonymous JSON listing gateway
  `https://apigw.solides.com.br/jobs/v3/home/vacancy?slug={tenant}`. **Confidence:
  verified** — the platform, the `{tenant}.vagas.solides.com.br` addressing, the JSON
  listing endpoint, and the per-role detail URL `/vaga/{id}` were confirmed live
  2026-06-03 against the named real tenant `solides` (Sólides Tecnologia): `count: 29`
  live roles, e.g. id `858464` mapping to `https://solides.vagas.solides.com.br/vaga/858464`
  (HTTP 200).
- D-2: The board is a client-rendered Next.js SPA that hydrates from this gateway (not a
  server-embedded payload, and not an authenticated REST API needing a token); the
  adapter calls the gateway directly — no headless browser.
- D-3: The richest per-role fields are `title`, the HTML `description` body,
  `occupationAreas` (department), `recruitmentContractType` (employment type),
  `city`/`state`/`address`, and `createdAt`. The numeric `id` is the stable per-role
  ATS id.
- D-4: The listing is paginated; the adapter walks pages, dedupes by `atsId`, and slices
  to `resultsWanted` (bounded by a page cap).
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-solides/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.vagas.solides.com.br`, confirmed with the
    named real tenant `solides` (Sólides Tecnologia).
  - The public listing gateway `…/jobs/v3/home/vacancy?slug=solides` returned `count: 29`
    live vacancies, each with a numeric `id` mapping to the canonical detail URL
    `/vaga/{id}` (verified=true; `…/vaga/858464` resolved 200). Other tenants seen on the
    same gateway: `certifica` (2 roles), `feeltech` (empty board).
