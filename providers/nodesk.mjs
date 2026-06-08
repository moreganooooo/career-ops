// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */
import { splitItems, extractTag } from './_rss.mjs';

const CANDIDATE_FEEDS = [
  'https://nodesk.co/feed/',
  'https://nodesk.co/jobs.rss',
  'https://nodesk.co/remote-jobs.rss'
];

export default {
  id: 'nodesk',
  detect() { return null; },
  async fetch(entry, ctx) {
    for (const u of CANDIDATE_FEEDS) {
      try {
        const xml = await ctx.fetchText(u).catch(()=>null);
        if (!xml) continue;
        const items = splitItems(xml);
        const jobs = items.map(it=>({ title: extractTag(it,'title'), link: extractTag(it,'link'), desc: extractTag(it,'description'), pubDate: extractTag(it,'pubDate') })).filter(j=>j.title && j.link);
        return jobs.filter(j=> { if (!entry.search_term) return true; const n = entry.search_term.toLowerCase(); return (j.title||'').toLowerCase().includes(n) || (j.desc||'').toLowerCase().includes(n); }).map(j=>({ title:j.title, url:j.link, company:entry.name, location:'', posted_at:j.pubDate||'' }));
      } catch(e) { continue; }
    }
    return [];
  }
};
