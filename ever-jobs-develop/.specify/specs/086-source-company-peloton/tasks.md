# Tasks: 086 — Source Company Plugin: Peloton

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.PELOTON = 'peloton'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:** New `PELOTON = 'peloton'` line under a `// Phase 96: Spec 086 — …` header.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-peloton` package
  - **Files:**
    - `packages/plugins/source-company-peloton/package.json`
    - `packages/plugins/source-company-peloton/tsconfig.json`
    - `packages/plugins/source-company-peloton/src/index.ts`
    - `packages/plugins/source-company-peloton/src/peloton.module.ts`
    - `packages/plugins/source-company-peloton/src/peloton.service.ts`
  - **Acceptance:** Mirrors `source-company-marqeta` with the
    `marqeta`/`Marqeta` → `peloton`/`Peloton` substitutions, the
    inline doc-comment narrative, AND the **D-04 variant-21
    fallback URL** swap from the canonical Greenhouse variant-2
    form to the canonical Greenhouse variant-2 fallback (note:
    the **wire** `absolute_url` is variant 21, but the
    **fallback** constructor uses variant 2 — same as ClassPass /
    Spec 067 precedent). `PelotonService` decorated
    `@SourcePlugin({ site: Site.PELOTON, name: 'Peloton',
    category: 'company' })`. Wire-title `.trim()` applied (D-10),
    wire-departments NOT trimmed (D-11 omitted).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:** `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** Place `PelotonModule` directly **after**
    `OpenAIModule` and **before** `PinterestModule` (`Ope` <
    `Pel` < `Pin`).
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-peloton/__tests__/peloton.service.spec.ts`
    - `packages/plugins/source-company-peloton/__tests__/fixtures/peloton-jobs.json`
  - **Acceptance:** ≥ 8 cases. Happy-path test asserts
    **D-04 variant-21 wire-shape pass-through** — emitted `jobUrl`
    contains `careers.onepeloton.com/en/all-jobs/?gh_jid=` AND
    does NOT contain `job-boards.greenhouse.io` (locking the
    variant-21 host AND absence of canonical-Greenhouse-host
    substring); AND **D-10 application lock with trailing-padded
    form** — emitted `title` for the padded listing equals
    trimmed form `'Senior Full Stack Software Engineer, Device
    Services'` AND byte-distinct from wire form (with trailing
    pad byte) AND exactly **1 byte shorter** (locking the
    trailing-pad observable; Peloton's 3.85 % pad rate is the
    **new cohort low**). All 8 cases green in 11.104 s.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:** `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md`
  - **Estimate:** 10 min.

## Notes

- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03.
- Cross-regression sweep (helpers + Marqeta + New Relic + Maven
  Clinic + Fivetran + Bitwarden + Calendly) **125/125 green in
  19.948 s** — no parser-level regressions introduced by the
  Peloton plugin landing.
