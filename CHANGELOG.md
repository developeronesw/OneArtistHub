# OneArtist Hub Changelog

## 0.1.1 — Content Management

Functional CMS milestone built on the installed 0.1.0/HF1 foundation.

### Working CRUD
- Releases: create, edit, publish/draft, feature, bulk delete, delete.
- Tracks: create, edit, publish/draft, choose parent release, preview-audio URL, track ordering metadata, explicit flag.
- Videos: create/edit/delete from YouTube URLs, YouTube ID parsing, server-side oEmbed metadata lookup, automatic thumbnail capture, public modal playback.
- Tour dates: create/edit/delete with venue, location, ticket link, status and show time.
- Store products: physical/digital product CRUD, pricing, inventory, SKU, variants, image, Dropbox private path.
- Custom pages: create/edit/delete, menu visibility, sanitized HTML editor.
- Media Library: working external/hosted media records instead of a dead navigation item.
- Bulk delete and one-click publish/draft controls for content lists.

### Workflow
- Aurora dashboard Quick Actions now open the actual create editor for Release, Video, Tour Date and Page.
- Empty content sections include working create actions.
- Track editor uses a real release selector instead of requiring a raw release ID.
- Release deletion also removes tracks linked to that release.

### Themes
- Midnight Cinema, Artist OS and Neon Editorial can be activated immediately from Appearance → Themes.
- Theme activation writes to D1 and changes the public site without a GitHub commit or Cloudflare redeploy.
- Live theme previews are available without changing the active theme.
- Public Music, Videos, Tour and Shop pages now display the complete published catalog while the homepage remains limited to the latest 3 releases/videos/tour dates and 4 products.

### UI / responsive
- Aurora Glass Studio remains the official admin dashboard.
- Mobile admin drawer/dock behavior improved.
- New editor, YouTube preview, status and theme controls remain SVG-icon based.
- No raster UI icons/logos were added.

### Backend
- Added authenticated `/api/admin/youtube` oEmbed helper.
- Video URLs are validated server-side and thumbnails are persisted.
- Partial content updates preserve existing publish/featured state correctly.
- PBKDF2 remains at Cloudflare-compatible 100,000 iterations.

No D1 schema migration is required for 0.1.1; existing installations and data are preserved.
