// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

const REMOTIVE_API = 'https://remotive.io/api/remote-jobs';

export default {
  id: 'remotive',
  detect() { return null; },
  async fetch(entry, ctx) {
    try {
      const json = await ctx.fetchJson(REMOTIVE_API).catch(()=>null);
      const jobs = Array.isArray(json?.jobs) ? json.jobs : [];
      return jobs
        .filter(j => j && j.title && j.url)
        .filter(j => { if (!entry.search_term) return true; const needle = entry.search_term.toLowerCase(); return (j.title||'').toLowerCase().includes(needle) || (j.category||'').toLowerCase().includes(needle) || (j.company_name||'').toLowerCase().includes(needle); })
        .map(j => ({ title: j.title, url: j.url, company: j.company_name || entry.name, location: j.candidate_required_location || '', posted_at: j.publication_date || '' }));
    } catch (e) { return []; }
  }
};
