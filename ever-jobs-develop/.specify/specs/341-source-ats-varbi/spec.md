# Spec: 341 — Varbi ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 341                                           |
| Slug           | source-ats-varbi                              |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 338 (TalentAdore), 330 (Prescreen)            |

## 1. Problem Statement

Varbi (varbi.com, "Grade Varbi Recruit") is a Swedish recruitment / ATS platform
used by over 70 000 recruiters — especially Nordic universities and public-sector
employers (KTH, Lund University, Uppsala University, Stockholm University, Västra
Götalandsregionen, …). Every customer tenant publishes a branded, public,
unauthenticated career page on its own sub-domain
(`https://{tenant}.varbi.com/en/`) that lists every open role as a
server-rendered HTML table, with each role linking to a public job-ad page.
Ever Jobs has no adapter for Varbi-powered career pages, so these vacancies are
currently un-ingestable. A single generic, multi-tenant Varbi adapter unlocks the
full catalogue of Varbi-powered career pages with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-varbi` plugin that ingests vacancies
  from **any** Varbi-powered career page given a `companySlug` (the tenant
  sub-domain label, e.g. `kth`, `lu`, `uu`, `su`, `vgregion`) or a `companyUrl`
  (a career URL whose first sub-domain label is the tenant).
- Use the **public, anonymous** tenant career page (no auth, no API key) served
  at `https://{tenant}.varbi.com/en/`, enriching the full advert body from each
  role's public job-ad page (`…/what:job/jobID:{jobID}/`).
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'varbi'`, `department`).

## 3. Non-Goals

- Any authenticated Varbi Recruit admin / recruiter API.
- Server-side filtering by city / department / category. We ingest the tenant's
  full open-roles list and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of Varbi tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Varbi plugin at a tenant's
> career slug, so that I ingest that organisation's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Varbi adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant token from `companySlug` (preferred), or from the first sub-domain label of `companyUrl`. | must |
| FR-2  | Fetch the tenant career page (`GET https://{tenant}.varbi.com/en/`) and parse its open-roles table. | must |
| FR-3  | Parse each listing row's `jobID`, title, city, company/department and application-deadline cells.   | must     |
| FR-4  | De-duplicate vacancies by `atsId` (numeric `jobID`) within a single run.                            | must     |
| FR-5  | Map each vacancy to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl, employmentType). | must |
| FR-6  | Enrich the advert body from the per-role job-ad page and convert it per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the single-page listing; bound per-role detail fetches to the sliced set. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.               | must     |
| FR-9  | Tolerate unknown / dead tenants (HTTP 4xx) and parse failures without throwing (partial/empty OK).  | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public career page only          |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`; cap detail fetches |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.VARBI, name: 'Varbi', category: 'ats', isAts: true })
class VarbiService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, verified live 2026-06-03 against `kth`):

```
GET https://{tenant}.varbi.com/en/
  → HTML listing table, one <tr> per open role:
      <td class="…pos-title"><a href="…/what:job/jobID:935474/">Avtalskoordinator</a></td>
      <td class="…pos-town"><a href="…">Stockholm</a></td>
      <td class="…pos-subcompany">Kungliga Tekniska högskolan,  Verksamhetsstödet vid KTH</td>
      <td class="…pos-ends"><a href="…">2026-06-11</a></td>

GET https://{tenant}.varbi.com/en/what:job/jobID:{jobID}/
  → HTML job ad:
      <div class="job-desc mb">…full advert body HTML…</div>
      <meta property="og:description" content="…plain-text summary…">
      apply link → https://{tenant}.varbi.com/se/apply/positionquick/{jobID}/
```

Verified parsed shape → `JobPostDto` mapping (`kth`, KTH Royal Institute of
Technology, 2026-06-03):

| Parsed field                                  | JobPostDto field        | Notes                                                   |
| --------------------------------------------- | ----------------------- | ------------------------------------------------------- |
| `jobID` (numeric, from row link)              | `atsId`, `id`           | `id` is prefixed `varbi-{atsId}`                        |
| `pos-title` anchor text                       | `title`                 | required; row skipped if absent (header/chrome rows)    |
| `…/what:job/jobID:{jobID}/`                   | `jobUrl`                | absolute job-ad URL                                     |
| `…/apply/positionquick/{jobID}/`              | `applyUrl`              | reconstructed canonical apply URL                       |
| `job-desc` HTML (else `og:description` text)  | `description`           | format-converted (HTML / Markdown / Plain)              |
| `pos-ends` date                               | `datePosted`            | application deadline, `YYYY-MM-DD`                       |
| `pos-town` anchor text                        | `location.city`         | free-text town/city; state/country left unset           |
| town / title / sub-company / summary text     | `isRemote`              | `remote` / `distans` / `etätyö` / `work from home` / `wfh` |
| `pos-subcompany` trailing segment             | `department`            | trailing "{Org}, {Unit}" segment                        |
| (when surfaced on ad)                         | `employmentType`        | free-text label                                         |
| page `<title>` ("Vacancies at X")             | `companyName`           | boilerplate stripped; falls back to tenant-derived name |
| —                                             | `site`                  | constant `Site.VARBI`                                   |
| —                                             | `atsType`               | constant `'varbi'`                                      |
| `description` text                            | `emails`                | harvested via `extractEmails`                           |

Tenant resolution:

- `companySlug` (e.g. `kth`) → used verbatim as the `{tenant}` sub-domain label.
- `companyUrl` (e.g. `https://kth.varbi.com/en/`) → first non-`www` sub-domain
  label is the tenant; falls back to the trailing path segment.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unknown tenant (HTTP 4xx), empty career page, or zero listing rows |
