# Tasks: 416 — Source ATS Plugin: Talentera (talentera.com)

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped
>
> Phase 425. All tasks implemented in this run.

## Phase 1 — Package scaffold

- [x] T01 — Create the package manifest + tsconfig
  - **Files:** `packages/plugins/source-ats-talentera/package.json`,
    `packages/plugins/source-ats-talentera/tsconfig.json`
  - **Acceptance:**
    - `name` is `@ever-jobs/source-ats-talentera`, version `0.1.0`, `main`/`types` → `src/index.ts`, MIT.
    - `tsconfig` extends the base and emits to `dist/packages/source-ats-talentera`.
  - **Estimate:** 0.5 day

- [x] T02 — Module + barrel exports
  - **Files:** `packages/plugins/source-ats-talentera/src/index.ts`,
    `packages/plugins/source-ats-talentera/src/talentera.module.ts`
  - **Acceptance:**
    - `TalenteraModule` provides + exports `TalenteraService`.
    - `index.ts` re-exports both.
  - **Estimate:** 0.5 day

## Phase 2 — Surface constants & wire types

- [x] T03 — Surface constants + URL builders
  - **Files:** `packages/plugins/source-ats-talentera/src/talentera.constants.ts`
  - **Acceptance:**
    - Root domain, origin / results / search-manager URL builders, detail + apply URL builders.
    - Guest-token regex, default results cap (100), page cap (25), page size, `DEFAULT_TIMEOUT_SECONDS = 15`.
    - Default headers (JSON Accept, browser UA, `X-Requested-With`), remote-detection regex.
    - Rich JSDoc header documenting the public surface + a verified=true confidence note (2026-06-04).
  - **Estimate:** 0.5 day

- [x] T04 — Wire + normalised interfaces
  - **Files:** `packages/plugins/source-ats-talentera/src/talentera.types.ts`
  - **Acceptance:**
    - `TalenteraSearchResponse`, `TalenteraJobItem` (all fields optional / defensively narrowed),
      and a normalised internal `TalenteraJob`.
  - **Estimate:** 0.5 day

## Phase 3 — Service pipeline

- [x] T05 — Resolve tenant codename + cap timeout
  - **Files:** `packages/plugins/source-ats-talentera/src/talentera.service.ts`
  - **Acceptance:**
    - Resolve codename from `companySlug` / `companyUrl` (sub-domain of `talentera.com`; `www`/apex → empty).
    - Timeout capped to 15 s on BOTH `timeout` and `requestTimeout`.
    - Empty result when neither slug nor URL is provided.
  - **Estimate:** 0.5 day

- [x] T06 — Guest-token mint + paginated drain
  - **Files:** `packages/plugins/source-ats-talentera/src/talentera.service.ts`
  - **Acceptance:**
    - Load the public results page, extract `USER_token`; transport failure → null (host down).
    - Drain `byt_job_search_manager` (`action=1`) bounded by `totalJobs`, page cap, `resultsWanted`.
    - Distinguish transport failure (stop sweep) from HTTP-status / guard (`{ status: 'fail' }`).
  - **Estimate:** 1 day

- [x] T07 — Map role → JobPostDto
  - **Files:** `packages/plugins/source-ats-talentera/src/talentera.service.ts`
  - **Acceptance:**
    - id `talentera-{atsId}`, `site: Site.TALENTERA`, `atsType: 'talentera'`, dedup by ATS id.
    - `applyUrl` (`/en/job-application/?jb_id={id}`), detail `jobUrl` (`/en/{country}/jobs/{slug}-{id}/`).
    - `LocationDto`, description per `descriptionFormat`, extracted emails, `YYYY-MM-DD` `datePosted`, remote flag.
    - `Logger` only (no `console.log`); never throws out of `scrape()`.
  - **Estimate:** 1 day

## Phase 4 — E2E test

- [x] T08 — E2E spec (5 tests)
  - **Files:** `packages/plugins/source-ats-talentera/__tests__/talentera.e2e-spec.ts`
  - **Acceptance:**
    - Known tenant (`careerroyaljet`) returns an array; shape asserts only when non-empty.
    - Empty when no slug/url; resolve from `companyUrl`; unknown tenant → empty; respects `resultsWanted`.
    - 30000 ms timeouts on network tests; zero results tolerated.
  - **Estimate:** 0.5 day

## Notes

- Tests written alongside the implementation, not batched.
- `Site.TALENTERA` enum entry + `ALL_SOURCE_MODULES` / path-alias / jest-mapper registration are
  orchestrator-owned shared-file edits and are intentionally out of scope for this package.
- Package typechecks cleanly once the enum entry is wired (verified locally 2026-06-04).
