# Plan: 375 — In-recruiting (Intervieweb) ATS Source Plugin

## Surface chosen

Public, anonymous, server-rendered HTML career board on the shared In-recruiting /
Intervieweb host `*.intervieweb.it`. No authentication, no API key. Two addressing
shapes, both verified live 2026-06-03:

- **Sub-domain tenant** — `https://{tenant}.intervieweb.it/{lang}/career`
  (verified: `rinascente`).
- **Path tenant ("SMART")** — `https://{host}.intervieweb.it/{tenant}/{lang}/career`
  (verified: `orbyta` under host `inrecruiting`).

Index page → enumerate `/jobs/{slug}-{id}/{lang}/` anchors. Detail page → richest
structured source is a schema.org `JobPosting` JSON-LD block (present on the classic
variant; absent on the "SMART" variant, which falls back to `og:` / `<title>` / card
fields). No JSON feed / RSS / sitemap is relied upon — the index HTML is the surface.

## Parse strategy

1. **Resolve target** — `companySlug` → `{slug}.intervieweb.it/{lang}/career`; a slug
   that is itself an `intervieweb.it` URL, or a `companyUrl` on an `intervieweb.it` host,
   is parsed: path tenant = leading non-`career`/non-`jobs`/non-lang path segment when
   present, else host sub-domain label; index URL rebuilt from host + path tenant.
2. **Enumerate index** — regex the canonical job-link shape across both addressing forms,
   capturing the absolute href, the `{slug}-{id}` token, and the trailing numeric `{id}`.
   De-dup by `{id}`. Read the card `<h3>` title and the labelled subtitle spans
   (`title="Location"`, `title="Functional Area"`) from a bounded window after each
   anchor.
3. **Slice** to `min(resultsWanted, detail cap)` before any detail fetch.
4. **Fan out** across detail pages with `Promise.allSettled` (never `.all`). For each:
   prefer the `JobPosting` JSON-LD; else `og:` meta; else the card `<h3>` / token /
   `<title>`. JSON-LD parsing is wrapped in try/catch and narrowed (array-or-single
   `@type`, array-or-single `jobLocation`).

## Normalisation mapping

| Field           | Source (in preference order)                                           |
| --------------- | ---------------------------------------------------------------------- |
| `atsId` / `id`  | trailing `{id}` → `inrecruiting-{id}`                                   |
| `title`         | JSON-LD `title` → `og:title` → card `<h3>` → `<title>` → de-slugged token |
| `jobUrl`/`applyUrl` | canonical `/jobs/{slug}-{id}/{lang}/` href                          |
| `description`   | JSON-LD `description` (HTML) → `og:description`; format-converted       |
| `datePosted`    | JSON-LD `datePosted` → `YYYY-MM-DD`                                     |
| `location`      | JSON-LD `jobLocation.address` (locality/region/country) → card Location split |
| `department`    | JSON-LD `industry` → card Functional Area                              |
| `employmentType`| JSON-LD `employmentType` token → readable label                        |
| `isRemote`      | `jobLocationType` TELECOMMUTE / remote regex over title+location+dept  |
| `companyName`   | JSON-LD `hiringOrganization.name` → de-slugified tenant                 |
| `emails`        | `extractEmails(description)`                                            |
| `site`/`atsType`| constants `Site.INRECRUITING` / `'inrecruiting'`                       |

## Error handling

- No slug/url, or an unresolvable host → empty `JobResponseDto` (no throw).
- HTTP 4xx / DNS / network on the index → empty result; on a detail page → that role is
  skipped, others proceed (`Promise.allSettled`).
- Malformed body / non-JSON JSON-LD / per-role map error → that field/role degrades;
  `scrape()` never throws. All logging via `this.logger` (never `console.log`).

## File list

- `packages/plugins/source-ats-inrecruiting/package.json`
- `packages/plugins/source-ats-inrecruiting/tsconfig.json`
- `packages/plugins/source-ats-inrecruiting/src/index.ts`
- `packages/plugins/source-ats-inrecruiting/src/inrecruiting.constants.ts`
- `packages/plugins/source-ats-inrecruiting/src/inrecruiting.types.ts`
- `packages/plugins/source-ats-inrecruiting/src/inrecruiting.module.ts`
- `packages/plugins/source-ats-inrecruiting/src/inrecruiting.service.ts`
- `packages/plugins/source-ats-inrecruiting/__tests__/inrecruiting.e2e-spec.ts`
- `.specify/specs/375-source-ats-inrecruiting/{spec.md,plan.md,tasks.md}`

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator.
