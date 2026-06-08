# Plan: 339 — JobDiva ATS Source Plugin

| Field         | Value             |
| ------------- | ----------------- |
| Spec          | spec.md           |
| Created       | 2026-06-03        |
| Last updated  | 2026-06-03        |
| Status        | done              |
| Owner         | scheduled-agent   |
| Supersedes    | (none)            |
| Related specs | 338 (TalentAdore) |

## Overview

Build a generic, multi-tenant JobDiva ATS source plugin that mirrors the
structure/idiom of the TalentAdore reference adapter (Spec 338) and the Eploy
XML-feed adapter (the established cheerio-XML-mode pattern). JobDiva serves open
roles through public, anonymous candidate-portal XML feeds keyed by an opaque
portal key (`?a={portalId}`).

## Files

```
packages/plugins/source-ats-jobdiva/
  package.json              # @ever-jobs/source-ats-jobdiva, main/types src/index.ts, MIT
  tsconfig.json             # extends ../../../tsconfig.base.json; outDir dist/packages/source-ats-jobdiva
  src/index.ts              # re-export JobDivaModule + JobDivaService
  src/jobdiva.constants.ts  # hosts, feed paths, portal-key regex, default cap, headers, doc comment
  src/jobdiva.types.ts      # JobDivaJob, JobDivaFeed — parsed XML wire shape (+ camelCase aliases)
  src/jobdiva.module.ts     # @Module providers/exports [JobDivaService]
  src/jobdiva.service.ts    # @SourcePlugin + IScraper implementation
  __tests__/jobdiva.e2e-spec.ts
```

## Fetch flow

1. `scrape(input)` — return empty `JobResponseDto` if neither `companySlug` nor
   `companyUrl` is set.
2. `resolveTenant` → `{host, portalId}`:
   - bare portal key → default host `www1.jobdiva.com`.
   - `{host}|{portalId}` pair → explicit host + key.
   - full portal / feed URL (in slug or `companyUrl`) → `a` query parameter is
     the key; URL origin is the host when it is `*.jobdiva.com`.
   - return empty when no portal key recoverable.
3. Build the `@ever-jobs/common` HTTP client with `proxies` / `caCert` /
   `requestTimeout`, set browser-like + XML-accept headers.
4. `fetchFeed` (candidate feed first): `GET {host}/candidates/myjobs/getportaljobs.jsp?a={portalId}`
   as text; parse with cheerio in XML mode (`xmlMode: true`); read
   `<outertag><jobs><job>`. Fall back to the employer "connect" feed
   (`/employers/connect/listofportaljobs.jsp`) when the candidate feed is empty.
5. `collect` → map each `<job>` to `JobPostDto`, de-dup by `atsId`
   (`<jobdivaid>`), slice to `resultsWanted`.

## Mapping

- `id` = `jobdiva-{atsId}`, `atsId` = `<jobdivaid>` (else `<jobdiva_no>`),
  `atsType` = `'jobdiva'`, `site` = `Site.JOBDIVA`.
- `jobUrl`/`applyUrl` = `<portal_url>` (else reconstructed portal landing URL).
- `description` from `<jobdescription>` (else `<jobdescription_400char>`),
  converted per `descriptionFormat` via `markdownConverter` / `htmlToPlainText`.
- `emails` = `extractEmails(description)`.
- `location` from `<city>`/`<state>`/`<state_abbr>`/`<countryid>` (employer
  feed) else split free-text `<location>`.
- `department` = `<division>` (else `<division2>`), `employmentType` =
  `<positiontype>`, `datePosted` from `<issuedate>`/`<startdate>` (epoch or
  string → `YYYY-MM-DD`), `isRemote` from text signals.
- `companyName` from `<company>` (employer feed) else portal-key-derived label.

## Error handling (graceful degradation)

- No slug/url, or unresolvable portal key → empty `JobResponseDto`.
- HTTP 4xx on a feed → logged warn, treated as "no jobs" (try fallback feed).
- 5xx / network error → rethrown to the outer `try`, which returns partial
  results (never throws out of `scrape`).
- Per-job map error → logged warn, skip that job (`collect` try/catch).
- XML parse error → logged warn, empty feed.

## Performance

- One fetch per feed; the candidate feed alone satisfies most tenants (the
  employer feed is only fetched when the candidate feed is empty).
- Full open-roles list returned in one envelope; client-side slice to
  `resultsWanted`. De-dup by `atsId` via a `Set`.

## Out of scope (orchestrator-wired)

- `Site.JOBDIVA` enum entry, `ALL_SOURCE_MODULES`, `tsconfig.base.json` path
  alias, `jest.config.js` moduleNameMapper. This plugin only references
  `Site.JOBDIVA`.
