# ever-jobs → career-ops Merge: Design

**Date:** 2026-06-07
**Status:** Approved

## Context

Morgan dropped a copy of the [ever-jobs](https://github.com/ever-co/ever-jobs) repository (`ever-jobs-develop/`) into `career-ops/`, hoping to merge its job-board sources into her existing system. ever-jobs is a NestJS monorepo (TypeScript, ~190 source plugins, REST/GraphQL/CLI/MCP server, Docker) — architecturally incompatible with career-ops's lightweight markdown + zero-token `.mjs` scanner. A literal code merge isn't possible or desirable; career-ops stays the primary system.

Decision: treat ever-jobs purely as a **reference catalog** — extract the *ideas* (which job boards exist, which companies are worth tracking, how they're queried) and re-implement what's valuable natively in career-ops's existing `providers/*.mjs` plugin format.

## What we found

1. **107 search-based job boards** in ever-jobs — mostly aggregators (RemoteOK, We Work Remotely, Indeed, LinkedIn, etc.) plus a long tail of dev-niche RSS feeds (Rails Job Board, Clojure Jobs, etc.) and country-specific boards that conflict with Morgan's US-only `location_filter`.
2. **565 company-specific scrapers**, of which **551 use Greenhouse** — i.e., exactly the `name` + `careers_url` + `api` shape career-ops's `tracked_companies` already uses. Of those, only 29 overlap with Morgan's current ~183 tracked companies, leaving **537 net-new direct-source targets**.
3. career-ops's `providers/websearch.mjs` deliberately blocks aggregator domains (RemoteOK, We Work Remotely, Himalayas, Wellfound, Built In, Indeed, Glassdoor, ZipRecruiter, etc.) from Brave web-search results — but this is a *search-result quality* mechanism (avoiding stale mirror listings), not a blanket anti-aggregator policy. A **dedicated provider** that hits a board's own structured JSON/RSS API directly is a different, complementary mechanism — the same pattern `greenhouse.mjs`/`lever.mjs` already use for ATS platforms. No conflict; `BLOCKED_DOMAINS` stays as-is.

## Design

### Part A — New job-board provider plugins (~18 new files in `providers/`)

Each new provider follows the existing `{ id, detect, fetch }` plugin contract (see `providers/greenhouse.mjs` for the reference shape) and returns normalized `{ title, url, company, location, posted_at? }`. `scan.mjs` auto-loads any `*.mjs` dropped into `providers/` — no core scanner changes required.

**Tier 1 — free, no-auth JSON/RSS APIs** (build first):
RemoteOK, We Work Remotely, Remotive, Himalayas, Jobicy, The Muse, Working Nomads, NoDesk, Real Work From Anywhere, Hacker News "Who's Hiring", 4 Day Week, PowerToFly, Crunchboard, Jobspresso

**Tier 2 — needs free API keys** (Morgan signs up; keys stored as env vars, same pattern as `BRAVE_API_KEY`):
Adzuna, Authentic Jobs, USAJobs, Built In

Each board gets 1–3 `tracked_companies` entries in `portals.yml` with an explicit `provider:` field and a `search_term` pointed at Morgan's marketing/sales-enablement/content/lifecycle keyword vocabulary (reusing language already present in `title_filter` / `search_queries`), e.g.:

```yaml
- name: "RemoteOK — Marketing & Lifecycle"
  provider: remoteok
  search_term: "marketing"
  enabled: true

- name: "RemoteOK — Sales Enablement & Content"
  provider: remoteok
  search_term: "enablement"
  enabled: true
```

`PortalEntry` is intentionally schema-loose — provider-specific fields are opaque to `scan.mjs` and validated by the provider itself — so adding a "search this board for X" entry alongside "track this company's board" entries requires no changes to the resolution loop.

### Part B — Bulk company-list expansion

1. Extract `name` + Greenhouse `slug` from all 551 `source-company-*` Greenhouse plugins in ever-jobs.
2. Dedupe against the 29 Greenhouse companies already in `tracked_companies` (matched by slug).
3. Bulk-add the ~537 net-new companies to `portals.yml` in the existing format:
   ```yaml
   - name: <Company>
     careers_url: https://boards.greenhouse.io/<slug>
     api: https://boards-api.greenhouse.io/v1/boards/<slug>/jobs
     enabled: true
   ```
4. Group the import under a clearly-labeled new section/comment block (e.g. `# Imported from ever-jobs catalog — 2026-06-07`) so it's auditable and reversible as a block.

This is consistent with career-ops's stated philosophy ("wide categorical net — `title_filter` handles precision") and the system's zero-token design: scanning more direct sources costs scan runtime (more HTTP calls, parallelized at `CONCURRENCY = 10`) and may surface more candidates in `data/pipeline.md`, but adds no LLM cost and no aggregator-noise risk.

## Out of scope (documented as future candidates, not built now)

- **Tier 3 providers** (LinkedIn — HTML scraping/ToS risk, Glassdoor — CSRF complexity, Indeed — GraphQL/bot-detection, Wellfound — Playwright SPA): higher complexity and risk; revisit later if Tier 1/2 prove valuable.
- **`websearch.mjs` `BLOCKED_DOMAINS`**: left untouched — it's a different, complementary mechanism (search-result quality vs. structured-API ingestion); no change needed.
- **The ~13 bespoke mega-company scrapers** (Amazon, Apple, Google, Meta, Microsoft, Netflix, etc.) and the single Ashby-based company source from ever-jobs's company list: not pursued — low marginal value for Morgan's remote IC-marketing target, and each would need a custom provider for one company.
- **Country-specific / dev-niche search boards** (StepStone, Naukri, Rails Job Board, Clojure Jobs, etc.): excluded — conflict with the US-only `location_filter` or carry no marketing-adjacent roles to "shift focus" toward.

## Testing

- New providers: validate against `providers/_types.js` contract (id present, `fetch` returns array of `{title, url, company, location}`).
- Run `node scan.mjs --company "<board name>"` (or equivalent single-target invocation) to spot-check each new provider in isolation before enabling broadly.
- Run `node verify-pipeline.mjs` after the bulk `portals.yml` edit to confirm structural integrity.
- Spot-check a sample of newly-added companies' `api` URLs resolve (HTTP 200, valid JSON) before considering the import complete.
