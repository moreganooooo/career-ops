# Plan: 379 — Carerix ATS Source Plugin

| Field         | Value                    |
| ------------- | ------------------------ |
| Spec          | spec.md                  |
| Created       | 2026-06-03               |
| Last updated  | 2026-06-03               |
| Status        | done                     |
| Owner         | scheduled-agent          |
| Supersedes    | (none)                   |
| Related specs | 380 (OTYS)               |

## Surface chosen

Public, anonymous **CxTools XML job feeds** served per tenant under
`https://{tenant}.carerix.com/cxtools/`:

1. `indeedFeed.php` — Indeed XML schema (`<source><job>…</job></source>`). Primary:
   the most uniformly structured feed across tenants.
2. `jobboardFeed.php?start=0&count=300[&medium={code}]` — generic CxTools job-board
   XML, paged via `start`/`count`. First fallback.
3. `RSSx.php` — RSS 2.0 / J4P "extended" feed (`<item>…</item>`). Last fallback.

The authenticated REST API (`api.carerix.com`) and the password-gated XML interface
are explicitly out of scope. The stable per-vacancy ATS id is the Carerix
`publicationID`.

Rationale for verified=false: Carerix's own technical documentation fully specifies
the addressing scheme, feed paths, query params, and the `publicationID` identifier,
but a live tenant feed could not be fetched during research (the generic feeds
require a per-tenant XML password to be enabled, and the demo sub-domain presented a
TLS host mismatch). The parser is therefore written defensively against the
documented feed shapes.

## Architecture / approach

`CarerixService implements IScraper`, decorated `@SourcePlugin({ site: Site.CARERIX,
… })` + `@Injectable`. Flow:

1. **Resolve tenant** (`resolveTenant`) from `companySlug` (the Carerix application
   name) or `companyUrl` (leading sub-domain label on a `carerix.com` host; `www`
   ignored). Empty when neither resolves.
2. **Build HTTP client** via `createHttpClient({ proxies, caCert, timeout })`; set
   browser-like XML/RSS headers.
3. **Probe feeds in order** (`fetchJobList`): for each candidate feed path, fetch
   (the job-board feed is paged via `start`/`count` up to a page cap; the Indeed /
   RSS feeds are single-document), parse `<job>` / `<item>` blocks, de-dup by
   `publicationID` (else URL), and stop at `resultsWanted`. The first feed that
   yields vacancies wins.
4. **Parse** (`parseFeed` → `parseIndeedJob` / `parseRssItem`): match each block with
   a regex, read child tags via `tag()` (unwraps CDATA, decodes XML entities). No XML
   dependency — defensive regex extraction, NFR-6.
5. **Normalise + map** (`normaliseJob` → `processJob`): assemble a `CarerixJob`, then
   a `JobPostDto`; skip a vacancy with no title or no id.

## Normalisation mapping

- `id` = `carerix-{publicationID}`; `atsId` = `publicationID`; `atsType` = `'carerix'`.
- `title` ← `<title>` (required).
- `jobUrl` / `applyUrl` ← `<url>`/`<link>`, else `…/vacature-{publicationID}`.
- `description` ← `<description>` (HTML), format-converted per `descriptionFormat`.
- `datePosted` ← `<date>`/`<pubDate>` parsed → `YYYY-MM-DD` (relative → null).
- `location` ← `<city>`/`<state>`/`<country>` → `LocationDto`; null when none usable.
- `isRemote` ← remote/`thuiswerk`/`hybride`/`wfh` across title / location / type / category.
- `department` ← `<category>`; `employmentType` ← normalised `<jobtype>`.
- `companyName` ← `<company>`, else de-slugified + title-cased tenant.
- `emails` ← `extractEmails(description)`.

## Error handling

- No slug/url → empty `JobResponseDto` (FR-8).
- Unresolvable tenant → empty.
- HTTP 4xx / DNS / network / 5xx on a feed → `fetchText` returns null → that feed is
  skipped; the next fallback is tried; all-empty → empty result (FR-9). `scrape`
  never throws — a caught top-level error returns partial results.
- Per-vacancy map errors are caught and logged via `this.logger`; the run continues.
- `Promise.allSettled` is unnecessary here (feeds are fetched sequentially, fallback
  by fallback) — the sequential probe already isolates per-feed failures; per-vacancy
  parsing is in a try/catch loop.

## File list

```
packages/plugins/source-ats-carerix/
  package.json                        @ever-jobs/source-ats-carerix, 0.1.0, MIT
  tsconfig.json                       extends ../../../tsconfig.base.json
  src/index.ts                        barrel: CarerixModule, CarerixService
  src/carerix.constants.ts            host/feed paths, page cap, headers, regexes
  src/carerix.types.ts                CarerixFeedJob + CarerixJob interfaces
  src/carerix.module.ts               @Module providing+exporting CarerixService
  src/carerix.service.ts              @SourcePlugin + @Injectable IScraper
  __tests__/carerix.e2e-spec.ts       network-tolerant E2E
.specify/specs/379-source-ats-carerix/
  spec.md  plan.md  tasks.md
```

Registration in the four canonical locations (`Site` enum, `ALL_SOURCE_MODULES`,
`tsconfig.base.json` paths, `jest.config.js` moduleNameMapper) is applied centrally
by the orchestrator — not edited by this plugin.
