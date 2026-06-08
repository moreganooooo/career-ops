# Plan: 331 — Traffit ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec ID      | 331                                |
| Slug         | source-ats-traffit                 |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Supersedes   | (none)                             |
| Related specs| 330 (Prescreen)                    |

> Implementation plan for `Spec 331 — source-ats-traffit`.

## Approach

Mirror the existing JSON-feed ATS adapter pattern. Closest sibling:
`source-ats-recooty` for the single shared-feed → client-side-slice shape. Build
a self-contained plugin package with the standard file layout, implement
`IScraper` over the public Traffit published-adverts feed, and register it in the
four canonical locations.

## Architecture

```
packages/plugins/source-ats-traffit/
  package.json                       # @ever-jobs/source-ats-traffit
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    traffit.module.ts                # Nest DI module
    traffit.service.ts               # @SourcePlugin + IScraper.scrape
    traffit.types.ts                 # wire-shape interfaces (envelope + advert.values)
    traffit.constants.ts             # host template, feed path, field ids, defaults, headers
  __tests__/
    traffit.e2e-spec.ts              # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` (verbatim sub-domain label, or first label if
   it contains dots / a scheme) ?? first sub-domain label of `companyUrl` (skips
   `www`, guards the bare apex `traffit.com`).
2. `fetchPublished(host)` → `GET https://{tenant}.traffit.com/public/job_posts/published`
   → JSON array of advert envelopes. DNS failure / HTTP 4xx → empty (no throw);
   non-array payload → empty.
3. `collect` iterates the array; `processJob` resolves `advert.values[]` by
   `field_id` (`description`, `geolocation`), maps to `JobPostDto`, de-dups by
   `atsId` (public job-post `id`).
4. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- Traffit's Knowledge Base documents a free, public Integration API for career
  pages: `{your-traffit-address}/public/job_posts/published` returns the adverts
  published on the career page, available on every plan, no authentication.
- Verified live:
  - `GET https://people.traffit.com/public/job_posts/published` → HTTP 200, JSON
    array of 12 published adverts (first: "Recepcjonista/ka", id 1409).
  - `GET https://traffit.traffit.com/public/job_posts/published` → HTTP 200, JSON
    array (advert "Customer Support Specialist", id 639, Gdynia/Poland, with a
    `description` HTML field and a structured `geolocation` field).
- The advanced authenticated Integration API (`api.traffit.com`) is not used; the
  free public feed carries everything needed for ingestion.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `TRAFFIT = 'traffit'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-traffit`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- The feed is a single fetch per tenant (no server-side pagination observed), so
  the whole published-adverts list is ingested in one request and sliced
  client-side to `resultsWanted`.
- DNS failure / HTTP 4xx → empty result; a non-array payload → empty; a malformed
  advert → that advert is skipped in isolation. A single tenant never aborts a
  batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).

## Risks / Mitigations

- **Feed pagination on huge tenants** (Q-TF-1) → single-page feed observed;
  re-evaluate if truncation appears.
- **Field ordering / custom fields** (Q-TF-3) → resolve `advert.values[]` by
  `field_id`, not positional index; ignore unknown custom field ids.
- **Advert language** (Q-TF-2) → accept the published language; no translation.
- **Missing geolocation / description** → `location` / `description` degrade to
  null; the advert is still emitted from its title + id.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
