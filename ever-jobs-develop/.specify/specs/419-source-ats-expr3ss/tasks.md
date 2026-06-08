# Tasks: 419 — Expr3ss! ATS Source Adapter

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped
>
> Phase number: 428. All tasks below were implemented in this run.

## Phase 1 — Package scaffold

- [x] T01 — Create the plugin package skeleton
  - **Files:** `packages/plugins/source-ats-expr3ss/package.json`,
    `packages/plugins/source-ats-expr3ss/tsconfig.json`,
    `packages/plugins/source-ats-expr3ss/src/index.ts`,
    `packages/plugins/source-ats-expr3ss/src/expr3ss.module.ts`
  - **Acceptance:**
    - `package.json` is `@ever-jobs/source-ats-expr3ss` v0.1.0, `main`+`types` `src/index.ts`, MIT.
    - `tsconfig.json` extends the base and outputs to `dist/packages/source-ats-expr3ss`.
    - `index.ts` exports `{ Expr3ssModule }` and `{ Expr3ssService }`.
    - `Expr3ssModule` provides + exports `Expr3ssService`.
  - **Estimate:** 0.5 day

## Phase 2 — Surface model + constants

- [x] T02 — Encode the public board surface as constants
  - **Files:** `packages/plugins/source-ats-expr3ss/src/expr3ss.constants.ts`
  - **Acceptance:**
    - Root domain, tenant-origin / board / apply URL builders, default results cap (100),
      max-pages cap, `DEFAULT_TIMEOUT_SECONDS = 15`, default headers, JSON-LD + anchor + id +
      remote regexes.
    - Rich JSDoc header documenting the surface and a "Surface confidence" note (`verified=false`,
      dated 2026-06-04).
  - **Estimate:** 0.5 day

- [x] T03 — Model the wire + normalised shapes
  - **Files:** `packages/plugins/source-ats-expr3ss/src/expr3ss.types.ts`
  - **Acceptance:**
    - JSON-LD `JobPosting` interfaces (hiring org, postal address, job location) + apply-anchor
      interface, all fields optional / defensively narrowed.
    - A normalised internal `Expr3ssJob` interface.
  - **Estimate:** 0.5 day

## Phase 3 — Scraper service

- [x] T04 — Implement the fetch → parse → map pipeline
  - **Files:** `packages/plugins/source-ats-expr3ss/src/expr3ss.service.ts`
  - **Acceptance:**
    - `@SourcePlugin({ site: Site.EXPR3SS, name: 'Expr3ss', category: 'ats', isAts: true })` +
      `@Injectable` `Expr3ssService implements IScraper`.
    - Resolves tenant from `companySlug` or `companyUrl`; caps timeout to 15 s on both
      `timeout` and `requestTimeout`.
    - Probes board variants bounded by the page cap and `resultsWanted`; harvests JSON-LD +
      apply anchors; maps each role → `JobPostDto` (id `expr3ss-${atsId}`, `site: Site.EXPR3SS`,
      `atsType: 'expr3ss'`, `applyUrl`, `LocationDto`, description per `descriptionFormat`,
      emails via `extractEmails`, `datePosted` `YYYY-MM-DD`).
    - Never throws; distinguishes host-down from HTTP-status; dedups by ATS id; uses `Logger`.
  - **Estimate:** 1 day

## Phase 4 — E2E test

- [x] T05 — Add the e2e spec
  - **Files:** `packages/plugins/source-ats-expr3ss/__tests__/expr3ss.e2e-spec.ts`
  - **Acceptance:**
    - 5 tests mirroring the sibling: known tenant returns an array (shape-asserts only when
      non-empty); empty when no slug/url; resolve from `companyUrl`; unknown tenant → empty;
      respects `resultsWanted`.
    - Uses a real tenant slug (`cos`) as `KNOWN_TENANT`; tolerates zero results; 30 000 ms
      timeouts on network tests.
  - **Estimate:** 0.5 day

## Notes

- Tests are authored alongside the implementation (Phase 4 ships with the package), not batched.
- The four shared registries (site enum, plugin index, base tsconfig alias, jest mapper) are wired
  by the orchestrator, NOT in this package.
- Update `docs/log.md` with the completed work in the same commit.
