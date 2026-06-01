# Mode: scan — Portal Scanner (Job Discovery)

Scans configured job portals, filters by title relevance, and adds new offers to the pipeline for later evaluation.

> **Note (v1.6+):** The default scanner (`scan.mjs` / `npm run scan`) is **zero-token** and uses structured sources: local parsers configured per company and public APIs from Greenhouse, Ashby, and Lever. The levels with Playwright/WebSearch described below are the **agent** flow, not what `scan.mjs` does. If a company has no local parser or supported API, `scan.mjs` will ignore it; in those cases, the agent must complete Level 1 or Level 3 manually.
>
> **Rule (v1.8+):** If a company's local parser succeeds in Level 0, the agent **must not** repeat that company in Playwright (Level 1) or API (Level 2). In Level 3, general queries remain active, but results from companies already covered by a successful parser are discarded.

## Configuration

Read `portals.yml`.

It contains:

- `search_queries`: broad discovery queries, often with `site:` filters
- `tracked_companies`: companies to monitor directly
- `tracked_companies[].parser`: optional local parser for stable pages
- `title_filter`: positive / negative / seniority-related title filters
- `location_filter`: allow / block rules for location and remote terms

If the repo later standardizes back to `portals.yml`, update this file to match. Do not silently mix both names.

## Morgan-specific filtering intent

This scanner is for Morgan Escott's job search. That changes how filtering should work.

Keep these standing rules in mind:

- Remote compatibility matters a lot. Roles that are clearly onsite or geographically incompatible should usually be filtered out early.
- Title lineage can be misleading. Do **not** assume Morgan is a bad fit just because a title says marketing, lifecycle, enablement, operations, onboarding, customer success, or content when her past titles used different wording.
- Favor functional overlap over exact title matching.
- Being slightly below a role's prestige level is less important than whether the actual work maps well and whether recruiter screening is plausible.
- Do not flood the pipeline with obviously bad matches just because one keyword overlaps.

## Discovery Strategy (4 Levels)

### Level 0 — Local parser (cheapest)

For each company in `tracked_companies` with `parser:` configured, execute the local parser defined in `portals.yml`.

Recommended contract:

```yaml
- name: Example Company
  careers_url: https://example.com/careers
  scan_method: local_parser
  parser:
    command: node
    script: scripts/parsers/example-company-jobs.js
    format: jobs-json-v1
  enabled: true
```

The parser should print JSON to stdout in one of these forms:

```json
[
  { "title": "Lifecycle Marketing Manager", "url": "https://example.com/jobs/123", "location": "Remote" }
]
```

```json
{
  "jobs": [
    { "title": "Lifecycle Marketing Manager", "url": "https://example.com/jobs/123", "location": "Remote" }
  ]
}
```

```json
{
  "results": [
    { "title": "Lifecycle Marketing Manager", "url": "https://example.com/jobs/123", "location": "Remote" }
  ]
}
```

If `company` is missing from parser output, use the name from `tracked_companies`.

### Rule: successful local parser — no repetitive expensive scraping

Maintain a `local_parser_ok` set in memory for companies where Level 0 succeeded.

A parser counts as successful when:

- `parser.command` and `parser.script` exist
- the script executes without fatal error
- stdout is valid JSON
- no timeout or crash occurs

| Level | If company is in `local_parser_ok` |
|---|---|
| Level 1 — Playwright | Skip |
| Level 2 — API | Skip |
| Level 3 — WebSearch | Keep general search active, but discard hits for those already-covered companies |

**Exceptions:**

- If the parser fails, do not add the company to `local_parser_ok`
- Level 3 is still useful for discovering new companies on the same platforms
- Do not create dedicated search queries for companies that already have working local parsers

### Level 1 — Direct careers-page scan (primary)

For each company in `tracked_companies` that is not in `local_parser_ok`:

- Navigate to `careers_url`
- Read all visible job listings
- Extract title, URL, company, and location if shown
- Traverse relevant sections or pagination when necessary

This is usually the most reliable real-time source.

### Level 2 — ATS APIs / feeds (complementary)

For companies with a public API or structured feed and not in `local_parser_ok`, use the API/feed as a fast complement to Level 1.

Current support:

- Greenhouse
- Ashby
- BambooHR
- Lever
- Teamtailor
- Workday

Use provider-specific parsing rules already established in the repo.

### Level 3 — WebSearch queries (broad discovery)

Use `search_queries` to discover new companies and new openings outside the directly tracked list.

This level is useful for:

- finding companies not yet in `tracked_companies`
- catching openings surfaced by portal indexing
- expanding the universe beyond hand-picked targets

Because search results can be stale, Level 3 results must be verified before pipeline insertion.

## Execution priority

1. Level 0: Local parser
2. Level 1: Direct careers-page scan
3. Level 2: ATS API / feed
4. Level 3: WebSearch discovery

Levels are additive. Merge and deduplicate all results.

## Workflow

1. **Read config:** `portals.yml`
2. **Read history:** `data/scan-history.tsv`
3. **Read dedup sources:** `data/applications.md` and `data/pipeline.md`

### 3.5 Level 0 — Local parser

Initialize `local_parser_ok = []`.

Prefer running `node scan.mjs` once to cover zero-token parsers and APIs. If done manually:

- execute parser command + script
- expand placeholders like `{careers_url}` and `{company}`
- read JSON from stdout
- normalize each job to `{title, url, company, location}`
- resolve relative URLs against `careers_url`
- if parser fails, continue without adding the company to `local_parser_ok`
- if parser succeeds, add the company name to `local_parser_ok` and accumulate jobs

