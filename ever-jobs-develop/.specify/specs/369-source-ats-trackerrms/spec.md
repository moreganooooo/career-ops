# Spec: 369 — TrackerRMS ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 369                                           |
| Slug           | source-ats-trackerrms                         |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 364 (PyjamaHR), 354 (Hireful)                 |

## 1. Problem Statement

TrackerRMS (Tracker / tracker-rms.com) is a staffing & recruiting ATS + CRM used by
recruitment agencies. Each tenant publishes its open roles to the public through
TrackerRMS's "Publish Jobs to your Website" / "Jobs+" integration, served by the
shared regional EVO Portal host and keyed by the tenant's TrackerRMS database name
(`https://evoportal{us|uk|ca}.tracker-rms.com/{database}/jobs?fields={csv}`). That
feed is a free, **unauthenticated**, server-rendered HTML fragment that tenants
embed in their own careers page. Ever Jobs has no adapter for TrackerRMS-powered
career boards, so these vacancies are currently un-ingestable. A single generic,
multi-tenant TrackerRMS adapter unlocks the full catalogue of TrackerRMS-powered
agency job boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-trackerrms` plugin that ingests vacancies
  from **any** TrackerRMS career feed given a `companySlug` (the TrackerRMS database
  name, e.g. `Tracker_PrecisionResources`) or a `companyUrl` (an EVO Portal feed /
  apply URL on a `tracker-rms.com` host, from which the database + region are
  extracted).
- Use the **public, anonymous** surface (no auth, no API key): the EVO Portal job
  feed (`/{database}/jobs?fields={csv}`), parsing the server-rendered `<li>` role
  blocks for the title, the apply link (and its `jobcode` reference), and the role
  body.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'trackerrms'`, `employmentType`).

## 3. Non-Goals

- Any authenticated TrackerRMS API (the documented `createResourceFromResume` /
  `attachDocument` recruiter API). This plugin consumes only the public,
  candidate-facing job feed.
- Server-side filtering by reference / location / worktype (the feed supports
  `filters=`). We ingest the tenant's full open-roles feed and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of TrackerRMS tenant databases (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the TrackerRMS plugin at a tenant's
> database name, so that I ingest that agency's full open-roles feed without writing
> a bespoke scraper.

> As a **plugin host**, I want the TrackerRMS adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant database + region from `companySlug` (used directly as the database, default region `us`) or from a `companyUrl` on a `tracker-rms.com` EVO Portal host (database from the first path segment, region from the `evoportal{xx}` host label). | must |
| FR-2  | Fetch the public HTML feed (`GET /{database}/jobs?fields={csv}`) once and split it into per-role `<li>` blocks (bounded by a hard item ceiling). | must |
| FR-3  | Parse each block: heading → title, anchor → apply URL + `jobcode` reference (used as `atsId`), remaining markup → description, labelled free-text → location / worktype. | must |
| FR-4  | De-duplicate roles by `atsId` within a single run.                                                   | must     |
| FR-5  | Map each role to `JobPostDto` (title, url, location, employmentType, remote, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by stopping once collected.                          | must     |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (empty feed / HTTP 4xx), network errors, and malformed / partial blocks without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public EVO Portal HTML feed      |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; item cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.TRACKERRMS, name: 'TrackerRMS', category: 'ats', isAts: true })
class TrackerRmsService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface observed live 2026-06-03):

```
GET https://evoportal{us|uk|ca}.tracker-rms.com/{database}/jobs?fields=reference,title,location,worktype,salary,description,linkregister
  → text/html fragment, one <li> block per open role, e.g.:
      <li>
        <h4>Certificate Management Platform (CMP) Administrator</h4>
        <p>… role body / responsibilities / requirements (HTML) …</p>
        <p>Location: Birmingham, AL</p>
        <a href="https://evoportalus.tracker-rms.com/PrecisionResources/apply?jobcode=JOB-1296">Click to Apply</a>
      </li>

Apply / candidate-registration URL (the `linkregister` field):
  https://evoportal{us|uk|ca}.tracker-rms.com/{database}/apply?jobcode={reference}
```

Wire shape → `JobPostDto` mapping:

| Source (parsed from `<li>` block)                   | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `jobcode` from apply link (else `reference` token)  | `atsId`, `id`           | `id` is prefixed `trackerrms-{atsId}`; role skipped if absent |
| heading (`<h1>`–`<h6>`)                             | `title`                 | required; role skipped if absent                            |
| apply link (`linkregister`) / built `/apply?jobcode=…` | `jobUrl`, `applyUrl` | absolute apply / candidate-registration URL                 |
| block body (markup minus heading + anchor)          | `description`           | format-converted (HTML / Markdown / Plain)                  |
| labelled `Location:` free-text                      | `location`              | split into city / state / country; null when none usable    |
| title / location / worktype text                    | `isRemote`              | remote detection (`remote` / `wfh` / `work from home` …)    |
| labelled `Worktype:` / `Type:` free-text            | `employmentType`        | token normalised to a readable, title-cased label           |
| database name (de-prefixed, de-slugified, title-cased) | `companyName`        | the feed carries no separate brand name                     |
| —                                                   | `site`                  | constant `Site.TRACKERRMS`                                  |
| —                                                   | `atsType`               | constant `'trackerrms'`                                     |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `Tracker_PrecisionResources`) → used directly as the database
  name; default region `us`.
