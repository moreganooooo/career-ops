# Tasks: 424 — CVWarehouse ATS Source Adapter

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped
>
> Phase number: 433 — all tasks implemented in this run.

## Phase 1 — Package scaffold

- [x] T01 — Scaffold the plugin package skeleton
  - **Files:** `packages/plugins/source-ats-cvwarehouse/package.json`,
    `packages/plugins/source-ats-cvwarehouse/tsconfig.json`,
    `packages/plugins/source-ats-cvwarehouse/src/index.ts`,
    `packages/plugins/source-ats-cvwarehouse/src/cvwarehouse.module.ts`
  - **Acceptance:** `package.json` named `@ever-jobs/source-ats-cvwarehouse` v0.1.0 (main+types
    `src/index.ts`, MIT); `tsconfig.json` extends base with `outDir`
    `../../../dist/packages/source-ats-cvwarehouse`; `index.ts` exports `CvWarehouseModule` +
    `CvWarehouseService`; module provides + exports the service.
  - **Estimate:** 0.5 day

## Phase 2 — Surface constants & types

- [x] T02 — Encode the verified public surface as constants
  - **Files:** `packages/plugins/source-ats-cvwarehouse/src/cvwarehouse.constants.ts`
  - **Acceptance:** root domain, board host / origin, company-GUID + lang params, URL builders
    (board / job / apply), `CVWAREHOUSE_DEFAULT_RESULTS = 100`, `CVWAREHOUSE_MAX_PAGES`,
    `CVWAREHOUSE_DEFAULT_TIMEOUT_SECONDS = 15`, default headers, remote regex, EU country-code
    map; rich JSDoc header with a "Surface confidence" note (verified=true, 2026-06-04).
  - **Estimate:** 0.5 day

- [x] T03 — Model the wire + normalised shapes
  - **Files:** `packages/plugins/source-ats-cvwarehouse/src/cvwarehouse.types.ts`
  - **Acceptance:** `CvWarehouseListingRow`, `CvWarehouseBoard`, and the normalised
    `CvWarehouseJob` interfaces; every read field optional + defensively narrowed.
  - **Estimate:** 0.5 day

## Phase 3 — Service implementation

- [x] T04 — Implement the scraper service
  - **Files:** `packages/plugins/source-ats-cvwarehouse/src/cvwarehouse.service.ts`
  - **Acceptance:** `@SourcePlugin({ site: Site.CVWAREHOUSE, name: 'CVWarehouse', category: 'ats',
    isAts: true })` + `@Injectable` `CvWarehouseService implements IScraper`; resolves GUID from
    `companySlug` / `companyUrl`; caps timeout to 15s on both `timeout` and `requestTimeout`;
    GETs the board once, parses role anchors + sibling detail blocks with cheerio; maps each role
    → `JobPostDto` (id `cvwarehouse-{atsId}`, `site: Site.CVWAREHOUSE`, `atsType: 'cvwarehouse'`,
    `applyUrl`, `LocationDto`, description via `descriptionFormat`, emails via `extractEmails`);
    dedupes by ATS id; distinguishes transport failure from HTTP status; never throws; uses
    `Logger` (no `console.log`).
  - **Estimate:** 1 day

## Phase 4 — E2E test

- [x] T05 — Author the e2e spec
  - **Files:** `packages/plugins/source-ats-cvwarehouse/__tests__/cvwarehouse.e2e-spec.ts`
  - **Acceptance:** 5 tests mirroring the sibling adapter — known tenant returns an array
    (shape-asserts only when non-empty); empty when no slug/url; resolve from `companyUrl`;
    unknown tenant → empty; respects `resultsWanted`. Tolerates zero results; 30000ms network
    timeouts; uses a real verified tenant GUID as `KNOWN_TENANT`.
  - **Estimate:** 0.5 day

## Notes

- Write tests alongside each implementation task; do not batch testing into a final task.
- Update `docs/log.md` with each completed task in the same commit.
- Shared wiring (site enum, plugin registry, base tsconfig, jest mapper) is owned by the
  orchestrator and intentionally not edited here.