| logged warn (HTTP 4xx)       | unknown/dead tenant or job ad — degrades to empty/partial, never throws |
| logged warn (parse failure)  | malformed markup / per-job map error — degrades to partial, never throws |

## 8. Test Plan

- E2E (`__tests__/varbi.e2e-spec.ts`): known tenant (`companySlug: 'kth'`)
  returns shaped jobs (`site === Site.VARBI`, `atsType === 'varbi'`,
  `atsId`/`jobUrl` defined); no-slug/url returns empty; unknown tenant degrades
  gracefully; `resultsWanted` is honoured; tenant resolvable from `companyUrl`.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-VB-1 — Custom vanity domains.** A few tenants front their career page with
  a custom domain instead of `{tenant}.varbi.com`. **Default (proceeding):**
  resolve via the `{tenant}.varbi.com` sub-domain (the canonical, universally
  served host); a caller may pass an explicit `companyUrl` whose first label is
  the tenant.
- **Q-VB-2 — Date semantics.** Varbi rows expose the *application deadline*, not
  an explicit publish date. **Default (proceeding):** map the deadline to
  `datePosted` (the only per-row date available); downstream consumers treat it
  as the role's salient date.
- **Q-VB-3 — Description language.** Tenants author ads in their own language
  (often Swedish) even on the `/en/` listing. **Default (proceeding):** accept
  whatever language the ad serves (no translation / language filter applied).
- **Q-VB-4 — Per-role detail cost.** The listing is one fetch; full advert
  bodies need one extra fetch per role. **Default (proceeding):** enrich only the
  already-sliced result set, capped at `VARBI_MAX_DETAIL_FETCHES` (100), to stay
  performance-minded.

## 10. Decisions

- D-1: Primary surface is the public, anonymous tenant career page at
  `https://{tenant}.varbi.com/en/`. Verified live 2026-06-03 against the KTH
  tenant (`kth`): HTTP 200 HTML listing 60 open roles, each row carrying the
  `…/what:job/jobID:{jobID}/` link plus `pos-title`, `pos-town`,
  `pos-subcompany` and `pos-ends` cells. **Confidence: verified** (byte-confirmed
  listing rows + job-ad bodies).
- D-2: The full advert body is enriched from each role's job-ad page
  (`…/what:job/jobID:{jobID}/`), parsed from the stable `<div class="job-desc">`
  block, with the `og:description` meta as a plain-text fallback. Verified live
  2026-06-03 against `kth.varbi.com/en/what:job/jobID:935474/` (≈ 6.5 KB markdown
  body).
- D-3: The richest structured fields come straight from the listing row
  (`jobID`, title, city, company/department, application deadline) so the listing
  alone yields a usable `JobPostDto` even if a detail fetch fails.
- D-4: Varbi does not expose a documented public JSON/RSS job feed; the
  server-rendered listing table is the authoritative public surface, so the
  adapter parses HTML with stable, cell-class-anchored regexes.
- D-5: The career page returns every open role in one response (no server-side
  pagination); the adapter fetches once and slices client-side to
  `resultsWanted`. De-dup is by `atsId` (numeric `jobID`).

## 11. References

- `packages/plugins/source-ats-varbi/` — implementation.
- Live surface verified 2026-06-03 (no authentication):
  - `https://kth.varbi.com/en/` (KTH, 60 open roles) — listing table.
  - `https://kth.varbi.com/en/what:job/jobID:935474/` — job ad with
    `<div class="job-desc">` body and apply link
    `https://kth.varbi.com/se/apply/positionquick/935474/`.
  - Other live tenants observed: `lu`, `su`, `uu`, `vgregion`, `sem`, `career`.
    Unknown sub-domains return HTTP 404.
