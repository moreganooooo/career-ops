# Spec: 423 — Sympa ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 423                                           |
| Slug           | source-ats-sympa                              |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-04                                    |
| Last updated   | 2026-06-04                                    |
| Supersedes     | (none)                                        |
| Related specs  | 405 (Apploi), 395 (Hirehive), 385 (Gupy)      |

## 1. Problem Statement

Sympa (sympa.com — a Nordic, Finland-origin HR suite with a built-in recruitment module) hosts
a branded, public, candidate-facing careers board for every customer tenant on a per-tenant
host `https://{slug}.recruitee.com/`, addressed by a per-tenant **careers slug**. The board is a
client-rendered site backed by a **single public, anonymous JSON offers feed** it consumes (no
bearer token, no API key — the feed responds 200 to any anonymous visitor):
`GET https://{slug}.recruitee.com/api/offers/` returning `{ offers: [ …role… ] }`. The whole
open-role set is delivered in one envelope (the board renders the array client-side), so the
board is directly crawlable without authentication and without a headless browser. Ever Jobs has
no adapter for Sympa-powered boards, so these (Nordic / EU) vacancy catalogues are currently
un-ingestable. A single generic, multi-tenant Sympa adapter unlocks the full catalogue of
Sympa-powered boards with one plugin.

### Adoption rationale

- **Market share.** Sympa is one of the fastest-growing HR suites in the Nordics, with a
  recruitment module serving employer tenants across Finland, Sweden, Denmark, Norway, the
  Netherlands, Germany and the UK. Its hosted careers boards represent a meaningful pool of
  EU / Nordic vacancies absent from existing US-centric ATS adapters.
- **Public surface stability.** Each tenant board exposes a stable, documented-by-use offers
  feed at the fixed path `/api/offers/`; the envelope shape (`{ offers: [ … ] }`) and the
  per-role field names are consistent across tenants, and the feed is anonymous (no auth churn).
- **Data quality.** Each role carries a stable numeric `id`, a clean `title`, structured
  `city` / `state_name` / `country` / `country_code` plus a free-text `location`, a
  `department`, an `employment_type_code`, boolean `remote` / `hybrid` / `on_site` work-model
  flags, ISO-ish `created_at` / `published_at` timestamps, HTML `description` + `requirements`
  bodies, a `company_name`, a canonical `careers_url` detail page and a `careers_apply_url` apply
  page — a rich, directly mappable record.

## 2. Goals

- Add a generic, multi-tenant `source-ats-sympa` plugin that ingests roles from **any** Sympa
  board given a `companySlug` (the careers slug, e.g. `sympa`) or a `companyUrl` (a
  `{slug}.recruitee.com` URL, from which the slug is derived).
- Use the **public, anonymous** surface (no auth, no API key): GET the offers feed
  `GET https://{slug}.recruitee.com/api/offers/`, returning `{ offers: [ … ] }`; keep only
  `published` roles.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'sympa'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated Sympa / recruiter API (the offers feed used here is the anonymous board
  path).
- Server-side filtering by department / location / keyword. We ingest the tenant's full
  published-role set and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Sympa tenant careers slugs (handled by the source-adoption backlog, not
  this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Sympa plugin at a tenant's careers slug,
> so that I ingest that organisation's full open-roles list without writing a bespoke scraper.

> As a **plugin host**, I want the Sympa adapter to behave like every other ATS source plugin
> (same DI module, same `IScraper.scrape` contract), so that it is enable/disable/replace-able
> like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant slug from `companySlug` or from a `companyUrl` on a `*.recruitee.com` host (left-most sub-domain label). | must |
| FR-2  | Fetch the public offers feed `GET /api/offers/` on `{slug}.recruitee.com` as JSON.                   | must     |
| FR-3  | Read `offers[]` from the `{ offers }` envelope; the full open-role set arrives in one envelope (single GET, no query pagination). | must |
| FR-4  | Keep only `published` roles (lenient: a role with no `status` is treated as live).                   | must     |
| FR-5  | Use each role's numeric `id` as the stable `atsId`; de-duplicate roles by `atsId` within a run.      | must     |
| FR-6  | Map each role to `JobPostDto` (title, url ← `careers_url`, applyUrl ← `careers_apply_url`, location, department, employmentType, remote, datePosted, description). | must |
| FR-7  | Convert any role description body per `descriptionFormat` (HTML / Markdown / Plain); combine `description` + `requirements`. | should |
| FR-8  | Honour `resultsWanted` (default 100 internally) by stopping once collected, bounded by an offer cap. | must     |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided, or when no slug resolves. | must |
| FR-10 | Tolerate unknown tenants (HTTP 404), network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public anonymous board feed      |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; offer cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | parse the public JSON feed only  |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.SYMPA, name: 'Sympa', category: 'ats', isAts: true })
class SympaService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-04):

