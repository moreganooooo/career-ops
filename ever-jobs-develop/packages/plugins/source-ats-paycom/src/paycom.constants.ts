/**
 * Constants for the Paycom applicant-tracking / careers platform.
 *
 * Paycom (paycom.com, US) is an enterprise payroll + HCM vendor whose
 * candidate-facing careers product is served from the `paycomonline.net` job
 * board. The board is multi-tenant and clientkey-addressed: every customer
 * publishes a public, unauthenticated careers site keyed by a 32-character hex
 * `clientkey`, e.g.
 *
 *   https://www.paycomonline.net/v4/ats/web.php/jobs?clientkey={CLIENTKEY}
 *
 * The listing page and per-job detail page are both client-rendered React apps
 * (a no-JS fetch returns only a `Loading…` shell), so the stable crawlable
 * surface is the board's JSON API rather than the HTML. The React app boots a
 * short-lived bearer token (a JWT) into the page and then talks to the
 * applicant-tracking JSON API:
 *
 *  1. Bootstrap — fetch the clientkey-addressed board page and read the bearer
 *     token the app embeds for its own API calls:
 *
 *       GET https://www.paycomonline.net/v4/ats/web.php/jobs?clientkey={KEY}
 *         → HTML carrying a `"token":"{JWT}"` / `Bearer {JWT}` value the React
 *           app forwards to the JSON API below. No login / candidate account is
 *           required — the token is public, page-embedded, and read-only.
 *
 *  2. Listing — POST the job-posting-previews search to enumerate open roles:
 *
 *       POST https://portal-applicant-tracking.us-cent.paycomonline.net
 *              /api/ats/job-posting-previews/search
 *         Authorization: Bearer {JWT}
 *         { "skip": 0, "take": {n} }
 *         → { "results": [ { "jobPostingId": 342042, "title": "…",
 *             "city": "Oklahoma City", "state": "OK", … } ], "total": N }
 *
 *  3. Detail — GET a single posting for its full HTML description:
 *
 *       GET https://portal-applicant-tracking.us-cent.paycomonline.net
 *             /api/ats/job-postings/{jobPostingId}
 *         Authorization: Bearer {JWT}
 *         → { "title": "…", "description": "<p>…HTML body…</p>",
 *             "city": "…", "state": "…", "datePosted": "2026-05-20", … }
 *
 * The classic board additionally pre-renders each role for Google-for-Jobs with a
 * schema.org `JobPosting` JSON-LD block on its detail page
 * (`…/web.php/jobs/ViewJobDetails?job={jobId}&clientkey={KEY}`); the adapter falls
 * back to scanning that JSON-LD (plus `og:` meta tags) when the JSON API path is
 * unavailable, so a markup / API drift never blanks a tenant entirely.
 *
 * The search API returns the tenant's full open-roles set (paged by skip/take),
 * so we request up to `resultsWanted` in one page and slice client-side. An
 * unknown clientkey (HTTP 4xx), a missing token, a malformed page, or a
 * non-JSON payload degrades to an empty (graceful) result rather than throwing,
 * so a single bad tenant never breaks a batch run.
 *
 * Surface confidence (researched 2026-06-03, no authentication):
 *  - Confirmed the platform + clientkey-addressed board pattern
 *    `paycomonline.net/v4/ats/web.php/jobs?clientkey={KEY}` and real, named
 *    tenants on it (Club Champion, Hollywood Feed, Piping Rock Club, Stir Foods).
 *    Confirmed the JSON API host
 *    `portal-applicant-tracking.us-cent.paycomonline.net/api/ats/...`: a GET to
 *    `/job-posting-previews/search` returns HTTP 405 (Method Not Allowed),
 *    confirming the endpoint exists and expects POST.
 *  - The board is a JS-rendered React app, so an unauthenticated no-JS fetch
 *    returns only the `Loading…` shell; the page-embedded bearer token and the
 *    JSON API's exact byte-level response shape could NOT be confirmed via a
 *    no-JS fetch. The JSON API + schema.org `JobPosting` fallback are the
 *    documented public patterns the board advertises, so the parser is written
 *    defensively around them (verified=false).
 */

