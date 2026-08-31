# Trae homepage clone

A local static capture of <https://www.trae.com/>, including the interactive card deck, Next.js runtime chunks, icons, sounds, portrait, and optimized image response.

## Run locally

From this directory:

```bash
node server.mjs
```

Open: <http://127.0.0.1:4173/>

Tarot app (built on this capture's visual language & assets): <http://127.0.0.1:4173/tarot/>

The page must be served over HTTP; opening `index.html` directly with `file://` will not resolve its root-absolute assets.

The Adobe Typekit stylesheet remains hosted by its original CDN, so an internet connection is required for the exact display font. All page-specific scripts, styles, media, sounds, and images are stored locally.

## Intended use

This capture is for local study and visual comparison only. Do not republish or present it as an official Trae site without permission from the site owner.
