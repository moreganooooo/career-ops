# Plan: 401 — Sage People ATS Source Plugin

| Field         | Value                    |
| ------------- | ------------------------ |
| Spec          | spec.md                  |
| Created       | 2026-06-03               |
| Last updated  | 2026-06-03               |
| Status        | done                     |
| Owner         | scheduled-agent          |
| Supersedes    | (none)                   |
| Related specs | 385 (Gupy)               |

## Surface chosen

Public, anonymous, server-rendered Recruit applicant-portal board on the hosted
Salesforce-Sites host `https://{tenant}.my.salesforce-sites.com/{path}/`. The board page
(`fRecruit__ApplyJobList`, probed across site-paths `careers`, `recruit`, root) is a
server-rendered Visualforce page that embeds the full open-roles set directly in the HTML
as a table whose rows each link to a role's detail / apply page:

```
<a href="/careers/fRecruit__ApplyJob?vacancyNo=VN4027&portal=English">Job Title</a>
```

No authentication, no API key, and no headless browser is required — the role anchors are
already in the rendered HTML. This was preferred over (a) the authenticated Salesforce
org APIs (REST / SOAP / Bulk — all need credentials / a connected app) and (b) treating
the page as a client-rendered SPA (the board is server-rendered, so a browser is
unnecessary). The board is **distinct** from the Sage HR / CakeHR surface served by the
separate `source-ats-sagehr` plugin.

## Parse strategy

1. **Resolve tenant** from `companySlug` (or a full URL passed as the slug) or
   `companyUrl`. A `my.salesforce-sites.com` host yields the tenant from its leading
   sub-domain label (`www` / `portal` rejected); a bare slug expands to
   `{tenant}.my.salesforce-sites.com`.
2. **Probe the board** across site-path variants (`careers`, `recruit`, root; cap
   `SAGEPEOPLE_MAX_PAGES`), fetching each as text via the `@ever-jobs/common` HTTP client.
   The first site-path whose `fRecruit__ApplyJobList` board yields role anchors wins. HTTP
   4xx / DNS / 5xx degrade to "try next" (and ultimately empty), never throw; a
   transport-level failure aborts the sweep (host unreachable).
3. **Harvest the roles.** `SAGEPEOPLE_JOB_ANCHOR_REGEX` captures every
   `<a href="…fRecruit__ApplyJob?…vacancyNo=VN…">Title</a>` anchor; `vacancyNo` is pulled
   from the href (`SAGEPEOPLE_VACANCY_NO_REGEX`) as the stable id, the anchor text is the
   title (tag-stripped, entity-decoded), and the `portal` label is preserved
   (`SAGEPEOPLE_PORTAL_REGEX`). The board's "Page N of M" total
   (`SAGEPEOPLE_PAGINATION_REGEX`) drives a bounded pagination sweep (`pageNumber`
   parameter), deduping by `vacancyNo` within and across pages.
4. **Normalise + map** each role → `JobPostDto`, deduping by `atsId`, slicing at
   `resultsWanted`.

## Normalisation mapping

- `atsId` ← anchor `vacancyNo` (e.g. `VN4027`).
- `title` ← anchor text, tag-stripped + entity-decoded (role skipped if absent).
- `description` ← null on the list page (the `fRecruit__ApplyJob` detail page is the body
  source for a future per-role detail fan-out); converted per `descriptionFormat`
  (HTML as-is / Markdown via `markdownConverter` / Plain via `htmlToPlainText`) when
  present.
- `jobUrl` = `applyUrl` ← the harvested anchor href, resolved absolute against the tenant
  origin (the detail page hosts the apply flow inline).
- `location` ← structured city / country recovered from the role's board row; null when
  nothing usable.
- `datePosted` ← not exposed on the list page; null.
- `isRemote` ← remote regex over title / location (English variants:
  `remote` / `home office` / `home based` / `wfh` / …).
- `companyName` ← de-slugified, title-cased tenant Salesforce-Site label.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.SAGEPEOPLE`; `atsType` = `'sagepeople'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns
  partial results on an unexpected error.
- `fetchHtml` swallows HTTP 4xx / 5xx (logged warn → null, host reachable) and DNS /
  network errors (logged warn → null, host unreachable → abort sweep).
- `parseBoardPage` returns an empty `vacancies` array when the board is absent / empty
  under a site-path (probe continues); a board with anchors wins and drives pagination.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out (the board is parsed page-by-page in a bounded loop); a future
  per-role detail fan-out would use `Promise.allSettled`.
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and
  `requestTimeout` (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-sagepeople/
  package.json
  tsconfig.json
  src/index.ts                        → barrel: SagePeopleModule, SagePeopleService
  src/sagepeople.constants.ts         → hosts, site paths, Recruit page names, caps, headers, anchor + vacancyNo + pagination + remote regexes
  src/sagepeople.types.ts             → SagePeopleVacancy / SagePeopleJob / SagePeopleBoardPage interfaces
  src/sagepeople.module.ts            → @Module providing+exporting SagePeopleService
  src/sagepeople.service.ts           → @SourcePlugin + SagePeopleService implements IScraper
  __tests__/sagepeople.e2e-spec.ts    → network-tolerant E2E
.specify/specs/401-source-ats-sagepeople/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.SAGEPEOPLE` but does not edit any shared file.
