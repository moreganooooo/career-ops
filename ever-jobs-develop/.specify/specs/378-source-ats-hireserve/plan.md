# Plan: 378 — Hireserve ATS Source Plugin

| Field         | Value                      |
| ------------- | -------------------------- |
| Spec          | spec.md                    |
| Created       | 2026-06-03                 |
| Last updated  | 2026-06-03                 |
| Status        | done                       |
| Owner         | scheduled-agent            |
| Supersedes    | (none)                     |
| Related specs | 377 (Oleeo), 369 (TrackerRMS) |

## Surface chosen

Public, anonymous, server-rendered Hireserve "wd_portal" careers portal. A tenant
portal is addressed by a host plus a numeric `p_web_site_id`:

- Hosts: `{tenant}.hireserve-projects.com` (production), `{tenant}.hireserve-test.com`
  (staging), and the shared `ats8.hireserve.com`.
- Enumeration: `GET {host}/wd/plsql/wd_portal.list?p_web_site_id={id}&p_function=map&p_title=Current+Vacancies`
  renders the full current-vacancies set as `/vacancy/{slug}-{ID}.html` anchors.
- Detail: the pretty `/vacancy/{slug}-{ID}.html` URL 301-redirects to
  `wd_portal.show_job?p_web_site_id={id}&p_web_page_id={ID}&p_lang=DEFAULT` and
  renders a server-side detail page.

Verified live 2026-06-03 against `university.hireserve-projects.com` (site id 2624,
14 open roles). Rejected alternatives: there is no public JSON / RSS / sitemap feed,
and the portal carries no schema.org JSON-LD — so the listing HTML is the documented
no-auth surface.

## Parse strategy

1. **Resolve target** → `{ origin, siteId, tenant }`:
   - `companyUrl` on a Hireserve host carrying `p_web_site_id` → origin + site id.
   - `companySlug` `{host}:{siteId}` / `{tenant}:{siteId}` → origin (tenant label
     expands to `{tenant}.hireserve-projects.com`) + site id.
   - `companySlug` as a full URL → parsed like `companyUrl`.
   - No host+siteId pair → null → empty result.
2. **Enumerate** the listing HTML: run `HIRESERVE_VACANCY_LINK_REGEX` over the
   document, capturing the title slug + trailing numeric `{ID}` (the `p_web_page_id`).
   Recover the title from the anchor text (and a bounded card window for any
   location / work-type line). De-dup by `{ID}`; stop at `resultsWanted`; page cap
   guards future pagination.
3. **Fetch detail** per role (best-effort, `Promise.allSettled` fan-out): parse
   title (`og:title` / `<title>`), body region, and labelled lines (Location,
   Employment/Contract Type, Salary, Department/Category, Closing Date) — all
   defensive. A detail fetch failure falls back to the listing-level fields.
4. **Normalise + map** each role to `JobPostDto`.

## Normalisation mapping

See spec §7.1. Highlights: `atsId` = `p_web_page_id`; `jobUrl`/`applyUrl` = the
pretty `/vacancy/{slug}-{ID}.html`; `description` from the detail body (format
-converted) with the location line as fallback; `employmentType` token title-cased;
location free-text split into city/state/country; `companyName` de-slugged from the
tenant label; `emails` harvested from the description.

## Error handling

- No slug/url, or no resolvable host+siteId target → empty `JobResponseDto`.
- HTTP 4xx / "Unauthorised" / DNS / malformed body → logged warn, empty/partial, no
  throw (`fetchHtml` returns null).
- Per-role failures isolated via `Promise.allSettled`; `scrape()` wraps the run in a
  try/catch returning partial results. `this.logger` only — never `console.log`.

## File list

- `packages/plugins/source-ats-hireserve/package.json`
- `packages/plugins/source-ats-hireserve/tsconfig.json`
- `packages/plugins/source-ats-hireserve/src/index.ts`
- `packages/plugins/source-ats-hireserve/src/hireserve.constants.ts`
- `packages/plugins/source-ats-hireserve/src/hireserve.types.ts`
- `packages/plugins/source-ats-hireserve/src/hireserve.module.ts`
- `packages/plugins/source-ats-hireserve/src/hireserve.service.ts`
- `packages/plugins/source-ats-hireserve/__tests__/hireserve.e2e-spec.ts`
- `.specify/specs/378-source-ats-hireserve/{spec.md,plan.md,tasks.md}`

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator.
