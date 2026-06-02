// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

// Brave Search provider — handles entries with `scan_method: websearch`.
// Fires the entry's `scan_query` at the Brave Web Search API and extracts
// job listings from the results.
//
// Required env var: BRAVE_API_KEY
// Free tier: https://api.search.brave.com (2,000 queries/month, 1 req/sec)
//
// Each result is returned in the standard provider format:
//   { title, url, company, location }
//
// Location is not reliably available from search snippets, so it defaults
// to empty string — the location filter in scan.mjs will pass empty locations
// through (by design), and the title filter handles the rest.

const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

// True sequential queue — each request waits for the previous one to fully
// complete before starting, then adds a 1.1s gap. This guarantees we never
// exceed Brave's free tier 1 req/sec limit regardless of scan.mjs concurrency.
const RATE_LIMIT_MS = 1100;
let queue = Promise.resolve();

function enqueue(fn) {
  const next = queue.then(() => fn()).then(
    result => new Promise(resolve => setTimeout(() => resolve(result), RATE_LIMIT_MS)),
    err    => new Promise((_, reject) => setTimeout(() => reject(err),  RATE_LIMIT_MS)),
  );
  queue = next.then(() => {}, () => {}); // keep queue moving even on error
  return next;
}

// Domains that never contain direct job postings — aggregators, content sites,
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
  // Job aggregators / boards that surface other companies' jobs
  'flexjobs.com', 'remote.co', 'weworkremotely.com', 'remoteok.com',
  'himalayas.app', 'wellfound.com', 'angel.co',
  'kickstartremote.com', 'jobleads.com', 'jobleads.de', 'jooble.org',
  'jobgether.com', 'talentify.io', 'jobsora.com', 'neuvoo.com',
  'trovit.com', 'adzuna.com', 'jobrapido.com', 'joblist.com',
  'lensa.com', 'lensa.ai',
  'jobright.ai', 'jobright.io',
  'getwork.com', 'careerjet.com', 'jobserve.com', 'jobsearch.com',
  'jobspider.com', 'jobvertise.com', 'jobsxl.com', 'jobs2careers.com',
  'smartjobboard.com', 'jobboardfire.com',
  'tarta.ai', 'brightcrowd.com', 'jobcase.com',
  'workopolis.com', 'eluta.ca', 'jobillico.com',
  'recruit.net', 'jobomas.com', 'jobatus.com',
  'snagajob.com', 'hotjobs.com', 'theladders.com',
  'dice.com', 'clearancejobs.com', 'usajobs.gov',
  'neighborhoods.com', // surfaced in Curriculum Associates results
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

// Title patterns that indicate an aggregator surfacing another company's job.
// e.g. "Email Marketing Specialist at Snap Finance" or
//      "Remote Email Specialist job at Easy HR Group | Lensa"
const AGGREGATOR_TITLE_PATTERNS = [
  /\bjob at\b/i,
  /\bjobs at\b/i,
  /\bposition at\b/i,
  /\bopening at\b/i,
  /\bvia\s+lensa\b/i,
  /\|\s*lensa\s*$/i,
  /\blensa\b/i,
  /\bJobright\b/i,
  /\bTalentify\b/i,
  /\bJooble\b/i,
  /\bAdzuna\b/i,
  /\bNeuvoo\b/i,
  /\bJobgether\b/i,
  /\bSnap Finance\b/i, // specific aggregator noise from earlier runs
];

/**
 * Returns true if the title looks like a direct company job (not aggregator noise).
 * @param {string} title
 * @returns {boolean}
 */
function isDirectJobTitle(title) {
  return !AGGREGATOR_TITLE_PATTERNS.some(pattern => pattern.test(title));
}

/**
 * Returns true if the URL looks like a real job posting.
 * @param {string} rawUrl
 * @returns {boolean}
 */
function isJobUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  const domain = parsed.hostname.replace(/^www\./, '');

  if (BLOCKED_DOMAINS.has(domain)) return false;
  for (const blocked of BLOCKED_DOMAINS) {
    if (domain.endsWith('.' + blocked)) return false;
  }

  const path = parsed.pathname.toLowerCase();
  if (CONTENT_PATH_SIGNALS.some(s => path.includes(s))) return false;
  if (JOB_PATH_SIGNALS.some(s => path.includes(s))) return true;
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

    const json = await enqueue(async () => {
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
      return response.json();
    });

    const results = /** @type {any[]} */ (json?.web?.results || []);

    return results
      .filter(r => r.url && r.title && isJobUrl(r.url) && isDirectJobTitle(r.title))
      .map(r => ({
        title: cleanTitle(r.title, entry.name),
        url: r.url,
        company: entry.name,
        location: extractLocation(r.description || r.extra_snippets?.[0] || ''),
      }));
  },
};

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
