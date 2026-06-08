/**
 * Constants for the isolved Hire careers platform.
 *
 * isolved Hire (isolvedhire.com — the candidate-facing job-board product of the isolved
 * People Cloud HCM suite) hosts a branded, public, unauthenticated career board for each
 * SMB customer tenant on its own sub-domain of the shared host
 * `https://{tenant}.isolvedhire.com/`. The `{tenant}` label is the company slug.
 *
 * The human-facing open-roles board (`/jobs/`) is a thin Vue single-page-app shell, so
 * rather than depend on a headless browser the adapter consumes the two clean,
 * machine-readable public surfaces every tenant board exposes:
 *
 *   1. The per-tenant job sitemap — a plain XML <urlset> that enumerates every OPEN role
 *      as a `<loc>` pointing at its detail page, plus a `<lastmod>`:
 *
 *        GET https://{tenant}.isolvedhire.com/job_site_map.xml
 *          → <urlset><url>
 *               <loc>https://{tenant}.isolvedhire.com/jobs/{jobId}.html</loc>
 *               <lastmod>2026-05-27</lastmod>
 *             </url> … </urlset>
 *
 *      The trailing numeric `{jobId}` (e.g. `1765310`) is the stable isolved Hire ATS id.
 *
 *   2. Each role's detail page, which embeds a complete Google-for-Jobs JSON-LD
 *      `JobPosting` object (the canonical, structured per-role record):
 *
 *        GET https://{tenant}.isolvedhire.com/jobs/{jobId}.html
 *          → <script type="application/ld+json">
 *               { "@type":"JobPosting", "title":"…", "url":"…/jobs/{jobId}.html",
 *                 "description":"<p>…HTML body…</p>", "datePosted":"2026-05-06 00:00:00",
 *                 "employmentType":"FULL_TIME",
 *                 "hiringOrganization":{ "name":"…" },
 *                 "jobLocation":{ "address":{ "addressLocality":"Miami",
 *                   "addressRegion":"FL", "addressCountry":"US" } },
 *                 "identifier":{ "sameAs":"{jobId}" } }
 *             </script>
 *
 * The adapter fetches the sitemap, extracts the open-role detail URLs (each carrying the
 * stable `jobId`), then fans out — bounded, with `Promise.allSettled` so one bad role
 * never nukes the rest — to each detail page and parses its embedded `JobPosting`. The
 * detail page `/jobs/{jobId}.html` is itself the canonical public detail / apply URL.
 *
 * The caller addresses a tenant by `companySlug` (the sub-domain label, e.g.
 * `americavotes`) or by `companyUrl` (any URL on an `isolvedhire.com` host whose leading
 * sub-domain label encodes the tenant). An unknown / parked tenant 302-redirects OFF the
 * board host (no sitemap), and a tenant with no open roles yields an empty sitemap, so
 * both degrade naturally to an empty result. A fetch error, an HTTP 4xx, a DNS failure,
 * or a malformed body degrades to an empty / partial result rather than throwing, so a
 * single bad tenant never breaks a batch run.
 *
 * Surface confidence (researched + verified live 2026-06-03, no authentication):
 *  - Confirmed the platform + tenant addressing (`{tenant}.isolvedhire.com`) and several
 *    real, named tenants on it: `americavotes` (America Votes), `isolved` (67 open roles),
 *    `lyrasis`, `pantheondata`, `uasystem` (University of Alabama System Office).
 *  - Confirmed the public `job_site_map.xml` enumerates open roles as
 *    `/jobs/{jobId}.html` and that each detail page embeds a JSON-LD `JobPosting`
 *    (verified=true — a live role `…/jobs/1765310.html`, "Florida State Director", Miami,
 *    FL, was parsed). robots.txt advertises the sitemap host `feeds.isolvedhire.com`.
 */

/** Hosted careers host suffix — tenant boards live at `{tenant}.isolvedhire.com`. */
export const ISOLVED_CAREER_HOST_SUFFIX = '.isolvedhire.com';

