# Plan: 369 — TrackerRMS ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 364 (PyjamaHR), 354 (Hireful)      |

> Implementation plan for `Spec 369 — source-ats-trackerrms`.

## Approach

Mirror the existing ATS adapter pattern (closest sibling: `source-ats-paychex` — a
server-rendered HTML public surface parsed defensively into the `JobPostDto`
contract). The key difference: TrackerRMS exposes no JSON job API; its documented
no-auth surface is the EVO Portal "Publish Jobs to your Website" HTML feed
(`https://evoportal{us|uk|ca}.tracker-rms.com/{database}/jobs?fields={csv}`), a
server-rendered `<ul><li>…</li></ul>` fragment. The service fetches the feed once,
splits it into per-role `<li>` blocks, and parses each block heuristically (heading
→ title, anchor → apply URL + `jobcode` reference, residual markup → description,
labelled free-text → location / worktype), normalising into the same `JobPostDto`
contract. Build a self-contained plugin package with the standard file layout,
implement `IScraper` over the public feed, and register it in the four canonical
locations.

## Architecture

```
packages/plugins/source-ats-trackerrms/
  package.json                       # @ever-jobs/source-ats-trackerrms
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    trackerrms.module.ts             # Nest DI module
    trackerrms.service.ts            # @SourcePlugin + IScraper.scrape
    trackerrms.types.ts              # parsed raw-item / normalised-job interfaces
    trackerrms.constants.ts          # portal hosts, paths, fields, defaults, item cap, headers, regexes
  __tests__/
    trackerrms.e2e-spec.ts           # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` used directly as the database name (default region
   `us`; a feed/apply URL passed as the slug is reduced to its database + region);
   else `companyUrl` on a `tracker-rms.com` EVO Portal host → database from the first
   path segment, region from the `evoportal{xx}` host label. Empty when neither yields
   a database.
2. `fetchJobFeed(host, database)` → `GET /{database}/jobs?fields={csv}` once; HTTP 4xx
   → empty (no throw); other errors re-thrown into the outer try/catch which returns
   partial results. `splitItems` slices the fragment into `<li>` blocks (bounded by a
   hard item cap), keeping only blocks with a heading or an anchor.
3. For each block, `parseItem` extracts title (heading), apply href + `jobcode`
   reference (anchor; falls back to a `reference|…` token), description (residual
   markup), and labelled location / worktype free-text; a block without a stable
   reference is skipped.
4. `processJob` maps each role → `JobPostDto`; `atsId` = the `jobcode` reference;
   de-dup by `atsId`; stop at `resultsWanted`.
5. Wrap in `JobResponseDto`.

## Endpoint Discovery (observed live 2026-06-03)

- TrackerRMS powers each agency's back office; tenants publish open roles to the
  public via the "Publish Jobs to your Website" / "Jobs+" integration on the shared
  regional EVO Portal host (`evoportalus` / `evoportaluk` / `evoportalca`
  `.tracker-rms.com`), keyed by the tenant's TrackerRMS database name.
- The feed (`/{database}/jobs?fields={csv}`) is a server-rendered HTML
  `<ul><li>…</li></ul>` fragment — one `<li>` per open role — whose column set is
  tenant-configured (`fields=` is a CSV, commonly
  `reference,title,location,worktype,salary,description,linkregister`). The
  `linkregister` field renders the per-role apply URL
  (`/{database}/apply?jobcode={reference}`).
- Confirmed live: the platform, the regional EVO Portal host shape, the
  `/{database}/jobs?fields=…` addressing, and the apply-URL shape, against the named
  real tenant `Tracker_PrecisionResources` (Precision Resources, a US staffing firm).
  The exact per-field DOM layout is tenant-configurable, so the parser is defensive.
  (verified=false)

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `TRACKERRMS = 'trackerrms'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-trackerrms`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- The feed is a single document; the adapter fetches once, bounds the parser with a
  hard item cap, dedupes by `atsId`, and stops mapping at `resultsWanted`.
- HTTP 4xx (unknown database / wrong region / missing feed) → empty; an empty feed →
  empty; a malformed block or per-role map error → partial result. `scrape` never
  throws, so a single tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy, optional
  CA cert).

## Risks / Mitigations

- **Custom embed domains** (Q-TR-1) → address by TrackerRMS database name on the
  canonical EVO Portal host (the stable public key); a `companyUrl` on a
  `tracker-rms.com` host derives the database + region. Bespoke embed domains deferred
  to the source-adoption backlog.
- **Region selection** (Q-TR-2) → default to `us`; a `companyUrl` carries the correct
  region in its `evoportal{xx}` host label.
- **Field layout drift** (Q-TR-3) → request a broad field set and parse each block
  heuristically; every value is best-effort, and a block missing a reference or title
  is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
