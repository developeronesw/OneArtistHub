# OneArtist Connect - PayPal payment connection service

Deploy `paypal-worker.js` as a central Cloudflare Worker owned by Developer One. Do not ship PayPal platform secrets inside customer OneArtist installations.

## Required Worker secrets

- `PAYPAL_ENV` — `sandbox` or `live`
- `PAYPAL_PARTNER_CLIENT_ID` — PayPal platform REST client ID
- `PAYPAL_PARTNER_SECRET` — PayPal platform REST client secret
- `PAYPAL_PARTNER_ID` — PayPal partner ID
- `PAYPAL_PARTNER_ATTRIBUTION_ID` — optional PayPal BN code
- `PAYPAL_WEBHOOK_ID_SANDBOX` — sandbox webhook ID
- `PAYPAL_WEBHOOK_ID_LIVE` — live webhook ID
- `CONNECT_SHARED_SECRET` — Worker-only administrative secret and registry-encryption key; never distribute it to installations
- `CONNECT_INSTALLATIONS` — a Cloudflare KV namespace binding used for the encrypted, multi-installation registry. It is required for automatic registration.
- `CONNECT_INSTALLATION_TOKENS` — legacy JSON array of private first-time installation tokens. Existing installations continue to work, but new installations do not use it.
- `CONNECT_INSTALLATION_ROUTES` — legacy private JSON merchant map. Existing installations continue to work, but new registrations use KV.

## Artist installation secrets

Each automatically registered managed installation gets:

- `ONEARTIST_CONNECT_URL`
- `ONEARTIST_CONNECT_URL` — the public Worker URL; the managed control-plane-only `ONEARTIST_CONNECT_PROVISIONING_SECRET` is never configured on customer/self-hosted servers

The managed server-side provisioning flow generates an `OAH_SITE_<32 lowercase hex>` identity and cryptographically-random one-time bootstrap credential. It calls `/installations/activate` with the Worker administrative credential and only sends the bootstrap SHA-256 hash and exact HTTPS callback URL. The raw bootstrap remains only in encrypted pending server-side integration storage until setup calls `/installations/register`; the Worker consumes (deletes) the activation record and generates `OAH_INST_<64 lowercase hexadecimal characters>` using `crypto.getRandomValues`. The browser never receives either credential. The installation encrypts its identity and token in the existing `integrations` server-side store using `APP_ENCRYPTION_KEY`; the Worker stores only a SHA-256 token lookup plus an AES-GCM-encrypted forwarding copy in KV.

Registration is replay-protected: successful registration deletes the matching activation record. A bootstrap token is accepted only for its pre-provisioned installation ID and route, and never authorizes revocation or normal operations. `ONEARTIST_CONNECT_TOKEN` remains supported solely for legacy manually provisioned installations and should be left empty for new ones.

Configure PayPal to send the production webhook to `POST https://CONNECT-WORKER/paypal/webhook`. The route map is keyed by the connected seller merchant ID returned by PayPal onboarding. Never include route tokens in logs or client responses.

## Endpoints

- `GET /health`
- `POST /installations/activate` — Worker-administrative provisioning endpoint that creates a one-time hashed KV activation record
- `POST /installations/register` — per-installation bootstrap registration; consumes its activation record and returns that installation's generated credential only to its server
- `POST /installations/revoke` — requires the installed credential and can revoke only its own installation ID
- `GET /config`
- `POST /onboard/start`
- `POST /onboard/status`
- `POST /paypal/create-order`
- `POST /paypal/order`
- `POST /paypal/capture`
- `POST /paypal/refund`
- `POST /paypal/webhook`
- `POST /paypal/webhook/verify`

The Worker authenticates to PayPal, generates the `PayPal-Auth-Assertion` for the connected seller, and keeps the platform Client Secret outside the artist installation. `/paypal/webhook` is the public PayPal listener: it verifies the event, identifies the seller merchant ID from the event payee, and forwards the verified event to the matching installation's private `/api/paypal/webhook/internal` endpoint.

## Registry lifecycle and local testing

When `/onboard/status` verifies a seller, the Worker atomically associates that merchant ID with the authenticated installation. Merchant-scoped payment calls and verified webhook forwarding then resolve only to that active installation. A token from another installation is rejected. Revoking an installation disables its authentication and forwarding.

Create and bind a KV namespace named `CONNECT_INSTALLATIONS` before deploying this Worker. Keep `CONNECT_SHARED_SECRET` exclusively on the Worker. The trusted provisioning workflow creates one activation record with `POST /installations/activate` using the Worker-only administrative secret and a SHA-256 bootstrap hash; it never stores the raw bootstrap token. Set only the bootstrap token (and optionally its generated installation ID) as server-side installation configuration, and set `ONEARTIST_CONNECT_URL=https://connect.oneartisthub.site`. Do not put any of these values in Vite variables, client-visible Pages build variables, source control, URLs, or logs.

Run `npm test` in this directory. The tests use a KV fixture and mocked `fetch`; they make no PayPal requests. Validate configuration without deploying through `npx wrangler deploy --dry-run` after binding KV and setting the normal Worker secrets locally/through your deployment environment.

## Seller onboarding

The Worker uses Partner Referrals with `EXPRESS_CHECKOUT` and `PAYMENT`/`REFUND` permissions. Seller onboarding is performed before payment, which is the PayPal-recommended flow and allows standard PayPal Checkout sellers to use personal accounts when the platform permits casual sellers.

OneArtist Hub does not configure a platform fee. Orders specify the connected seller as the payee and use instant disbursement so funds are routed directly to the seller rather than being collected and later paid out by OneArtist.


## Square seller connection

OneArtist Hub now supports Square as the alternate artist payment provider. Square uses OAuth so artists authorize their own Square seller account without entering API credentials into the artist site. A connected installation may have **PayPal or Square, never both**. The Connect Worker rejects a Square connection when PayPal is connected and rejects PayPal onboarding when Square is connected.

Required Connect Worker secrets/variables:

- `SQUARE_ENV`: `production` (use `sandbox` only for testing)
- `SQUARE_CLIENT_ID`: Square application client ID
- `SQUARE_CLIENT_SECRET`: Square application secret
- `SQUARE_REDIRECT_URI`: `https://connect.oneartisthub.site/square/oauth/callback`

The Square OAuth callback must exactly match the URI registered in the Square Developer application. The Worker stores the seller access/refresh tokens encrypted in the existing Connect installation KV and refreshes tokens on a scheduled Worker run. No Square application fee is configured by OneArtist Hub.
