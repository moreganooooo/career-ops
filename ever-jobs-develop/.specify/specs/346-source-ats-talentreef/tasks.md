# Tasks: 346 — TalentReef ATS Source Plugin

## Research

- [x] Identify TalentReef's public, unauthenticated surface (career-search pages
      on `apply.jobappnetwork.com/{tenant}/{lang}`).
- [x] Confirm live tenant slugs (`rtg`, `jibinc`, `mcm`, `surf-sand-careers`,
      `tacobellcorporate`).
- [x] Confirm the legacy applicant portal (`{secure|cf-apply}.jobappnetwork.com/
      apply/c_{code}/l_{lang}/`) is the application surface, not the listing
      surface, and exclude it.
- [x] Note the verification gap: SPA-rendered listing; exact wire shape not
      byte-confirmed; `api.jobappnetwork.com` returns HTTP 401 (`verified: false`).

## Package scaffold

- [x] `package.json` (`@ever-jobs/source-ats-talentreef`, 0.1.0, MIT, main/types
      `src/index.ts`).
- [x] `tsconfig.json` (extends base; outDir `dist/packages/source-ats-talentreef`).
- [x] `src/index.ts` (re-export `TalentReefModule`, `TalentReefService`).
- [x] `src/talentreef.module.ts` (`@Module` providers/exports `[TalentReefService]`).

## Implementation

- [x] `src/talentreef.constants.ts` — host/path templates, default lang, JSON-LD
      + state + client-id regexes, results cap (100), browser-like headers, rich
      surface doc comment with the live-verification note (2026-06-03).
- [x] `src/talentreef.types.ts` — defensive `JobPosting` JSON-LD + SPA positions
      interfaces (snake_case + camelCase aliases).
- [x] `src/talentreef.service.ts` — `@SourcePlugin({ site: Site.TALENTREEF, … })`
      `IScraper`; resolve tenant; fetch career page once; harvest JSON-LD + SPA
      positions; map to `JobPostDto` (id `talentreef-${atsId}`, atsType
      `'talentreef'`, location, description per `DescriptionFormat`, emails,
      datePosted, isRemote, department, employmentType, applyUrl); de-dup by
      atsId; slice to `resultsWanted`; graceful degradation throughout.

## Tests

- [x] `__tests__/talentreef.e2e-spec.ts` — known tenant returns shaped jobs when
      present; empty when no slug/url; unknown tenant graceful; `resultsWanted`
      honoured; network-tolerant; 30000 ms timeouts.

## Spec docs

- [x] `spec.md` (problem, goals, non-goals, public surface, data mapping,
      acceptance criteria, risks/open questions, decisions, references).
- [x] `plan.md` (files, fetch flow, error handling, perf).
- [x] `tasks.md` (this checklist).

## Hand-off (orchestrator-owned, not in this package)

- [ ] Add `Site.TALENTREEF = 'source-ats-talentreef'` to the site enum.
- [ ] Append `TalentReefModule` to `ALL_SOURCE_MODULES` in `packages/plugins/index.ts`.
- [ ] Add `@ever-jobs/source-ats-talentreef` path alias in `tsconfig.base.json`.
- [ ] Add the matching `jest.config.js` moduleNameMapper entry.
