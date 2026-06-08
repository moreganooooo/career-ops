// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

const WN_API = 'https://www.workingnomads.co/api/v1/jobs';

export default {
  id: 'workingnomads',
  detect() { return null; },
  async fetch(entry, ctx) {
    try {
      const json = await ctx.fetchJson(WN_API).catch(()=>null);
      const jobs = Array.isArray(json) ? json : [];
      return jobs
        .filter(j => j && (j.title || j.brand))
        .filter(j => { if (!entry.search_term) return true; const n = entry.search_term.toLowerCase(); return (j.title||'').toLowerCase().includes(n) || (j.tags||[]).join(' ').toLowerCase().includes(n); })
        .map(j => ({ title: j.title || '', url: j.url || j.apply_url || '', company: j.company || j.brand || entry.name, location: j.location || '', posted_at: j.pubDate || j.date || '' }))
        .filter(j=>j.title && j.url);
    } catch (e) { return []; }
  }
};
