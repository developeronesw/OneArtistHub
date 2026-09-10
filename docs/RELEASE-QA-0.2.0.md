# OneArtist Hub 0.2.0 — Release QA

The 0.2.0 release is intended to overlay 0.1.3 without recreating D1 or rerunning setup.

## Verified in package QA

- JavaScript syntax for React application, media ingest, Pages Function API and self-host Node modules.
- D1 fresh schema execution and 0.1.3 -> 0.2.0 migration semantics.
- Album ZIP ingest wiring and MP3 ID3v2.4 rewrite/package path.
- External or embedded cover-art discovery and replacement.
- Legacy ID3v1 and existing ID3v2 removal before finalized tags are written.
- Track/total numbering and full-duration capture during preview generation.
- Public/private media object separation and private storage identifiers removed from public bootstrap data.
- Cloudflare R2, Dropbox and self-hosted local-storage adapter routing.
- Cloudflare Email Service REST endpoint/payload wiring and Resend fallback.
- Direct PayPal merchant credential verification endpoint.
- Self-host Ubuntu installer shell syntax and input validation.
- SQLite-to-MySQL query compatibility transforms used by the shared API contract.
- Existing authentication, customer accounts, PayPal webhooks, refunds, analytics, themes, SVG-only icon contract and continuous player checks.
- ZIP root layout, CRC integrity, secret scan and 0.1.3 update-overlay equivalence.

## Deployment gate

Run `npm install`, `npm run check`, and `npm run build` in the deployment environment before pushing the update. The production build must finish successfully before deployment.

## Cloudflare media note

When R2 is selected, bind the bucket to the Pages project as `MEDIA`. The serverless single-request upload path is intentionally capped below the platform request-body limit; use the VPS/local profile for substantially larger packages until multipart direct-to-storage upload support is added.
