# Cartel Full Width Theme — Official OneArtistHub Theme

Theme key: `cartel`

This theme is integrated into the existing OneArtistHub 0.4.0 public-theme system. It does not replace the release player, commerce, admin, media library, authentication, PayPal, or API code.

## Activate

1. Install/deploy the updated source.
2. Sign into OneArtistHub Admin.
3. Open **Themes**.
4. Preview **Cartel Full Width**.
5. Activate it.

The existing theme setting `site.publicTheme` stores the active theme.

## Content configuration

The theme intentionally uses the existing OneArtistHub content/settings model:

- `site.logoUrl` — artist logo
- `site.heroImage` — full-width hero image
- `site.heroTitle` — hero artist/title
- `site.heroSubtitle` — release/subtitle line
- Artist profile — artist name, genre, bio
- Releases — release artwork, title, release type, tracks
- Products — merchandise images, names, prices, variants
- Tour dates — date, city, venue, ticket URL
- Existing public navigation, cart and player remain active

No artist-specific text is hardcoded into the production data model.
