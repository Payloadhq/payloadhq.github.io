# Payload Developer Portal

**Source for the Payload developer portal** — by Payload. The canonical docs home
for RevRule by Payload and the Payload free utilities.

Live site: https://payloadhq.github.io/

## What it is

The public, static home of Payload documentation: product pages, developer docs,
how-to guides, browser utilities, and the X402 Observatory reference data. No
trackers, no build step. Payload's brand order is: PAYLOAD is the parent company;
Veyline by Payload is the flagship; callx402 by Payload (powered by Veyline) is
the x402 action layer; RevRule by Payload is the separate programmable revenue
rules engine. The portal's current published coverage is RevRule by Payload and
the Payload free utilities; Veyline and callx402 docs are not yet published on
the portal.

## Repository layout

- `index.html` — portal home
- `docs.html` — documentation hub
- `products.html` — product catalog (data from `products.json`)
- `revrule.html`, `revrule-api.html` — RevRule product and API docs
- `x402-observatory/` — the X402 Observatory: reference data and check pages
- `guides/` — how-to guides (x402 402 payments, MCP, n8n, AI search, CRM)
- `utilities/` — browser-based utilities
- `llms.txt`, `sitemap.xml`, `robots.txt` — machine-readable discovery files

## Local preview

No build step required. Serve the directory with any static file server:

```sh
cd payloadhq.github.io
npx serve .
```

Then open http://localhost:3000 in your browser.

## Contributing changes

Edits are plain HTML, CSS, and JavaScript. When you change products or pages,
keep `products.json`, `sitemap.xml`, and `llms.txt` in sync with the live content.

## Links

- Canonical docs: https://payloadhq.github.io/
- Payload on GitHub: https://github.com/Payloadhq
- callx402 (x402 action layer): https://github.com/Payloadhq/callx402

## License

No license file is published in this repo. Free utilities linked from the portal
are MIT in their own repositories; commercial products carry their own license terms.
