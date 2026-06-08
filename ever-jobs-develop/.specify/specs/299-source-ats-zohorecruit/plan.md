# Plan 299 — Zoho Recruit ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 299 — source-ats-zohorecruit`.

## Approach

Mirror the existing career-site ATS adapter pattern (closest sibling:
`source-ats-eightfold`). Build a self-contained plugin package with the standard
file layout, implement `IScraper` over the public Zoho Recruit career-site page,
and register it in the four canonical locations (orchestrator-owned).

The key platform difference from Eightfold: Zoho server-renders the full
open-roles list into the careers HTML (hidden `<input id="jobs">`) rather than
exposing a JSON pagination API. So instead of a multi-page API fan-out, we fetch
one document and parse the embedded, HTML-entity-encoded JSON array. The fetch is
still wrapped in `Promise.allSettled` so a transient failure degrades to empty
results without aborting an enclosing batch.

## Architecture

```
packages/plugins/source-ats-zohorecruit/
  package.json                       # @ever-jobs/source-ats-zohorecruit
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    zohorecruit.module.ts            # Nest DI module
    zohorecruit.service.ts           # @SourcePlugin + IScraper.scrape
    zohorecruit.types.ts             # wire-shape interfaces (Job_Openings fields)
    zohorecruit.constants.ts         # hosts, paths, input id, url template, headers
  __tests__/
    zohorecruit.e2e-spec.ts          # network-tolerant E2E
```

Data flow:

1. `resolveHost` — `companyUrl` (origin) ?? `https://{slug}.zohorecruit.com`.
2. `fetchOpenings` — GET `/jobs/Careers`; locate `<input id="jobs" value="…">`,
   decode HTML entities, `JSON.parse` defensively → `ZohoRecruitJobOpening[]`.
3. `collect` → `processJob` → `JobPostDto`, de-duping by `atsId` (`id`).
4. Skip locked / unpublished records (FR-9).
5. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Field mapping (Job_Openings → JobPostDto)

| JobPostDto      | Zoho field(s)                              |
| --------------- | ------------------------------------------ |
| id              | `zohorecruit-{id}`                         |
| atsId           | `id`                                       |
| atsType         | `'zohorecruit'` (literal)                  |
| title           | `Posting_Title` ?? `Job_Opening_Name`      |
| companyName     | derived from slug / host                   |
| jobUrl/applyUrl | `{host}/jobs/Careers/{id}/{title-slug}`    |
| location        | `City` / `State` / `Country`               |
| description     | `Job_Description` (format-converted)       |
| datePosted      | `Date_Opened` (epoch-s/ms/ISO tolerant)    |
| isRemote        | `Remote_Job`                               |
| department      | `Industry`                                 |
| employmentType  | `Job_Type`                                 |
| emails          | `extractEmails(description)`               |

## Registration (CLAUDE.md §4 — 4 files, orchestrator-owned)

1. `packages/models/src/enums/site.enum.ts` — `ZOHORECRUIT = 'zohorecruit'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

> Per run instructions, this plugin author does NOT edit those shared files; the
> orchestrator registers them centrally to avoid concurrent-run conflicts.

## Performance Notes

- Single document fetch per tenant via the shared `@ever-jobs/common` HTTP client
  (timeouts, retries, UA).
- `Promise.allSettled`-wrapped fetch: a transient failure degrades to a warn +
  empty result, never an abort (NFR-1).

## Risks / Mitigations

- **WAF / lazy-load** → out of scope this iteration (Q-ZR-1); graceful empty.
- **Tenant field drift / missing fields** → every field optional + read with
  `??`; missing description/location/date → null, not a throw.
- **Entity-encoded value attribute** → explicit `decodeHtmlEntities` (numeric +
  named entities) before `JSON.parse`, wrapped in try/catch.
- **Datacenter (EU/IN)** → resolved via explicit `companyUrl` (Q-ZR-2).

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
`tsc --noEmit --skipLibCheck` against the package tsconfig verified exit 0.
