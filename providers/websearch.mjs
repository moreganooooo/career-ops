// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

// Brave Search provider — handles entries with `scan_method: websearch`.
// Fires the entry's `scan_query` at the Brave Web Search API and extracts
// job listings from the results.
//
// Required env var: BRAVE_API_KEY
// Free tier: https://api.search.brave.com (2,000 queries/month)
//
// Each result is returned in the standard provider format:
//   { title, url, company, location }
//
// Location is not reliably available from search snippets, so it defaults
// to empty string — the location filter in scan.mjs will pass empty locations
// through (by design), and the title filter handles the rest.

const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

// Domains that never contain job postings — content sites, aggregators,
// listicles, review sites, social networks, etc.
const BLOCKED_DOMAINS = new Set([
  'linkedin.com', 'indeed.com', 'glassdoor.com', 'ziprecruiter.com',
  'monster.com', 'careerbuilder.com', 'simplyhired.com', 'salary.com',
  'payscale.com', 'builtin.com', 'builtinnyc.com', 'builtinboston.com',
  'builtinchicago.com', 'builtinla.com', 'builtinsf.com', 'builtinaustin.com',
  'builtinseattle.com', 'builtincolorado.com',
  'crunchbase.com', 'pitchbook.com', 'techcrunch.com', 'forbes.com',
  'businessinsider.com', 'fastcompany.com', 'inc.com', 'wired.com',
  'medium.com', 'substack.com', 'hubspot.com', 'salesforce.com',
  'g2.com', 'capterra.com', 'trustpilot.com', 'yelp.com',
  'reddit.com', 'quora.com', 'twitter.com', 'x.com', 'facebook.com',
  'youtube.com', 'tiktok.com', 'instagram.com',
  'wikipedia.org', 'wikihow.com',
  'flexjobs.com', 'remote.co', 'weworkremotely.com', 'remoteok.com',
  'himalayas.app', 'wellfound.com', 'angel.co',
]);

// URL path segments that strongly indicate a real job posting page.
const JOB_PATH_SIGNALS = [
  '/job', '/jobs', '/career', '/careers', '/opening', '/openings',
  '/position', '/positions', '/apply', '/application', '/listing',
  '/vacancy', '/vacancies', '/hire', '/hiring', '/work-with-us',
  '/work_with_us', '/join', '/join-us', '/join_us', '/opportunities',
];

// URL path segments that strongly indicate non-job content.
const CONTENT_PATH_SIGNALS = [
  '/blog', '/news', '/article', '/articles', '/post', '/posts',
  '/guide', '/guides', '/resource', '/resources', '/learn',
  '/tutorial', '/tutorials', '/review', '/reviews', '/report',
  '/reports', '/podcast', '/webinar', '/ebook', '/whitepaper',
  '/press', '/media', '/about', '/pricing', '/product', '/features',
  '/solutions', '/customers', '/case-study', '/case_study',
  '/best-', '/top-', '/how-to', '/what-is',
];

/**
 * Returns true if the URL looks like a real job posting.
 * Logic:
 *   1. Blocked domain → reject immediately
 *   2. Has a content path signal → reject (listicle/article)
 *   3. Has a job path signal → accept
 *   4. Neither signal → accept (e.g. careers.company.com/ with no path)
 *
 * @param {string} rawUrl
 * @returns {boolean}
 */
function isJobUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false; // malformed URL
  }

  // Strip leading 'www.' for domain matching
  const domain = parsed.hostname.replace(/^www\./, '');

  // 1. Blocked domain check (exact + subdomain)
  if (BLOCKED_DOMAINS.has(domain)) return false;
  for (const blocked of BLOCKED_DOMAINS) {
    if (domain.endsWith('.' + blocked)) return false;
  }

  const path = parsed.pathname.toLowerCase();

  // 2. Content path signals — reject listicles and editorial content
  if (CONTENT_PATH_SIGNALS.some(s => path.includes(s))) return false;

  // 3. Job path signals — accept job-looking URLs
  if (JOB_PATH_SIGNALS.some(s => path.includes(s))) return true;

  // 4. No strong signal either way — pass through
  return true;
}

/** @type {Provider} */
export default {
  id: 'websearch',

  detect(entry) {
    const scan_method = /** @type {any} */ (entry).scan_method;
    const scan_query  = /** @type {any} */ (entry).scan_query;
    if (scan_method === 'websearch' && scan_query) {
      return { url: BRAVE_API_URL };
    }
    return null;
  },

  async fetch(entry, _ctx) {
    if (!BRAVE_API_KEY) {
      throw new Error(
        'websearch: BRAVE_API_KEY is not set. Add it to your .env file.\n' +
        '  Get a free key at: https://api.search.brave.com'
      );
    }

    const query = /** @type {any} */ (entry).scan_query;
    if (!query) throw new Error(`websearch: no scan_query defined for ${entry.name}`);

    const params = new URLSearchParams({
      q: query,
      count: '20',
      search_lang: 'en',
      country: 'us',
      safesearch: 'moderate',
      freshness: 'pm',  // past month — keeps results recent
    });

    const response = await fetch(`${BRAVE_API_URL}?${params}`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(
        `websearch: Brave API error ${response.status} for "${entry.name}" — ${await response.text()}`
      );
    }

    const json = await response.json();
    const results = /** @type {any[]} */ (json?.web?.results || []);

    return results
      .filter(r => r.url && r.title && isJobUrl(r.url))
      .map(r => ({
        title: cleanTitle(r.title, entry.name),
        url: r.url,
        company: entry.name,
        location: extractLocation(r.description || r.extra_snippets?.[0] || ''),
      }));
  },
};

// Strip the company name and common job board suffixes from result titles
// so the title filter works cleanly against just the role name.
/**
 * @param {string} raw
 * @param {string} companyName
 * @returns {string}
 */
function cleanTitle(raw, companyName) {
  return raw
    .replace(new RegExp(`\\s*[-|]\\s*${escapeRegex(companyName)}.*$`, 'i'), '')
    .replace(/\s*[-|]\s*(Jobs|Careers|Job Board|Greenhouse|Lever|Ashby|LinkedIn|Indeed|Glassdoor).*$/i, '')
    .trim();
}

// Best-effort location extraction from the result snippet.
// Looks for common patterns like "Remote", "New York, NY", "US", etc.
/**
 * @param {string} snippet
 * @returns {string}
 */
function extractLocation(snippet) {
  const remoteMatch = snippet.match(/\b(remote|fully remote|work from anywhere)\b/i);
  if (remoteMatch) return 'Remote';
  const locMatch = snippet.match(/\b([A-Z][a-z]+(?:,\s*[A-Z]{2})?(?:,\s*(?:US|USA|United States))?)\b/);
  return locMatch?.[1] || '';
}

/**
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
