# Plan: 338 — TalentAdore ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 330 (Prescreen), 301 (Niceboard)   |

> Implementation plan for `Spec 338 — source-ats-talentadore`.

## Approach

Mirror the existing JSON-feed ATS adapter pattern. Closest sibling:
`source-ats-recooty` — a single shared public feed keyed by a tenant read key,
returning the full open-roles list in one envelope with no server-side
pagination. Build a self-contained plugin package with the standard file layout,
implement `IScraper` over the public TalentAdore positions feed, and register it
in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-talentadore/
  package.json                       # @ever-jobs/source-ats-talentadore
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    talentadore.module.ts            # Nest DI module
    talentadore.service.ts           # @SourcePlugin + IScraper.scrape
    talentadore.types.ts             # wire-shape interfaces (feed envelope + job)
    talentadore.constants.ts         # hosts, path/query templates, key regex, defaults, headers
  __tests__/
    talentadore.e2e-spec.ts          # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` (verbatim) ?? first sub-domain label of
   `companyUrl` (skips `www`, falls back to trailing path segment).
2. `resolveFeedKey(tenant)` — if the tenant token already looks like a bare feed
   key (short, URL-safe, mixed-case), use it; else `GET
   https://{tenant}.careers.talentadore.com/` and harvest the embedded
   `ats.talentadore.com/positions/{feedKey}` reference. HTTP 4xx → empty
   (no throw).
3. `fetchFeed(feedKey)` → `GET /positions/{feedKey}/json?v=2&display_description=job_description`
   → read `jobs[]`. HTTP 4xx / missing `jobs[]` → empty (no throw).
4. `mapToJobPost` for each job → `JobPostDto`; `atsId` = `id` (else `job_token`);
   de-dup by `atsId`.
5. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- TalentAdore documents an RSS/JSON "feed builder" for tenant career pages (the
  `/json` view swaps for `/rss`). Each tenant career page
  (`{tenant}.careers.talentadore.com`, a WordPress multisite) embeds a reference
  to `ats.talentadore.com/positions/{feedKey}/json`, which is the public,
  unauthenticated open-roles feed.
- Verified live against the Amer Sports tenant:
  - `GET https://amersports.careers.talentadore.com/` → HTTP 200, HTML embedding
    `ats.talentadore.com/positions/mwRcjSn/json`.
  - `GET https://ats.talentadore.com/positions/mwRcjSn/json?v=2&display_description=job_description`
    → HTTP 200, envelope `{ version, company, generated_at, jobs[] }` with 36
    roles carrying `id`, `job_token`, `name`, `link`, `description_html`,
    `description_text`, `start_date`, `updated`, `city`/`county`/`country`,
    `employment_type`, `categories`, `business_unit_name`.
  - Empty tenants (e.g. Beamex `nyNS3Sd`, Sonepar `QO6tqSp`) → HTTP 200 with
    `jobs: []`.
- The standard WordPress `/feed/` RSS on the careers sub-domain returns
  blog-style posts (employee stories), not job ads, and is not used.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `TALENTADORE = 'talentadore'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-talentadore`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One feed fetch per tenant (plus one career-page fetch when a feed key must be
  resolved from a slug); the feed returns every open role in a single envelope,
  so the result-set is bounded by slicing client-side to `resultsWanted`.
- HTTP 4xx (unknown sub-domain or feed key) → empty result; a malformed payload
  or per-job map error → partial result. `scrape` never throws, so a single
  tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Custom vanity domains** (Q-TA-1) → resolve via the canonical
  `{tenant}.careers.talentadore.com` sub-domain; allow a direct feed key as an
  escape hatch.
- **Feed key vs. slug ambiguity** (Q-TA-2) → mixed-case short token ⇒ feed key,
  else careers slug.
- **Career-page markup drift** → the feed-key regex matches the stable
  `ats.talentadore.com/positions/{key}` reference rather than tenant-specific
  markup; a direct feed key bypasses harvesting entirely.
- **Description language** (Q-TA-3) → accept whatever language the feed serves.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
