# Spec: 296 — Eightfold AI ATS Source Plugin

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 296                                |
| Slug           | source-ats-eightfold               |
| Status         | done                               |
| Owner          | scheduled-agent (run #400)         |
| Created        | 2026-06-03                         |
| Last updated   | 2026-06-03                         |
| Supersedes     | (none)                             |
| Related specs  | 006, 013 (ATS parity batches)      |

## 1. Problem Statement

Eightfold AI ("PCSX" / SmartApply) is a talent-intelligence platform that hosts
the public careers sites of many large enterprises (Nvidia, Cisco, AT&T, Bayer,
Booking, Dolby, Activision, and hundreds more). Ever Jobs has adapters for ~45
ATS platforms but **none for Eightfold**, so every Eightfold-hosted enterprise
career site is currently un-ingestable except via brittle company-specific
scrapers. A single generic, multi-tenant Eightfold adapter unlocks a large
catalogue of enterprise roles with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-eightfold` plugin that ingests jobs
  from **any** Eightfold-powered careers site given a `companySlug` or a
  custom-domain `companyUrl`.
- Use the **public** positions API (no auth) so no credentials are required.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'eightfold'`, `department`).
- Paginate efficiently with bounded concurrent page fan-out.

## 3. Non-Goals

- WAF / Cloudflare bypass via browser TLS fingerprinting. Tenants behind an
  aggressive WAF that 403s plain HTTPS are out of scope for this iteration
  (tracked as a follow-up; see Open Questions).
- Per-position detail enrichment (`/api/pcsx/position_details`) for descriptions
  not present in the listing payload — deferred to a later iteration.
- A curated seed list of Eightfold tenant slugs (handled separately by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Eightfold plugin at a
> tenant slug, so that I ingest that enterprise's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Eightfold adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant host from `companySlug` → `https://{slug}.eightfold.ai`, or from `companyUrl`. | must     |
| FR-2  | Fetch positions from the public `/api/apply/v2/jobs` endpoint with `domain`, `start`, `num`, `sort_by`. | must     |
| FR-3  | Read total `count` from the first page and paginate (server-fixed page size = 10) until `resultsWanted`. | must     |
| FR-4  | De-duplicate positions by ATS id within a single run.                                        | must     |
| FR-5  | Map each position to `JobPostDto` (title, url, location, department, remote, datePosted, description). | must     |
| FR-6  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                        | should   |
| FR-7  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.        | must     |
| FR-8  | Tolerate unknown / dead tenants and per-page failures without throwing (partial results OK).  | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                  | Target                          |
| ------ | -------------------------------------------- | ------------------------------- |
| NFR-1  | Remaining pages fetched concurrently         | ≤ 8 concurrent requests/tenant  |
| NFR-2  | A single failed page must not fail the batch | `Promise.allSettled` fan-out    |
| NFR-3  | No credentials / secrets required            | public endpoint only            |
| NFR-4  | Polite pacing between pagination rounds       | 300–600 ms jittered delay       |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.EIGHTFOLD, name: 'Eightfold', category: 'ats', isAts: true })
class EightfoldService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public):

```
GET {host}/api/apply/v2/jobs?domain={domain}&start={n}&num=10&sort_by=timestamp
  → { positions: EightfoldPosition[], count: number }
```

### 7.2 Errors

| Code / Behaviour            | Meaning                                              |
| --------------------------- | --------------------------------------------------- |
| empty `JobResponseDto`      | no slug/url, dead tenant, or all pages failed        |
| logged warn per failed page | a single page 4xx/5xx/transient — batch continues    |

## 8. Test Plan

- E2E (`__tests__/eightfold.e2e-spec.ts`): known tenant returns shaped jobs;
  no-slug returns empty; unknown tenant degrades gracefully; `resultsWanted`
  is honoured. Network-tolerant (zero results is acceptable).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper.

## 9. Open Questions

- **Q-EF-1 — WAF fallback.** Some tenants (Bayer, AT&T, Activision, Verizon)
  sit behind Cloudflare and 403 plain HTTPS. A browser-fingerprint fallback
  would recover them but adds a heavyweight optional dependency.
  **Default (proceeding):** ship public-endpoint-only; record WAF tenants for a
  follow-up spec. Logged in `docs/questions.md` as Q-043.

## 10. Decisions

- D-1: Primary endpoint is the public SmartApply `/api/apply/v2/jobs` (reachable
  cross-tenant without auth), not the PCSX `/api/pcsx/search` endpoint (which
  403s on SmartApply-only tenants). The PCSX path is retained as a documented
  constant for a future iteration.
- D-2: `domain` query param defaults to `{slug}.com`; overridable indirectly via
  `companyUrl`. This matches observed tenant behaviour.
- D-3: Location strings ("Country, State, City") are reversed into the
  `LocationDto` `{ city, state, country }` shape.

## 11. References

- `packages/plugins/source-ats-eightfold/` — implementation.
- `packages/plugins/source-ats-phenom/` — sibling career-site adapter (pattern).
- Public Eightfold positions API (SmartApply v2).
