# OneArtist Hub 0.2.2 — Infrastructure & Integrations

This is a cumulative update for existing **0.2.0 and 0.2.1** installations. It includes the 0.2.1 Media Library/Universal Asset Picker changes plus the 0.2.2 infrastructure work.

## Storage
- Cloudflare R2
- Dropbox
- S3-compatible object storage with AWS Signature V4
- VPS local private storage
- S3 endpoint/region/bucket/key configuration and read/write/delete connection test

## Deployment
- Cloudflare Pages + Functions + D1
- Node.js VPS + MySQL
- Node.js VPS + MariaDB
- Node.js VPS + SQLite
- Separate Ubuntu SQLite installer
- Browser-side album processing remains available; VPS deployments continue to support large server-backed media storage

## Email
- Resend API
- Brevo transactional email API
- Cloudflare Email Service API
- SMTP on the Node/VPS runtime through Nodemailer
- Durable D1/MySQL/SQLite email queue with exponential retry, dead-letter state, logs and admin retry action

## Payments
- Existing direct PayPal Client ID/Secret mode remains fully supported
- Optional PayPal Connect architecture for seller-login onboarding
- `connect-service/paypal-worker.js` is a separate central Cloudflare Worker reference implementation
- Partner secrets never belong in customer OneArtist Hub packages
- Merchant callback is verified server-to-server before OneArtist marks onboarding connected

Live PayPal Partner Referrals usage still requires the PayPal platform/partner permissions enabled for your PayPal application. Direct merchant checkout does not depend on that approval.
