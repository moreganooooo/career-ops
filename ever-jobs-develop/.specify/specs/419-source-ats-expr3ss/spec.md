# Spec: 419 — Expr3ss! ATS Source Adapter

| Field         | Value                                   |
| ------------- | --------------------------------------- |
| Spec ID       | 419                                     |
| Slug          | source-ats-expr3ss                      |
| Status        | done                                    |
| Owner         | scheduled-agent                         |
| Created       | 2026-06-04                              |
| Last updated  | 2026-06-04                              |
| Supersedes    | (none)                                  |
| Related specs | 410, 411, 412, 413, 414                 |

## 1. Problem Statement

Ever Jobs ingests public, candidate-facing job listings from a broad estate of applicant-tracking
systems (ATS) so downstream consumers see one normalised job feed. **Expr3ss!** (expr3ss.com) is
an Australian predictive-hiring ATS used by many mid-to-large Australian and APAC employers (e.g.
transport, hospitality, retail, healthcare brands). Its tenants each publish an open, anonymous
job board on a dedicated `{tenant}.expr3ss.com` sub-domain, and those boards are published for
aggregators (Google for Jobs, Indeed) with structured `JobPosting` markup. Without a dedicated
adapter, that estate of Australian roles is invisible to the platform. We add a self-contained,
multi-tenant adapter that reads the public board surface and emits normalised `JobPostDto` roles.

## 2. Goals

- Add a generic, multi-tenant Expr3ss! source adapter (`@ever-jobs/source-ats-expr3ss`).
- Resolve a tenant from `companySlug` (the sub-domain label) or `companyUrl` (a board URL).
- Read the **public, anonymous** board surface only — no authentication, no headless browser.
- Emit normalised `JobPostDto` roles (id, title, company, location, description, dates, apply URL).
- Degrade gracefully: never throw out of `scrape()`; a bad tenant yields an empty / partial result.

## 3. Non-Goals

- No authenticated Expr3ss! API, recruiter portal, or candidate-account surface.
- No application submission / write-back — read-only ingestion of public listings.
- No editing of shared registries (site enum, plugin index, base tsconfig, jest config) — those
  are wired by the orchestrator.
- No cross-plugin imports — the adapter talks only through `@ever-jobs/models` /
  `@ever-jobs/common` / `@ever-jobs/plugin`.

## 4. User / Caller Stories

> As the **ingestion orchestrator**, I want to pass an Expr3ss! tenant slug and receive its open
> public roles as normalised `JobPostDto`s, so that Australian Expr3ss!-hosted jobs flow into the
> unified feed alongside every other ATS.

> As a **batch run**, I want a single unreachable / empty / challenge-gated Expr3ss! tenant to
> degrade to an empty result rather than throw, so that one bad tenant never nukes the batch.

## 5. Functional Requirements

| ID    | Requirement                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant from `companySlug` (sub-domain label) or `companyUrl` on an `*.expr3ss.com` host. | must     |
| FR-2  | Fetch the public board `https://{tenant}.expr3ss.com/home` (desktop variant first).                | must     |
| FR-3  | Harvest schema.org `JobPosting` JSON-LD island(s) as the rich structured source.                    | must     |
| FR-4  | Harvest per-role `ApplyOnline/Default.aspx?ID={id}` apply anchors as the always-present listing.    | must     |
| FR-5  | Map each role → `JobPostDto` with id `expr3ss-${atsId}`, `site: Site.EXPR3SS`, `atsType: expr3ss`. | must     |
| FR-6  | Provide `applyUrl`, `LocationDto`, description (HTML/MARKDOWN/PLAIN), emails, `datePosted` (Y-M-D). | must     |
| FR-7  | Dedup roles by ATS id; honour `resultsWanted` (default 100).                                         | must     |
| FR-8  | Cap timeout at 15s on BOTH `timeout` and `requestTimeout`; only ever shorten a caller's request.    | must     |
| FR-9  | Distinguish transport failure (host down → stop probing) from HTTP-status errors (try next variant). | must     |
| FR-10 | Never throw out of `scrape()`; any fetch/parse failure degrades to an empty / partial result.       | must     |
| FR-11 | Detect remote roles via schema.org `jobLocationType` + a title/location regex.                      | should   |

