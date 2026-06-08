# Tasks: 325 — Teamdash ATS Source Plugin

All tasks completed in this run (scheduled-agent, 2026-06-03).

## Research

- [x] T-1 — Identify a real live Teamdash tenant and its public surface
      (`cr14.teamdash.com`; career page `/p/job/20eH77Ul/career-page`).
- [x] T-2 — Confirm there is no anonymous JSON listing API (probed `/api/*`,
      `/careers`, `/jobs`, `/p/career` → 404); the listing lives in the
      embedded `window.context.career_page_feed_contents` blob.
- [x] T-3 — Byte-confirm the listing + detail wire shape (feed item
      `{ url, title, location }`; landing `data.blocks[]`, `meta.title`,
      `created_at`, `status`, `stage.name`).

## Plugin package

- [x] T-4 — `package.json` (`@ever-jobs/source-ats-teamdash`, 0.1.0, MIT).
- [x] T-5 — `tsconfig.json` (extends base; outDir `dist/packages/source-ats-teamdash`).
- [x] T-6 — `src/index.ts` (export `TeamdashModule`, `TeamdashService`).
- [x] T-7 — `src/teamdash.constants.ts` (host templates, context marker,
      headers, page size / concurrency / defaults; verified wire-surface doc).
- [x] T-8 — `src/teamdash.types.ts` (`TeamdashContext`, `TeamdashFeedItem`,
      `TeamdashLanding`, block/stage/meta interfaces; all fields optional).
- [x] T-9 — `src/teamdash.module.ts` (NestJS `@Module`).
- [x] T-10 — `src/teamdash.service.ts` (`@SourcePlugin` + `@Injectable`
      `IScraper` scraper).

## Service behaviour

- [x] T-11 — Resolve tenant from `companySlug` / `companyUrl`; empty result
      when neither provided.
- [x] T-12 — HTTP via `createHttpClient(...)` + `setHeaders(...)`.
- [x] T-13 — Extract `window.context` via depth-tracking, string-aware brace
      scan; tolerate missing/malformed blobs.
- [x] T-14 — Flatten + de-dupe `career_page_feed_contents`; bounded
      `Promise.allSettled` detail fan-out (never `Promise.all`).
- [x] T-15 — Assemble description from `landing.data.blocks[]`; honour
      `descriptionFormat` (HTML / Markdown / Plain).
- [x] T-16 — Map to `JobPostDto` (`teamdash-{atsId}` id, site `Site.TEAMDASH`,
      `atsType: 'teamdash'`, department = stage name, applyUrl); de-dupe by `atsId`.
- [x] T-17 — Honour `resultsWanted` (default 100); never throw to caller; log
      via NestJS `Logger`.

## Tests & verification

- [x] T-18 — `__tests__/teamdash.e2e-spec.ts` (4 tests, live `cr14` tenant,
      network-tolerant; asserts `site`/`atsType`; nullable fields guarded).
- [x] T-19 — `tsc --noEmit` against the package tsconfig — clean.
- [x] T-20 — Live probe confirmed 2 shaped jobs from `cr14.teamdash.com`
      (title/atsId/location/date/department/remote/Markdown description);
      unknown tenant + no-input both return empty.

## Spec-Kit triplet

- [x] T-21 — `spec.md` (metadata, FRs/NFRs, contracts w/ verified wire shape,
      errors, test plan, open questions, decisions, references).
- [x] T-22 — `plan.md` (endpoint choice, file layout, registration notes).
- [x] T-23 — `tasks.md` (this file).

## Central registration (orchestrator-owned — NOT edited by this plugin)

- [x] T-24 — `Site.TEAMDASH = 'teamdash'` (added by orchestrator).
- [ ] T-25 — `ALL_SOURCE_MODULES` append (orchestrator).
- [ ] T-26 — `tsconfig.base.json` path alias (orchestrator).
- [ ] T-27 — `jest.config.js` moduleNameMapper (orchestrator).
