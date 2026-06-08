# Tasks: 417 — Source ATS Plugin: Subscribe-HR (subscribe-hr.com.au)

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped
>
> Phase number: 426. All tasks implemented in this run.

## Phase 1 — Live research & surface confirmation

- [x] T01 — Confirm the public, anonymous careers-board surface
  - **Files:** (research only)
  - **Acceptance:**
    - Board host pattern confirmed: `https://{tenant}.careers.subscribe-hr.com/`.
    - Per-role detail URL confirmed: `/jobs/{id}-{slug}`.
    - Listing page confirmed to carry inline role cards (`data-vacancyId`, hidden `jobName` /
      `jobShortDescription` / `jobUrl` inputs, attribute `<ul>`, `job-desc` summary).
    - `?page={n}` pagination confirmed to return distinct id sets across pages.
    - Verified live 2026-06-04 against tenant `subscribehr16`.
  - **Estimate:** 0.5 day

## Phase 2 — Package scaffold

- [x] T02 — Scaffold the plugin package shell
  - **Files:** `packages/plugins/source-ats-subscribehr/package.json`, `tsconfig.json`,
    `src/index.ts`, `src/subscribehr.module.ts`
  - **Acceptance:**
    - `package.json` named `@ever-jobs/source-ats-subscribehr`, v0.1.0, MIT, `src/index.ts`
      main+types.
    - `tsconfig.json` extends base, `outDir` → `../../../dist/packages/source-ats-subscribehr`.
    - `index.ts` exports `SubscribeHrModule` + `SubscribeHrService`.
    - `@Module` provides + exports `SubscribeHrService`.
  - **Estimate:** 0.5 day

- [x] T03 — Author constants & wire-shape types
  - **Files:** `src/subscribehr.constants.ts`, `src/subscribehr.types.ts`
  - **Acceptance:**
    - Root domain, board host suffix, URL builders, default results cap (100), max-pages cap
      (25), `DEFAULT_TIMEOUT_SECONDS = 15`, default headers, card-parsing regexes, and a
      remote-detection regex — all with rich JSDoc + a "Surface confidence" note (verified true,
      2026-06-04).
    - `SubscribeHrCard` + normalised `SubscribeHrJob` interfaces, all fields optional /
      defensively narrowed.
  - **Estimate:** 0.5 day

## Phase 3 — Service implementation

- [x] T04 — Implement `SubscribeHrService.scrape`
  - **Files:** `src/subscribehr.service.ts`
  - **Acceptance:**
    - `@SourcePlugin({ site: Site.SUBSCRIBEHR, name: 'Subscribe-HR', category: 'ats', isAts: true })`
      + `@Injectable`, implements `IScraper`.
    - Resolves tenant from `companySlug` or `companyUrl`; empty result when neither is present.
    - Caps timeout to 15 s on both `timeout` and `requestTimeout`.
    - Drains the `?page={n}` listing bounded by the page cap, `resultsWanted`, and new-id stall.
    - Parses each card (vacancy id, title, summary, url, attributes, description) defensively.
    - Maps each role → `JobPostDto` (id `subscribehr-${atsId}`, `site: Site.SUBSCRIBEHR`,
      `atsType: 'subscribehr'`, `applyUrl`, `LocationDto`, format-aware description, emails,
      datePosted normalised when present, remote + employment-type inferred).
    - Dedups by ATS id; distinguishes transport failure from HTTP-status errors; never throws;
      uses `Logger`.
  - **Estimate:** 1 day

## Phase 4 — Tests & docs

- [x] T05 — E2E spec
  - **Files:** `__tests__/subscribehr.e2e-spec.ts`
  - **Acceptance:**
    - 5 tests mirroring the canonical sibling: known tenant returns array (shape-asserts only
      when non-empty); empty when no slug/url; resolve from `companyUrl`; unknown tenant →
      empty; respects `resultsWanted`.
    - Uses the real tenant `subscribehr16` as `KNOWN_TENANT`; tolerates zero results; 30 s
      timeouts on network tests.
  - **Estimate:** 0.5 day

- [x] T06 — Spec triplet
  - **Files:** `.specify/specs/417-source-ats-subscribehr/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** spec (rationale, surface, inputs, outputs, graceful-degradation contract),
    plan (fetch→parse→map pipeline), tasks (this checklist, all done).
  - **Estimate:** 0.5 day

## Notes

- Tests were written alongside the implementation, not batched into a final task.
- The `Site.SUBSCRIBEHR` enum entry and the module / path-alias / jest-mapper registrations are
  wired by the orchestrator; this package does not edit those shared files.
- Update `docs/log.md` with each completed task in the same commit.
