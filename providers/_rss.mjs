// @ts-check
// Minimal RSS helpers used by multiple providers. Keep intentionally small and dependency-free.

export function splitItems(xml) {
  if (!xml) return [];
  const items = [];
  const re = /<item[\s\S]*?<\/item>/gi;
  let m;
  while ((m = re.exec(xml))) items.push(m[0]);
  return items;
}

export function extractTag(item, tag) {
  if (!item) return '';
  const re = new RegExp(`<${tag}[^>]*>([\s\S]*?)<\\/${tag}>`, 'i');
  const m = item.match(re);
  if (!m) return '';
  let s = m[1].trim();
  // unwrap CDATA
  s = s.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
  // decode common HTML entities
  s = s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  // strip inner HTML tags
  s = s.replace(/<[^>]+>/g, '').trim();
  return s;
}
