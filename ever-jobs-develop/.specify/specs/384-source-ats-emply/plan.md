# Plan: 384 — Emply (Visma) ATS Source Plugin

| Field         | Value                    |
| ------------- | ------------------------ |
| Spec          | spec.md                  |
| Created       | 2026-06-03               |
| Last updated  | 2026-06-03               |
| Status        | done                     |
| Owner         | scheduled-agent          |
| Supersedes    | (none)                   |
| Related specs | 376 (Altamira)           |

## Surface chosen

Public, anonymous, server-rendered open-roles index on the hosted careers host
`https://{tenant}.career.emply.com/`. The index page (probed across
`{locale}/vacant-positions`, `vacancies`, `available-positions`, `jobs`) is a thin
server-rendered shell that embeds the full open-vacancy set directly in the HTML as a
JavaScript bootstrap call:

```
proceedBatch({ vacancies : JSON.parse('[ {…vacancy…}, … ]'), … });
```

No authentication, no API key, and no headless browser is required — the vacancy data
is already in the HTML. This was preferred over (a) the authenticated `api.emply.com`
REST API (needs a per-tenant API key) and (b) treating the page as a SPA (the data is
server-embedded, so a browser is unnecessary).

## Parse strategy

1. **Resolve tenant** from `companySlug` (or a full URL passed as the slug) or
   `companyUrl`. A `career.emply.com` host yields the tenant from its leading
   sub-domain label; a bare slug expands to `{tenant}.career.emply.com`.
2. **Probe the index** across locale × path variants (cap `EMPLY_MAX_PAGES`), fetching
   each as text via the `@ever-jobs/common` HTTP client. The first page that renders the
   `proceedBatch` vacancy marker wins; its locale is remembered for URL building. HTTP
   4xx / DNS / 5xx degrade to "try next" (and ultimately empty), never throw.
3. **Extract the batch.** `EMPLY_BATCH_REGEX` captures the single-quoted JS string
   literal argument to `JSON.parse(...)`. `decodeJsStringLiteral` decodes it with a
   left-to-right single-pass scanner (handling `\\`, `\"`, `\'`, `\/`, `\n`, `\r`, `\t`,
   `\uXXXX`, `\xXX`; unknown escapes drop the backslash) — mirroring exactly what the
   browser does before `JSON.parse`, **without `eval`**. The decoded text is then
   `JSON.parse`d into the vacancy array. A missing marker → `null` (try next path); a
   present-but-unparseable marker → empty board (logged warn, no throw).
4. **Normalise + map** each vacancy → `JobPostDto`, deduping by `atsId`, slicing at
   `resultsWanted`.

## Normalisation mapping

- `atsId` ← `shortId` → `publishingId` → `number` (first usable).
- `title` ← `title` → first translation `title`.
- `description` ← the first translation with a non-empty HTML `content`, converted per
  `descriptionFormat` (HTML as-is / Markdown via `markdownConverter` / Plain via
  `htmlToPlainText`).
- `jobUrl` ← `externalCseAdLink` or `/{locale}/ad/{titleAsUrl}/{shortId}`.
- `applyUrl` ← `externalCseApplyLink` or `/{locale}/apply/{titleAsUrl}/{shortId}`.
- `location` ← best-effort comma split of the free-text `location` into city/state/
  country; null when nothing usable; a bare "Remote" token yields a null location.
- `datePosted` ← `published` → `created`, parsed to `YYYY-MM-DD`.
- `department` ← `department`.
- `isRemote` ← remote regex over title / location / department.
- `companyName` ← de-slugified, title-cased tenant label.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.EMPLY`; `atsType` = `'emply'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns
  partial results on an unexpected error.
- `fetchHtml` swallows HTTP 4xx (logged warn → null), and 5xx / DNS / network errors
  (logged warn → null).
- `extractVacancies` returns `null` when the marker is absent (probe continues) and an
  empty array when the marker is present but unparseable (board treated as empty).
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out (the batch is parsed from a single document); per-role work
  is a simple bounded loop. (`Promise.allSettled` would be used for any future per-role
  detail fan-out.)

## File list

```
packages/plugins/source-ats-emply/
  package.json
  tsconfig.json
  src/index.ts                  → barrel: EmplyModule, EmplyService
  src/emply.constants.ts        → hosts, index paths, locales, regexes, caps, headers
  src/emply.types.ts            → EmplyVacancy / EmplyTranslation / EmplyJob interfaces
  src/emply.module.ts           → @Module providing+exporting EmplyService
  src/emply.service.ts          → @SourcePlugin + EmplyService implements IScraper
  __tests__/emply.e2e-spec.ts   → network-tolerant E2E
.specify/specs/384-source-ats-emply/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.EMPLY` but does not edit any shared file.
