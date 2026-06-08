# Plan: 404 — HR Partner ATS Source Plugin

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

Public, anonymous, server-rendered job board on the hosted careers host
`https://{tenant}.hrpartner.io/jobs`. The board (probed across `/jobs`, `/`) is a
server-rendered HTML page (Tailwind + Alpine.js progressive enhancement) that emits the
full open-roles set directly in the markup, each role as a `.job-listing` card:

```
<div class="… job-listing …"> … <div class="p-6">
  <a class="block mb-3" href="/jobs/{slug}"><h3>{title}</h3></a>
  <div class="… job-content …">{summary}</div>
  <span class="… rounded-full …">{location}</span>
  <span class="… rounded-full …">{category}</span>
</div> … </div>
```

No authentication, no API key, and no headless browser is required — the role data is
already in the HTML. This was preferred over (a) the authenticated HR Partner REST API
(needs per-tenant credentials) and (b) treating the page as a client-rendered SPA (the data
is server-rendered, and the page is progressively enhanced with Alpine.js for styling only,
so a browser is unnecessary). There is no `__NEXT_DATA__` data island, JSON-LD block, or
public JSON / RSS endpoint on the board (verified live 2026-06-03), so HTML card parsing is
the correct surface.

## Parse strategy

1. **Resolve tenant** from `companySlug` (or a full URL passed as the slug) or
   `companyUrl`. A `hrpartner.io` host yields the tenant from its leading sub-domain label
   (`www` / `workplace` / `help` rejected); a bare slug expands to `{tenant}.hrpartner.io`.
2. **Probe the board** across path variants (cap `HRPARTNER_MAX_PAGES`), fetching each as
   text via the `@ever-jobs/common` HTTP client. The first page whose HTML emits
   `.job-listing` cards wins; the board `<h1>` / `og:title` / `<title>` lead is read for
   the brand name (ignoring HR Partner's generic catch-all titles). HTTP 4xx / DNS / 5xx
   degrade to "try next" (and ultimately empty), never throw; a transport-level failure
   aborts the sweep (host unreachable). When no path yields cards, return a valid empty set
   (an unknown tenant resolves to the host's catch-all empty board, HTTP 200 with no cards).
3. **Extract the cards.** `HRPARTNER_CARD_REGEX` captures each card's inner HTML; per-card,
   `HRPARTNER_TITLE_LINK_REGEX` reads the `/jobs/{slug}` href + `<h3>` title (with an
   href-only fallback), `HRPARTNER_SUMMARY_REGEX` reads the `job-content` summary, and
   `HRPARTNER_TAG_REGEX` reads the `rounded-full` pills (first = location, rest = category).
   A card with no role href is skipped.
4. **Normalise + map** each card → `JobPostDto`, deduping by `atsId` (the URL slug), slicing
   at `resultsWanted`.

## Normalisation mapping

- `atsId` ← `/jobs/{slug}` final URL segment (the slug or numeric id).
- `title` ← `<h3>` text (role skipped if absent).
- `description` ← `job-content` summary when present, converted per `descriptionFormat`
  (HTML as-is / Markdown via `markdownConverter` / Plain via `htmlToPlainText`).
- `jobUrl` = `applyUrl` ← `/jobs/{slug}` (the detail page hosts the apply flow inline).
- `location` ← first `rounded-full` pill, comma-split → city / state / country; null when
  nothing usable.
- `datePosted` ← not exposed on the board card → null.
- `department` ← remaining `rounded-full` pill(s).
- `isRemote` ← remote regex over title / location / category (no structured flag on the
  board).
- `companyName` ← board `<h1>` → `og:title` → `<title>` leading segment (generic catch-all
  titles ignored) → de-slugified, title-cased tenant label.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.HRPARTNER`; `atsType` = `'hrpartner'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchHtml` swallows HTTP 4xx / 5xx (logged warn → null, host reachable) and DNS /
  network errors (logged warn → null, host unreachable → abort sweep).
- `extractJobs` returns an empty array when the board emits no cards (a valid "no roles"
  result); `fetchJobs` returns an empty set rather than null in that case so the caller logs
  an empty board, not an unreachable host.
- Per-card / per-role mapping errors are caught per-iteration so one bad card never drops
  the rest, and per-card field extraction is fully defensive (tag-stripped, trimmed,
  null-narrowed).
- No `Promise.all` fan-out (the board is parsed from a single document); per-role work is a
  simple bounded loop. (`Promise.allSettled` would be used for any future per-role detail
  fan-out.)
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and
  `requestTimeout` (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-hrpartner/
  package.json
  tsconfig.json
  src/index.ts                       → barrel: HrPartnerModule, HrPartnerService
  src/hrpartner.constants.ts         → hosts, index paths, caps, headers, card + field + brand regexes
  src/hrpartner.types.ts             → HrPartnerJobItem / HrPartnerJob interfaces
  src/hrpartner.module.ts            → @Module providing+exporting HrPartnerService
  src/hrpartner.service.ts           → @SourcePlugin + HrPartnerService implements IScraper
  __tests__/hrpartner.e2e-spec.ts    → network-tolerant E2E
.specify/specs/404-source-ats-hrpartner/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.HRPARTNER` but does not edit any shared file.
