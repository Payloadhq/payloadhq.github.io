#!/usr/bin/env python3
"""Payload site SEO guardrails (2026-11-10).

Runs against a site tree (local redesign-v3/tree or a GitHub checkout of
Payloadhq/payloadhq.github.io) and fails (exit 1) if any check fails:

  * every HTML page has a <title>, meta description, and a canonical URL
    that matches its own public URL
  * exactly one <h1> per page
  * every JSON-LD block parses as JSON
  * no internal-instruction language in visible copy (the v13 lesson)
  * every internal href/src resolves to a file in the tree
  * CSS/JS references resolve (same rule as version_assets)
  * sitemap.xml parses, every <loc> maps to an existing file, and every
    indexable page appears in the sitemap
  * robots.txt exists, references the sitemap, and does not block the site
  * products.json parses and every product URL maps to an existing page

Sample/fixture subtrees that are not indexable content (the arena, the
heist, dead-letter, stories, packets, black-box-arena sample assets and
the observatory app) are excluded from the per-page content checks but
their internal links are still followed from checked pages only.

Usage: python3 seo_check.py <tree-dir>
"""
import json
import os
import re
import sys
import xml.etree.ElementTree as ET

BASE = "https://payloadhq.dev/"
EXCLUDED_PREFIXES = ("x402-observatory/", "black-box-arena/",
                     "dead-letter-exchange/", "the-heist/", "stories/",
                     "packets/")
# Interactive app surfaces, not content pages: signers, payment testers,
# and the Flow app pages. They are not acquisition content, are not in
# the sitemap, and two of them deliberately canonicalize to their parent
# product surface. Named explicitly so the exclusion is auditable.
APP_SURFACES = {"flow-pay.html", "flow-rail.html", "flow-sandbox.html",
                "flow-try.html", "safe-sign.html", "safe-transfer.html",
                "x402-live-test-signer.html"}
# Server system pages: served by the web server itself (the branded 404),
# deliberately noindex and absent from the sitemap. Named explicitly so
# the exclusion is auditable (added v17, 2026-11-12).
SYSTEM_PAGES = {"404.html"}
INTERNAL_TERMS = ["shown in rotation", "flagship", "keyword stuffing",
                  "seo strategy", "lorem ipsum", "placeholder text",
                  "as instructed", "per your directive"]

failures = []
warnings = []


def fail(msg):
    failures.append(msg)


def visible_text(html):
    s = re.sub(r"<script.*?</script>", " ", html, flags=re.S)
    s = re.sub(r"<style.*?</style>", " ", s, flags=re.S)
    s = re.sub(r"<!--.*?-->", " ", s, flags=re.S)
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s))


def url_for(relpath):
    if relpath == "index.html":
        return BASE
    return BASE + relpath