```
GET https://{slug}.recruitee.com/api/offers/
  → { "offers": [
        { "id": 2620732, "slug": "aml-branch-manager-romania",
          "title": "AML Branch Manager, Romania", "status": "published",
          "careers_url": "https://careers.example.com/o/aml-branch-manager-romania",
          "careers_apply_url": "https://careers.example.com/o/aml-branch-manager-romania/c/new",
          "city": "Bucharest", "state_name": "București", "country": "Romania",
          "country_code": "RO", "location": "Bucharest, București, Romania",
          "department": "Support & Operations", "employment_type_code": "fulltime_permanent",
          "remote": false, "hybrid": true, "on_site": false,
          "created_at": "2026-05-29 09:42:54 UTC", "published_at": "2026-05-29 09:45:21 UTC",
          "description": "<p>…</p>", "requirements": "<ul>…</ul>",
          "company_name": "…", "mailbox_email": "job.xxxxx@{slug}.recruitee.com" }
      ] }
  (Sympa's own tenant `sympa.recruitee.com` currently returns `{ "offers": [] }`;
   an unknown tenant host answers HTTP 404.)

Canonical per-role detail URL:  offers[].careers_url      (shape: https://{board}/o/{slug})
Canonical per-role apply  URL:  offers[].careers_apply_url (shape: https://{board}/o/{slug}/c/new)
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `id`                                                | `atsId`, `id`           | `id` is prefixed `sympa-{atsId}`; role skipped if absent    |
| `title`                                             | `title`                 | required; role skipped if absent                            |
| `careers_url` (else derived `/o/{slug}`)            | `jobUrl`                | canonical public detail URL                                 |
| `careers_apply_url` (else `careers_url`)            | `applyUrl`              | canonical public apply URL                                  |
| `description` + `requirements`                      | `description`           | HTML, combined; format-converted (HTML / Markdown / Plain)  |
| `published_at` (else `created_at`)                  | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `city`, `state_name`, `country` (else nested `locations[0]`) | `location`     | structured city / state / country; null when none           |
| `remote` / `hybrid` flags, then title/location/department regex | `isRemote`  | structured flags first, then text regex (`remote`/`wfh`…)   |
| `department` (else `category_code`)                 | `department`            | when present                                                |
| `employment_type_code`                              | `employmentType`        | e.g. `fulltime_permanent`                                   |
| `company_name` (else de-slugified slug)             | `companyName`           | role-level brand preferred                                  |
| —                                                   | `site`                  | constant `Site.SYMPA`                                       |
| —                                                   | `atsType`               | constant `'sympa'`                                          |
| `description` text + `mailbox_email`                | `emails`                | harvested via `extractEmails`, plus the role mailbox        |

Tenant resolution:

- `companySlug` (e.g. `sympa`) → used directly as the careers slug.
- `companySlug` containing a board URL → slug taken from the `{slug}.recruitee.com` sub-domain.
- `companyUrl` on a `*.recruitee.com` host → slug taken from the left-most sub-domain label.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable slug, unknown tenant (HTTP 404), or no roles     |
| logged warn (HTTP 4xx/5xx)   | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | feed body unparseable, or per-role map error — partial, never throws      |

## 8. Test Plan

- E2E (`__tests__/sympa.e2e-spec.ts`): known tenant (`companySlug: 'bunq'`) returns shaped jobs
  (`site === Site.SYMPA`, `atsType === 'sympa'`, `atsId`/`jobUrl` defined); `companyUrl`
  resolution path exercised; no-slug/url returns empty; unknown tenant degrades gracefully;
  `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape assertions
  guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths, and
  `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-SY-1 — Sub-domain addressing.** Sympa addresses a tenant by a careers slug as the
  left-most sub-domain label on the shared hosted careers domain. **Default (proceeding):**
  resolve the slug from `companySlug` directly or from the sub-domain of a `companyUrl`.
- **Q-SY-2 — Single-envelope feed.** The offers feed returns the tenant's full open-role set in
  one `{ offers: [ … ] }` envelope (no query-cursor pagination observed). **Default
  (proceeding):** GET the feed once and slice client-side to `resultsWanted`, bounded by an
  in-memory offer cap.
- **Q-SY-3 — Role status filter.** The feed may carry non-live roles in other states.
  **Default (proceeding):** keep only `status === 'published'` roles; treat a role with no
  `status` as live (lenient).
- **Q-SY-4 — Split body fields.** Tenants sometimes split the role body across `description`
  and `requirements`. **Default (proceeding):** concatenate both HTML bodies (de-duplicating
  when one already embeds the other) before format conversion.

## 10. Decisions

- D-1: Primary surface is the single public, anonymous board feed
  `GET https://{slug}.recruitee.com/api/offers/` (returning `{ offers: [ … ] }`).
  **Confidence: verified** — the platform, the per-tenant `{slug}.recruitee.com` addressing, the
  fixed `/api/offers/` feed path, the envelope shape, the per-role fields, and the
  unknown-tenant 404 behaviour were all confirmed live 2026-06-04 anonymously: Sympa's own
  tenant `sympa.recruitee.com/api/offers/` returned `{ "offers": [] }`, an active tenant
  returned a populated `offers` array (first role `id` `2620732`, `status` `published`,
  `careers_url` `https://…/o/aml-branch-manager-romania`), and an unknown tenant host answered
  HTTP 404. verified=true.