/** Root domain — used to recognise tenant hosts / URLs passed via `companyUrl`. */
export const ISOLVED_ROOT_DOMAIN = 'isolvedhire.com';

/** Builds a tenant's career-board origin from its slug. */
export const isolvedCareerOrigin = (tenant: string): string =>
  `https://${tenant}${ISOLVED_CAREER_HOST_SUFFIX}`;

/**
 * Per-tenant job sitemap path. A plain XML `<urlset>` that enumerates every OPEN role as
 * a `<loc>https://{tenant}.isolvedhire.com/jobs/{jobId}.html</loc>` (+ `<lastmod>`). This
 * is the clean, machine-readable index of the tenant's open board (the human `/jobs/`
 * page is a Vue SPA), so it is the adapter's primary listing surface.
 */
export const ISOLVED_JOB_SITEMAP_PATH = '/job_site_map.xml';

/**
 * Builds the canonical public detail / apply URL for a role from its sub-domain tenant
 * and stable numeric `jobId`: `https://{tenant}.isolvedhire.com/jobs/{jobId}.html`.
 */
export const isolvedJobDetailUrl = (tenant: string, jobId: string): string =>
  `${isolvedCareerOrigin(tenant)}/jobs/${encodeURIComponent(jobId)}.html`;

/**
 * Default internal results cap. Mirrors the sibling ATS adapters: when a caller omits
 * `resultsWanted` entirely we ingest up to 100 of the tenant's open roles.
 */
export const ISOLVED_DEFAULT_RESULTS = 100;

/**
 * Hard ceiling on role detail pages fetched per scrape. The sitemap lists the full open
 * board in one document; the cap bounds the per-role detail fan-out so an unexpectedly
 * huge tenant board can never run away. It is applied AFTER slicing to `resultsWanted`.
 */
export const ISOLVED_MAX_DETAIL_FETCHES = 100;

/**
 * Concurrency cap for the per-role detail fan-out. Roles are fetched in bounded batches
 * (via `Promise.allSettled`) so a tenant with many open roles stays inside the CI time
 * budget without hammering the board host.
 */
export const ISOLVED_DETAIL_CONCURRENCY = 8;

/**
 * Upper bound (seconds) on the per-request HTTP timeout. An unresponsive isolved Hire
 * board host can connect-then-hang, so we cap the shared client's 60s default to keep
 * graceful-degradation well inside callers' budgets; a healthy tenant responds in well
 * under a second. A caller may request a SHORTER timeout — we only bound the upper end.
 */
export const ISOLVED_DEFAULT_TIMEOUT_SECONDS = 15;

/** Default request headers. The board expects a browser-like UA + an XML/HTML Accept. */
export const ISOLVED_HEADERS: Record<string, string> = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

/**
 * Matches a single role detail URL inside a `<loc>…</loc>` element of the job sitemap.
 * The capture group is the stable numeric `jobId` (the final path segment before
 * `.html`). The `/jobs/` board landing page (no numeric segment) is intentionally NOT
 * matched, so only concrete role pages are harvested.
 */
export const ISOLVED_SITEMAP_JOB_REGEX =
  /<loc>\s*(https?:\/\/[^<\s]*?\/jobs\/(\d+)\.html)\s*<\/loc>/gi;

/**
 * Captures the body of a JSON-LD `<script type="application/ld+json">…</script>` block
 * embedded in a role detail page. The capture group is the raw JSON text (which the
 * adapter `JSON.parse`s, then narrows to the `JobPosting` object). Tolerant of attribute
 * ordering and extra whitespace.
 */
export const ISOLVED_LD_JSON_REGEX =
  /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/** Detects remote / home-working roles across the title, location, and type fields. */
export const ISOLVED_REMOTE_REGEX =
  /\b(remote|virtual|home[\s-]?(?:based|working|office)|work\s*from\s*home|wfh|telecommute|telework|anywhere)\b/i;
