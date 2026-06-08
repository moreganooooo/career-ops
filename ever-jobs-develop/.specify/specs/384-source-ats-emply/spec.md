# Spec: 384 — Emply (Visma) ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 384                                           |
| Slug           | source-ats-emply                              |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 366 (Scout Talent), 364 (PyjamaHR)            |

## 1. Problem Statement

Emply (emply.com, Denmark — part of Visma) is a Nordic recruitment / HR ATS whose
candidate-facing product is a hosted, branded career site. Every customer tenant
publishes a branded, public career site on its own sub-domain of the shared hosted
careers host `https://{tenant}.career.emply.com/`. The open-roles index page is a thin
server-rendered shell that **embeds the full open-vacancy set directly in the HTML** as
a JavaScript bootstrap call (`proceedBatch({ vacancies : JSON.parse('[…]') })`), so the
board is directly crawlable without authentication and without a headless browser. Ever
Jobs has no adapter for Emply-powered career sites, so these vacancies are currently
un-ingestable. A single generic, multi-tenant Emply adapter unlocks the full catalogue
of Emply-powered career boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-emply` plugin that ingests vacancies from
  **any** Emply career site given a `companySlug` (the tenant sub-domain label, e.g.
  `au`) or a `companyUrl` (a career-site URL on a `career.emply.com` host, from which
  the tenant label is derived).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered
  open-roles index (`https://{tenant}.career.emply.com/{locale}/vacant-positions`, with
  `vacancies` / `available-positions` / `jobs` path variants) whose HTML embeds the full
  vacancy set as `proceedBatch({ vacancies : JSON.parse('[…]') })`; the embedded JSON
  carries each role's title, HTML body, department, location, dates, and the stable
  `shortId`.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'emply'`, `department`).

## 3. Non-Goals

- Any authenticated Emply API (the `api.emply.com` REST API requires a per-tenant API
  key). This plugin consumes only the public candidate-facing career site.
- Server-side filtering by category / location / work type (the board supports these
  facets). We ingest the tenant's full embedded vacancy set and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Emply tenant sub-domains (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Emply plugin at a tenant's
> career sub-domain, so that I ingest that organisation's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Emply adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (expanded to `{tenant}.career.emply.com`) or from a `companyUrl` on a `career.emply.com` host (leading sub-domain label is the tenant). | must |
| FR-2  | Fetch the public server-rendered index across known locale/path variants (`{locale}/vacant-positions`, `vacancies`, `available-positions`, `jobs`) until one returns an embedded vacancy batch. | must |
| FR-3  | Extract the `proceedBatch({ vacancies : JSON.parse('[…]') })` payload by decoding the single-quoted JS string literal (without `eval`) and `JSON.parse`-ing the result. | must |
| FR-4  | Use each vacancy's `shortId` (then `publishingId`, then `number`) as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl) building the canonical detail URL `/{locale}/ad/{titleAsUrl}/{shortId}` and apply URL `/{locale}/apply/{titleAsUrl}/{shortId}`. | must |
| FR-6  | Convert the HTML job-ad body (from the vacancy `translations[].content`) per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the embedded vacancy set, bounded by a probe-page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public embedded-JSON index page  |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | parse server-embedded JSON only  |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.EMPLY, name: 'Emply (Visma)', category: 'ats', isAts: true })
class EmplyService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://{tenant}.career.emply.com/{locale}/vacant-positions
  → server-rendered HTML embedding the full open-vacancy set as a JS bootstrap call:
      proceedBatch({ vacancies : JSON.parse('[ {…vacancy…}, … ]'), … });
    The JSON.parse argument is a single-quoted JS string literal (escapes \\, \", \',
    \/, \n, \r, \uXXXX). Decode the literal, then JSON.parse → array of vacancy objects:
      { "id":"<guid>", "adId":"<guid>", "publishingId": 33994, "number": 21157,
        "shortId":"vgxqup", "title":"…", "titleAsUrl":"…-slug",
        "department":"…", "location":"Aarhus C …", "published":"2026-05-26T12:21:57",
        "created":"…", "deadline":"…", "talentPool": false,
        "externalCseAdLink": null, "externalCseApplyLink": null,
        "translations":[ { "title":"…", "content":"<p>…HTML body…</p>" } ] }

Canonical per-role detail URL:  https://{tenant}.career.emply.com/{locale}/ad/{titleAsUrl}/{shortId}
Canonical per-role apply URL:   https://{tenant}.career.emply.com/{locale}/apply/{titleAsUrl}/{shortId}
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `shortId` (else `publishingId`, else `number`)      | `atsId`, `id`           | `id` is prefixed `emply-{atsId}`; role skipped if absent    |
| `title` (else `translations[].title`)               | `title`                 | required; role skipped if absent                            |
| `/{locale}/ad/{titleAsUrl}/{shortId}` (or `externalCseAdLink`) | `jobUrl`      | canonical public detail URL                                 |
| `/{locale}/apply/{titleAsUrl}/{shortId}` (or `externalCseApplyLink`) | `applyUrl` | canonical public apply URL                                  |
| `translations[].content` (HTML)                     | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `published` (else `created`)                        | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `location` (free-text)                              | `location`              | best-effort city / state / country split; null when none    |
| title / location / department                       | `isRemote`              | remote detection (`remote` / `wfh` / `hjemmearbejde` …)      |
| `department`                                        | `department`            | when present                                                |
| tenant slug (de-slugified + title-cased)            | `companyName`           | the board carries no brand name                             |
| —                                                   | `site`                  | constant `Site.EMPLY`                                       |
| —                                                   | `atsType`               | constant `'emply'`                                          |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `au`) → expanded to `https://au.career.emply.com`.
- `companySlug` containing a bare host / `career.emply.com` → tenant taken from the host.
- `companyUrl` on a `career.emply.com` host → leading sub-domain label is the tenant.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | marker present but unparseable, or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/emply.e2e-spec.ts`): known tenant (`companySlug: 'au'`) returns
  shaped jobs (`site === Site.EMPLY`, `atsType === 'emply'`, `atsId`/`jobUrl` defined);
  `companyUrl` resolution path exercised; no-slug/url returns empty; unknown tenant
  degrades gracefully; `resultsWanted` honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`). 30000 ms timeouts on network
  tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-EM-1 — Locale / index path.** Tenants localise the board and expose it under one
  of several index paths. **Default (proceeding):** probe `{locale}/vacant-positions`
  then `vacancies` / `available-positions` / `jobs`, across locales `en`, default, `da`,
  taking the first page that renders the `proceedBatch` vacancy marker; that page's
  locale is used to build per-role URLs.
