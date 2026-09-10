# Provider Matrix — OneArtist Hub 0.2.2

| Area | Providers |
|---|---|
| Database | Cloudflare D1, MySQL, MariaDB, SQLite |
| Storage | Cloudflare R2, Dropbox, S3-compatible, VPS Local |
| Mail | Resend, Brevo, Cloudflare Email Service, SMTP on VPS |
| Payments | PayPal Direct, PayPal Connect architecture |

## S3 compatible
Store endpoint, region, bucket, access key ID and secret access key under Settings. Secrets are AES-GCM encrypted before persistence. Use the built-in connection test before activating the provider.

## SMTP
SMTP sockets are not exposed from the Cloudflare Pages/Workers runtime. SMTP therefore appears only when the Node/VPS runtime exposes `SMTP_SEND`. Resend, Brevo and Cloudflare Email remain available on serverless deployments.

## Email queue
Every transactional email is persisted before the first delivery attempt. Failed delivery enters retry state with exponential backoff and is retried opportunistically on application traffic. The admin can manually retry failed/dead messages from Settings. Five failed attempts move a message to dead state instead of looping forever.

## PayPal Connect
The customer-facing OneArtist installation contacts a separately deployed OneArtist Connect service. The Connect service owns the PayPal partner credentials, creates Partner Referrals signup URLs and verifies merchant onboarding status. A per-install connection token should be used in production.
