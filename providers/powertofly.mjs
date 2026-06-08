// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */
import { splitItems, extractTag } from './_rss.mjs';

const FEEDS = ['https://powertofly.com/jobs/rss','https://powertofly.com/jobs'];

export default {
  id: 'powertofly',
  detect() { return null; },
  async fetch(entry, ctx) {
    for (const u of FEEDS) {
      try {
        const text = await ctx.fetchText(u).catch(()=>null);
        if (!text) continue;
        if (text.trim().startsWith('<')) {
          const items = splitItems(text);
          const jobs = items.map(it=>({ title: extractTag(it,'title'), link: extractTag(it,'link'), description: extractTag(it,'description'), pubDate: extractTag(it,'pubDate') })).filter(j=>j.title && j.link);
          return jobs.filter(j=>{ if(!entry.search_term) return true; const n=entry.search_term.toLowerCase(); return (j.title||'').toLowerCase().includes(n) || (j.description||'').toLowerCase().includes(n); }).map(j=>({ title:j.title, url:j.link, company:entry.name, location:'', posted_at:j.pubDate||'' }));
        }
      } catch(e){ continue; }
    }
    return [];
  }
};