- **Q-EM-2 — Stable per-role id.** Each vacancy carries `shortId` (the URL slug
  segment), `publishingId`, and `number`. **Default (proceeding):** prefer `shortId`
  (the canonical URL id), falling back to `publishingId` then `number`.
- **Q-EM-3 — Company display name.** The embedded vacancy carries no brand name.
  **Default (proceeding):** de-slugify + title-case the tenant sub-domain label for
  `companyName`.
- **Q-EM-4 — Custom careers domains.** Some tenants may front the board under their own
  custom domain. **Default (proceeding):** address a tenant by its `career.emply.com`
  sub-domain (the stable public host); custom-domain detection is deferred to the
  source-adoption backlog.

## 10. Decisions

- D-1: Primary surface is the public, anonymous server-rendered open-roles index on
  `{tenant}.career.emply.com`, whose HTML embeds the full vacancy set as
  `proceedBatch({ vacancies : JSON.parse('[…]') })`. **Confidence: verified** — the
  platform, the `{tenant}.career.emply.com` addressing, the embedded-JSON index, and the
  per-role URL shape `/{locale}/ad/{titleAsUrl}/{shortId}` were confirmed live 2026-06-03
  against the named real tenant `au` (Aarhus University): 6 live roles parsed, e.g.
  `…/ad/virksomhedskonsulent-til-…/vgxqup`.
- D-2: The board is a thin server-rendered shell that bootstraps with an embedded JSON
  array (not a SPA needing a headless browser, and not a separate JSON API needing an
  API key); the adapter decodes the single-quoted JS string literal (left-to-right scan,
  no `eval`) and `JSON.parse`s the result.
- D-3: The richest per-role fields are `title`, the `translations[].content` HTML body,
  `department`, `location`, and `published` / `created`. The `shortId` segment is the
  stable per-role ATS id.
- D-4: The index embeds every open role in one document (no server-side pagination of
  the job set); the adapter collects the embedded vacancies, dedupes by `atsId`, and
  slices to `resultsWanted` (bounded by a probe-page cap).
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-emply/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.career.emply.com`, confirmed with the named
    real tenant `au` (Aarhus University,
    `https://au.career.emply.com/en/vacant-positions`).
  - The server-rendered index embeds the open-vacancy set as
    `proceedBatch({ vacancies : JSON.parse('[…]') })`; decoding + `JSON.parse` yielded 6
    live vacancies, each with a `shortId` + `titleAsUrl` mapping to the canonical detail
    URL `/{locale}/ad/{titleAsUrl}/{shortId}` (verified=true). Other Emply-powered
    tenants seen: `nspa-nato`, `semcomaritime`, `capital-four`, `navigatorgas`, `dao`.
