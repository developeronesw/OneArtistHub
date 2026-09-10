# OneArtist Hub 0.3.0 — Mockup-Locked Public Themes

This update replaces the generic public-theme presentation with three independently structured, responsive public experiences based on the approved OneArtist concept boards.

## Theme fidelity targets
- **Midnight Cinema** — cinematic black/gold, framed widescreen composition, serif/editorial typography, feature-film hero treatment, release/video/merch/tour geometry matching the concept board.
- **Artist OS** — desktop side rail, deep navy/blue creator operating-system canvas, immersive artist hero, modular information panels, compact mobile app geometry.
- **Neon Editorial** — black/navy editorial canvas, oversized white/pink/orange headline treatment, asymmetrical hero photography, dense release/video/merch presentation and poster-style typography.

No database migration is required. Existing themes remain selected through `site.publicTheme`; activating a theme still applies immediately without rebuilding.

## Deployment
Overlay this update on 0.2.2, run `npm install`, `npm run check`, and `npm run build`, then commit/push. Do not recreate D1 or rerun setup.
