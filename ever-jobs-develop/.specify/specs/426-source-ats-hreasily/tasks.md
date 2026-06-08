# Tasks: 426 — HReasily ATS Source Adapter

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Live research & surface modelling

- [x] T01 — Research HReasily's public, anonymous candidate-facing job surface
  - **Files:** `src/hreasily.constants.ts` (surface JSDoc + confidence note)
  - **Acceptance:**
    - Identified platform identity, SEA/SG footprint, and the Applicant-Tracking module.
    - Confirmed the employer app is server-rendered and login-gated (private surface).
    - Documented the candidate surface as a defensive best-effort model with verified=false
      and a dated confidence note (no fabricated "verified" endpoint).
  - **Estimate:** 0.5 day

## Phase 2 — Package scaffold & implementation

- [x] T02 — Scaffold the package (manifest, tsconfig, barrel, module)
  - **Files:** `package.json`, `tsconfig.json`, `src/index.ts`, `src/hreasily.module.ts`
  - **Acceptance:** name `@ever-jobs/source-ats-hreasily`, v0.1.0, MIT; outDir
    `../../../dist/packages/source-ats-hreasily`; barrel exports `HReasilyModule` +
    `HReasilyService`; NestJS module provides+exports the service.
  - **Estimate:** 0.5 day

- [x] T03 — Constants (hosts, URL builders, caps, headers, regex)
  - **Files:** `src/hreasily.constants.ts`
  - **Acceptance:** root domain, careers host/origin, career-page + detail URL builders,
    DEFAULT_RESULTS=100, MAX_PAGES=25, DEFAULT_TIMEOUT_SECONDS=15, default headers,
    remote-detection regex, rich JSDoc + surface-confidence note.
  - **Estimate:** 0.5 day

- [x] T04 — Wire types (JSON-LD JobPosting + data island + normalised job)
  - **Files:** `src/hreasily.types.ts`
  - **Acceptance:** defensively-narrowed interfaces for `JobPosting`, `ItemList`/`ListItem`,
    `Place`/`PostalAddress`/`Organization`, the data-island row, and a normalised internal job.
  - **Estimate:** 0.5 day

- [x] T05 — Service: resolve → fetch → extract → map, fully graceful
  - **Files:** `src/hreasily.service.ts`
  - **Acceptance:**
    - `@SourcePlugin({ site: Site.HREASILY, name: 'HReasily', category: 'ats', isAts: true })`.
    - Resolve slug from `companySlug` / `companyUrl`; empty result when absent.
    - Timeout capped to 15 s on BOTH `timeout` and `requestTimeout`.
    - JSON-LD-first extraction with data-island + anchor fallbacks; dedup by ATS id.
    - Map → `JobPostDto` (id `hreasily-{atsId}`, `site: Site.HREASILY`, `atsType: 'hreasily'`,
      applyUrl, LocationDto, descriptionFormat, extractEmails, datePosted YYYY-MM-DD).
    - Transport-failure vs HTTP-status distinction; never throws; `Logger` only.
  - **Estimate:** 1 day

## Phase 3 — Tests & spec triplet

- [x] T06 — E2E test (5 cases, tolerant of zero results)
  - **Files:** `__tests__/hreasily.e2e-spec.ts`
  - **Acceptance:** known tenant → array + shape-assert when non-empty; empty when no
    slug/url; resolve from `companyUrl`; unknown tenant → empty; respects `resultsWanted`;
    30000 ms timeouts on network tests.
  - **Estimate:** 0.5 day

- [x] T07 — Spec triplet
  - **Files:** `.specify/specs/426-source-ats-hreasily/{spec,plan,tasks}.md`
  - **Acceptance:** spec states rationale, surface, inputs, outputs, graceful-degradation
    contract; plan describes the fetch→parse→map pipeline; tasks checklist all done.
  - **Estimate:** 0.5 day

- [x] T08 — Typecheck verification
  - **Files:** (whole package)
  - **Acceptance:** `tsc --noEmit -p packages/plugins/source-ats-hreasily/tsconfig.json` is
    clean once the orchestrator-owned `Site.HREASILY` enum entry is present (verified by a
    temporary local enum injection during this run, then restored).
  - **Estimate:** 0.25 day

## Notes

- Tests are written alongside the implementation, not batched into a final task.
- Shared wiring (site enum, plugin index, base tsconfig, jest config) is owned by the
  orchestrator and intentionally untouched here.
- Surface is verified=false this run; once a live HReasily hiring tenant confirms the real
  host/path, update `hreasily.constants.ts` and flip verified=true.
