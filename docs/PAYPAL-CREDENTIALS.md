# PayPal Payment Connection

OneArtist Hub now supports PayPal seller onboarding through the central **OneArtist Connect** Cloudflare Worker.

## Artist experience

Artists do not enter PayPal Client IDs, Client Secrets, Webhook IDs, or developer credentials into OneArtist Hub.

1. Open **Settings → PayPal Payments**.
2. Select **Connect PayPal**.
3. PayPal opens the seller onboarding flow.
4. The artist logs into an existing PayPal account or creates one, then grants OneArtist Hub permission.
5. OneArtist Hub stores the returned PayPal merchant ID in the encrypted/settings-backed site configuration.
6. Once PayPal reports `payments_receivable=true` and the email is confirmed, the artist is ready to receive payments.

For PayPal Checkout, PayPal currently supports casual sellers using personal accounts when sellers are onboarded before payment. Expanded Checkout requires business accounts, so this OneArtist Hub path uses standard PayPal Checkout for the personal-account seller experience.

## Central Worker secrets

The artist installation only needs these deployment secrets:

- `ONEARTIST_CONNECT_URL` — URL of the central OneArtist Connect Worker.
- `ONEARTIST_CONNECT_TOKEN` — per-installation bearer token shared with that Worker.

The central Worker keeps the PayPal platform credentials and webhook ID server-side:

- `PAYPAL_ENV` — `sandbox` or `live`
- `PAYPAL_PARTNER_CLIENT_ID`
- `PAYPAL_PARTNER_SECRET`
- `PAYPAL_PARTNER_ID`
- `PAYPAL_PARTNER_ATTRIBUTION_ID` — optional BN code
- `PAYPAL_WEBHOOK_ID_SANDBOX` and/or `PAYPAL_WEBHOOK_ID_LIVE`
- `CONNECT_SHARED_SECRET`

The Worker uses `PayPal-Auth-Assertion` to act on behalf of the connected seller, so separate seller API credentials are not required. PayPal documents this as the platform pattern for identifying the merchant on each API call.

## Central webhook routing

PayPal sends events to the public `/paypal/webhook` endpoint on the central Connect Worker. The Worker posts the original verified event body to the installation URL stored in `CONNECT_INSTALLATION_ROUTES`, using that installation's private route token. The site accepts only `POST /api/paypal/webhook/internal` deliveries with `x-oneartist-connect-token`; it never verifies or trusts direct PayPal delivery.

## Funds

OneArtist Hub does not add a platform fee. The order is created with the artist's PayPal merchant ID as the payee and `INSTANT` disbursement. PayPal's normal processing fees and any account-specific fees remain governed by PayPal.
