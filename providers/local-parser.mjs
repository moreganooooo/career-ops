// Minimal local-parser provider stub.
// Real local parsers are user-provided per-company via `portals.yml`.

export default {
  id: 'local-parser',

  // detect: optionally detect if this provider should handle the entry.
  detect(entry) {
    // The default stub does not auto-detect; real parsers are configured
    // per-company via `parser.command` + `parser.script` in portals.yml.
    return null;
  },

  // fetch: return an empty list by default. User parsers should implement
  // their own executable scripts and configuration.
  async fetch(entry, ctx) {
    return [];
  },
};