## 6. Non-Functional Requirements

| ID     | Requirement                              | Target                          |
| ------ | ---------------------------------------- | ------------------------------- |
| NFR-1  | Per-request timeout (capped)             | ≤ 15 s                          |
| NFR-2  | Board pages fetched per scrape           | ≤ EXPR3SS_MAX_PAGES (8)         |
| NFR-3  | No `console.log` in production code      | Use `Logger` (`@nestjs/common`) |
| NFR-4  | TypeScript only                          | no `.js` / `.py`                |
| NFR-5  | No competitor / library names in repo    | platform's own endpoints only   |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.EXPR3SS, name: 'Expr3ss', category: 'ats', isAts: true })
export class Expr3ssService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Public surface (anonymous):
- Board: `GET https://{tenant}.expr3ss.com/home?mobile=no` → server-rendered HTML.
- Detail / apply: `https://{tenant}.expr3ss.com/ApplyOnline/Default.aspx?ID={id}`.
- Per role: schema.org `JobPosting` JSON-LD (title, datePosted, hiringOrganization, jobLocation,
  description, url) embedded for aggregators, plus a per-role apply anchor carrying the numeric id.

Output `JobPostDto` fields: `id` (`expr3ss-${atsId}`), `title`, `companyName`, `jobUrl`,
`location` (`LocationDto`), `description`, `datePosted` (`YYYY-MM-DD`), `isRemote`, `emails`,
`site` (`Site.EXPR3SS`), `atsId`, `atsType` (`expr3ss`), `department`, `employmentType`, `applyUrl`.

### 7.2 Errors

| Code                  | Meaning                                                        |
| --------------------- | ------------------------------------------------------------- |
| (none thrown)         | All failures degrade to an empty / partial `JobResponseDto`.  |
| host-unreachable      | Transport-level failure → stop probing variants, return what's collected. |
| http-status           | 4xx / 403-challenge / 5xx → try next board variant, else empty result. |

## 8. Test Plan

- E2E (`__tests__/expr3ss.e2e-spec.ts`, 5 tests): known tenant returns an array (shape-asserts only
  when non-empty); empty when no slug/url; resolve from `companyUrl`; unknown tenant → empty;
  respects `resultsWanted`. Network tests use 30 000 ms timeouts and tolerate zero results.
- Graceful-degradation: malformed JSON-LD island, missing anchors, HTTP 403/404, DNS failure all
  degrade to an empty / partial result without throwing.

## 9. Open Questions

- The entire `*.expr3ss.com` surface is gated behind an edge managed-challenge (HTTP 403 +
  `Cf-Mitigated: challenge`) for non-browser clients, so the live JSON-LD / anchor shape could not
  be extracted from a plain HTTP client this run. The adapter is built defensively against the
  documented board + apply-URL shape and the JobPosting markup the board publishes for aggregators.
  Recorded in `docs/questions.md` with the default: ship defensively, `verified=false`.

## 10. Decisions

- 2026-06-04 — Address tenants by `{tenant}.expr3ss.com` sub-domain (confirmed live: `cos`, `dnata`,
  `humanology`, `peer`, `kelsian`, `provision`, `craveablebrands`, `krispykreme`, `jobs`).
- 2026-06-04 — Parse the public board HTML (JSON-LD + apply anchors); do NOT use any authenticated
  Expr3ss! API or a headless browser.
- 2026-06-04 — Use the role's numeric `ID` query value as the stable ATS id; build the canonical
  `ApplyOnline/Default.aspx?ID={id}` apply URL from tenant + id.

## 11. References

- Canonical template adapter: `packages/plugins/source-ats-apploi/`.
- JSON-LD + anchor scrape idiom sibling: `packages/plugins/source-ats-cezanne/`.
- Public boards observed: `cos.expr3ss.com/home`, `dnata.expr3ss.com/home`, `jobs.expr3ss.com/home`.
