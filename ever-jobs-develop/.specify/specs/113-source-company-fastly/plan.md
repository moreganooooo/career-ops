# Plan: 113 — Source Company Plugin: Fastly

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Fastly's careers board is hosted on Greenhouse at the slug
`fastly`. Mirror Squarespace (Spec 088) byte-for-byte —
Squarespace is the closest behavioural cousin sharing four
axes: D-08 + D-09 case-symmetric + D-10 applied + D-11
omitted, and is the only prior cohort plugin to use a
`/about/`-ancestor path-segment in the wire URL.

**One structural deviation** from Squarespace:

1. **D-04 wire-shape variant 30 — HTTPS-scheme `www.`-prefixed
   brand-domain `/about/jobs/apply` query-only-id — first
   cohort observation.** Squarespace publishes its
   `absolute_url` on
   `http://www.squarespace.com/about/careers?gh_jid=<id>`
   (variant 22, HTTP); Fastly's tenant publishes
   `https://www.fastly.com/about/jobs/apply?gh_jid=<id>` —
   variant 30, HTTPS sister with a different path
   (`/about/jobs/apply` rather than `/about/careers`). The
   plugin emits `listing.absolute_url` byte-for-byte; fallback
   uses canonical Greenhouse variant-2.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-fastly`                | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `FASTLY = 'fastly'` (Phase 123).                         |
| `packages/plugins/index.ts`                             | import + register `FastlyModule` in `ALL_SOURCE_MODULES`.       |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-fastly`.                  |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `fastly` row as shipped.                                   |
| `docs/index.md` / `docs/log.md`                         | run-#323 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Variant 30 URL never seen — regression risk on any URL-shape downstream consumer. | Pinned in fixture + asserted byte-for-byte. |
| Trailing-pad title may rotate off the wire.         | D-10 lock pinned via fixture; cross-regression covers cohort. |
