# Plan: 115 — Source Company Plugin: Okta

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Okta's careers board is hosted on Greenhouse at the slug
`okta`. Mirror Fastly (Spec 113) byte-for-byte — Fastly is
the closest behavioural cousin sharing four axes: D-08 + D-09
case-symmetric + D-10 applied + D-11 omitted, and the closest
D-04 sister (both variants are HTTPS-scheme `www.`-prefixed
brand-domain forms).

**One structural deviation** from Fastly:

1. **D-04 wire-shape variant 31** — HTTPS-scheme `www.`-prefixed
   brand-domain `/company/careers/opportunity/<id>` id-in-path
   + gh_jid query — first cohort observation. Fastly variant
   30 has query-only id with `/about/jobs/apply` path; Okta
   variant 31 has id-in-path + gh_jid query with
   `/company/careers/opportunity/<id>` path. The plugin emits
   `listing.absolute_url` byte-for-byte; fallback uses
   canonical Greenhouse variant-2.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-okta`                  | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `OKTA = 'okta'` (Phase 125).                              |
| `packages/plugins/index.ts`                             | import + register `OktaModule` in `ALL_SOURCE_MODULES`.         |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-okta`.                    |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `okta` row as shipped.                                     |
| `docs/index.md` / `docs/log.md`                         | run-#325 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Variant 31 URL never seen — id-in-path + gh_jid dual-id form is regression risk on URL-shape downstream consumers. | Pinned in fixture + asserted byte-for-byte. |
| Suffix-numeric-ID dept naming may surprise downstream consumers expecting clean names. | D-11 pass-through pins the byte-for-byte form. |
