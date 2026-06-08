# Tasks: 415 — Employment Hero ATS Source Adapter

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped
>
> Phase: 424. All tasks implemented in this run.

## Phase 1 — Live research

- [x] T01 — Confirm the public, anonymous candidate-facing surface
  - **Files:** (research only)
  - **Acceptance:**
    - Board addressing confirmed: `jobs.employmenthero.com/organisations/{slug}` 307→
      `employmenthero.com/jobs/organisations/{slug}/`.
    - Feed confirmed live anonymously:
      `GET services.employmenthero.com/ats/api/v1/career_page/organisations/{slug}/jobs`
      → `{ data: { items: [...], page_index, item_per_page, total_pages, total_items } }`.
    - Pagination (`page_index` / `item_per_page`) and unknown-tenant 404
      (`organisation_not_found`) confirmed. verified=true (2026-06-04).
  - **Estimate:** 0.5 day

## Phase 2 — Package scaffold

- [x] T02 — Package manifest + tsconfig
  - **Files:** `packages/plugins/source-ats-employmenthero/package.json`, `tsconfig.json`
  - **Acceptance:** name `@ever-jobs/source-ats-employmenthero`, version 0.1.0, MIT;
    `outDir` → `dist/packages/source-ats-employmenthero`.
  - **Estimate:** 0.5 day

- [x] T03 — Constants module
  - **Files:** `src/employmenthero.constants.ts`
  - **Acceptance:** root domain, board host, canonical + API origins, URL builders, default
    results cap (100), page size, max-pages cap, `DEFAULT_TIMEOUT_SECONDS = 15`, default headers,
    remote regex; rich JSDoc surface header with a verified=true confidence note (2026-06-04).
  - **Estimate:** 0.5 day

- [x] T04 — Types module
  - **Files:** `src/employmenthero.types.ts`
  - **Acceptance:** wire interfaces (all fields optional / defensively narrowed) + normalised
    internal job interface.
  - **Estimate:** 0.5 day

- [x] T05 — Module + barrel
  - **Files:** `src/employmenthero.module.ts`, `src/index.ts`
  - **Acceptance:** `@Module` provides + exports `EmploymentHeroService`; barrel exports module +
    service.
  - **Estimate:** 0.5 day

- [x] T06 — Service (fetch → parse → map)
  - **Files:** `src/employmenthero.service.ts`
  - **Acceptance:**
    - `@SourcePlugin({ site: Site.EMPLOYMENTHERO, name: 'Employment Hero', category: 'ats',
      isAts: true })` + `@Injectable` implements `IScraper`.
    - Resolve slug from `companySlug` / `companyUrl`; cap timeout 15 s on both keys.
    - Drain feed by `page_index`, bounded by `total_pages` + page cap + `resultsWanted`.
    - Map role → `JobPostDto` (id `employmenthero-${atsId}`, site, atsType `employmenthero`,
      detail / apply URL from `friendly_id`, `LocationDto`, description per `descriptionFormat`,
      emails via `extractEmails`, `datePosted` → `YYYY-MM-DD`).
    - Distinguish transport failure from HTTP-status errors; dedup by ATS id; never throw;
      `Logger` only.
  - **Estimate:** 1 day

## Phase 3 — Tests + spec

- [x] T07 — E2E spec
  - **Files:** `__tests__/employmenthero.e2e-spec.ts`
  - **Acceptance:** five tests mirroring the template (known tenant array + conditional shape
    asserts; empty when no slug/url; resolve from `companyUrl`; unknown tenant → empty; respects
    `resultsWanted`); 30000 ms network timeouts; zero results tolerated.
  - **Estimate:** 0.5 day

- [x] T08 — Spec triplet
  - **Files:** `.specify/specs/415-source-ats-employmenthero/{spec,plan,tasks}.md`
  - **Acceptance:** spec states adoption rationale, public surface, inputs / outputs, and the
    graceful-degradation contract; plan describes the fetch → parse → map pipeline; tasks all
    marked done.
  - **Estimate:** 0.5 day

## Notes

- Tests are authored alongside the implementation, not batched into a final task.
- Shared registry wiring (site enum, plugin index, tsconfig paths, jest mapper) is performed by
  the orchestrator, not in this package.