/** Canonical board origin (the public, clientkey-addressed careers host). */
export const PAYCOM_BOARD_ORIGIN = 'https://www.paycomonline.net';

/** Root board domain — used to recognise board URLs passed via `companyUrl`. */
export const PAYCOM_ROOT_DOMAIN = 'paycomonline.net';

/** Alternate board domain some legacy tenants are served from. */
export const PAYCOM_ALT_DOMAINS = ['paycomonline.com'];

/** Clientkey-addressed board listing path (the React board's entry page). */
export const PAYCOM_BOARD_PATH = '/v4/ats/web.php/jobs';

/** Per-job detail (classic board) path; carries schema.org JobPosting JSON-LD. */
export const PAYCOM_DETAIL_PATH = '/v4/ats/web.php/jobs/ViewJobDetails';

/** Origin of the applicant-tracking JSON API the React board calls. */
export const PAYCOM_API_ORIGIN = 'https://portal-applicant-tracking.us-cent.paycomonline.net';

/** Job-posting-previews search endpoint (POST {skip,take}); enumerates open roles. */
export const PAYCOM_API_SEARCH_PATH = '/api/ats/job-posting-previews/search';

/** Single job-posting endpoint (GET); returns a posting's full HTML description. */
export const PAYCOM_API_DETAIL_PATH = '/api/ats/job-postings';

/**
 * Default internal results cap. Mirrors the sibling ATS adapters: the public DTO
 * default is small, but when a caller omits `resultsWanted` entirely we ingest
 * up to 100 of the tenant's open roles.
 */
export const PAYCOM_DEFAULT_RESULTS = 100;

/** Default request headers. The board / API expect a browser-like UA + JSON. */
export const PAYCOM_HEADERS: Record<string, string> = {
  Accept: 'application/json,text/html;q=0.9,*/*;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

/**
 * Matches the page-embedded bearer token the React board boots for its own API
 * calls. We tolerate a few shapes: a JSON `"token":"…"` / `"accessToken":"…"`
 * field, or an inline `Bearer …` literal. The token is a JWT (three
 * dot-separated base64url segments) — the value capture stays JWT-shaped.
 */
export const PAYCOM_TOKEN_REGEX =
  /(?:"(?:access[_-]?)?token"\s*:\s*"|Bearer\s+)([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/i;

/** Matches a board listing URL's `clientkey` query value. */
export const PAYCOM_CLIENTKEY_REGEX = /[?&]clientkey=([A-Za-z0-9]+)/i;

/** A bare clientkey looks like a 16–64 char hex/alphanumeric token. */
export const PAYCOM_CLIENTKEY_TOKEN_REGEX = /^[A-Za-z0-9]{16,64}$/;

/**
 * Extracts every `<script type="application/ld+json">…</script>` block's inner
 * JSON text from a detail page. A page may carry several JSON-LD blocks
 * (Organization, BreadcrumbList, JobPosting); we scan them all for the
 * `JobPosting` object.
 */
export const PAYCOM_JSONLD_REGEX =
  /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/** Extracts a `<meta property="og:…" content="…">` / `<meta name="…" content="…">` value. */
export const PAYCOM_OG_TITLE_REGEX = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i;
export const PAYCOM_OG_URL_REGEX = /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']*)["']/i;
export const PAYCOM_OG_DESCRIPTION_REGEX =
  /<meta[^>]+property=["']og:description["'][^>]+content=["']([\s\S]*?)["']\s*\/?>/i;
export const PAYCOM_TITLE_TAG_REGEX = /<title>([\s\S]*?)<\/title>/i;

/** Detects remote / work-from-home roles across the title, location, and body text. */
export const PAYCOM_REMOTE_REGEX =
  /\b(remote|work\s*from\s*home|wfh|telecommute|fully\s*remote|home[\s-]?based)\b/i;
