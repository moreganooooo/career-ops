# Tasks: 339 — JobDiva ATS Source Plugin

## Research
- [x] Confirm JobDiva's public, unauthenticated job surface (WebSearch + live WebFetch).
- [x] Verify the candidate portal (`/portal/?a={portalId}`) and both XML feeds live (2026-06-03).
- [x] Capture the `<outertag><jobs><job>` wire shape and per-job field names.

## Scaffolding
- [x] `package.json` (`@ever-jobs/source-ats-jobdiva`, main/types `src/index.ts`, MIT).
- [x] `tsconfig.json` (extends base; outDir `dist/packages/source-ats-jobdiva`).
- [x] `src/index.ts` (re-export `JobDivaModule` + `JobDivaService`).
- [x] `src/jobdiva.module.ts` (`@Module` providers/exports `[JobDivaService]`).

## Constants & types
- [x] `src/jobdiva.constants.ts` — hosts, feed paths, portal-key regex, default cap (100), headers, doc comment with live-verification note (2026-06-03).
- [x] `src/jobdiva.types.ts` — `JobDivaJob`, `JobDivaFeed` (XML wire shape + camelCase aliases).

## Service
- [x] `@SourcePlugin({ site: Site.JOBDIVA, name: 'JobDiva', category: 'ats', isAts: true })`.
- [x] `resolveTenant` — bare key, `{host}|{portalId}` pair, portal/feed URL, `companyUrl`.
- [x] `fetchFeed` — candidate feed first, employer "connect" feed fallback; cheerio XML mode.
- [x] `processJob` → `JobPostDto` (id `jobdiva-{atsId}`, atsType `jobdiva`, location, description, emails, department, employmentType, datePosted, isRemote, applyUrl).
- [x] `formatDescription` per `descriptionFormat` (HTML / Markdown / Plain).
- [x] De-dup by `atsId`; client-side slice to `resultsWanted`.
- [x] Graceful degradation — 4xx → empty, parse/per-job error → warn + partial, never throws.

## Tests
- [x] `__tests__/jobdiva.e2e-spec.ts` — known tenant, companyUrl resolution, empty-when-no-input, unknown-tenant, resultsWanted; network-tolerant; 30000 ms timeouts.

## Docs
- [x] `spec.md`, `plan.md`, `tasks.md` under `.specify/specs/339-source-ats-jobdiva/`.

## Verification
- [x] Type-check against the package tsconfig (no new errors introduced by this package).
- [ ] Central registration (Site enum, ALL_SOURCE_MODULES, tsconfig paths, jest moduleNameMapper) — handled by the orchestrator.
