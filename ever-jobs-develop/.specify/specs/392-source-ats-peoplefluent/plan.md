# Plan: 392 — PeopleFluent ATS Source Plugin

| Field         | Value                    |
| ------------- | ------------------------ |
| Spec          | spec.md                  |
| Created       | 2026-06-03               |
| Last updated  | 2026-06-03               |
| Status        | done                     |
| Owner         | scheduled-agent          |
| Supersedes    | (none)                   |
| Related specs | 384 (Emply), 379 (Carerix) |

## Surface chosen

Public, anonymous, server-rendered candidate results view on the shared PeopleClick RMS
careers host `https://careers.peopleclick.com/`. A tenant is addressed by its RMS client
code as a path segment:

```
https://careers.peopleclick.com/careerscp/client_{tenant}/external/{entry}
```

The results view (probed across `gateway.do?functionname=searchfromlink`, `search.do`,
`search/search.html`, `gateway/searchFromLink.html`) renders each open role as an anchor
pointing at the canonical detail page:

```
<a href="…/external/jobDetails/jobDetail.html?jobPostId={id}&localeCode={locale}">Title</a>
```

No authentication, no API key, and no headless browser is required. This was preferred
over (a) the authenticated RMS recruiter portal / API (needs credentials) and (b) treating
the page as a SPA (the role anchors are server-rendered).

Because a populated listing array could not be captured live this run (the role rows are
produced by a parameterised gateway / form submission, and the specific indexed detail ids
had rotated to 404), the adapter is written **defensively** against the documented anchor
shape and degrades to empty — following the Carerix precedent (verified=false).

## Parse strategy

1. **Resolve tenant** from `companySlug` (the RMS client code, or a full URL passed as the
   slug) or `companyUrl`. The `client_{tenant}` path segment is the stable tenant token
   regardless of host; a bare slug normalises to the client code.
2. **Probe the results view** across locale × entry-path variants (cap
   `PEOPLEFLUENT_MAX_PAGES`), fetching each as text via the `@ever-jobs/common` HTTP
   client. The first page that renders `jobDetail.html?jobPostId=` anchors wins; its
   locale is remembered for URL building. HTTP 4xx / 5xx degrade to "try next"; a
   transport-level failure (DNS / refused / reset / timeout) aborts the sweep (host down).
   Never throws.
3. **Extract the listings.** `PEOPLEFLUENT_JOB_ANCHOR_REGEX` captures each
   `<a href="…jobPostId={id}…">title</a>` row (href + id + inner text);
   `PEOPLEFLUENT_JOB_ID_REGEX` is a fallback that captures bare `jobPostId` tokens not
   wrapped in an anchor. Roles are keyed/deduped by `jobPostId`. No role tokens at all →
   `null` (try next entry).
4. **Normalise + map** each listing → `JobPostDto`, deduping by `atsId`, slicing at
   `resultsWanted`.

## Normalisation mapping

- `atsId` ← `jobPostId` (the numeric detail-URL id).
- `title` ← anchor inner text (HTML-stripped + entity-decoded).
- `jobUrl` / `applyUrl` ← canonical `…/jobDetails/jobDetail.html?jobPostId={id}&localeCode={locale}`.
- `location` ← best-effort comma split of any adjacent results-row location text into
  city/state/country; null when nothing usable; a bare "Remote" token yields a null
  location.
- `isRemote` ← remote regex over title / location.
- `description` ← any HTML body when present, converted per `descriptionFormat` (HTML
  as-is / Markdown via `markdownConverter` / Plain via `htmlToPlainText`).
- `companyName` ← de-slugified, title-cased tenant client code.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.PEOPLEFLUENT`; `atsType` = `'peoplefluent'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchHtml` swallows HTTP statuses (logged warn → null, host reachable) and
  transport-level failures (logged warn → null, host down) — never throws.
- `extractListings` returns `null` when no role tokens are present (probe continues) and a
  (possibly empty) array when tokens are present.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and
  `requestTimeout` (CI budget requirement).
- No `Promise.all` fan-out (the listings are parsed from a single document); per-role work
  is a simple bounded loop. (`Promise.allSettled` would be used for any future per-role
  detail fan-out.)

## File list

```
packages/plugins/source-ats-peoplefluent/
  package.json
  tsconfig.json
  src/index.ts                          → barrel: PeopleFluentModule, PeopleFluentService
  src/peoplefluent.constants.ts         → host, base path, entry paths, locales, regexes, caps, headers
  src/peoplefluent.types.ts             → PeopleFluentListing / PeopleFluentJob interfaces
  src/peoplefluent.module.ts            → @Module providing+exporting PeopleFluentService
  src/peoplefluent.service.ts           → @SourcePlugin + PeopleFluentService implements IScraper
  __tests__/peoplefluent.e2e-spec.ts    → network-tolerant E2E
.specify/specs/392-source-ats-peoplefluent/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.PEOPLEFLUENT` but does not edit any shared file.