- `companySlug` containing a feed/apply URL / `tracker-rms.com` host → the database +
  region are extracted from the URL.
- `companyUrl` on a `tracker-rms.com` EVO Portal host
  (`evoportal{us|uk|ca}.tracker-rms.com/{database}/jobs|apply`) → the database is the
  first path segment and the region the `evoportal{xx}` host label.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable database, unknown tenant (empty feed / HTTP 4xx), or no roles |
| logged warn (HTTP 4xx)       | unknown / wrong-region tenant — degrades to empty, never throws           |
| logged warn (parse failure)  | malformed block or per-role map error — partial, never throws             |

## 8. Test Plan

- E2E (`__tests__/trackerrms.e2e-spec.ts`): known tenant
  (`companySlug: 'Tracker_PrecisionResources'`) returns shaped jobs
  (`site === Site.TRACKERRMS`, `atsType === 'trackerrms'`, `atsId`/`jobUrl` defined);
  `companyUrl` resolution path exercised; no-slug/url returns empty; unknown tenant
  degrades gracefully; `resultsWanted` honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`). 30000 ms timeouts on network
  tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-TR-1 — Custom careers domains.** Tenants embed the feed into their own careers
  page (via iframe / single line of HTML), so the candidate-visible domain is often
  the agency's own. **Default (proceeding):** address a tenant by its TrackerRMS
  database name on the canonical EVO Portal host (the stable public key); a caller may
  pass a full `companyUrl` on a `tracker-rms.com` host to derive the database + region.
  Bespoke embed domains are deferred to the source-adoption backlog.
- **Q-TR-2 — Region selection.** The EVO Portal is regional
  (`evoportalus` / `evoportaluk` / `evoportalca`) and a database lives in exactly one.
  **Default (proceeding):** default to `us`; a `companyUrl` carries the correct region
  in its host label.
- **Q-TR-3 — Field layout drift.** The `<li>` column set is tenant-configured, so the
  rendered fields (and their order / labels) vary. **Default (proceeding):** request a
  broad field set and parse each block heuristically — title from the heading,
  reference from the apply link's `jobcode`, body from the residual markup, and
  location / worktype from labelled free-text — treating every value as best-effort.

## 10. Decisions

- D-1: Primary surface is the public, anonymous EVO Portal job feed
  (`https://evoportal{us|uk|ca}.tracker-rms.com/{database}/jobs?fields={csv}`), a
  server-rendered HTML `<ul><li>…</li></ul>` fragment — one `<li>` per open role —
  whose `linkregister` field renders the per-role apply URL
  (`/{database}/apply?jobcode={reference}`). **Confidence: defensive (verified=false)**
  — the platform, the regional host shape, the tenant addressing, and the apply-URL
  shape were observed live 2026-06-03 against the named real tenant
  `Tracker_PrecisionResources` (Precision Resources, a US staffing firm), but the
  exact, stable per-field DOM contract across tenants is tenant-configurable and not
  guaranteed, so the parser is fully defensive.
- D-2: There is no public JSON job API on the EVO Portal; the documented no-auth
  surface is the "Publish Jobs to your Website" HTML feed, which is used here.
- D-3: The richest fields recoverable per role are the heading (title), the apply
  link + its `jobcode` (the stable per-role TrackerRMS reference / ATS id), the block
  body (HTML description), and labelled free-text for location / worktype.
- D-4: The feed is a single document (no server-side pagination); the adapter fetches
  once, splits into `<li>` blocks (bounded by an item cap), dedupes by `atsId`, and
  slices to `resultsWanted` client-side.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); every block is parsed with defensive
  narrowing so a missing field, a malformed block, or layout drift never throws.

## 11. References

- `packages/plugins/source-ats-trackerrms/` — implementation.
- Surface observed live 2026-06-03 (no authentication):
  - Platform + tenant addressing
    `https://evoportal{us|uk|ca}.tracker-rms.com/{database}/jobs?fields={csv}`,
    confirmed with the named real tenant `Tracker_PrecisionResources` (Precision
    Resources) whose feed renders live `<li>` role blocks with apply links of the
    form `…/PrecisionResources/apply?jobcode=…`.
  - The feed is server-rendered HTML whose per-field DOM layout is tenant-configured;
    the adapter parses it defensively (verified=false).
