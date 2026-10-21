# Stage photography

Downloaded 2026-10-21 from the individual free-photo pages below. All three pages explicitly identify the **Unsplash License**, not Unsplash+. License: https://unsplash.com/license — permits downloading, copying, modifying and using photos commercially and noncommercially; excludes compiling a competing service or selling unmodified images. Attribution is voluntary and included in the demo footer.

| Local file | Photographer | Source / actual place | CDN original |
| --- | --- | --- | --- |
| santorini.jpg | orva studio | https://unsplash.com/photos/santorini-greece-yB6WFHbkX40 — Imerovigli, Santorini, Greece | https://images.unsplash.com/photo-1498503403619-e39e4ff390fe |
| pool.jpg | Sara Dubler | https://unsplash.com/photos/photo-of-brown-bench-near-swimming-pool-Koei_7yYtIo — Ao Nang, Thailand | https://images.unsplash.com/photo-1520250497591-112f2f40a3f4 |
| isfahan.jpg | Hasan Almasi | https://unsplash.com/photos/an-aerial-view-of-a-park-with-a-fountain-in-the-middle-cSp40ydLuBE — Naqshe Jahan Square, Isfahan, Iran | https://images.unsplash.com/photo-1676822965554-4c1b4ab4614d |

Saved as JPEG, width 1200, quality 78 using the image CDN. These are real stock photographs used as illustrations, **not photographs of the fictional hotels**. Destination badges belong to fictional offer data; image alt text identifies the actual photographed location. Every photo carries a visible Hebrew illustration/fictional-hotel label. The Iran scene uses a real Iran photograph and a conspicuous fictional-world notice, not a genuine travel recommendation.

`src/stage-photos.ts` embeds the local bytes into the standalone document as data URLs. No image request, tracker or remote dependency runs in the browser, including the local Chromium and AgentCore data-document paths. These asset files must be shipped beside `src/` or `dist/` when distributing the demo.
