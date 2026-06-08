/**
 * Constants for the Dover recruiting-automation ATS careers platform.
 *
 * Dover (dover.com) is a modern recruiting-automation ATS whose candidate-facing
 * product is a no-code, hosted/embeddable careers page. Every customer tenant
 * publishes a branded, public, unauthenticated job board on Dover's application
 * host (`app.dover.com`) under one of two addressing forms:
 *
 *   1. The short board slug form (the most common; used for embeds):
 *
 *        https://app.dover.com/jobs/{slug}
 *          e.g. https://app.dover.com/jobs/dover
 *               https://app.dover.com/jobs/beimpact
 *
 *   2. The company + careers-page UUID form:
 *
 *        https://app.dover.com/{company}/careers/{careersPageId}
 *          e.g. https://app.dover.com/dover/careers/733c3162-cbbd-6558-9866-1d6b8561f8b9
 *
 * Both views are client-rendered single-page apps, so the board HTML carries no
 * server-side job links. The stable public surface is the careers SPA's backing
 * JSON endpoint, served unauthenticated from Dover's API host so the hosted board
 * (and any embed) can render it client-side:
 *
 *   GET https://app.dover.com/api/v1/careers-page/{slug}
 *     → { jobs: [ { id, title, location, ... }, ... ] }  (the public board feed)
 *
 * The feed returns every open role for the tenant in one document (no server-side
 * pagination of the job set), so we slice client-side to honour `resultsWanted`.
 * As a defensive fallback — and because Dover pre-renders each board for
 * Google-for-Jobs — the adapter also scans the board HTML for any embedded
 * `application/ld+json` schema.org `JobPosting` blocks, so a markup/endpoint shift
 * still yields roles rather than an empty result.
 *
 * An unknown slug (HTTP 404 / 4xx), a missing feed, a malformed page, or a
 * non-JSON payload degrades to an empty (graceful) result rather than throwing, so
 * a single bad tenant never breaks a batch run.
 *
 * Surface confidence (researched 2026-06-03, no authentication):
 *  - Confirmed the platform + the two tenant board URL forms
 *    (`app.dover.com/jobs/{slug}` and `app.dover.com/{company}/careers/{uuid}`) and
 *    real, named tenants on it: `dover` (Dover), `beimpact`, `unthread` (Unthread),
 *    `backbone` (Backbone), `paces` (Paces), `daysheets` (Daysheets).
 *  - The boards are JS-rendered SPAs, so an unauthenticated no-JS fetch returns
 *    only the app shell; the careers feed JSON's exact byte-level shape could NOT
 *    be confirmed via a no-JS fetch. Dover documents a public "list all jobs"
 *    careers surface, so the parser is written defensively around it
 *    (verified=false).
 */

/** Dover application host that serves the hosted/embedded careers boards. */
export const DOVER_HOST = 'https://app.dover.com';

/** Root domain — used to recognise board hosts passed via `companyUrl`. */
export const DOVER_ROOT_DOMAIN = 'dover.com';

/**
 * Public, unauthenticated careers-page JSON feed that enumerates a tenant's open
 * roles. `{slug}` is the board slug (the `/jobs/{slug}` label, or the company
 * label of a `/{company}/careers/{uuid}` URL).
 */
export const DOVER_CAREERS_API_TEMPLATE = 'https://app.dover.com/api/v1/careers-page/{slug}';

/** Short board URL template (`/jobs/{slug}`) — used to fetch the board HTML fallback. */
export const DOVER_BOARD_URL_TEMPLATE = 'https://app.dover.com/jobs/{slug}';

/**
 * Default internal results cap. Mirrors the sibling ATS adapters: the public DTO
 * default is small, but when a caller omits `resultsWanted` entirely we ingest up
 * to 100 of the tenant's open roles.
 */
export const DOVER_DEFAULT_RESULTS = 100;

/** Default request headers. The board host expects a browser-like UA. */
export const DOVER_HEADERS: Record<string, string> = {
  Accept: 'application/json,text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

/**
 * Matches a Dover board path, capturing the tenant slug. Both `/jobs/{slug}` and
 * `/{company}/careers/{uuid}` forms are recognised; the first path segment (or the
 * `/jobs/` label) is the tenant slug used to address the careers feed.
 */
export const DOVER_BOARD_PATH_REGEX = /^\/(?:jobs\/([^/?#]+)|([^/?#]+)\/careers(?:\/|$))/i;

/**
 * Extracts every `<script type="application/ld+json">…</script>` block's inner
 * JSON text from a board page. A page may carry several JSON-LD blocks
 * (Organization, BreadcrumbList, JobPosting); we scan them all for `JobPosting`
 * objects.
 */
export const DOVER_JSONLD_REGEX =
  /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/** Detects remote / distributed roles across the title, location, and body text. */
export const DOVER_REMOTE_REGEX =
  /\b(remote|distributed|work\s*from\s*home|wfh|telecommute|fully\s*remote|anywhere)\b/i;
