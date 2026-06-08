# Plan: 373 — Taleez ATS Source Plugin

| Field         | Value                            |
| ------------- | -------------------------------- |
| Spec          | spec.md                          |
| Created       | 2026-06-03                       |
| Last updated  | 2026-06-03                       |
| Status        | done                             |
| Owner         | scheduled-agent                  |
| Supersedes    | (none)                           |
| Related specs | 374 (Softy), 366 (Scout Talent)  |

## Surface chosen

Public, anonymous Taleez candidate-facing surface (no auth, no API key):

- **Board (enumeration):** `https://{tenant}.taleez.com/` (sub-domain form) with the
  `https://taleez.com/careers/{tenant}` path alias as a fallback. The board shell is
  server-rendered; its role *list* is client-rendered (Angular SPA). The adapter
  harvests canonical `https://taleez.com/apply/{slug}` anchors from the board HTML when
  Taleez server-renders them.
- **Per-role detail (parsing):** `https://taleez.com/apply/{slug}` — fully
  server-rendered, embedding a schema.org `JobPosting` JSON-LD block plus `og:` meta.
  This is the documented no-auth per-role surface.
- **Direct addressing:** a caller may pass a `…/apply/{slug}` URL as `companyUrl` to
  scrape a single role without enumerating a board.

Rejected alternatives: the authenticated `https://api.taleez.com/0/jobs` data API
(403 to anonymous callers — requires an API key + secret); driving the board SPA with
a headless browser (out of scope — deferred to the source-adoption backlog).

## Parse strategy

1. **Resolve tenant / direct role.** From `companySlug` or `companyUrl`: a
   `…/apply/{slug}` URL → single-role mode; a `{tenant}.taleez.com` host → sub-domain
   label; a `/careers/{tenant}` path → path segment; a bare slug → the tenant token.
2. **Collect links.** Single-role mode yields one `{ slug, url }`. Otherwise fetch the
   board URL(s) and run `TALEEZ_APPLY_LINK_REGEX` over the HTML to harvest
   `…/apply/{slug}` anchors, deduping by `{slug}`, slicing to `resultsWanted` (page
   cap `TALEEZ_MAX_PAGES`). An anchor-less (SPA) board yields an empty list.
3. **Fetch + parse details.** `Promise.allSettled` over the links: GET each
   `/apply/{slug}` page, extract the `JobPosting` JSON-LD via `TALEEZ_JSONLD_REGEX`
   (tolerating multiple blocks / `@graph` envelopes), and narrow it defensively. `og:`
   meta and the `<title>` tag are fallbacks for title / description / url.
4. **Normalise → map.** Build a `TaleezJob`, then a `JobPostDto`.

## Normalisation mapping

- `atsId` / `id` ← JSON-LD `identifier.value` (the `{slug}`); `id` = `taleez-{slug}`.
- `title` ← JSON-LD `title` → `og:title` → `<title>` (Taleez prefix stripped).
- `jobUrl` / `applyUrl` ← `https://taleez.com/apply/{slug}` (JSON-LD `url` / `og:url`
  preferred when present).
- `description` ← JSON-LD `description` + `qualifications` (HTML) → `og:description`,
  format-converted per `descriptionFormat`.
- `datePosted` ← JSON-LD `datePosted` (ISO 8601) → `YYYY-MM-DD`.
- `location` ← JSON-LD `jobLocation.address` (locality / region / country), tolerating
  a single `Place` or an array and a string / object `addressCountry`.
- `isRemote` ← `jobLocationType === 'TELECOMMUTE'` or remote/`télétravail`/wfh tokens.
- `department` ← JSON-LD `industry`.
- `employmentType` ← JSON-LD `employmentType` token (or first of an array), normalised
  (`FULL_TIME` → `Full Time`).
- `companyName` ← JSON-LD `hiringOrganization.name` / `identifier.name`, else
  de-slugified + title-cased tenant token.
- `emails` ← `extractEmails(description)`.

## Error handling

- Missing slug + url → empty `JobResponseDto`.
- Unresolvable tenant → empty.
- HTTP 4xx / DNS / network on board or detail fetch → that fetch returns null
  (logged warn), degrading to empty / skip; never throws.
- Malformed / non-JSON JSON-LD → null posting; `og:` / `<title>` fallbacks apply.
- Per-role fan-out via `Promise.allSettled`; a rejected role is logged and skipped.
- `scrape()` wraps the body in try/catch and returns an empty result on any unexpected
  error — a single bad tenant never nukes a batch run.

## File list

```
packages/plugins/source-ats-taleez/
  package.json
  tsconfig.json
  src/index.ts
  src/taleez.constants.ts
  src/taleez.types.ts
  src/taleez.module.ts
  src/taleez.service.ts
  __tests__/taleez.e2e-spec.ts
.specify/specs/373-source-ats-taleez/
  spec.md
  plan.md
  tasks.md
```

Central registration (`Site.TALEEZ`, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths,
`jest.config.js` moduleNameMapper) is applied by the orchestrator, not this plugin.
