/* Payload robots.txt checker — parser and AI-crawler table.
 * Shared between the browser page and Node tests. No dependencies.
 * Matching follows RFC 9309 semantics in simplified form:
 *   - groups are matched case-insensitively; the most specific (longest)
 *     matching user-agent wins; "*" is the fallback group.
 *   - within the winning group, the most specific (longest) Allow/Disallow
 *     rule wins; Allow wins ties. No applicable rule => allowed (default).
 */
"use strict";

const CRAWLERS = [
  { token: "GPTBot",            owner: "OpenAI",      note: "Trains OpenAI models; does not serve ChatGPT answers." },
  { token: "ChatGPT-User",      owner: "OpenAI",      note: "Fetches pages on behalf of ChatGPT users." },
  { token: "OAI-SearchBot",     owner: "OpenAI",      note: "Search indexing for OpenAI." },
  { token: "ClaudeBot",         owner: "Anthropic",   note: "Trains Anthropic models." },
  { token: "anthropic-ai",      owner: "Anthropic",   note: "General Anthropic crawler token." },
  { token: "Claude-User",       owner: "Anthropic",   note: "Fetches pages on behalf of Claude users." },
  { token: "Claude-SearchBot",  owner: "Anthropic",   note: "Search indexing for Anthropic." },
  { token: "PerplexityBot",     owner: "Perplexity",  note: "Crawls for Perplexity answers." },
  { token: "Perplexity-User",   owner: "Perplexity",  note: "Fetches pages on behalf of Perplexity users." },
  { token: "Google-Extended",   owner: "Google",      note: "Opt-out token for Google AI training (Gemini); separate from Googlebot." },
  { token: "Applebot-Extended", owner: "Apple",       note: "Opt-out token for Apple AI training; separate from Applebot." },
  { token: "Bytespider",        owner: "ByteDance",   note: "Trains ByteDance models." },
  { token: "Meta-ExternalAgent",owner: "Meta",        note: "Trains Meta AI models." },
  { token: "Meta-WebIndexer",   owner: "Meta",        note: "Meta web indexing." },
  { token: "CCBot",             owner: "Common Crawl",note: "Common Crawl dataset; feeds many AI training corpora." },
  { token: "DuckAssistBot",     owner: "DuckDuckGo",  note: "Powers DuckDuckGo AI-assisted answers." },
  { token: "cohere-ai",         owner: "Cohere",      note: "Trains Cohere models." },
  { token: "YouBot",            owner: "You.com",     note: "Crawls for You.com AI answers." },
];

function parseRobots(text) {
  const groups = []; // { agents: [lowercase], rules: [{type:'allow'|'disallow', path, raw, line}] }
  let current = null;
  const lines = text.split(/\r?\n/);
  lines.forEach((rawLine, idx) => {
    const line = rawLine.split("#")[0].trim();
    if (!line) return;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) return;
    const field = m[1].toLowerCase();
    const value = m[2].trim();
    if (field === "user-agent") {
      const agent = value.toLowerCase();
      if (!current || current.sawRule) {
        current = { agents: [], rules: [], sawRule: false };
        groups.push(current);
      }
      current.agents.push(agent);
    } else if (field === "allow" || field === "disallow") {
      if (!current) return; // rule before any user-agent: ignore
      current.sawRule = true;
      let path = value;
      try { path = decodeURIComponent(value); } catch (e) { /* keep raw */ }
      current.rules.push({ type: field, path, raw: rawLine.trim(), line: idx + 1 });
    }
    // sitemap:, crawl-delay:, etc. are informational for this checker: ignored
  });
  return groups;
}

// Find the winning group for a crawler token (case-insensitive).
function winningGroup(groups, token) {
  const t = token.toLowerCase();
  let best = null, bestLen = -1, wildcard = null;
  for (const g of groups) {
    for (const a of g.agents) {
      if (a === "*") { if (!wildcard) wildcard = g; continue; }
      // RFC: group matches if the UA string starts with the pattern; we also
      // accept substring match since robots authors vary.
      if (t === a || t.startsWith(a) || t.includes(a) || a.includes(t)) {
        if (a.length > bestLen) { best = g; bestLen = a.length; }
      }
    }
  }
  return { group: best || wildcard, specific: !!best };
}

// Evaluate access for path "/" under the winning group.
function evaluate(group, token) {
  if (!group) return { status: "unmentioned", rule: null };
  const path = "/";
  let winner = null;
  for (const r of group.rules) {
    if (!r.path) {
      // "Disallow:" (empty) explicitly allows everything.
      if (r.type === "disallow") {
        const cand = { type: "allow", path: r.path, raw: r.raw, line: r.line, len: -1 };
        if (!winner || cand.len > winner.len) winner = cand;
      }
      continue;
    }
    if (!path.startsWith(r.path)) continue;
    const cand = { type: r.type, path: r.path, raw: r.raw, line: r.line, len: r.path.length };
    if (!winner || cand.len > winner.len ||
        (cand.len === winner.len && cand.type === "allow" && winner.type === "disallow")) {
      winner = cand;
    }
  }
  if (!winner) return { status: "allowed", rule: null, reason: "no applicable rule" };
  if (winner.type === "allow") return { status: "allowed", rule: winner.raw, line: winner.line };
  return { status: "blocked", rule: winner.raw, line: winner.line };
}

function checkCrawlers(text) {
  const groups = parseRobots(text);
  return CRAWLERS.map((c) => {
    const { group, specific } = winningGroup(groups, c.token);
    const verdict = evaluate(group, c.token);
    let status;
    if (specific) {
      // The file names this crawler: its fate is decided by its group's rules.
      status = verdict.status === "blocked" ? "blocked" : "allowed";
    } else if (group && group.rules.length) {
      // Only the wildcard group applies: blocked/allowed by it, but unmentioned by name.
      status = verdict.status;
      if (status === "allowed" && !verdict.rule) status = "unmentioned";
    } else {
      // Nothing in the file addresses this crawler at all.
      status = "unmentioned";
    }
    return {
      token: c.token, owner: c.owner, note: c.note,
      status,
      rule: verdict.rule, line: verdict.line,
      matchedGroup: group ? group.agents.join(", ") : null,
      specific,
    };
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { CRAWLERS, parseRobots, winningGroup, evaluate, checkCrawlers };
}