- D-2: The feed is consumed as a JSON REST endpoint (not a SPA needing a headless browser, and
  not an authenticated API); the adapter GETs JSON and reads `offers[]`, narrowing defensively.
- D-3: Each role carries a numeric `id`, a `title`, `careers_url` / `careers_apply_url`,
  structured location fields, a `department`, an `employment_type_code`, `remote` / `hybrid`
  flags, `published_at` / `created_at`, and HTML `description` + `requirements`. The `id` is the
  stable per-role ATS id; `careers_url` is the canonical detail URL.
- D-4: The feed is a single envelope; the adapter GETs once, keeps only `published` roles,
  dedupes by `atsId`, and stops once `resultsWanted` roles are collected (bounded by an offer
  cap).
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive object/array
  narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-sympa/` — implementation.
- Surface verified live 2026-06-04 (no authentication):
  - Platform + addressing `{slug}.recruitee.com`; fixed feed path `/api/offers/`.
  - `GET https://sympa.recruitee.com/api/offers/` → `{ "offers": [] }` (Sympa's own tenant, no
    currently-open roles).
  - An active tenant `GET https://{slug}.recruitee.com/api/offers/` →
    `{ "offers": [ { id: 2620732, slug: "aml-branch-manager-romania",
    title: "AML Branch Manager, Romania", status: "published",
    careers_url: "https://…/o/aml-branch-manager-romania",
    careers_apply_url: "https://…/o/…/c/new", city: "Bucharest", country: "Romania",
    country_code: "RO", department: "Support & Operations",
    employment_type_code: "fulltime_permanent", hybrid: true,
    published_at: "2026-05-29 09:45:21 UTC", description: "<p>…</p>" } ] }`.
  - An unknown tenant host answered HTTP 404. verified=true.