### 4. Level 1 — Direct careers-page scan

For each enabled tracked company with a `careers_url` and not in `local_parser_ok`:

- open the careers page
- read all relevant listings
- extract `{title, url, company, location}`
- follow pagination when needed
- accumulate candidates
- if `careers_url` fails, fall back once and note the URL for correction

### 5. Level 2 — ATS APIs / feeds

For each enabled tracked company with `api:` defined and not in `local_parser_ok`:

- fetch the API or feed
- use provider-specific parsing
- normalize extracted jobs to `{title, url, company, location}`
- accumulate and deduplicate against prior levels

### 6. Level 3 — WebSearch queries

For each enabled query in `search_queries`:

- execute the query
- extract title, URL, company, and any visible location clues
- discard results whose normalized company matches `local_parser_ok`
- accumulate the rest

### 6b. Verify liveness of Level 3 results

Before adding any new Level 3 result to the pipeline, verify that the posting is still active.

For each new Level 3 URL:

- navigate to the URL
- confirm that the job title, meaningful description content, and an apply path are visible
- if the page says the job is closed, missing, filled, expired, or redirects generically, mark it `skipped_expired`
- if the page fails to load, continue without interrupting the whole scan

## Title filtering guidance

Use `title_filter` from `portals.yml`, but apply judgment.

### Positive signals

Strong positive signals may include roles touching:

- lifecycle
- CRM
- email marketing
- retention
- campaign operations
- marketing operations
- enablement
- content strategy
- copywriting
- brand voice
- marketing coordinator / specialist / generalist
- customer marketing
- communications, if the work genuinely overlaps

### Caution signals

Use caution for roles that sound adjacent but may drift too far, such as:

- pure sales with no messaging / content / systems component
- support-only roles with no campaign, enablement, lifecycle, or content overlap
- social-only roles if the rest of the work is missing
- event-heavy field marketing with extensive travel

### Negative signals

Usually filter out:

- clearly onsite-only roles
- location-locked roles outside Morgan's workable range
- deeply engineering or product-only roles
- senior leadership roles requiring ongoing people management
- obviously junior roles that are implausible or administratively narrow with no growth value

### Important reminder

Do **not** over-filter based on formal title purity.

A role can still be relevant if the title is imperfect but the work includes:

- messaging systems
- campaign logic
- CRM / database work
- enablement assets
- process design
- content operations
- lifecycle thinking
- cross-functional marketing support

## Remote and location filtering

`location_filter` should be treated as a practical screen, not a soft preference.

Prioritize:

- fully remote roles
- remote roles open to U.S. candidates or New York residents
- remote roles with reasonable timezone expectations

Filter or deprioritize:

- onsite-only roles
- hybrid roles tied to far-away metros
- roles with explicit in-office requirements incompatible with Buffalo / Amherst / Getzville reality

If a role is hybrid but close enough or ambiguous, keep it only if the rest of the fit is unusually strong.

## Dedup and pipeline rules

Before adding a role to the pipeline:

- check `scan-history.tsv`
- check `data/applications.md`
- check `data/pipeline.md`

Deduplicate by URL first, then by strong company + title similarity.

If Morgan has already applied, evaluated, or deliberately skipped a company recently, do not re-add it blindly. Flag it clearly instead.

## For each new verified offer passing filters

Add to `pipeline.md` pending section as:

```markdown
- [ ] {url} | {company} | {title}
```

Then log to `scan-history.tsv` with the correct status.

Statuses:

- `added`
- `skipped_title`
- `skipped_dup`
- `skipped_expired`
- `skipped_location`
- `skipped_remote`

If a role looks intriguing but title-sensitive, it is usually better to keep it than lose it entirely. In that case, add a short note in the pipeline entry or scan summary rather than discarding it automatically.

## Scan history format

`data/scan-history.tsv` tracks all seen URLs.

```text
url     first_seen      portal  title   company status
https://...     2026-02-10      Ashby — Lifecycle Marketing   Lifecycle Marketing Manager   Acme    added
https://...     2026-02-10      Greenhouse — Content  Junior Content Assistant   BigCo   skipped_title
https://...     2026-02-10      WebSearch — Marketing Ops     Marketing Ops Specialist     OldCo   skipped_dup
https://...     2026-02-10      WebSearch — CRM      CRM Coordinator     ClosedCo        skipped_expired
```

## Output summary

```text
Portal Scan — {YYYY-MM-DD}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Queries executed: N
Offers found: N total
Relevant after title/location filtering: N
Duplicates: N
Expired discarded: N
New added to pipeline.md: N

+ {company} | {title} | {query_name}
...

→ Run /career-ops pipeline to evaluate new offers.
```

## Careers URL management

Each tracked company should have a `careers_url`.

Prefer the company's own careers page when possible. Only fall back to direct ATS URLs if no stable corporate careers page exists.

If `careers_url` is missing:

1. Try the known platform pattern
2. Search once for the careers page
3. Confirm it works
4. Save it back to `portals.yml`

If `careers_url` breaks:

1. Note it in the scan summary
2. Try a fallback once
3. Mark it for manual update

## Maintaining `portals.yml`

- Always save `careers_url` when adding a new tracked company
- Add or disable search queries based on noise level and usefulness
- Refine title filters as Morgan's target lanes evolve
- Keep location and remote rules realistic
- Add companies for closer tracking when they repeatedly produce good-fit roles
- Recheck broken URLs periodically because companies change ATS platforms