def main():
    tree = sys.argv[1] if len(sys.argv) > 1 else "."
    html_files = []
    for root, _dirs, names in os.walk(tree):
        for n in names:
            if n.endswith(".html"):
                rel = os.path.relpath(os.path.join(root, n), tree)
                html_files.append(rel.replace(os.sep, "/"))
    indexable = sorted(p for p in html_files
                       if not p.startswith(EXCLUDED_PREFIXES)
                       and p not in APP_SURFACES
                       and p not in SYSTEM_PAGES
                       and not os.path.basename(p).startswith("sample-"))
    print(f"pages: {len(html_files)} html, {len(indexable)} indexable checked")

    for rel in indexable:
        path = os.path.join(tree, rel)
        s = open(path, encoding="utf-8", errors="replace").read()
        if "<title>" not in s or not re.search(r"<title>[^<]{4,}</title>", s):
            fail(f"{rel}: missing or empty <title>")
        if 'name="description"' not in s:
            fail(f"{rel}: missing meta description")
        if 'property="og:title"' not in s or 'property="og:description"' not in s:
            fail(f"{rel}: missing Open Graph title/description")
        m = re.search(r'<link rel="canonical" href="([^"]+)"', s)
        if not m:
            fail(f"{rel}: missing canonical")
        elif m.group(1) != url_for(rel):
            fail(f"{rel}: canonical {m.group(1)} != {url_for(rel)}")
        h1 = len(re.findall(r"<h1[\s>]", s))
        if h1 != 1:
            fail(f"{rel}: {h1} <h1> elements (expected 1)")
        for block in re.findall(
                r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
            try:
                json.loads(block)
            except Exception as e:
                fail(f"{rel}: JSON-LD does not parse: {e}")
        text = visible_text(s).lower()
        for term in INTERNAL_TERMS:
            if term in text:
                fail(f"{rel}: internal language in public copy: '{term}'")
        base = os.path.dirname(rel)
        for href in re.findall(r'(?:href|src)="([^"#]+)', s):
            if href.startswith(("http", "mailto:", "data:", "tel:")):
                continue
            target = os.path.normpath(
                os.path.join(base, href.split("?")[0])).replace(os.sep, "/")
            if not os.path.exists(os.path.join(tree, target)):
                fail(f"{rel}: broken internal reference -> {href}")

    # sitemap
    sm_path = os.path.join(tree, "sitemap.xml")
    if not os.path.exists(sm_path):
        fail("sitemap.xml missing")
        locs = []
    else:
        try:
            ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
            root = ET.parse(sm_path).getroot()
            locs = [e.text.strip() for e in root.findall("sm:url/sm:loc", ns)]
        except Exception as e:
            fail(f"sitemap.xml does not parse: {e}")
            locs = []
    loc_set = set(locs)
    for loc in locs:
        if not loc.startswith(BASE):
            fail(f"sitemap: foreign loc {loc}")
            continue
        rel = loc[len(BASE):] or "index.html"
        if not os.path.exists(os.path.join(tree, rel)):
            fail(f"sitemap: loc has no file: {loc}")
    for rel in indexable:
        if url_for(rel) not in loc_set:
            fail(f"sitemap: indexable page missing: {rel}")

    # hreflang: head alternates must be reciprocal across each language
    # group, and the sitemap must carry exactly the same alternates as
    # the page heads (added v17: the Veyline en/es/pt-BR group was in the
    # heads but missing from the sitemap, undetected by the v15 gate).
    sm_alt = {}
    if os.path.exists(sm_path):
        ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9",
              "xhtml": "http://www.w3.org/1999/xhtml"}
        for u in ET.parse(sm_path).getroot().findall("sm:url", ns):
            loc = u.find("sm:loc", ns).text.strip()
            sm_alt[loc] = {(l.get("hreflang"), l.get("href"))
                           for l in u.findall("xhtml:link", ns)}
    head_alt = {}
    for rel in indexable:
        s = open(os.path.join(tree, rel), encoding="utf-8",
                 errors="replace").read()
        head_alt[url_for(rel)] = {
            (lang, href) for lang, href in re.findall(
                r'hreflang="([^"]+)" href="([^"]+)"', s)}
    for url, alts in head_alt.items():
        if sm_alt.get(url, set()) != alts:
            fail(f"hreflang: sitemap alternates for {url} do not match "
                 f"the page head")
        for lang, href in alts:
            if href not in head_alt:
                fail(f"hreflang: {url} points at non-indexable {href}")
            elif head_alt[href] != alts:
                fail(f"hreflang: {href} does not reciprocate the "
                     f"alternate set declared by {url}")

    # robots.txt
    rb = os.path.join(tree, "robots.txt")
    if not os.path.exists(rb):
        fail("robots.txt missing")
    else:
        txt = open(rb, encoding="utf-8").read()
        if "sitemap:" not in txt.lower():
            fail("robots.txt does not reference the sitemap")
        if re.search(r"User-agent:\s*\*\s*\nDisallow:\s*/\s*$", txt, re.M):
            fail("robots.txt blocks the whole site")

    # products.json
    pj_path = os.path.join(tree, "products.json")
    if os.path.exists(pj_path):
        try:
            pj = json.load(open(pj_path, encoding="utf-8"))
            for p in pj.get("products", []):
                url = p.get("url", "")
                if url.startswith(BASE):
                    rel = url[len(BASE):].split("#")[0] or "index.html"
                    if not os.path.exists(os.path.join(tree, rel)):
                        fail(f"products.json: {p.get('name')} url has no page: {url}")
        except Exception as e:
            fail(f"products.json does not parse: {e}")

    for w in warnings:
        print("WARN:", w)
    if failures:
        print(f"\nSEO CHECK FAILED: {len(failures)} problem(s)")
        for f in failures:
            print(" -", f)
        return 1
    print(f"SEO CHECK PASSED: {len(indexable)} pages, {len(locs)} sitemap URLs")
    return 0


if __name__ == "__main__":
    sys.exit(main())
