// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

/**
 * RemoteOK provider - attempts JSON API then falls back to empty array.
 */
export default {
  id: 'remoteok',
  detect() { return null; },
  async fetch(entry, ctx) {
    try {
      const url = 'https://remoteok.com/api';
      const json = await ctx.fetchJson(url).catch(()=>null);
      const items = Array.isArray(json) ? json : [];
      return items
        .filter(i => i && (i.position || i.title))
        .map(i => ({
          title: i.position || i.title || '',
          url: (i.url && String(i.url).startsWith('http')) ? i.url : (i.url ? `https://remoteok.com${i.url}` : ''),
          company: i.company || i.company_name || entry.name || '',
          location: i.location || i.location_name || '',
          posted_at: i.date || i.posted_at || '',
        }))
        .filter(j => j.title && j.url);
    } catch (e) {
      return [];
    }
  }
};
