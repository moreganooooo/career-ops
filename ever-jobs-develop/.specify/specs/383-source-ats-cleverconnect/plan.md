# Plan: 383 — CleverConnect ATS Source Plugin

| Field        | Value                          |
| ------------ | ------------------------------ |
| Spec ID      | 383                            |
| Slug         | source-ats-cleverconnect       |
| Status       | done                           |
| Created      | 2026-06-03                     |
| Last updated | 2026-06-03                     |

## 1. Surface chosen

Public, anonymous, server-rendered board document:

```
GET https://career.{tenant}.cleverconnect.com/jobs
```

The board is an Angular SPA, but the server pre-renders the full open-roles payload
into the initial HTML as an Angular **TransferState** JSON island whose JSON
punctuation is HTML-entity-encoded (`&q;`=`"`, `&a;`=`&`, `&l;`=`<`, `&g;`=`>`,
`&s;`=`'`). Decoding the island yields a JSON array of structured offer objects. This
is preferred over the SPA's runtime XHR API (which 404s to non-browser clients and is
not a documented public surface). Verified live 2026-06-03 against tenant `demo`.

## 2. Architecture / approach

`CleverConnectService implements IScraper` (single class, no peer-plugin imports):

1. **Tenant resolution** — `resolveTenant(companySlug, companyUrl)`:
   - explicit `companySlug` used directly (lower-cased); a slug that is itself a full
     URL / contains a `cleverconnect.com` host is reduced to its tenant label;
   - `companyUrl` on a `cleverconnect.com` host → tenant label parsed from the
     `career.{tenant}` sub-domain (leading `career`/`www` labels skipped);
   - neither usable → empty `JobResponseDto`.
2. **Fetch** — `createHttpClient({ proxies, caCert, timeout })` + browser-like headers;
   `GET {host}/jobs` as text. A page loop (cap `CLEVERCONNECT_MAX_PAGES`) guards any
   future server-side pagination; in practice one document holds the full set.
3. **Decode + parse** — `parseBoard(html)`:
   - reverse the entity encoding (`decodeEntities`);
   - anchor on each `"jobOfferShort":"/jobads/` marker, walk back to the enclosing
     object's `{` (`objectStart`, brace-aware) and forward to its matching `}`
     (`objectEnd`, string- and escape-aware), then `JSON.parse` the balanced slice
     (`safeParseOffer`, never throws);
   - de-dup by offer id; skip non-`PUBLISHED` offers.
4. **Normalise** — `normaliseJob(offer, tenant)` → `CleverConnectJob`:
   - id from numeric `id` or trailing id of the detail path;
   - detail/apply URL from `url.jobOfferShort` (`/jobads/{id}`) → `url.jobOffer` →
     synthesised `/jobads/{id}`;
   - `locality` split into city / state (region), parenthesised département stripped;
   - company name from `recruiter` / `publisher` / `company.name` / slug;
   - department from `labels.macroJobList` / `labels.jobList`; employment type from
     `labels.contractTypeList`; remote detected across title / locality / contract /
     body.
5. **Map** — `processJob(...)` → `JobPostDto` (`id` = `cleverconnect-{atsId}`,
   `site` = `Site.CLEVERCONNECT`, `atsType` = `'cleverconnect'`, `applyUrl` =
   `url.redirect` or the detail URL, `emails` via `extractEmails`, `datePosted` null).
6. **Format** — `formatDescription(html, format)` honours HTML / Markdown / Plain via
   `markdownConverter` / `htmlToPlainText`.

## 3. Normalisation mapping

See spec §7.1 (wire shape → `JobPostDto` mapping table).

## 4. Error handling

- No slug/url, unresolvable host → empty `JobResponseDto`.
- HTTP 4xx / DNS / network error on the board fetch → logged warn, `fetchHtml` returns
  null → empty/partial result, never throws.
- Un-decodable island / malformed offer object → `safeParseOffer` returns null and the
  offer is skipped; per-offer map errors are caught per-role.
- The outer `scrape` try/catch returns whatever was accumulated (partial) on any
  unexpected error — `scrape` never throws.
- `Promise.allSettled` is not required here: parsing is synchronous over a single
  fetched document (no per-role network fan-out). All HTTP is a single board GET.

## 5. File list

```
packages/plugins/source-ats-cleverconnect/
  package.json
  tsconfig.json
  src/index.ts
  src/cleverconnect.constants.ts
  src/cleverconnect.types.ts
  src/cleverconnect.module.ts
  src/cleverconnect.service.ts
  __tests__/cleverconnect.e2e-spec.ts
.specify/specs/383-source-ats-cleverconnect/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`,
`packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`) is applied
centrally by the orchestrator, not by this plugin package.
