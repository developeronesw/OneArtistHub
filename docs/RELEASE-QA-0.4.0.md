# OneArtist Hub 0.4.0 Release Candidate QA

Date: September 11, 2026

## Verified locally

- `npm run security-test`
- `npm run check`
- `npm run build`
- `git diff --check`
- Temporary SQLite schema application with security tables and foreign keys
- MySQL/MariaDB SQL translation contract across the full schema
- In-memory album ZIP policy checks for valid archives, nested archives and excessive file counts
- Self-host installer and adapter syntax checks

## Verified through source and tests

- Receipt token generation, hashing, expiration and scoped authorization
- Public receipt data minimization
- Atomic one-time download-token consumption
- Database-backed failed-login tracking and progressive throttling
- Emergency recovery throttling, session invalidation, audit events and notification path
- Upload request-size enforcement and media magic-byte validation
- Album ZIP compressed-size, expanded-size, file-count, per-file, nested-archive and artwork limits
- URL scheme policy and HTML sanitization
- PayPal webhook verification, certificate-host validation, capture amount/currency checks and refund validation
- Opaque production errors with request IDs
- Security event and audit logging paths
- Pages and self-host CSP, HSTS and frame restrictions
- D1/SQLite/MySQL/MariaDB schema and compatibility source contracts

## Blocked pending environment access

The following were not claimed as passed because the required infrastructure or credentials were unavailable in the verification workspace:

- Live Cloudflare Pages/Functions HTTP verification
- Live Cloudflare D1 migration verification
- Self-hosted SQLite runtime verification
- Self-hosted MySQL runtime verification
- Live MariaDB runtime verification
- PayPal sandbox API and webhook verification
- Live Cloudflare upload behavior and delivered response-header verification

No production customer data, live database, secret, credential, deployment, or destructive migration was used during this verification phase.
