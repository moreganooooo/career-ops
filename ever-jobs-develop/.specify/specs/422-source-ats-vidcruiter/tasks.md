# Tasks: 422 — VidCruiter ATS Source Adapter

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Package scaffold

- [x] T01 — Live research: confirm VidCruiter's public anonymous candidate surface
  - **Files:** (research only)
  - **Acceptance:** Confirmed `vidcruiter.hiringplatform.com/list/careers/` board and the
    `GET /list/{slug}.json?page={n}` → `{ business_processes: [...] }` feed anonymously, plus
    drain-until-empty pagination and the `/processes/{uuid}` canonical apply URL. verified=true.
  - **Estimate:** 0.5 day

- [x] T02 — Package manifest + tsconfig
  - **Files:** `packages/plugins/source-ats-vidcruiter/package.json`, `tsconfig.json`
  - **Acceptance:** name `@ever-jobs/source-ats-vidcruiter`, v0.1.0, MIT; outDir
    `../../../dist/packages/source-ats-vidcruiter`.
  - **Estimate:** 0.1 day

- [x] T03 — Constants with surface JSDoc + confidence note
  - **Files:** `src/vidcruiter.constants.ts`
  - **Acceptance:** root domain, feed/board URL builders, default results cap (100), max-pages cap
    (25), `DEFAULT_TIMEOUT_SECONDS = 15`, default headers, remote regex; surface-confidence note
    dated 2026-06-04 with verified=true.
  - **Estimate:** 0.3 day

- [x] T04 — Wire types
  - **Files:** `src/vidcruiter.types.ts`
  - **Acceptance:** `VidCruiterProcessItem`, `VidCruiterFeedResponse`, normalised `VidCruiterJob`;
    all wire fields optional + defensively narrowed.
  - **Estimate:** 0.2 day

- [x] T05 — NestJS module
  - **Files:** `src/vidcruiter.module.ts`, `src/index.ts`
  - **Acceptance:** `@Module` provides+exports `VidCruiterService`; index re-exports module+service.
  - **Estimate:** 0.1 day

- [x] T06 — Service implementing IScraper
  - **Files:** `src/vidcruiter.service.ts`
  - **Acceptance:** `@SourcePlugin({ site: Site.VIDCRUITER, name: 'VidCruiter', category: 'ats',
    isAts: true })`; resolves tenant+slug from companySlug/companyUrl; caps timeout to 15s on both
    keys; drains the feed bounded by page cap + resultsWanted; maps each role → JobPostDto
    (`vidcruiter-${atsId}`, site VIDCRUITER, atsType `vidcruiter`, applyUrl, LocationDto,
    descriptionFormat handling, extractEmails); dedups by ATS id; never throws; distinguishes
    transport-failure from HTTP-status errors; uses Logger.
  - **Estimate:** 0.6 day

## Phase 2 — Tests + spec

- [x] T07 — E2E test (5 cases)
  - **Files:** `__tests__/vidcruiter.e2e-spec.ts`
  - **Acceptance:** known tenant returns array (shape-asserts only when non-empty); empty when no
    slug/url; resolve from companyUrl; unknown tenant → empty; respects resultsWanted; 30000ms
    network timeouts; KNOWN_TENANT = `vidcruiter`.
  - **Estimate:** 0.3 day

- [x] T08 — Spec triplet
  - **Files:** `.specify/specs/422-source-ats-vidcruiter/{spec,plan,tasks}.md`
  - **Acceptance:** spec states rationale, public surface, inputs/outputs, graceful-degradation
    contract; plan describes fetch→parse→map; tasks checklist all done.
  - **Estimate:** 0.2 day

## Notes

- Write tests alongside each implementation task; do not batch testing into a final task.
- Update `docs/log.md` with each completed task in the same commit.
