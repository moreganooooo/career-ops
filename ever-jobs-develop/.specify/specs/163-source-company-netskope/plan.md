# Plan: 163 — Source Company Plugin: Netskope

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Netskope's careers board is hosted on Greenhouse at the slug
`netskope`, but Greenhouse emits `absolute_url` as a vanity-
domain shape `https://www.netskope.com/company/careers/open-positions/?gh_jid=<id>`
— a previously-unobserved 3-segment path. Mirror Alma (Spec
152) byte-for-byte except for the D-04 sub-axis.

**One structural deviation** from Alma — D-04 sub-axis
(variant 2 → new variant 43, first cohort observation).
**46th distinct wire-shape variant** in the company-direct
cohort.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged
  green; CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-netskope`              | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `NETSKOPE = 'netskope'` (Phase 173).                             |
| `packages/plugins/index.ts`                             | import + register `NetskopeModule` in `ALL_SOURCE_MODULES`.             |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-netskope`.                        |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `netskope` row as shipped.                                         |
| `docs/index.md` / `docs/log.md`                         | run-#373 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Variant 43 vanity-domain `absolute_url` may not be guaranteed-resolvable for all listing IDs. | Fallback `jobUrl` constructor defaults to canonical Greenhouse variant-2 form when `absolute_url` is missing — same strategy as Klaviyo / Bird / Collective Health. |
