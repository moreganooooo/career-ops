// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

// Hacker News "Who's hiring" is typically a monthly thread. This provider
// currently attempts to fetch the HNRSS frontpage and returns an empty list
// if no clear "Who's Hiring" items are found. Non-throwing and safe.

export default {
  id: 'hackernews',
  detect() { return null; },
  async fetch(entry, ctx) {
    try {
      // best-effort: use HNRSS search (hnrss.org) for "who's hiring"
      const q = encodeURIComponent("who's hiring");
      const url = `https://hnrss.org/search?q=${q}`;
      const text = await ctx.fetchText(url).catch(()=>null);
      if (!text) return [];
      // simple heuristic: split by <item>
      const { splitItems, extractTag } = await import('./_rss.mjs');
      const items = splitItems(text);
      const jobs = items.map(it=>({ title: extractTag(it,'title'), link: extractTag(it,'link') })).filter(j=>j.title && j.link);
      return jobs.filter(j=>{ if(!entry.search_term) return true; return j.title.toLowerCase().includes(entry.search_term.toLowerCase()); }).map(j=>({ title:j.title, url:j.link, company:entry.name, location:'', posted_at:'' }));
    } catch(e) { return []; }
  }
};
