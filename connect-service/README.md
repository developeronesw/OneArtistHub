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
- `CONNECT_SHARED_SECRET` — secret used by OneArtist installations to authenticate to this Worker
- `CONNECT_INSTALLATION_TOKENS` — JSON array of private first-time installation tokens, used only for onboarding before a PayPal merchant ID exists
- `CONNECT_INSTALLATION_ROUTES` — private JSON mapping merchant IDs to `{ "url": "https://artist.example", "token": "site-token" }`

## Artist installation secrets

Each OneArtist installation gets:

- `ONEARTIST_CONNECT_URL`
- `ONEARTIST_CONNECT_TOKEN`

The shared secret remains available for administrative API calls. New installations use `CONNECT_INSTALLATION_TOKENS` only for `/onboard/start` and `/onboard/status`; after onboarding, payment APIs and webhook forwarding use the merchant-keyed route map and per-installation token.

Configure PayPal to send the production webhook to `POST https://CONNECT-WORKER/paypal/webhook`. The route map is keyed by the connected seller merchant ID returned by PayPal onboarding. Never include route tokens in logs or client responses.

## Endpoints

- `GET /health`
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

## Seller onboarding

The Worker uses Partner Referrals with `EXPRESS_CHECKOUT` and `PAYMENT`/`REFUND` permissions. Seller onboarding is performed before payment, which is the PayPal-recommended flow and allows standard PayPal Checkout sellers to use personal accounts when the platform permits casual sellers.

OneArtist Hub does not configure a platform fee. Orders specify the connected seller as the payee and use instant disbursement so funds are routed directly to the seller rather than being collected and later paid out by OneArtist.
