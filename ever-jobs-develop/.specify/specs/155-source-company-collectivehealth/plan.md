# Plan: 155 — Source Company Plugin: Collective Health

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Collective Health's careers board is hosted on Greenhouse at
the slug `collectivehealth`. Mirror Cribl (Spec 143) byte-
for-byte — Cribl is the closest behavioural cousin sharing
three primary axes: D-08 + D-10 omitted + D-11 omitted.

**Two structural deviations** from Cribl:
- **D-04 sub-axis**: variant 38 → variant 42 first cohort
  observation (`jobs.collectivehealth.com/apply/?gh_jid=<id>`
  `jobs.` subdomain `/apply/` query-only-id form). **45th
  distinct wire-shape variant**. **First cohort observation
  of `jobs.` subdomain prefix**.
- **D-09 sub-axis**: case-symmetric → internal-whitespace
  asymmetric (`'Collective Health'` 17 bytes vs slug
  `collectivehealth` 16 bytes). **9th cohort observation of
  internal-whitespace D-09 asymmetry case**.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                       | Change                                                                  |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-collectivehealth`            | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                      | append `COLLECTIVEHEALTH = 'collectivehealth'` (Phase 165).             |
| `packages/plugins/index.ts`                                   | import + register `CollectiveHealthModule` in `ALL_SOURCE_MODULES`.     |
| `tsconfig.base.json`                                          | path alias `@ever-jobs/source-company-collectivehealth`.                |
| `jest.config.js`                                              | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                             | mark `collectivehealth` row as shipped.                                 |
| `docs/index.md` / `docs/log.md`                               | run-#365 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Wire `absolute_url` may flip from variant-42 `jobs.` subdomain to canonical Greenhouse subdomain mid-quarter without notice. | Plugin emits `listing.absolute_url` byte-for-byte; the **fallback** `jobUrl` constructor defaults to the canonical Greenhouse variant-2 form rather than reconstructing the `jobs.` subdomain shape. |
