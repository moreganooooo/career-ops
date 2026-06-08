// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

const THEMUSE_API = 'https://www.themuse.com/api/public/jobs?page=1';

export default {
  id: 'themuse',
  detect() { return null; },
  async fetch(entry, ctx) {
    try {
      const json = await ctx.fetchJson(THEMUSE_API).catch(()=>null);
      const results = Array.isArray(json?.results) ? json.results : [];
      return results
        .filter(r => r && r.name)
        .filter(r => { if (!entry.search_term) return true; const n = entry.search_term.toLowerCase(); return (r.name||'').toLowerCase().includes(n) || (r.contents||'').toLowerCase().includes(n); })
        .map(r => ({ title: r.name, url: r.refs?.landing_page || r.refs?.api || '', company: r.company?.name || entry.name, location: (r.locations||[]).map(l=>l.name).join('; '), posted_at: r.publication_date || '' }))
        .filter(j => j.title && j.url);
    } catch (e) { return []; }
  }
};
