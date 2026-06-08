# Plan: 421 — Breathe HR ATS Source Plugin

| Field         | Value                    |
| ------------- | ------------------------ |
| Spec          | spec.md                  |
| Created       | 2026-06-04               |
| Last updated  | 2026-06-04               |
| Status        | done                     |
| Owner         | scheduled-agent          |
| Supersedes    | (none)                   |
| Related specs | 405 (Apploi)             |

## Surface chosen

The public, anonymous, server-rendered candidate-facing vacancy share page that Breathe mints for
every published role and the employer embeds across their own careers page:

```
GET https://hr.breathehr.com/v/{slug}-{id}        (server-rendered HTML detail / apply page)
```

No authentication, no API key, and no headless browser is required — the page is plain
server-rendered HTML with stable, class-named markup. This was preferred over (a) any
authenticated Breathe area (the `/recruitment/vacancies` management board and the tenant
`*.breathehr.com` sub-domain both 302-redirect to `login.breathehr.com`) and (b) waiting on a
Breathe-hosted public index (Breathe exposes none — tenants embed the share links on their own
sites). The trailing numeric segment of the `{slug}-{id}` token is the stable vacancy id (the
ATS id).

## Parse strategy

1. **Resolve vacancy references.**
   - A `companySlug` (or `companyUrl`) that is itself a `hr.breathehr.com/v/{slug}-{id}` URL or a
     bare `{slug}-{id}` token → a single direct vacancy reference.
   - Otherwise a `companyUrl` (or a `companySlug` that is a URL) is the tenant's own careers page:
     GET it as HTML and **harvest** every embedded `hr.breathehr.com/v/{slug}-{id}` link (deduped
     by vacancy id, first-seen order). A bare non-URL slug yields no careers page (we cannot
     synthesise a tenant's own site) → empty.
2. **Bound the work.** Dedupe references by vacancy id and slice to `min(resultsWanted, page cap)`.
3. **Fetch + parse each role.** GET each `/v/{slug}-{id}` page as HTML via the `@ever-jobs/common`
   client and parse it with the bundled HTML parser: `.job-title` (title), `.vacancy-company`
   ("Vacancy at {Company}" → company), `<title>` (fallback company), `.salary` ("Salary" label
   stripped), `.location` (free text), the two `.vacancy-date` blocks (labelled by a leading
   `<strong>` → "Vacancy listed" / "Application deadline"), `.trix-content` (HTML body; fallback
   `.vacancy-subsection-details`), and `og:url` (canonical URL).
4. **Distinguish failure modes.** An HTTP 4xx/5xx (e.g. a removed role 404s) → skip that role
   (host reachable). A transport-level failure (DNS / refused / reset / timeout) → abort the
   drain (host unreachable). Malformed HTML → empty parse. Never throw.
5. **Normalise + map** each role → `JobPostDto`, deduping by `atsId`, stopping at `resultsWanted`.

## Normalisation mapping

- `atsId` ← trailing numeric `-{id}` of the `{slug}-{id}` token (role skipped if absent).
- `title` ← `.job-title` (role skipped if absent).
- `description` ← `.trix-content` HTML (else `.vacancy-subsection-details`), converted per
  `descriptionFormat` (HTML as-is / Markdown via `markdownConverter` / Plain via
  `htmlToPlainText`).
- `jobUrl` = `applyUrl` ← `og:url` (else the requested `/v/{slug}-{id}` URL; the detail page hosts
  the apply flow inline).
- `location` ← `.location` free text, split on `,` / `/` into city + region; null when none.
- `datePosted` ← the "Vacancy listed" `.vacancy-date` (`DD/MM/YYYY`), parsed to `YYYY-MM-DD`.
- `isRemote` ← remote regex over title / location / description (`remote`/`home-working`/
  `home-based`/`hybrid`/`wfh`/`work from home`…).
- `companyName` ← `.vacancy-company` with the "Vacancy at " prefix stripped, else the de-slugified
  `<title>`.
- `salary` ← `.salary` ("Salary" label stripped) — retained on the normalised role for context.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.BREATHEHR`; `atsType` = `'breathehr'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial results
  on an unexpected error.
- `fetchCareersPage` / `fetchVacancy` swallow HTTP 4xx / 5xx (logged warn → null/skip, host
  reachable) and DNS / network errors (logged warn → `hostReachable: false`, abort drain).
- `parseVacancy` wraps the HTML load in try/catch and returns `{}` on a parser error; every field
  is read defensively and may be absent.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out (roles are fetched sequentially in a bounded loop).
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and `requestTimeout`
  (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-breathehr/
  package.json
  tsconfig.json
  src/index.ts                       → barrel: BreatheHrModule, BreatheHrService
  src/breathehr.constants.ts         → host, origins, URL builders, link/token/id regexes, page cap, headers, remote regex
  src/breathehr.types.ts             → vacancy-ref + raw-page + normalised BreatheHrJob interfaces
  src/breathehr.module.ts            → @Module providing+exporting BreatheHrService
  src/breathehr.service.ts           → @SourcePlugin + BreatheHrService implements IScraper
  __tests__/breathehr.e2e-spec.ts    → network-tolerant E2E
.specify/specs/421-source-ats-breathehr/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this plugin
references `Site.BREATHEHR` but does not edit any shared file.
