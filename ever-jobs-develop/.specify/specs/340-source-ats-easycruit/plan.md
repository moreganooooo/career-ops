# Plan: 340 — EasyCruit ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 338 (TalentAdore), 330 (Prescreen) |

> Implementation plan for `Spec 340 — source-ats-easycruit`.

## Approach

Mirror the existing single-feed ATS adapter pattern. Closest sibling:
`source-ats-talentadore` — a single public per-tenant feed returning the full
open-roles list in one envelope with no server-side pagination. EasyCruit serves
that envelope as **XML** (`VacancyList`) rather than JSON, so the only structural
difference from the sibling is a tolerant in-house XML parser (no new dependency)
that projects each `Vacancy` into the same defensive wire-shape interfaces. Build
a self-contained plugin package with the standard file layout, implement
`IScraper` over the public EasyCruit vacancy-list feed, and register it in the
four canonical locations.

## Architecture

```
packages/plugins/source-ats-easycruit/
  package.json                       # @ever-jobs/source-ats-easycruit
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    easycruit.module.ts              # Nest DI module
    easycruit.service.ts             # @SourcePlugin + IScraper.scrape + XML parser
    easycruit.types.ts               # parsed wire-shape interfaces (vacancy / version / department)
    easycruit.constants.ts           # host/path templates, default iso/results, headers, block regexes
  __tests__/
    easycruit.e2e-spec.ts            # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` (verbatim) ?? first sub-domain label of
   `companyUrl` (skips `www` / `easycruit`, falls back to trailing path segment).
2. `fetchFeed(tenant)` → `GET https://{tenant}.easycruit.com/export/xml/vacancy/list.xml`
   as text. HTTP 4xx or a body lacking `<Vacancy` → empty (no throw).
3. `parseVacancyList(xml)` — tolerant regex parse: split top-level `<Vacancy>`
   blocks, then their `<Version language=…>` and `<Department id=…>` blocks;
   extract attributes and child-text (CDATA-unwrapped, entity-decoded). Any
   unparseable block is skipped.
4. `processVacancy` for each vacancy → `JobPostDto`; `atsId` = `Vacancy@id`;
   pick the preferred-language version; build/resolve the job URL; de-dup by
   `atsId`.
5. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- EasyCruit (Visma) documents a public "Vacancy XML feed" — a `VacancyList`
  export (namespace `urn:EasyCruit`) with a published schema at
  `https://www.easycruit.com/dtd/vacancy-list.xsd`. Each tenant career page lives
  at `{tenant}.easycruit.com` and serves the feed at
  `/export/xml/vacancy/list.xml`.
- Verified live against the Esvagt A/S tenant:
  - `GET https://esvagt.easycruit.com/?iso=gb` → HTTP 200 public HTML career page
    whose job links are `/vacancy/{vacancyId}/{departmentId}?iso=gb`.
  - `GET https://esvagt.easycruit.com/export/xml/vacancy/list.xml` → HTTP 200
    `VacancyList` XML with `Vacancy` elements carrying `id`, `date_start`,
    `date_end`, `date_modified` attributes; `Versions/Version[@language]` with
    `Title`, `Location`, `Engagement`, `Region`, `Categories`; and
    `Departments/Department[@id]` with `Name`, `VacancyURL`, `ApplicationURL`.
- The authenticated Reporting API (OAuth2 via Visma Connect) is an explicit
  non-goal; job data is read only from the anonymous vacancy-list feed.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `EASYCRUIT = 'easycruit'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-easycruit`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…6)

- One feed fetch per tenant; the feed returns every open role in a single
  envelope, so the result-set is bounded by slicing client-side to
  `resultsWanted`.
- HTTP 4xx (unknown sub-domain) → empty result; a malformed payload or per-vacancy
  parse/map error → partial result. `scrape` never throws, so a single tenant
  never aborts a batch run.
- No new runtime dependency: the flat XML is parsed with tolerant in-house
  regexes (CDATA + entity decoding) rather than pulling in an XML library.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **No XML parser in the repo** (Q-EC-1) → tolerant regex parser over the flat,
  schema-published structure; unparseable blocks skipped, never thrown.
- **Multi-language vacancies** (Q-EC-2) → prefer an English `Version`, else the
  first titled version, else the first present.
- **Thin list-feed bodies** (Q-EC-3) → synthesise a short HTML summary from the
  labelled fields so description formatting / e-mail extraction stay consistent.
- **Custom vanity domains** (Q-EC-4) → resolve via the canonical
  `{tenant}.easycruit.com` sub-domain; accept a `companyUrl` whose first
  sub-domain label is the tenant.
- **Feed markup drift** → block regexes match the stable schema element names
  (`Vacancy`, `Version`, `Department`, `Title`, `VacancyURL`) rather than
  tenant-specific markup.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
