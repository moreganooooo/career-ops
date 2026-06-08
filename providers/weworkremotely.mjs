// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */
import { splitItems, extractTag } from './_rss.mjs';

const WWR_RSS = 'https://weworkremotely.com/remote-jobs.rss';

export default {
  id: 'weworkremotely',
  detect() { return null; },
  async fetch(entry, ctx) {
    try {
      const xml = await ctx.fetchText(WWR_RSS).catch(()=>null);
      if (!xml) return [];
      const items = splitItems(xml);
      return items.map(it=>({ title: extractTag(it,'title'), link: extractTag(it,'link'), desc: extractTag(it,'description'), pubDate: extractTag(it,'pubDate') })).filter(j=>j.title && j.link).filter(j=>{ if(!entry.search_term) return true; const n=entry.search_term.toLowerCase(); return (j.title||'').toLowerCase().includes(n) || (j.desc||'').toLowerCase().includes(n); }).map(j=>({ title:j.title, url:j.link, company:entry.name, location:'', posted_at:j.pubDate||'' }));
    } catch(e) { return []; }
  }
};
