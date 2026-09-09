# Provider Portability

OneArtist Hub 0.1.0 implements the Cloudflare/D1 backend first, but the frontend does not call D1 directly. Every admin and public data operation goes through `/api/*`.

That API boundary is intentional.

Future adapters can implement the same contract using:

- Node.js + MySQL
- Node.js + PostgreSQL
- Node.js + SQLite
- Supabase/PostgreSQL
- other compatible serverless SQL providers

Storage is also intended to remain provider-based. FOUNDATION includes Dropbox digital delivery. R2/S3/local-server adapters can follow the same authorization-token workflow.

Payment integrations follow the same rule. FOUNDATION implements PayPal first without putting PayPal secrets in the React application.
