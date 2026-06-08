// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

const NODESK_API_URL = 'https://nodesk.co/api/jobs/';
const NODESK_HEADERS = { Accept: 'application/json' };

function matchesSearchTerm(job, term) {
  if (!term) return true;
  const needle = term.toLowerCase();
  const haystack = `${job.title || ''} ${job.category || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
  return haystack.includes(needle);
}

/** @type {Provider} */
export default {
  id: 'nodesk',
  detect() {
    return null;
  },
  async fetch(entry, ctx) {
    const json = await ctx.fetchJson(NODESK_API_URL, { headers: NODESK_HEADERS });
    const jobs = Array.isArray(json) ? json : Array.isArray(json?.jobs) ? json.jobs : [];
    return jobs
      .filter((j) => j.url && j.title)
      .filter((j) => matchesSearchTerm(j, entry.search_term))
      .map((j) => ({
        title: j.title || '',
        url: j.url,
        company: j.company || entry.name,
        location: j.location || '',
        posted_at: j.published_at || j.date || '',
      }));
  },
};
