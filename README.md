# Álfar Smári

A buildless personal portfolio matching [Figma frame 406:8917](https://www.figma.com/design/BvJJ66MR43HD20sgNcUO9I?node-id=406-8917), with project imagery from [Manneskja](https://manneskja.com/).

Serve the repository root with any static HTTP server. No installation or build step is required.

The centered 762 × 525 panel has a fixed identity header and sidebar, with an independently scrollable image column. On narrow screens the sidebar sits above the gallery. The gallery supports touch, trackpad, and keyboard scrolling. Project images link to their corresponding Manneskja sections, and the name opens an email.

The existing `bg.jpg` is the default full-screen background, with a CSS `blur(150px)`. Choose **Upload background** to replace it with an image up to 30 MB; **Reset** restores the default. Uploaded images remain on the device and persist in that browser through IndexedDB. They do not change the background for other visitors. Use the stable branch preview URL when testing persistence, since browser storage is specific to each origin.

## Assets

Client icons come directly from the Figma frame. The header and sidebar use the specified Suisse Intl Book font. All assets are stored locally, without temporary Figma URLs or runtime dependencies on Manneskja's asset filenames.

| Local project image | Original Manneskja asset |
| --- | --- |
| `assets/projects/freepower.webp` | `/assets/hero-1280-_qMvgZ9-.webp` |
| `assets/projects/optivolt.webp` | `/assets/hero-iphone18-1280-eHdOLdxb.webp` |
| `assets/projects/nolla.webp` | `/assets/nolla-hero-1280-CzBVy5LW.webp` |
| `assets/projects/qava.webp` | `/assets/hero-1280-DqZ0KTUJ.webp` |
