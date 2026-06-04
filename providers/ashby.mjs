// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

// Ashby provider — hits the public posting-api endpoint.
// Auto-detects from careers_url pattern `https://jobs.ashbyhq.com/<slug>`.
// Falls back to entry.api if careers_url uses a custom domain (e.g. Zapier, Miro).

function resolveApiUrl(entry) {
  // Prefer explicit api field — handles custom-domain careers pages
  if (entry.api) return entry.api;
  const url = entry.careers_url || '';
  const match = url.match(/jobs\.ashbyhq\.com\/([^/?#]+)/);
  if (!match) return null;
  return `https://api.ashbyhq.com/posting-api/job-board/${match[1]}?includeCompensation=true`;
}

/** @type {Provider} */
export default {
  id: 'ashby',

  detect(entry) {
    const apiUrl = resolveApiUrl(entry);
    return apiUrl ? { url: apiUrl } : null;
  },

  async fetch(entry, ctx) {
    const apiUrl = resolveApiUrl(entry);
    if (!apiUrl) throw new Error(`ashby: cannot derive API URL for ${entry.name}`);
    const json = await ctx.fetchJson(apiUrl);
    const jobs = Array.isArray(json?.jobs) ? json.jobs : [];
    return jobs.map(j => ({
      title: j.title || '',
      url: j.jobUrl || '',
      company: entry.name,
      location: j.location || '',
    }));
  },
};
