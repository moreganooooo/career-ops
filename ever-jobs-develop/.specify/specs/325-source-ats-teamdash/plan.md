# Plan: 325 — Teamdash ATS Source Plugin

| Field        | Value                       |
| ------------ | --------------------------- |
| Spec         | spec.md                     |
| Created      | 2026-06-03                  |
| Last updated | 2026-06-03                  |
| Status       | done                        |
| Owner        | scheduled-agent             |

## Phase

Phase 334 — generic, multi-tenant Teamdash career-page adapter, end-to-end.

## Endpoint choice

Teamdash exposes **no anonymous JSON listing API** (probed `/api/*`,
`/careers`, `/jobs`, `/p/career` on a live tenant — all HTTP 404). The reliable
public surface is the **server-side-rendered career page**, which embeds the
full page state inline as a single `window.context = { ... }` JSON assignment.

Decision: read the embedded `window.context` blob directly.

- **Listing**: `GET https://{tenant}.teamdash.com/p/job/{landingToken}/{slug}`
  → `window.context.career_page_feed_contents` (map of feed-slug → job
  summaries: `{ url, title, location, imageUrl, customFields }`).
- **Detail**: `GET {feedItem.url}` → `window.context.landing` with
  `data.meta.title`, `data.blocks[]` (HTML content), `created_at`, `status`,
  `stage.name`.

The blob is extracted with a depth-tracking, string-literal-aware brace scan so
nested braces inside string values do not break the parse.

## File layout

```
packages/plugins/source-ats-teamdash/
  package.json                      # @ever-jobs/source-ats-teamdash, 0.1.0, MIT
  tsconfig.json                     # extends base; outDir dist/packages/source-ats-teamdash
  src/
    index.ts                        # export TeamdashModule, TeamdashService
    teamdash.constants.ts           # host templates, context marker, headers, defaults
    teamdash.types.ts               # TeamdashContext / TeamdashFeedItem / TeamdashLanding
    teamdash.module.ts              # @Module providing + exporting TeamdashService
    teamdash.service.ts             # @SourcePlugin + @Injectable scraper (IScraper)
  __tests__/
    teamdash.e2e-spec.ts            # 4 network-tolerant tests, live cr14 tenant
```

## Implementation notes

- `TeamdashService.scrape(input)`:
  1. Return `new JobResponseDto([])` when neither `companySlug` nor `companyUrl`.
  2. Resolve the career-page URL (prefer `companyUrl`; build from `companySlug`
     with a best-effort `career-page` landing slug).
  3. `createHttpClient({ proxies, caCert, timeout })` + `setHeaders(...)`.
  4. Fetch + parse `window.context`; read `career_page_feed_contents`; flatten +
     de-dupe by URL.
  5. Trim candidates to `resultsWanted`, then fan out to detail landings in
     bounded `Promise.allSettled` chunks (6 per round, polite delay between).
  6. Assemble description from `landing.data.blocks[]`; map to `JobPostDto`;
     de-dupe by `atsId`.
  7. Never throw — catch and return partial/empty; log via NestJS `Logger`.

- Description format honoured via `DescriptionFormat` (HTML / MARKDOWN / PLAIN)
  using `markdownConverter` / `htmlToPlainText` from `@ever-jobs/common`.
- `atsId` = opaque `/p/job/{token}/...` path token. `department` = `stage.name`.
- Remote inferred from location/title/description (incl. Estonian "kaugtöö").

## Registration (performed centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `Site.TEAMDASH = 'teamdash'` (done).
2. `packages/plugins/index.ts` — append `TeamdashModule` to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-teamdash`.
4. `jest.config.js` — matching `moduleNameMapper` entry.

This plugin touches ONLY its own package dir and spec dir.

## Verification

- `npx tsc --noEmit -p packages/plugins/source-ats-teamdash/tsconfig.json` — clean.
- Live probe against `cr14.teamdash.com` returned 2 shaped jobs with correct
  title, atsId, location, datePosted, department, remote flag, and Markdown
  descriptions; unknown tenant + no-input both returned empty.
