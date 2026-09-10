# OneArtist Connect — PayPal partner onboarding service

Deploy `paypal-worker.js` as a separate Cloudflare Worker owned by Developer One. Do not ship PayPal partner secrets inside customer OneArtist installations.

Required Worker secrets/variables:

- `PAYPAL_PARTNER_CLIENT_ID`
- `PAYPAL_PARTNER_SECRET`
- `PAYPAL_PARTNER_ID` — your PayPal merchant/partner ID
- `PAYPAL_PARTNER_ATTRIBUTION_ID` — BN code when PayPal provides one
- `CONNECT_SHARED_SECRET` — use a unique per-install token in production
- `PAYPAL_ENV=sandbox` or `live`

OneArtist installations use `ONEARTIST_CONNECT_URL` and `ONEARTIST_CONNECT_TOKEN` as deployment secrets. The CMS requests an onboarding URL from `/onboard/start`, redirects the seller to PayPal, then verifies the returned merchant through `/onboard/status` before marking the connection ready.

PayPal Partner Referrals requires PayPal platform/partner approval for live use. Direct merchant Client ID/Secret checkout remains available independently.
