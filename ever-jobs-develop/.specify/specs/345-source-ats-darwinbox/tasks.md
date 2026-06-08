# Tasks: 345 — Darwinbox ATS Source Plugin

## Research
- [x] Confirm the public Darwinbox careers surface (`{tenant}.darwinbox.in/ms/candidate/careers`).
- [x] Identify the candidate-API base (`/ms/candidateapi/`) from the SPA bundle.
- [x] Byte-confirm the `{status,data}` API envelope (`GET /ms/candidateapi/getCompanyDetails` → 404 JSON).
- [x] Note the Cloudflare bot gate limiting anonymous job-list access → `verified: false`.
- [x] Capture a known public tenant for tests (`dbox`).

## Package scaffold
- [x] `package.json` (`@ever-jobs/source-ats-darwinbox`, v0.1.0, main/types `src/index.ts`, MIT).
- [x] `tsconfig.json` (extends base, outDir `dist/packages/source-ats-darwinbox`).
- [x] `src/index.ts` re-exports `DarwinboxModule` + `DarwinboxService`.

## Implementation
- [x] `src/darwinbox.constants.ts` — host templates, careers/api paths, job-list path list, headers, results cap, verified-research doc comment (2026-06-03).
- [x] `src/darwinbox.types.ts` — defensive `DarwinboxApiResponse` / `DarwinboxJobListData` / `DarwinboxJob` (snake_case + camelCase aliases).
- [x] `src/darwinbox.module.ts` — `@Module` providers/exports `[DarwinboxService]`.
- [x] `src/darwinbox.service.ts` — `@SourcePlugin` + `@Injectable` `IScraper`:
  - [x] tenant resolution from `companySlug` / `companyUrl`.
  - [x] live-host resolution across `.darwinbox.in` / `.darwinbox.com`.
  - [x] candidate-API job fetch (multi-path, envelope extraction).
  - [x] `JobPostDto` mapping (`darwinbox-{atsId}`, location, description, emails, remote, department, employmentType, applyUrl).
  - [x] description format conversion (HTML / Markdown / Plain).
  - [x] de-dup by `atsId`; slice to `resultsWanted`.
  - [x] graceful degradation (no throw; 403 bot gate + 4xx + parse errors → empty/partial).

## Tests
- [x] `__tests__/darwinbox.e2e-spec.ts` — known tenant, empty-input, unknown-tenant, resultsWanted; network-tolerant; 30000 ms timeouts.

## Docs
- [x] `spec.md`, `plan.md`, `tasks.md` under `.specify/specs/345-source-ats-darwinbox/`.

## Wiring (orchestrator — out of this plugin's scope)
- [x] `Site.DARWINBOX` enum entry.
- [x] `ALL_SOURCE_MODULES` registration.
- [x] `tsconfig.base.json` path alias.
- [x] `jest.config.js` moduleNameMapper entry.
