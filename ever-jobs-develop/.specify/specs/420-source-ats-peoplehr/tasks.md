# Tasks: 420 — Access PeopleHR ATS Source Adapter

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

> Phase: 429

## Phase 1 — Live surface research

- [x] T01 — Confirm the public, anonymous PeopleHR candidate-facing surface
  - **Files:** (research only)
  - **Acceptance:**
    - Tenant board URL pattern confirmed: `https://{tenant}.peoplehr.net/JobBoard`.
    - Opening-row HTML shape confirmed: `tr[data-url="/Pages/JobBoard/Opening.aspx?v={GUID}"]`
      with `lblVacancyName` / `lblLocation` / `lblDepartment` spans + a `lblCompanyName` display name.
    - Vacancy GUID confirmed as the stable ATS id; canonical detail URL is `Opening.aspx?v={GUID}`.
    - At least one live tenant verified (`efigroup`, plus `kpmg`, `britishcanoeing`, `benburgess`,
      `scottishwoodlandsltd`).
  - **Estimate:** 0.5 day

## Phase 2 — Package scaffold

- [x] T02 — Scaffold the plugin package
  - **Files:** `packages/plugins/source-ats-peoplehr/package.json`, `tsconfig.json`,
    `src/index.ts`, `src/peoplehr.module.ts`
  - **Acceptance:**
    - `package.json` named `@ever-jobs/source-ats-peoplehr`, version 0.1.0, MIT, main+types
      `src/index.ts`.
    - `tsconfig.json` extends the base config with outDir `../../../dist/packages/source-ats-peoplehr`.
    - `index.ts` exports `PeopleHrModule` and `PeopleHrService`.
    - `PeopleHrModule` provides + exports `PeopleHrService`.
  - **Estimate:** 0.5 day

## Phase 3 — Constants, types, service

- [x] T03 — Author constants + wire-shape / normalised types
  - **Files:** `src/peoplehr.constants.ts`, `src/peoplehr.types.ts`
  - **Acceptance:**
    - Root domain, board path, opening path, URL builders, GUID regex, default results cap (100),
      max-pages cap, `DEFAULT_TIMEOUT_SECONDS = 15`, default headers, remote regex.
    - Rich JSDoc header documenting the surface + a "Surface confidence" note (verified true,
      2026-06-04).
    - `PeopleHrBoardRow` (wire shape, all optional) + `PeopleHrJob` (normalised internal role).
  - **Estimate:** 0.5 day

- [x] T04 — Implement the scraper service
  - **Files:** `src/peoplehr.service.ts`
  - **Acceptance:**
    - `@SourcePlugin({ site: Site.PEOPLEHR, name: 'Access PeopleHR', category: 'ats', isAts: true })`
      + `@Injectable` implementing `IScraper`.
    - Resolves tenant from `companySlug` / `companyUrl`; caps timeout to 15 s on both keys.
    - Fetches the single board page; distinguishes transport failure from HTTP-status error.
    - Parses every opening row; maps each → `JobPostDto` (id `peoplehr-{guid}`, `site`,
      `atsType: 'peoplehr'`, `applyUrl`, `LocationDto`, `descriptionFormat`, `extractEmails`).
    - Dedups by vacancy GUID; honours `resultsWanted`; never throws; uses `Logger`.
  - **Estimate:** 1 day

## Phase 4 — E2E test

- [x] T05 — Author the e2e spec
  - **Files:** `__tests__/peoplehr.e2e-spec.ts`
  - **Acceptance:**
    - 5 tests mirroring the sibling adapter: known tenant returns array & shape-asserts when
      non-empty; empty when no slug/url; resolve from `companyUrl`; unknown tenant → empty;
      respects `resultsWanted`.
    - Uses a real tenant (`efigroup`) as `KNOWN_TENANT`; tolerates zero results; 30000 ms network
      timeouts.
  - **Estimate:** 0.5 day

## Notes

- Write tests alongside each implementation task; do not batch testing into a final task.
- Update `docs/log.md` with each completed task in the same commit.
- Shared wiring files (site enum, plugin index, base tsconfig, jest config) are owned by the
  orchestrator and are intentionally untouched here.
