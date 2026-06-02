// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

// Brave Search provider — handles entries with `scanmethod: websearch`.
// Fires the entry's `scanquery` at the Brave Web Search API and extracts
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

/** @type {Provider} */
export default {
  id: 'websearch',

  detect(entry) {
    const { scanmethod, scanquery } =
      /** @type {{ scanmethod?: string, scanquery?: string }} */ (entry);

    if (scanmethod === 'websearch' && scanquery) {
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

    const query = /** @type {{ scanquery?: string }} */ (entry).scanquery;
    if (!query) throw new Error(`websearch: no scanquery defined for ${entry.name}`);

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
    /** @type {Array<{url: string, title: string, description?: string, extra_snippets?: string[]}>} */
    const results = /** @type {Array<{url: string, title: string, description?: string, extra_snippets?: string[]}>} */ (json?.web?.results || []);

    return results
      .filter(r => r.url && r.title)
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
