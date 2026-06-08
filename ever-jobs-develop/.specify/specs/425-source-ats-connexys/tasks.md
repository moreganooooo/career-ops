# Tasks: 425 — Connexys ATS Source Adapter

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Package scaffold

- [x] T01 — Create package manifest + tsconfig
  - **Files:** `packages/plugins/source-ats-connexys/package.json`,
    `packages/plugins/source-ats-connexys/tsconfig.json`
  - **Acceptance:** name `@ever-jobs/source-ats-connexys`, v0.1.0, main+types `src/index.ts`,
    MIT; tsconfig extends base, outDir `dist/packages/source-ats-connexys`.
  - **Estimate:** 0.5 day

- [x] T02 — Module + barrel exports
  - **Files:** `src/index.ts`, `src/connexys.module.ts`
  - **Acceptance:** `ConnexysModule` provides + exports `ConnexysService`; barrel re-exports both.
  - **Estimate:** 0.5 day

## Phase 2 — Surface modelling

- [x] T03 — Constants + surface JSDoc
  - **Files:** `src/connexys.constants.ts`
  - **Acceptance:** root domain, feed host, URL builder (`p_pub_id`), results cap (100),
    max-pages cap, `DEFAULT_TIMEOUT_SECONDS = 15`, headers, vacancy + remote regex; rich JSDoc
    with a dated `Surface confidence` note (verified=false, 2026-06-04).
  - **Estimate:** 0.5 day

- [x] T04 — Wire + normalised types
  - **Files:** `src/connexys.types.ts`
  - **Acceptance:** `ConnexysVacancy` (all optional, multi-alias), `ConnexysVacancyList`,
    `ConnexysJob` normalised interface.
  - **Estimate:** 0.5 day

## Phase 3 — Service + tests

- [x] T05 — Scraper service (resolve → fetch → parse → map)
  - **Files:** `src/connexys.service.ts`
  - **Acceptance:** `@SourcePlugin({ site: Site.CONNEXYS, … })`; resolves site + channel from
    `companySlug` / `companyUrl`; caps timeout on both keys; single feed fetch; tolerant CDATA
    parse; maps each role → `JobPostDto` (`connexys-{atsId}`, `Site.CONNEXYS`,
    `atsType: 'connexys'`, location, description by format, emails, `YYYY-MM-DD` date); dedup by
    ATS id; honours `resultsWanted`; never throws; transport-fail vs HTTP-status distinguished;
    Logger (no console).
  - **Estimate:** 1 day

- [x] T06 — E2E test
  - **Files:** `__tests__/connexys.e2e-spec.ts`
  - **Acceptance:** 5 tests (known tenant array + shape-when-non-empty; empty w/o slug+url;
    resolve from `companyUrl`; unknown tenant → empty; respects `resultsWanted`); zero results
    tolerated; 30s timeouts on network tests.
  - **Estimate:** 0.5 day

## Notes

- Tests authored alongside the implementation in this run.
- Shared registry wiring (`Site.CONNEXYS`, plugin index, tsconfig path, jest mapper) is owned
  by the orchestrator and intentionally out of scope here.
