# OneArtist Hub 0.2.1 — Release QA

Version 0.2.1 is a schema-neutral update over 0.2.0. Existing releases, products, orders, customers, integrations, media objects, analytics, themes and authentication data are preserved.

## Verified in package QA

- JavaScript syntax for React application, Pages Function API, media ingest and self-host modules.
- Existing OneArtist Hub 0.2.0 source QA remains green.
- Real Media Library route/UI backed by `media_objects` and reusable `content_items` media metadata.
- Multi-file Media Library uploads register provider-backed media records.
- Reusable asset picker opens from release, track, product, artist profile, artist logo, homepage hero and Album ZIP cover workflows.
- Direct form upload and existing-library selection both resolve to public media URLs.
- Album ZIP picker can fetch selected library artwork for MP3 tag embedding and final release ZIP generation.
- Media title and alt metadata can be updated without moving or duplicating the underlying file.
- In-use media deletion protection detects references in non-media content and settings.
- Provider-backed deletion is implemented for R2, Dropbox and VPS-local storage.
- Public file serving rejects non-public objects, normalizes MIME type, uses `nosniff`, and downloads document media as attachments.
- SVG-only application icon/logo contract remains intact.
- Fresh D1 schema executes successfully; no 0.2.1 database migration is required.
- UPDATE archive overlays a clean 0.2.0 FULL package to the same 0.2.1 source tree.
- FULL and UPDATE archive CRC/integrity checks pass.

## Deployment gate

The target deployment environment must run:

```bash
npm install
npm run check
npm run build
```

`npm run check` must end with `OneArtist Hub static/source QA PASSED.` and Vite must complete the production build before pushing to `main`.
