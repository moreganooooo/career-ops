# Plan: 128 — Source Company Plugin: Dremio

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Dremio's careers board is hosted on Greenhouse at the slug
`dremio`. Mirror Fastly (Spec 113) — Fastly is the closest
behavioural cousin sharing four axes: D-08 + D-09 case-
symmetric + D-10 applied + D-11 omitted, AND the closest
D-04 sister (HTTPS + www + query-only-id form).

**One structural deviation** from Fastly:

1. **D-04 wire-shape variant 33** — HTTPS-scheme `www.`-prefixed
   brand-domain `/careers/job-postings/` query-only-id (first
   cohort observation; sister to Fastly's variant 30
   `/about/jobs/apply`). Same scheme + www + query-only-id
   pattern; different path with trailing slash.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-dremio`                | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `DREMIO = 'dremio'` (Phase 138).                         |
| `packages/plugins/index.ts`                             | import + register `DremioModule` in `ALL_SOURCE_MODULES`.       |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-dremio`.                  |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `dremio` row as shipped.                                   |
| `docs/index.md` / `docs/log.md`                         | run-#338 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Variant 33 path with trailing slash is a first-cohort observation. | Pinned in fixture + asserted byte-for-byte. |
| Sentence-style catchall dept name `'Unsure what to apply for? ...'` may surprise downstream consumers. | D-11 pass-through is byte-for-byte; observability noted. |
