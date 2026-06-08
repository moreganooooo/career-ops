# Spec: 402 — Cezanne HR ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 402                                           |
| Slug           | source-ats-cezanne                            |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 385 (Gupy), 384 (Emply), 366 (Scout Talent)   |

## 1. Problem Statement

Cezanne HR (cezannehr.com — a UK / EU mid-market HR + recruitment suite) hosts a branded,
public, candidate-facing careers / vacancies board for every customer tenant on its shared
hosted careers host `https://cezanneondemand.intervieweb.it/{tenant}/{lang}/career`. The
board is a **server-rendered** page that lists each open role as an anchor to its per-role
detail page (`…/jobvacancy/{slug}/{id}`); richer boards / detail pages additionally embed
schema.org `JobPosting` JSON-LD. The board is therefore directly crawlable without
authentication and without a headless browser — by harvesting the per-role `jobvacancy`
anchors (and the JSON-LD island when present). Ever Jobs has no adapter for Cezanne-powered
careers boards, so these (UK / EU-heavy, mid-market) vacancy catalogues are currently
un-ingestable. A single generic, multi-tenant Cezanne adapter unlocks the full catalogue of
Cezanne-powered careers boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-cezanne` plugin that ingests roles from **any**
  Cezanne careers board given a `companySlug` (the tenant path segment, e.g.
  `bluecresthealth`) or a `companyUrl` (a careers-board URL on the hosted careers host, from
  which the tenant label is derived).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered careers
  board `https://cezanneondemand.intervieweb.it/{tenant}/{lang}/career` whose HTML lists
  each open role as a `jobvacancy` anchor (and embeds schema.org `JobPosting` JSON-LD when
  available); each role carries a stable trailing numeric vacancy `id`.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'cezanne'`).

## 3. Non-Goals

- Any authenticated Cezanne REST API (the host exposes an `/api/{VERSION}/...` endpoint
  that is version / credential keyed and requires a per-tenant context). This plugin
  consumes only the public candidate-facing careers board.
- Driving the board's client-side session / CSRF bootstrap with a headless browser. The
  adapter parses the server-rendered board / JSON-LD only; a session-gated board degrades
  to an empty result.
- Server-side filtering by category / location / work type (the board supports these
  facets). We ingest the tenant's full board role set and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Cezanne tenant slugs (handled by the source-adoption backlog, not
  this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Cezanne plugin at a tenant's careers
> board, so that I ingest that organisation's full open-roles list without writing a bespoke
> scraper.

> As a **plugin host**, I want the Cezanne adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (expanded to `/{tenant}/{lang}/career`) or from a `companyUrl` on the hosted careers host (first path segment is the tenant). | must |
| FR-2  | Fetch the public server-rendered careers board across known locale variants (`en`, `it`, `es`, `fr`, `de`) until one yields harvestable roles. | must |
| FR-3  | Harvest per-role `jobvacancy` anchors and any schema.org `JobPosting` JSON-LD island(s) from the board HTML, merging by the trailing vacancy id. | must |
| FR-4  | Use each role's trailing numeric vacancy `id` as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, employmentType, remote, datePosted, description, applyUrl) building the canonical detail / apply URL `…/jobvacancy/{slug}/{id}`. | must |
| FR-6  | Convert any role description body (from JSON-LD) per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the board role set, bounded by a probe-page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, empty / session-gated boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public server-rendered board     |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | parse server-rendered anchors + JSON-LD only |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.CEZANNE, name: 'Cezanne HR', category: 'ats', isAts: true })
class CezanneService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface researched 2026-06-03, documented-but-unverified):

```
GET https://cezanneondemand.intervieweb.it/{tenant}/{lang}/career
  → server-rendered HTML listing each open role as a detail anchor:
      <a href="…/{tenant}/{lang}/jobvacancy/{slug}/{id}">{title}</a>
    and (when present) one or more schema.org JobPosting JSON-LD islands:
      <script type="application/ld+json">
        { "@type":"JobPosting", "title":"…", "url":"…/jobvacancy/{slug}/{id}",
          "datePosted":"…", "employmentType":"FULL_TIME",
          "hiringOrganization": { "name":"…" },
          "jobLocation": { "address": { "addressLocality":"…",
            "addressRegion":"…", "addressCountry":"…" } },
          "description":"…" }
      </script>
    Roles are merged by the trailing numeric vacancy id in the detail URL.

Canonical per-role detail / apply URL:
  https://cezanneondemand.intervieweb.it/{tenant}/{lang}/jobvacancy/{slug}/{id}
```

Wire shape → `JobPostDto` mapping:

| Source                                                       | JobPostDto field        | Notes                                                       |
| ------------------------------------------------------------ | ----------------------- | ----------------------------------------------------------- |
| trailing `…/jobvacancy/{slug}/{id}` id                       | `atsId`, `id`           | `id` is prefixed `cezanne-{atsId}`; role skipped if absent  |
| JSON-LD `title` / anchor text                                | `title`                 | required; role skipped if absent                            |
| `…/jobvacancy/{slug}/{id}`                                   | `jobUrl`, `applyUrl`    | canonical public detail URL (also hosts the apply flow)     |
| JSON-LD `description` (when present, HTML)                    | `description`           | format-converted (HTML / Markdown / Plain)                  |
| JSON-LD `datePosted` (when present)                          | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| JSON-LD `jobLocation.address.{addressLocality, addressRegion, addressCountry}` | `location` | structured city / state / country; null when none           |
| JSON-LD `employmentType` (when present)                      | `employmentType`        | first usable string                                         |
| title / location regex (`remote`/`home office`/`wfh`/…)      | `isRemote`              | text regex over title + location                            |
| JSON-LD `hiringOrganization.name` (else de-slugified slug)   | `companyName`           | the board listing carries no per-role brand name            |
| —                                                            | `site`                  | constant `Site.CEZANNE`                                     |
| —                                                            | `atsType`               | constant `'cezanne'`                                        |
| `description` text                                           | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `bluecresthealth`) → expanded to
  `https://cezanneondemand.intervieweb.it/{tenant}/{lang}/career`.
