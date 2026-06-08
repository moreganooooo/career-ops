// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */
import { splitItems, extractTag } from './_rss.mjs';

const FEEDS = ['https://4dayweek.io/jobs.rss','https://4dayweek.io/feed/'];

export default {
  id: 'fourdayweek',
  detect() { return null; },
  async fetch(entry, ctx) {
    for (const u of FEEDS) {
      try {
        const xml = await ctx.fetchText(u).catch(()=>null);
        if (!xml) continue;
        const items = splitItems(xml);
        return items.map(it=>({ title: extractTag(it,'title'), link: extractTag(it,'link'), description: extractTag(it,'description'), pubDate: extractTag(it,'pubDate') })).filter(j=>j.title && j.link).filter(j=>{ if(!entry.search_term) return true; const n=entry.search_term.toLowerCase(); return (j.title||'').toLowerCase().includes(n) || (j.description||'').toLowerCase().includes(n); }).map(j=>({ title:j.title, url:j.link, company:entry.name, location:'', posted_at:j.pubDate||'' }));
      } catch(e){ continue; }
    }
    return [];
  }
};
