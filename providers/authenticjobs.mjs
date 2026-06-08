// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

const AUTHENTICJOBS_API_URL = 'https://authenticjobs.com/api/';
const AUTHENTICJOBS_HEADERS = { Accept: 'application/json' };

/** @type {Provider} */
export default {
  id: 'authenticjobs',
  detect() {
    return null;
  },
  async fetch(entry, ctx) {
    const apiKey = process.env.AUTHENTICJOBS_API_KEY;
    if (!apiKey) {
      throw new Error('authenticjobs: missing AUTHENTICJOBS_API_KEY environment variable');
    }
    const params = new URLSearchParams({
      format: 'json',
      method: 'aj.jobs.search',
      api_key: apiKey,
      sort: 'date-posted-desc',
    });
    if (entry.search_term) params.set('keyword', entry.search_term);
    const url = `${AUTHENTICJOBS_API_URL}?${params.toString()}`;
    const json = await ctx.fetchJson(url, { headers: AUTHENTICJOBS_HEADERS });
    const jobs = Array.isArray(json?.listings?.listing) ? json.listings.listing : [];
    return jobs
      .filter((j) => j.id && j.title)
      .map((j) => ({
        title: j.title || '',
        url: j.company?.url ? j.company.url : `https://authenticjobs.com/job/${j.id}`,
        company: j.company?.name || entry.name,
        location: j.location?.name || '',
        posted_at: j.posted_at || j.date || '',
      }));
  },
};