- `companySlug` containing a bare host / `intervieweb.it` → tenant taken from the URL's
  first path segment.
- `companyUrl` on an `intervieweb.it` host → first path segment is the tenant
  (`www` / `access.php` / `app.php` rejected as non-tenant labels).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), session-gated / empty board, or no roles |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | JSON-LD island present but unparseable, or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/cezanne.e2e-spec.ts`): known tenant (`companySlug: 'bluecresthealth'`)
  returns shaped jobs (`site === Site.CEZANNE`, `atsType === 'cezanne'`, `atsId`/`jobUrl`
  defined); `companyUrl` resolution path exercised; no-slug/url returns empty; unknown
  tenant degrades gracefully; `resultsWanted` honoured. Network-tolerant (zero results is
  acceptable — the live board performs a client-side session bootstrap a non-headless client
  cannot drive; shape assertions guarded by `length > 0`). 30000 ms timeouts on network
  tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths,
  and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-CZ-1 — Board locale.** The board is served per language at `/{tenant}/{lang}/career`.
  **Default (proceeding):** probe `en` first, then `it` / `es` / `fr` / `de`, taking the
  first locale that yields harvestable roles.
- **Q-CZ-2 — Stable per-role id.** Each role's detail URL ends in a numeric vacancy id.
  **Default (proceeding):** use that trailing `…/jobvacancy/{slug}/{id}` id directly as the
  stable ATS id.
- **Q-CZ-3 — Company display name.** The board listing carries no per-role brand name.
  **Default (proceeding):** read the JSON-LD `hiringOrganization.name` when present, falling
  back to a de-slugified, title-cased tenant label.
- **Q-CZ-4 — Role description body + session gate.** The board listing anchors are
  lightweight (title + detail URL); the richer fields (description, datePosted, location)
  come from the schema.org JSON-LD when the board embeds it, and the live anonymous board
  performs a client-side session / CSRF bootstrap behind a CDN before rendering roles.
  **Default (proceeding):** map every field the server-rendered board + JSON-LD expose and
  degrade gracefully to an empty result when the session-bootstrapped board exposes no
  harvestable roles (the canonical `/jobvacancy/{slug}/{id}` detail page remains the body
  source for a future per-role detail fan-out).

## 10. Decisions

- D-1: Primary surface is the public, anonymous server-rendered careers board on the hosted
  careers host `cezanneondemand.intervieweb.it/{tenant}/{lang}/career`, whose HTML lists
  each open role as a `jobvacancy` detail anchor and (when present) embeds schema.org
  `JobPosting` JSON-LD. **Confidence: documented-but-unverified** — the platform, the
  `{tenant}/{lang}/career` addressing, and many real named tenants were confirmed live
  2026-06-03 (e.g. `bluecresthealth`, `orecatapult`, `turing`, `croesus`, `unity`, `msfuk`,
  `inspirationhealthcare`, `ymcaderbyshire`); the `jobvacancy` detail path segment is
  accepted by the host. The role list itself could **not** be confirmed against a live
  extracted payload: the anonymous board performs a client-side session / CSRF bootstrap (a
  `302` to `access.php`) behind a CDN before rendering roles, which a non-headless HTTP
  client cannot drive. The adapter is therefore built **defensively** against the documented
  board + detail-URL shape. verified=false.
- D-2: The board is a server-rendered page (not a separate JSON API needing credentials);
  the adapter harvests the `jobvacancy` anchors and, when present, the schema.org JSON-LD
  island — no headless browser. The host's `/api/{VERSION}/...` REST endpoint exists but is
  version / credential keyed and is deliberately NOT used (it is not the anonymous candidate
  surface).
- D-3: Each role's detail URL ends in a numeric vacancy id; that id is the stable per-role
  ATS id. The richest structured fields come from the schema.org `JobPosting` JSON-LD when
  the board embeds it; the anchor listing supplies the always-present title + URL fallback.
- D-4: The board renders every open role in one document (no server-side pagination of the
  role set); the adapter collects the harvested roles, dedupes by `atsId`, and slices to
  `resultsWanted` (bounded by a probe-page cap).
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-cezanne/` — implementation.
- Surface researched 2026-06-03 (no authentication; documented-but-unverified):
  - Platform + tenant board pattern `cezanneondemand.intervieweb.it/{tenant}/{lang}/career`,
    confirmed live with named real tenants `bluecresthealth`, `orecatapult`, `turing`,
    `croesus`, `unity`, `msfuk`, `inspirationhealthcare`, `ymcaderbyshire`.
  - The per-role detail path segment `jobvacancy` (canonical
    `/{tenant}/{lang}/jobvacancy/{slug}/{id}`) is accepted by the host. The live anonymous
    board redirects (`302` → `access.php`) into a client-side session / CSRF bootstrap
    behind a CDN before rendering roles, so the role list was not extracted from a live
    payload by a non-headless client; the host's `/api/{VERSION}/...` endpoint is
    version / credential keyed and is not the anonymous surface. Confidence:
    **documented-but-unverified** (verified=false).
