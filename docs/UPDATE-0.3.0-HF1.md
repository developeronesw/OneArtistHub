# OneArtist Hub 0.3.0 HF1 — Theme-Safe Player Geometry

This hotfix corrects the Artist OS regression where theme-specific player offsets moved the persistent OneArtist glass player away from its canonical centered viewport position.

## Contract

The persistent player geometry is global and immutable across Midnight Cinema, Artist OS, Neon Editorial, and future themes. Themes may only skin the player visually (background, border, glow, play-button color, progress accent). They may not set player `left`, `right`, `bottom`, `width`, `max-width`, `margin`, `position`, or `transform` values.

Desktop remains centered at a maximum width of 1180px with 15px viewport gutters. Tablet/mobile continue using the existing global responsive widths and bottom offsets.

No database migration is required.
