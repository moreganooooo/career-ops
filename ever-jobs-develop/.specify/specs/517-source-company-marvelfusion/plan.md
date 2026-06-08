# Plan: 517 — Source Company Plugin: Marvel Fusion

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-06-03 |
| Last updated | 2026-06-03 |

## 1. Approach

Marvel Fusion's careers board is hosted on Greenhouse at the slug
`marvelfusion`. This plugin mirrors the canonical variant-2 + D-08
company-direct template: fetch
`https://api.greenhouse.io/v1/boards/marvelfusion/jobs?content=true`,
map each listing to a `JobPostDto`, pass the wire `company_name`
through, defensively `.trim()` titles and department names, and run
descriptions through the entity-decode-then-tag-strip pipeline. All
transport errors are swallowed so the aggregator sees an empty result
rather than an exception.

## 2. Phases

### Phase 1 — Scaffold + register + test

- Goal: a registered, tested `source-company-marvelfusion` plugin.
- Deliverables: package files, `Site.MARVEL_FUSION` enum value, the
  four wiring registrations, and a ≥ 9-case unit suite against a
  3-listing fixture.
- Exit criteria: `jest` green for the new suite; docs + CI green.

## 3. Packages Touched

- `packages/plugins/source-company-marvelfusion` (new)
- `packages/models/src/enums/site.enum.ts` (enum value)
- `packages/plugins/index.ts` (barrel registration)
- `tsconfig.base.json` + `jest.config.js` (path alias + mapper)
