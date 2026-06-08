# Plan: 381 — Umantis (Haufe Talent) ATS Source Plugin

| Field         | Value                    |
| ------------- | ------------------------ |
| Spec          | spec.md                  |
| Created       | 2026-06-03               |
| Last updated  | 2026-06-03               |
| Status        | done                     |
| Owner         | scheduled-agent          |
| Supersedes    | (none)                   |
| Related specs | 375 (In-recruiting)      |

## Surface chosen

Public, anonymous, **server-rendered HTML** candidate board on the shared host
`recruitingapp-{tenantId}.umantis.com` (and the `.de.umantis.com` variant), keyed by
a stable numeric tenant id:

- **Index (enumeration):** `GET https://{host}/Jobs/All?lang=eng` — one document
  listing every open role as a `/Vacancies/{ID}/Description/{langCode}` anchor.
- **Detail (per role):** `GET https://{host}/Vacancies/{ID}/Description/{langCode}?lang=eng`
  — server-rendered page whose `<title>` is "{title} | {organisation}", with a
  free-text location, an optional `DD.MM.YYYY` posting date, a job-ad body, and an
  "Apply here / Hier bewerben" link (`…/Application/CheckLogin/…`).

Verified live 2026-06-03 against the named real tenant `5476` (ASMPT, on
`recruitingapp-5476.de.umantis.com`); other live tenants seen: `2698` (Swiss TPH),
`2717` (Generali), `2388` (Haufe Group). No JSON API / RSS feed is relied upon; the
SPA-free HTML is the documented no-auth surface.

## Parse strategy

1. **Tenant resolution.** `companySlug` may be a bare numeric id (`5476` → host
   `recruitingapp-5476.umantis.com`), a `{id}.de` form (→ `.de.umantis.com` host), or
   a full `umantis.com` URL. `companyUrl` on a `umantis.com` host is used verbatim,
   with the tenant id read from the `recruitingapp-{id}` sub-domain. No slug/url, or
   an unresolvable value, → empty result.
2. **Index parse.** Anchor on the `/Vacancies/(\d+)/Description/(\d+)` link regex
   (not volatile CSS classes), capturing the numeric id + language code. De-dup by
   id; read the anchor's link text as the title and a date token from a bounded text
   window around each link. Stop at `resultsWanted` (page cap guards future
   pagination).
3. **Detail parse (fanned out).** For each index role, best-effort fetch the detail
   page and parse the `<title>` ("{title} | {organisation}"), an apply-link href, an
   og:description fallback, and a `DD.MM.YYYY` date from the body. A failed / 4xx
   detail degrades to the index-level fields.

## Normalisation mapping

`{ID}` → `atsId` / `id` (`umantis-{id}`); detail `<title>` head (else index link
text / og:title) → `title`; detail-host vacancy URL → `jobUrl`; apply-link href
(else `jobUrl`) → `applyUrl`; detail body / og:description (else location line) →
`description` (format-converted); `DD.MM.YYYY` → `datePosted` (`YYYY-MM-DD`);
free-text location ("City (Country)") → `location` (city/country split);
title/location/body → `isRemote`; employment-type text → `employmentType`; `<title>`
tail (else `Umantis {tenantId}`) → `companyName`; `description` → `emails` via
`extractEmails`; constants `Site.UMANTIS` / `'umantis'`.

## Error handling

- Missing slug + url → empty `JobResponseDto`.
- Unresolvable tenant → empty.
- HTTP 4xx / marketing-site redirect / DNS / malformed body on index → empty; on a
  detail page → degrade to index-level fields. Never throw out of `scrape()`.
- Per-role detail fan-out via `Promise.allSettled`; a rejected detail is logged
  (`this.logger.warn`) and skipped, never aborting the batch.
- Partial results returned on a late top-level error.

## File list

```
packages/plugins/source-ats-umantis/
  package.json
  tsconfig.json
  src/index.ts
  src/umantis.module.ts
  src/umantis.service.ts
  src/umantis.constants.ts
  src/umantis.types.ts
  __tests__/umantis.e2e-spec.ts
.specify/specs/381-source-ats-umantis/
  spec.md
  plan.md
  tasks.md
```

Registration (Site enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths,
`jest.config.js` moduleNameMapper) is applied centrally by the orchestrator — not
edited by this plugin package.
